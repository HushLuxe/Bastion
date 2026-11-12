// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "./IERC20.sol";
import {BastionReceipt} from "./BastionReceipt.sol";
import {BastionAchievements} from "./BastionAchievements.sol";
import {IBastionShareHook, IMezoRouter, IStabilityPool} from "./interfaces/IMezo.sol";

/// @title BastionVault
/// @notice Gamified MUSD savings vault on Mezo.
/// @dev    Deposited canonical MUSD is routed directly into Mezo's canonical Stability Pool
///         (provideToSP). Collateral gains (BTC) from Mezo liquidations are harvested and
///         swapped back into MUSD via Mezo Pools Router, replenishing any Stability Pool
///         offset first and splitting net MUSD yield between depositors and the protocol
///         treasury (protocolFeeBps).
///
///         Receipt shares (bMUSD) are ERC-20 transferable and remain redeemable by any holder.
///         Unpaid yield carry is preserved across deposits, transfers, claims, and withdrawals.
///         Note: Owner can pause vault actions (including withdrawals) via setPaused(true), and
///         Stability Pool withdrawals require no undercollateralized troves in Mezo.
contract BastionVault is IBastionShareHook {
    // ────────────────────────── errors ──────────────────────────

    error ZeroAmount();
    error ZeroAddress();
    error NotOwner();
    error NotReceipt();
    error OnlyStabilityPool();
    error VaultPaused();
    error InsufficientShares();
    error Reentrancy();
    error InvalidGoal();
    error FeeTooHigh();
    error TransferFailed();

    // ────────────────────────── events ──────────────────────────

    event Deposited(address indexed user, uint256 amount, uint256 shares);
    event SavingsDeposited(address indexed user, uint256 indexed goalId, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, uint256 shares, uint256 principal, uint256 yieldPaid);
    event YieldClaimed(address indexed user, uint256 yieldPaid);
    event YieldHarvested(
        address indexed caller, uint256 grossYield, uint256 netUserYield, uint256 protocolFee, uint256 accruedPerShare
    );
    event GoalCreated(
        address indexed user, uint256 indexed goalId, string name, uint256 targetAmount, uint256 deadline
    );
    event GoalProgressUpdated(address indexed user, uint256 indexed goalId, uint256 savedAmount, uint8 tier);
    event BadgeEarned(address indexed user, uint8 indexed badgeId, uint256 tokenId);
    event PausedSet(bool paused);
    event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);
    event ProtocolFeeUpdated(uint256 protocolFeeBps);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ────────────────────────── types ──────────────────────────

    struct UserState {
        uint256 depositedTotal; // lifetime MUSD deposited
        uint256 yieldEarned; // lifetime MUSD yield paid out
        uint256 firstDepositAt; // timestamp of first deposit
        uint256 depositCount; // number of deposits
        uint256 yieldDebt; // reward-index snapshot
        uint256 carry; // unpaid yield carried forward across interactions
        uint256 goalsCompleted; // number of 100%-completed goals
    }

    struct SavingsGoal {
        string name;
        uint256 targetAmount;
        uint256 savedAmount;
        uint256 createdAt;
        uint256 deadline;
        uint8 highestTier; // 0 = <25%, 1 = 25% Bronze, 2 = 50% Silver, 3 = 75% Gold, 4 = 100% Vanguard
        bool completed;
    }

    struct LeaderboardEntry {
        address user;
        uint256 shares;
        uint256 depositedTotal;
        uint256 yieldEarned;
        uint256 badgesEarned;
        uint8 level;
    }

    // ────────────────────────── constants ──────────────────────────

    uint256 public constant WAD = 1e18;
    uint256 public constant BPS_DENOM = 10_000;
    uint256 public constant MAX_FEE_BPS = 2500; // 25% max protocol fee on yield

    uint8 public constant FIRST_DEPOSIT = 0;
    uint8 public constant SAVED_100 = 1;
    uint8 public constant SAVED_500 = 2;
    uint8 public constant HELD_7_DAYS = 3;
    uint8 public constant HELD_30_DAYS = 4;
    uint8 public constant YIELD_10 = 5;
    uint8 public constant GOAL_25_BRONZE = 6;
    uint8 public constant GOAL_50_SILVER = 7;
    uint8 public constant GOAL_75_GOLD = 8;
    uint8 public constant GOAL_100_VANGUARD = 9;

    uint256 public constant MILESTONE_100 = 100 * 1e18;
    uint256 public constant MILESTONE_500 = 500 * 1e18;
    uint256 public constant MILESTONE_YIELD_10 = 10 * 1e18;
    uint256 public constant SEVEN_DAYS = 7 days;
    uint256 public constant THIRTY_DAYS = 30 days;

    // ────────────────────────── immutables & storage ──────────────────────────

    IERC20 public immutable asset; // Canonical MUSD
    IERC20 public immutable btcToken; // Mezo BTC ERC-20 precompile wrapper (0x7b7C...)
    IStabilityPool public immutable stabilityPool;
    IMezoRouter public immutable router;
    address public immutable poolFactory;

    BastionReceipt public immutable receipt;
    BastionAchievements public immutable achievements;
    uint256 public immutable deployedAt;

    address public owner;
    address public treasury;
    uint256 public protocolFeeBps;
    bool public paused;

    /// @notice Cumulative net yield accrued per bMUSD share (wad).
    uint256 public accruedPerShare;
    /// @notice Total receipt shares outstanding (1:1 with receipt.totalSupply()).
    uint256 public totalShares;
    /// @notice Lifetime MUSD deposited across all users.
    uint256 public totalDeposited;
    /// @notice MUSD surplus currently reserved to back unpaid user yield + carry.
    uint256 public yieldReserve;
    /// @notice Cumulative net MUSD yield distributed to savers from real Mezo yield.
    uint256 public totalNetYield;
    /// @notice Cumulative MUSD protocol fees sent to treasury from real Mezo yield.
    uint256 public totalProtocolFees;
    /// @notice Timestamp and amount of the most recent yield harvest.
    uint256 public lastHarvestAt;
    uint256 public lastHarvestYield;
    /// @notice Native BTC received from StabilityPool awaiting swap to MUSD.
    uint256 public pendingBtcToSwap;

    mapping(address => UserState) public users;
    mapping(address => SavingsGoal[]) private _goals;
    mapping(address => uint256) public activeGoalId;

    address[] public savers;
    mapping(address => bool) public isSaver;

    uint256 private _entered;

    // ────────────────────────── modifiers ──────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyReceipt() {
        if (msg.sender != address(receipt)) revert NotReceipt();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert VaultPaused();
        _;
    }

    modifier nonReentrant() {
        if (_entered == 1) revert Reentrancy();
        _entered = 1;
        _;
        _entered = 0;
    }

    constructor(
        IERC20 asset_,
        IERC20 btcToken_,
        IStabilityPool stabilityPool_,
        IMezoRouter router_,
        address poolFactory_,
        address treasury_,
        uint256 protocolFeeBps_,
        BastionReceipt receipt_,
        BastionAchievements achievements_
    ) {
        if (
            address(asset_) == address(0) || address(btcToken_) == address(0) || address(stabilityPool_) == address(0)
                || address(router_) == address(0) || poolFactory_ == address(0) || treasury_ == address(0)
                || address(receipt_) == address(0) || address(achievements_) == address(0)
        ) {
            revert ZeroAddress();
        }
        if (protocolFeeBps_ > MAX_FEE_BPS) revert FeeTooHigh();

        asset = asset_;
        btcToken = btcToken_;
        stabilityPool = stabilityPool_;
        router = router_;
        poolFactory = poolFactory_;
        treasury = treasury_;
        protocolFeeBps = protocolFeeBps_;
        deployedAt = block.timestamp;

        receipt = receipt_;
        achievements = achievements_;

        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
        emit TreasuryUpdated(address(0), treasury_);
        emit ProtocolFeeUpdated(protocolFeeBps_);
    }

    /// @dev Accepts native BTC collateral gains exclusively from Mezo StabilityPool.
    receive() external payable {
        if (msg.sender != address(stabilityPool)) revert OnlyStabilityPool();
        pendingBtcToSwap += msg.value;
    }

    // ────────────────────────── goals ──────────────────────────

    /// @notice Creates a new savings goal (e.g. 7, 30, or 90 days) and marks it active.
    function createGoal(string calldata name, uint256 targetAmount, uint256 durationDays)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 goalId)
    {
        uint256 len = bytes(name).length;
        if (len == 0 || len > 64 || targetAmount == 0 || durationDays == 0 || durationDays > 3650) {
            revert InvalidGoal();
        }

        uint256 deadline = block.timestamp + (durationDays * 1 days);
        goalId = _goals[msg.sender].length;
        _goals[msg.sender].push(
            SavingsGoal({
                name: name,
                targetAmount: targetAmount,
                savedAmount: 0,
                createdAt: block.timestamp,
                deadline: deadline,
                highestTier: 0,
                completed: false
            })
        );
        activeGoalId[msg.sender] = goalId;
        _registerSaver(msg.sender);

        emit GoalCreated(msg.sender, goalId, name, targetAmount, deadline);
    }

    /// @notice Selects which of the caller's goals receives subsequent `deposit()` calls.
    function setActiveGoal(uint256 goalId) external {
        if (goalId >= _goals[msg.sender].length) revert InvalidGoal();
        activeGoalId[msg.sender] = goalId;
    }

    // ────────────────────────── user actions ──────────────────────────

    /// @notice Deposits MUSD into the active goal (if any), routes to Mezo StabilityPool,
    ///         and mints bMUSD receipt shares 1:1.
    function deposit(uint256 amount) external whenNotPaused nonReentrant returns (uint256 shares) {
        uint256 count = _goals[msg.sender].length;
        uint256 goalId = count > 0 ? activeGoalId[msg.sender] : 0;
        return _deposit(msg.sender, goalId, count > 0, amount);
    }

    /// @notice Deposits MUSD toward a specific savings goal and routes to Mezo StabilityPool.
    function depositToGoal(uint256 goalId, uint256 amount)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 shares)
    {
        if (goalId >= _goals[msg.sender].length) revert InvalidGoal();
        activeGoalId[msg.sender] = goalId;
        return _deposit(msg.sender, goalId, true, amount);
    }

    /// @notice Withdraws principal by burning `shareAmount` of bMUSD (including transferred bMUSD)
    ///         and pays any settled real yield.
    function withdraw(uint256 shareAmount)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 principal, uint256 yieldPaid)
    {
        return _withdraw(msg.sender, shareAmount);
    }

    /// @notice Alias for `withdraw` so transferred bMUSD holders can explicitly redeem shares.
    function redeem(uint256 shareAmount)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 principal, uint256 yieldPaid)
    {
        return _withdraw(msg.sender, shareAmount);
    }

    /// @notice Withdraws the caller's entire bMUSD balance plus settled yield.
    function withdrawAll() external whenNotPaused nonReentrant returns (uint256 principal, uint256 yieldPaid) {
        uint256 shares = receipt.balanceOf(msg.sender);
        if (shares == 0) revert InsufficientShares();
        return _withdraw(msg.sender, shares);
    }

    /// @notice Harvests pending StabilityPool collateral gains (if any) and claims accrued yield.
    function claimYield() external whenNotPaused nonReentrant returns (uint256 yieldPaid) {
        _harvestIfPending();
        yieldPaid = _settleYield(msg.sender);
        emit YieldClaimed(msg.sender, yieldPaid);
        _checkMilestones(msg.sender);
    }

    /// @notice Permissionlessly claims BTC liquidation gains from Mezo StabilityPool, swaps
    ///         them to MUSD via Mezo Router, replenishes principal if offset, sends the
    ///         protocol fee to treasury, and distributes net yield to bMUSD holders.
    function harvest(uint256 minMusdOut) external nonReentrant returns (uint256 netUserYield, uint256 feeTaken) {
        return _harvest(minMusdOut);
    }

    // ────────────────────────── receipt transfer hook ──────────────────────────

    /// @inheritdoc IBastionShareHook
    function onShareTransfer(address from, address to, uint256) external onlyReceipt nonReentrant {
        // Harvest any pending StabilityPool gains and checkpoint both sides BEFORE balances change
        // so neither loses accrued yield and transferred bMUSD starts earning from this moment.
        _harvestIfPending();
        _checkpointCarry(from);
        _checkpointCarry(to);
        _registerSaver(to);
    }

    // ────────────────────────── owner actions ──────────────────────────

    function setPaused(bool paused_) external onlyOwner {
        paused = paused_;
        emit PausedSet(paused_);
    }

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, treasury_);
        treasury = treasury_;
    }

    function setProtocolFeeBps(uint256 protocolFeeBps_) external onlyOwner {
        if (protocolFeeBps_ > MAX_FEE_BPS) revert FeeTooHigh();
        protocolFeeBps = protocolFeeBps_;
        emit ProtocolFeeUpdated(protocolFeeBps_);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ────────────────────────── views ──────────────────────────

    function sharesOf(address user) public view returns (uint256) {
        return receipt.balanceOf(user);
    }

    function depositedTotalOf(address user) external view returns (uint256) {
        return users[user].depositedTotal;
    }

    function yieldEarnedOf(address user) external view returns (uint256) {
        return users[user].yieldEarned;
    }

    function carryOf(address user) external view returns (uint256) {
        return users[user].carry;
    }

    function firstDepositAtOf(address user) external view returns (uint256) {
        return users[user].firstDepositAt;
    }

    function depositCountOf(address user) external view returns (uint256) {
        return users[user].depositCount;
    }

    function goalsCountOf(address user) external view returns (uint256) {
        return _goals[user].length;
    }

    function getGoalsOf(address user) external view returns (SavingsGoal[] memory) {
        return _goals[user];
    }

    function getGoal(address user, uint256 goalId) external view returns (SavingsGoal memory) {
        if (goalId >= _goals[user].length) revert InvalidGoal();
        return _goals[user][goalId];
    }

    /// @notice Total MUSD managed across vault idle balance and Mezo Stability Pool position.
    function totalAssets() public view returns (uint256) {
        return asset.balanceOf(address(this)) + stabilityPool.getCompoundedMUSDDeposit(address(this));
    }

    /// @notice Vault's live compounded MUSD deposit inside Mezo Stability Pool.
    function stabilityPoolDeposit() external view returns (uint256) {
        return stabilityPool.getCompoundedMUSDDeposit(address(this));
    }

    /// @notice Pending BTC collateral gain waiting in Mezo Stability Pool.
    function pendingCollateralGain() external view returns (uint256) {
        return stabilityPool.getDepositorCollateralGain(address(this));
    }

    /// @notice MUSD surplus above principal available for yield payouts.
    function yieldBuffer() public view returns (uint256) {
        uint256 assets = totalAssets();
        return assets > totalShares ? assets - totalShares : 0;
    }

    /// @notice Realized net APY in basis points, derived strictly from real harvested yield.
    function realizedApyBps() external view returns (uint256) {
        if (totalNetYield == 0 || totalShares == 0 || block.timestamp <= deployedAt) return 0;
        uint256 elapsed = block.timestamp - deployedAt;
        return (totalNetYield * 365 days * BPS_DENOM) / (totalShares * elapsed);
    }

    /// @notice Unpaid yield accrued by `user` (carried yield + index delta on current bMUSD balance).
    function pendingYield(address user) public view returns (uint256) {
        return _pendingYieldAt(user, accruedPerShare);
    }

    /// @notice MUSD value of `user`'s position: redeemable bMUSD principal + unpaid yield.
    function positionValue(address user) public view returns (uint256) {
        return receipt.balanceOf(user) + pendingYield(user);
    }

    /// @notice User level derived on-chain: 0=Initiate, 1=Bronze, 2=Silver, 3=Gold, 4=Vanguard.
    function userLevelOf(address user) public view returns (uint8) {
        if (achievements.earned(GOAL_100_VANGUARD, user) || users[user].depositedTotal >= MILESTONE_500) return 4;
        if (achievements.earned(GOAL_75_GOLD, user) || users[user].depositedTotal >= MILESTONE_100) return 3;
        if (achievements.earned(GOAL_50_SILVER, user) || users[user].depositCount >= 2) return 2;
        if (achievements.earned(GOAL_25_BRONZE, user) || achievements.earned(FIRST_DEPOSIT, user)) return 1;
        return 0;
    }

    /// @notice Bitmap of earned badges (bits 0..9).
    function earnedBadges(address user) public view returns (uint256 bitmap) {
        for (uint8 i = 0; i < 10; i++) {
            if (achievements.earned(i, user)) bitmap |= (1 << i);
        }
    }

    function getSaversCount() external view returns (uint256) {
        return savers.length;
    }

    function getLeaderboard(uint256 offset, uint256 limit) external view returns (LeaderboardEntry[] memory entries) {
        uint256 len = savers.length;
        if (offset >= len || limit == 0) return new LeaderboardEntry[](0);
        uint256 end = offset + limit;
        if (end > len) end = len;
        entries = new LeaderboardEntry[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            address u = savers[i];
            uint256 bitmap = earnedBadges(u);
            uint256 badgeCount;
            for (uint8 b = 0; b < 10; b++) {
                if ((bitmap & (1 << b)) != 0) badgeCount++;
            }
            entries[i - offset] = LeaderboardEntry({
                user: u,
                shares: receipt.balanceOf(u),
                depositedTotal: users[u].depositedTotal,
                yieldEarned: users[u].yieldEarned,
                badgesEarned: badgeCount,
                level: userLevelOf(u)
            });
        }
    }

    /// @notice Whether `user` currently satisfies the condition for core milestone `badgeId` (0..5).
    function milestoneMet(address user, uint8 badgeId) public view returns (bool) {
        UserState storage state = users[user];
        if (badgeId == FIRST_DEPOSIT) return state.depositedTotal > 0;
        if (badgeId == SAVED_100) return state.depositedTotal >= MILESTONE_100;
        if (badgeId == SAVED_500) return state.depositedTotal >= MILESTONE_500;
        if (badgeId == HELD_7_DAYS) {
            return state.firstDepositAt != 0 && block.timestamp - state.firstDepositAt >= SEVEN_DAYS;
        }
        if (badgeId == HELD_30_DAYS) {
            return state.firstDepositAt != 0 && block.timestamp - state.firstDepositAt >= THIRTY_DAYS;
        }
        if (badgeId == YIELD_10) return state.yieldEarned >= MILESTONE_YIELD_10;
        return false;
    }

    // ────────────────────────── internals ──────────────────────────

    function _deposit(address user, uint256 goalId, bool hasGoal, uint256 amount) internal returns (uint256 shares) {
        if (amount == 0) revert ZeroAmount();

        // Realize any pending StabilityPool yield before changing totalShares.
        _harvestIfPending();
        _settleYield(user);

        UserState storage state = users[user];
        state.depositedTotal += amount;
        state.depositCount += 1;
        if (state.firstDepositAt == 0) state.firstDepositAt = block.timestamp;
        _registerSaver(user);

        totalShares += amount;
        totalDeposited += amount;
        // Note: state.carry from _settleYield is intentionally preserved!

        receipt.mint(user, amount);

        if (!asset.transferFrom(user, address(this), amount)) revert TransferFailed();
        _routeToStabilityPool(amount);

        // If provideToSP delivered collateral gains, harvest them immediately.
        if (pendingBtcToSwap > 0) {
            _harvest(0);
        }

        if (hasGoal) {
            _updateGoalOnDeposit(user, goalId, amount);
        }

        emit Deposited(user, amount, amount);
        emit SavingsDeposited(user, goalId, amount, amount);

        _checkMilestones(user);
        return amount;
    }

    function _withdraw(address user, uint256 shareAmount) internal returns (uint256 principal, uint256 yieldPaid) {
        if (shareAmount == 0) revert ZeroAmount();
        uint256 userShares = receipt.balanceOf(user);
        if (userShares < shareAmount) revert InsufficientShares();

        _harvestIfPending();
        yieldPaid = _settleYield(user);

        uint256 sharesBefore = totalShares;
        uint256 assetsBefore = totalAssets();

        principal = shareAmount;
        if (assetsBefore < sharesBefore) {
            principal = (shareAmount * assetsBefore) / sharesBefore;
        }

        totalShares -= shareAmount;
        // Note: state.carry from _settleYield is intentionally preserved!

        receipt.burn(user, shareAmount);

        if (principal > 0) {
            _withdrawIfNeeded(principal);
            if (!asset.transfer(user, principal)) revert TransferFailed();
        }

        // Update active uncompleted goal if caller has one.
        if (_goals[user].length > 0) {
            uint256 gid = activeGoalId[user];
            SavingsGoal storage g = _goals[user][gid];
            if (!g.completed && g.savedAmount > 0) {
                g.savedAmount = g.savedAmount > shareAmount ? g.savedAmount - shareAmount : 0;
            }
        }

        emit Withdrawn(user, shareAmount, principal, yieldPaid);
        _checkMilestones(user);
    }

    function _harvestIfPending() internal {
        if (stabilityPool.getDepositorCollateralGain(address(this)) > 0 || pendingBtcToSwap > 0) {
            _harvest(0);
        }
    }

    function _harvest(uint256 minMusdOut) internal returns (uint256 netUserYield, uint256 feeTaken) {
        if (stabilityPool.getDepositorCollateralGain(address(this)) > 0) {
            stabilityPool.withdrawFromSP(0);
        }

        uint256 btcBal = pendingBtcToSwap;
        if (btcBal > 0) {
            pendingBtcToSwap = 0;
            btcToken.approve(address(router), btcBal);
            IMezoRouter.Route[] memory routes = new IMezoRouter.Route[](1);
            routes[0] =
                IMezoRouter.Route({from: address(btcToken), to: address(asset), stable: false, factory: poolFactory});
            router.swapExactTokensForTokens(btcBal, minMusdOut, routes, address(this), block.timestamp);
        }

        // 1. Replenish any StabilityPool MUSD debt offset first so principal stays intact.
        uint256 compounded = stabilityPool.getCompoundedMUSDDeposit(address(this));
        uint256 idle = asset.balanceOf(address(this));
        if (compounded < totalShares && idle > 0) {
            uint256 deficit = totalShares - compounded;
            uint256 replenish = idle < deficit ? idle : deficit;
            _routeToStabilityPool(replenish);
        }

        // 2. Account any new MUSD yield surplus above totalShares + existing yieldReserve.
        uint256 totalManaged = totalAssets();
        uint256 surplus = totalManaged > totalShares ? totalManaged - totalShares : 0;
        uint256 newYield = surplus > yieldReserve ? surplus - yieldReserve : 0;

        if (newYield > 0) {
            if (totalShares == 0) {
                feeTaken = newYield;
                _withdrawIfNeeded(feeTaken);
                if (!asset.transfer(treasury, feeTaken)) revert TransferFailed();
                totalProtocolFees += feeTaken;
                emit YieldHarvested(msg.sender, newYield, 0, feeTaken, accruedPerShare);
            } else {
                feeTaken = (newYield * protocolFeeBps) / BPS_DENOM;
                netUserYield = newYield - feeTaken;

                if (feeTaken > 0) {
                    _withdrawIfNeeded(feeTaken);
                    if (!asset.transfer(treasury, feeTaken)) revert TransferFailed();
                    totalProtocolFees += feeTaken;
                }

                yieldReserve += netUserYield;
                totalNetYield += netUserYield;
                accruedPerShare += (netUserYield * WAD) / totalShares;
                lastHarvestAt = block.timestamp;
                lastHarvestYield = netUserYield;

                emit YieldHarvested(msg.sender, newYield, netUserYield, feeTaken, accruedPerShare);
            }
        }
    }

    function _routeToStabilityPool(uint256 amount) internal {
        if (amount == 0) return;
        asset.approve(address(stabilityPool), amount);
        stabilityPool.provideToSP(amount);
    }

    function _withdrawIfNeeded(uint256 needed) internal {
        uint256 idle = asset.balanceOf(address(this));
        if (idle < needed) {
            stabilityPool.withdrawFromSP(needed - idle);
        }
    }

    function _pendingYieldAt(address user, uint256 index) internal view returns (uint256) {
        UserState storage state = users[user];
        uint256 pending = state.carry;
        uint256 bal = receipt.balanceOf(user);
        if (bal == 0) return pending;
        uint256 delta = index > state.yieldDebt ? index - state.yieldDebt : 0;
        return pending + (bal * delta) / WAD;
    }

    function _checkpointCarry(address user) internal {
        UserState storage state = users[user];
        state.carry = _pendingYieldAt(user, accruedPerShare);
        state.yieldDebt = accruedPerShare;
    }

    function _settleYield(address user) internal returns (uint256 paid) {
        UserState storage state = users[user];
        uint256 pending = _pendingYieldAt(user, accruedPerShare);
        state.yieldDebt = accruedPerShare;
        if (pending == 0) return 0;

        uint256 buffer = yieldBuffer();
        uint256 cap = buffer < yieldReserve ? buffer : yieldReserve;
        paid = pending < cap ? pending : cap;

        // Unpaid carry is preserved and paid out once yield liquidity is available.
        state.carry = pending - paid;
        if (paid == 0) return 0;

        yieldReserve -= paid;
        state.yieldEarned += paid;
        _withdrawIfNeeded(paid);
        if (!asset.transfer(user, paid)) revert TransferFailed();
    }

    function _updateGoalOnDeposit(address user, uint256 goalId, uint256 amount) internal {
        SavingsGoal storage g = _goals[user][goalId];
        g.savedAmount += amount;

        uint256 pct = (g.savedAmount * 100) / g.targetAmount;
        uint8 newTier = g.highestTier;
        if (pct >= 25 && newTier < 1) {
            newTier = 1;
            _mintBadgeIfNew(user, GOAL_25_BRONZE);
        }
        if (pct >= 50 && newTier < 2) {
            newTier = 2;
            _mintBadgeIfNew(user, GOAL_50_SILVER);
        }
        if (pct >= 75 && newTier < 3) {
            newTier = 3;
            _mintBadgeIfNew(user, GOAL_75_GOLD);
        }
        if (pct >= 100) {
            if (newTier < 4) {
                newTier = 4;
                _mintBadgeIfNew(user, GOAL_100_VANGUARD);
            }
            if (!g.completed) {
                g.completed = true;
                users[user].goalsCompleted += 1;
            }
        }
        g.highestTier = newTier;
        emit GoalProgressUpdated(user, goalId, g.savedAmount, newTier);
    }

    function _checkMilestones(address user) internal {
        for (uint8 badgeId = 0; badgeId <= YIELD_10; badgeId++) {
            if (achievements.earned(badgeId, user)) continue;
            if (!milestoneMet(user, badgeId)) continue;
            _mintBadgeIfNew(user, badgeId);
        }
    }

    function _mintBadgeIfNew(address user, uint8 badgeId) internal {
        if (achievements.earned(badgeId, user)) return;
        achievements.mintBadge(user, badgeId);
        emit BadgeEarned(user, badgeId, achievements.tokenIdByBadge(user, badgeId));
    }

    function _registerSaver(address user) internal {
        if (!isSaver[user] && user != address(0)) {
            isSaver[user] = true;
            savers.push(user);
        }
    }
}
