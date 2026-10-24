// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "./IERC20.sol";
import {BastionReceipt} from "./BastionReceipt.sol";
import {BastionAchievements} from "./BastionAchievements.sol";

/// @title Bastion
/// @notice Gamified MUSD savings vault. Depositors earn yield and unlock ERC-721
///         achievement badges as they hit savings milestones.
/// @dev    Wave 1 uses a simple, owner-controlled yield rate: a global reward index
///         advances with time and yield is paid out of MUSD the vault already holds.
///         Nothing here can make the vault insolvent: deposits are always fully backed
///         and yield payouts are capped by the surplus above principal.
contract BastionVault {
    // ────────────────────────── errors ──────────────────────────

    error ZeroAmount();
    error ZeroAddress();
    error NotOwner();
    error VaultPaused();
    error InsufficientShares();
    error Reentrancy();

    // ────────────────────────── events ──────────────────────────

    event Deposited(address indexed user, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, uint256 shares, uint256 principal, uint256 yieldPaid);
    event YieldClaimed(address indexed user, uint256 yieldPaid);
    event RateUpdated(uint256 ratePerSecond);
    event YieldFunded(address indexed funder, uint256 amount);
    event BadgeEarned(address indexed user, uint8 indexed badgeId, uint256 tokenId);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ────────────────────────── types ──────────────────────────

    struct UserState {
        uint256 shares; // receipt shares held
        uint256 depositedTotal; // lifetime MUSD deposited
        uint256 yieldEarned; // lifetime MUSD yield paid out
        uint256 firstDepositAt; // timestamp of first deposit
        uint256 depositCount; // number of deposits
        uint256 yieldDebt; // reward-index snapshot
        uint256 carry; // yield that could not be paid yet and rolls forward
    }

    // ────────────────────────── constants ──────────────────────────

    uint256 public constant WAD = 1e18;
    uint256 public constant FIRST_DEPOSIT = 0;
    uint256 public constant SAVED_100 = 1;
    uint256 public constant SAVED_500 = 2;
    uint256 public constant HELD_7_DAYS = 3;
    uint256 public constant HELD_30_DAYS = 4;
    uint256 public constant YIELD_10 = 5;

    uint256 public constant MILESTONE_100 = 100 * 1e18;
    uint256 public constant MILESTONE_500 = 500 * 1e18;
    uint256 public constant MILESTONE_YIELD_10 = 10 * 1e18;
    uint256 public constant SEVEN_DAYS = 7 days;
    uint256 public constant THIRTY_DAYS = 30 days;

    // ────────────────────────── immutables & storage ──────────────────────────

    IERC20 public immutable asset; // MUSD
    BastionReceipt public immutable receipt;
    BastionAchievements public immutable achievements;

    address public owner;
    bool public paused;

    /// @notice Yield accrued per share, in wad units of MUSD per receipt share.
    uint256 public accruedPerShare;
    /// @notice Owner-set yield rate as a wad fraction per second.
    uint256 public ratePerSecond;
    /// @notice Timestamp of the last reward-index update.
    uint256 public lastAccrual;
    /// @notice Total receipt shares outstanding (principal).
    uint256 public totalShares;
    /// @notice Lifetime MUSD deposited across all users.
    uint256 public totalDeposited;

    mapping(address => UserState) public users;

    uint256 private _entered;

    // ────────────────────────── modifiers ──────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
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

    /// @dev The vault deploys its own receipt token and achievement ledger so the
    ///      whole protocol comes up in a single transaction and the trust direction
    ///      is always vault -> helpers, never the other way round.
    constructor(IERC20 asset_) {
        if (address(asset_) == address(0)) revert ZeroAddress();
        asset = asset_;
        receipt = new BastionReceipt(address(this));
        achievements = new BastionAchievements(address(this));
        owner = msg.sender;
        lastAccrual = block.timestamp;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // ────────────────────────── user actions ──────────────────────────

    /// @notice Deposits MUSD and mints receipt shares 1:1.
    /// @param amount MUSD to deposit (1e18 = 1 MUSD).
    function deposit(uint256 amount) external whenNotPaused nonReentrant returns (uint256 shares) {
        if (amount == 0) revert ZeroAmount();

        _accrue();
        _settleYield(msg.sender);

        UserState storage state = users[msg.sender];
        state.depositedTotal += amount;
        state.depositCount += 1;
        if (state.firstDepositAt == 0) state.firstDepositAt = block.timestamp;

        state.shares += amount;
        totalShares += amount;
        totalDeposited += amount;
        state.yieldDebt = accruedPerShare;
        state.carry = 0;

        receipt.mint(msg.sender, amount);

        if (!asset.transferFrom(msg.sender, address(this), amount)) revert ZeroAmount();

        emit Deposited(msg.sender, amount, amount);

        _checkMilestones(msg.sender);
        return amount;
    }

    /// @notice Withdraws principal plus any accrued yield.
    /// @param shareAmount Receipt shares to burn.
    function withdraw(uint256 shareAmount)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 principal, uint256 yieldPaid)
    {
        UserState storage state = users[msg.sender];
        if (state.shares < shareAmount) revert InsufficientShares();
        if (shareAmount == 0) revert ZeroAmount();

        _accrue();
        yieldPaid = _settleYield(msg.sender);

        state.shares -= shareAmount;
        totalShares -= shareAmount;
        state.yieldDebt = accruedPerShare;
        state.carry = 0;

        receipt.burn(msg.sender, shareAmount);

        principal = shareAmount;
        if (!asset.transfer(msg.sender, principal)) revert ZeroAmount();

        emit Withdrawn(msg.sender, shareAmount, principal, yieldPaid);

        _checkMilestones(msg.sender);
    }

    /// @notice Withdraws the caller's entire position.
    function withdrawAll() external whenNotPaused nonReentrant returns (uint256 principal, uint256 yieldPaid) {
        uint256 shares = users[msg.sender].shares;
        if (shares == 0) revert InsufficientShares();

        _accrue();
        yieldPaid = _settleYield(msg.sender);

        users[msg.sender].shares = 0;
        totalShares -= shares;
        users[msg.sender].yieldDebt = accruedPerShare;
        users[msg.sender].carry = 0;

        receipt.burn(msg.sender, shares);

        principal = shares;
        if (!asset.transfer(msg.sender, principal)) revert ZeroAmount();

        emit Withdrawn(msg.sender, shares, principal, yieldPaid);

        _checkMilestones(msg.sender);
    }

    /// @notice Claims accrued yield without withdrawing principal.
    function claimYield() external whenNotPaused nonReentrant returns (uint256 yieldPaid) {
        _accrue();
        yieldPaid = _settleYield(msg.sender);
        emit YieldClaimed(msg.sender, yieldPaid);
        _checkMilestones(msg.sender);
    }

    // ────────────────────────── owner actions ──────────────────────────

    /// @notice Sets the yield rate as a wad fraction per second (e.g. 1e14 = 0.01%/second).
    function setRate(uint256 ratePerSecond_) external onlyOwner {
        _accrue();
        ratePerSecond = ratePerSecond_;
        emit RateUpdated(ratePerSecond_);
    }

    /// @notice Adds MUSD to the vault to back future yield payouts.
    function fundYield(uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        if (!asset.transferFrom(msg.sender, address(this), amount)) revert ZeroAmount();
        emit YieldFunded(msg.sender, amount);
    }

    function setPaused(bool paused_) external onlyOwner {
        paused = paused_;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ────────────────────────── views ──────────────────────────

    function sharesOf(address user) external view returns (uint256) {
        return users[user].shares;
    }

    function depositedTotalOf(address user) external view returns (uint256) {
        return users[user].depositedTotal;
    }

    function yieldEarnedOf(address user) external view returns (uint256) {
        return users[user].yieldEarned;
    }

    function firstDepositAtOf(address user) external view returns (uint256) {
        return users[user].firstDepositAt;
    }

    function depositCountOf(address user) external view returns (uint256) {
        return users[user].depositCount;
    }

    /// @notice MUSD held by the vault (principal + unpaid yield buffer).
    function totalAssets() public view returns (uint256) {
        return asset.balanceOf(address(this));
    }

    /// @notice MUSD held by the vault that is not backing principal.
    function yieldBuffer() public view returns (uint256) {
        uint256 balance = asset.balanceOf(address(this));
        return balance > totalShares ? balance - totalShares : 0;
    }

    /// @notice Reward index projected to the current block.
    /// @dev    Accrual is lazy (it is written on interaction), so reads project the
    ///         index forward to `now` and the UI can show yield ticking up live.
    function projectedIndex() public view returns (uint256) {
        uint256 timestamp = block.timestamp;
        if (timestamp <= lastAccrual || totalShares == 0 || ratePerSecond == 0) {
            return accruedPerShare;
        }
        return accruedPerShare + (ratePerSecond * (timestamp - lastAccrual));
    }

    /// @notice Yield accrued by `user` that has not been paid out yet.
    /// @dev    Includes yield carried forward from earlier interactions when the
    ///         vault did not hold enough surplus to pay it at the time.
    function pendingYield(address user) public view returns (uint256) {
        return _pendingYieldAt(user, projectedIndex());
    }

    function _pendingYieldAt(address user, uint256 index) internal view returns (uint256) {
        UserState storage state = users[user];
        uint256 pending = state.carry;
        if (state.shares == 0) return pending;
        uint256 delta = index > state.yieldDebt ? index - state.yieldDebt : 0;
        return pending + (state.shares * delta) / WAD;
    }

    /// @notice MUSD value of `user`'s position: principal plus unpaid yield.
    function positionValue(address user) public view returns (uint256) {
        return users[user].shares + pendingYield(user);
    }

    /// @notice Projected annual yield for `user` at the current rate.
    function estimatedAnnualYield(address user) external view returns (uint256) {
        return (users[user].shares * ratePerSecond * 365 days) / WAD;
    }

    /// @notice Share of the milestones the holder has earned, as a bitmap.
    function earnedBadges(address user) external view returns (uint256) {
        uint256 bitmap;
        for (uint8 i = 0; i < 6; i++) {
            if (achievements.earned(i, user)) bitmap |= (1 << i);
        }
        return bitmap;
    }

    /// @notice Whether `user` currently satisfies the condition for `badgeId`.
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

    /// @dev Advances the reward index. Index grows by rate * elapsed seconds.
    function _accrue() internal {
        uint256 timestamp = block.timestamp;
        if (timestamp <= lastAccrual) return;
        if (totalShares != 0 && ratePerSecond != 0) {
            accruedPerShare += (ratePerSecond * (timestamp - lastAccrual));
        }
        lastAccrual = timestamp;
    }

    /// @dev Pays out the caller's pending yield from the surplus above principal and
    ///      resets their index snapshot. Never pays more than the buffer holds.
    function _settleYield(address user) internal returns (uint256 paid) {
        UserState storage state = users[user];
        // settled against the stored index: `_accrue()` has already rolled it to now
        uint256 pending = _pendingYieldAt(user, accruedPerShare);
        state.yieldDebt = accruedPerShare;
        if (pending == 0) return 0;

        uint256 buffer = yieldBuffer();
        paid = pending < buffer ? pending : buffer;

        // whatever the buffer could not cover rolls forward to the next interaction
        state.carry = pending - paid;
        if (paid == 0) return 0;

        state.yieldEarned += paid;
        if (!asset.transfer(user, paid)) revert ZeroAmount();
    }

    /// @dev Mints every badge the user has newly earned.
    function _checkMilestones(address user) internal {
        for (uint8 badgeId = 0; badgeId < 6; badgeId++) {
            if (achievements.earned(badgeId, user)) continue;
            if (!milestoneMet(user, badgeId)) continue;
            achievements.mintBadge(user, badgeId);
            emit BadgeEarned(user, badgeId, achievements.tokenIdByBadge(user, badgeId));
        }
    }
}
