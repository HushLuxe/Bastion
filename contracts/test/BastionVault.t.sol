// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {BastionVault} from "../src/BastionVault.sol";
import {BastionReceipt} from "../src/BastionReceipt.sol";
import {BastionAchievements} from "../src/BastionAchievements.sol";
import {MockMUSD} from "../src/MockMUSD.sol";
import {MockBTCCaller, MockMezoRouter, MockStabilityPool} from "./mocks/MockMezo.sol";

contract BastionVaultTest is Test {
    BastionVault internal vault;
    BastionReceipt internal receipt;
    BastionAchievements internal achievements;
    MockMUSD internal musd;
    MockBTCCaller internal btc;
    MockStabilityPool internal sp;
    MockMezoRouter internal router;

    address internal owner;
    address internal treasury;
    address internal alice;
    address internal bob;
    address internal poolFactory;

    uint256 internal constant WAD = 1e18;
    uint256 internal constant FEE_BPS = 1000; // 10% protocol fee on real yield

    function setUp() public {
        owner = makeAddr("owner");
        treasury = makeAddr("treasury");
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        poolFactory = makeAddr("poolFactory");

        musd = new MockMUSD();
        btc = new MockBTCCaller();
        sp = new MockStabilityPool(musd);
        router = new MockMezoRouter(musd, btc);

        vm.startPrank(owner);
        receipt = new BastionReceipt();
        achievements = new BastionAchievements();
        vault = new BastionVault(musd, btc, sp, router, poolFactory, treasury, FEE_BPS, receipt, achievements);
        receipt.setVault(address(vault));
        achievements.setVault(address(vault));
        vm.stopPrank();

        _fund(alice, 1_000_000 ether);
        _fund(bob, 1_000_000 ether);
        _fund(owner, 1_000_000 ether);
    }

    function _fund(address who, uint256 amount) internal {
        musd.mint(who, amount);
        vm.prank(who);
        musd.approve(address(vault), type(uint256).max);
    }

    function _deposit(address who, uint256 amount) internal {
        vm.prank(who);
        vault.deposit(amount);
    }

    function _simulateLiquidationAndHarvest(uint256 musdOffset, uint256 btcGain)
        internal
        returns (uint256 netUserYield, uint256 feeTaken)
    {
        vm.deal(address(this), btcGain);
        sp.simulateLiquidation{value: btcGain}(address(vault), musdOffset, btcGain);
        return vault.harvest(0);
    }

    // ────────────────────────── goals & deposits ──────────────────────────

    function test_Goal_CreateAndMilestoneProgression() public {
        vm.prank(alice);
        uint256 goalId = vault.createGoal("Emergency Keep", 100 ether, 30);

        // 25% -> Bronze badge
        vm.prank(alice);
        vault.depositToGoal(goalId, 25 ether);
        assertTrue(achievements.earned(vault.FIRST_DEPOSIT(), alice), "first deposit");
        assertTrue(achievements.earned(vault.GOAL_25_BRONZE(), alice), "25% bronze");
        assertFalse(achievements.earned(vault.GOAL_50_SILVER(), alice), "not 50% yet");
        assertEq(vault.userLevelOf(alice), 1, "bronze level");

        // 50% -> Silver badge
        vm.prank(alice);
        vault.depositToGoal(goalId, 25 ether);
        assertTrue(achievements.earned(vault.GOAL_50_SILVER(), alice), "50% silver");

        // 75% -> Gold badge
        vm.prank(alice);
        vault.depositToGoal(goalId, 25 ether);
        assertTrue(achievements.earned(vault.GOAL_75_GOLD(), alice), "75% gold");
        assertEq(vault.userLevelOf(alice), 3, "gold level");

        // 100% -> Vanguard badge + Saved 100 MUSD badge
        vm.prank(alice);
        vault.depositToGoal(goalId, 25 ether);
        assertTrue(achievements.earned(vault.GOAL_100_VANGUARD(), alice), "100% vanguard");
        assertTrue(achievements.earned(vault.SAVED_100(), alice), "saved 100");
        assertEq(vault.userLevelOf(alice), 4, "vanguard level");

        BastionVault.SavingsGoal memory g = vault.getGoal(alice, goalId);
        assertTrue(g.completed, "goal completed");
        assertEq(g.savedAmount, 100 ether, "full target saved");
    }

    function test_Deposit_RoutesDirectlyIntoStabilityPool() public {
        _deposit(alice, 100 ether);

        assertEq(receipt.balanceOf(alice), 100 ether, "bMUSD minted 1:1");
        assertEq(vault.sharesOf(alice), 100 ether, "sharesOf matches bMUSD");
        assertEq(musd.balanceOf(address(vault)), 0, "no idle MUSD left in vault");
        assertEq(sp.getCompoundedMUSDDeposit(address(vault)), 100 ether, "100% routed to StabilityPool");
        assertEq(vault.totalAssets(), 100 ether, "totalAssets tracks SP position");
    }

    function test_Deposit_RevertsWhenPaused() public {
        vm.prank(owner);
        vault.setPaused(true);

        vm.prank(alice);
        vm.expectRevert(BastionVault.VaultPaused.selector);
        vault.deposit(10 ether);
    }

    function test_Withdraw_RevertsWhenPaused() public {
        _deposit(alice, 50 ether);
        vm.prank(owner);
        vault.setPaused(true);

        vm.prank(alice);
        vm.expectRevert(BastionVault.VaultPaused.selector);
        vault.withdraw(10 ether);
    }

    // ────────────────────────── P1: real yield routing + treasury fee ──────────────────────────

    function test_YieldRouting_StabilityPoolGainSwapsTakesFeeAndPaysSaver() public {
        _deposit(alice, 100 ether);

        // Simulate liquidation: 10 MUSD offset, 0.00025 BTC gain (= 20 MUSD at 80k BTC/MUSD) -> 10 MUSD gross yield
        (uint256 netUserYield, uint256 feeTaken) = _simulateLiquidationAndHarvest(10 ether, 0.00025 ether);

        // Gross yield = 20 - 10 = 10 MUSD. Fee = 10% = 1 MUSD. Net user yield = 9 MUSD.
        assertEq(feeTaken, 1 ether, "10% protocol fee to treasury");
        assertEq(netUserYield, 9 ether, "90% net yield to savers");
        assertEq(musd.balanceOf(treasury), 1 ether, "treasury received fee in MUSD");
        assertEq(sp.getCompoundedMUSDDeposit(address(vault)), 100 ether, "principal replenished in StabilityPool");
        assertEq(vault.pendingYield(alice), 9 ether, "alice sees 9 MUSD real pending yield");

        skip(365 days);
        // Derived APY: 9 MUSD over 365 days on 100 MUSD principal = 9% = 900 bps
        assertEq(vault.realizedApyBps(), 900, "derived APY reflects real harvested yield");

        vm.prank(alice);
        uint256 paid = vault.claimYield();
        assertEq(paid, 9 ether, "alice claimed 9 MUSD");
        assertEq(vault.yieldEarnedOf(alice), 9 ether, "yieldEarned recorded");
        assertEq(musd.balanceOf(alice), 1_000_000 ether - 100 ether + 9 ether, "alice balance updated");
    }

    function test_YieldRouting_EarnsYield10BadgeFromRealYield() public {
        _deposit(alice, 100 ether);
        // 10 MUSD offset, 0.000375 BTC (= 30 MUSD) -> 20 MUSD gross -> 2 MUSD fee, 18 MUSD net
        _simulateLiquidationAndHarvest(10 ether, 0.000375 ether);

        vm.prank(alice);
        vault.claimYield();
        assertTrue(achievements.earned(vault.YIELD_10(), alice), "earned >= 10 MUSD real yield badge");
    }

    function test_Receive_RejectsNonStabilityPoolEth() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        (bool ok,) = address(vault).call{value: 0.1 ether}("");
        assertFalse(ok, "only stability pool may send BTC");
    }

    // ────────────────────────── P2(b): transferred bMUSD is redeemable ──────────────────────────

    function test_Regression_TransferredReceiptIsRedeemableWithYield() public {
        _deposit(alice, 100 ether);

        // Harvest 10 MUSD net yield before transfer (alice holds 100 bMUSD)
        // 0 offset, 0.000125 BTC (= 10 MUSD) -> 1 MUSD fee, 9 MUSD net
        _simulateLiquidationAndHarvest(0, 0.000125 ether);
        assertEq(vault.pendingYield(alice), 9 ether, "alice pending before transfer");

        // Alice transfers 40 bMUSD to Bob
        vm.prank(alice);
        assertTrue(receipt.transfer(bob, 40 ether), "transfer bMUSD");

        assertEq(receipt.balanceOf(alice), 60 ether, "alice bMUSD");
        assertEq(receipt.balanceOf(bob), 40 ether, "bob bMUSD");
        assertEq(vault.pendingYield(alice), 9 ether, "alice pre-transfer yield preserved in carry");
        assertEq(vault.pendingYield(bob), 0, "bob starts at 0 yield");

        // Second harvest: another 0.000125 BTC (= 10 MUSD) -> 1 MUSD fee, 9 MUSD net split 60/40
        _simulateLiquidationAndHarvest(0, 0.000125 ether);
        // Alice: 9 carry + 5.4 new = 14.4 MUSD; Bob: 3.6 MUSD
        assertEq(vault.pendingYield(alice), 14.4 ether, "alice yield = carry + 60% of second harvest");
        assertEq(vault.pendingYield(bob), 3.6 ether, "bob yield = 40% of second harvest");

        // Bob redeems his transferred 40 bMUSD!
        uint256 bobMusdBefore = musd.balanceOf(bob);
        vm.prank(bob);
        (uint256 bobPrincipal, uint256 bobYield) = vault.redeem(40 ether);

        assertEq(bobPrincipal, 40 ether, "bob redeemed 40 MUSD principal");
        assertEq(bobYield, 3.6 ether, "bob received 3.6 MUSD yield");
        assertEq(musd.balanceOf(bob), bobMusdBefore + 43.6 ether, "bob received principal + yield");
        assertEq(receipt.balanceOf(bob), 0, "bob bMUSD burned");

        // Alice withdraws her remaining 60 bMUSD
        uint256 aliceMusdBefore = musd.balanceOf(alice);
        vm.prank(alice);
        (uint256 alicePrincipal, uint256 aliceYield) = vault.withdrawAll();

        assertEq(alicePrincipal, 60 ether, "alice withdrew 60 MUSD principal");
        assertEq(aliceYield, 14.4 ether, "alice received pre-transfer carry + post-transfer yield");
        assertEq(musd.balanceOf(alice), aliceMusdBefore + 74.4 ether, "alice balance matches");
        assertEq(vault.totalShares(), 0, "all shares redeemed");
        assertEq(receipt.totalSupply(), 0, "totalSupply 0");
    }

    // ────────────────────────── P2(a): carry is NOT discarded on deposit / withdraw ──────────────────────────

    function test_Regression_CarryPreservedAcrossDepositAndWithdraw() public {
        _deposit(alice, 100 ether);

        // Harvest 9 MUSD net yield
        _simulateLiquidationAndHarvest(0, 0.000125 ether);
        assertEq(vault.pendingYield(alice), 9 ether, "9 MUSD accrued");

        // Simulate a temporary StabilityPool offset of 5 MUSD (before next liquidation BTC swap runs)
        // Total assets = 109 - 5 = 104 MUSD; yieldBuffer = 4 MUSD < 9 MUSD pending!
        // Note: simulate with 0 btcGain to create a partial liquidity squeeze
        sp.simulateLiquidation{value: 0}(address(vault), 5 ether, 0);
        assertEq(vault.yieldBuffer(), 4 ether, "buffer temporarily capped at 4 MUSD");

        // Alice deposits 10 MUSD while buffer is short -> pays 4 MUSD, 5 MUSD MUST remain in carry!
        _deposit(alice, 10 ether);
        assertEq(vault.yieldEarnedOf(alice), 4 ether, "4 MUSD paid out");
        assertEq(vault.carryOf(alice), 5 ether, "5 MUSD carry preserved on deposit (NOT zeroed!)");

        // Alice withdraws 10 MUSD while carry is still 5 MUSD -> carry MUST STILL be preserved!
        vm.prank(alice);
        vault.withdraw(10 ether);
        assertEq(vault.carryOf(alice), 5 ether, "5 MUSD carry preserved on withdraw (NOT zeroed!)");

        // Later a liquidation brings 0.0001875 BTC (= 15 MUSD):
        // 5 MUSD restores backing for the 5 MUSD unpaid carry (yieldReserve = 5),
        // leaving 10 MUSD new gross yield -> 1 MUSD fee + 9 MUSD net user yield!
        _simulateLiquidationAndHarvest(0, 0.0001875 ether);

        // Alice's pending yield = 5 MUSD preserved carry + 9 MUSD new net yield = 14 MUSD
        assertEq(vault.pendingYield(alice), 14 ether, "carried yield + new yield intact");

        vm.prank(alice);
        uint256 claimed = vault.claimYield();
        assertEq(claimed, 14 ether, "carried 5 MUSD paid out in full!");
        assertEq(vault.carryOf(alice), 0, "carry cleared only after actual payment");
    }

    // ────────────────────────── soulbound badges & leaderboard ──────────────────────────

    function test_Achievements_SoulboundAndOnChainSvg() public {
        vm.prank(alice);
        uint256 gid = vault.createGoal("Sovereign Stack", 40 ether, 7);
        vm.prank(alice);
        vault.depositToGoal(gid, 40 ether);

        uint256 tokenId = achievements.tokenIdByBadge(alice, vault.GOAL_100_VANGUARD());
        assertEq(achievements.ownerOf(tokenId), alice, "alice owns vanguard badge");

        vm.prank(alice);
        vm.expectRevert("BastionAchievements: soulbound");
        achievements.transferFrom(alice, bob, tokenId);

        string memory uri = achievements.tokenURI(tokenId);
        assertGt(bytes(uri).length, 100, "on-chain SVG URI generated");
    }

    function test_Leaderboard_ReadsOnChainSavers() public {
        _deposit(alice, 150 ether);
        _deposit(bob, 50 ether);

        BastionVault.LeaderboardEntry[] memory entries = vault.getLeaderboard(0, 10);
        assertEq(entries.length, 2, "2 savers on leaderboard");
        assertEq(entries[0].user, alice);
        assertEq(entries[0].shares, 150 ether);
        assertEq(entries[1].user, bob);
        assertEq(entries[1].shares, 50 ether);
    }

    function test_Badges_DurationAnd500Musd() public {
        _deposit(alice, 500 ether);
        assertTrue(achievements.earned(vault.SAVED_500(), alice), "saved 500 badge");

        skip(7 days);
        _deposit(alice, 1 ether);
        assertTrue(achievements.earned(vault.HELD_7_DAYS(), alice), "held 7 days badge");

        skip(23 days);
        _deposit(alice, 1 ether);
        assertTrue(achievements.earned(vault.HELD_30_DAYS(), alice), "held 30 days badge");
    }

    function test_Admin_OnlyOwnerAndFeeCap() public {
        vm.prank(alice);
        vm.expectRevert(BastionVault.NotOwner.selector);
        vault.setProtocolFeeBps(500);

        vm.prank(owner);
        vm.expectRevert(BastionVault.FeeTooHigh.selector);
        vault.setProtocolFeeBps(3000);

        vm.prank(owner);
        vault.setProtocolFeeBps(500);
        assertEq(vault.protocolFeeBps(), 500, "fee updated");
    }

    function test_Goal_RejectsInvalidParams() public {
        vm.prank(alice);
        vm.expectRevert(BastionVault.InvalidGoal.selector);
        vault.createGoal("", 100 ether, 30);

        vm.prank(alice);
        vm.expectRevert(BastionVault.InvalidGoal.selector);
        vault.createGoal("Zero Target", 0, 30);
    }

    // ────────────────────────── fuzz & invariants ──────────────────────────

    function testFuzz_DepositsTransfersAndRedemptionsStaySolvent(uint96 a1, uint96 a2, uint96 xfer) public {
        a1 = uint96(bound(a1, 1 ether, 50_000 ether));
        a2 = uint96(bound(a2, 1 ether, 50_000 ether));
        xfer = uint96(bound(xfer, 1, a1));

        _deposit(alice, a1);
        _deposit(bob, a2);

        _simulateLiquidationAndHarvest(0, 0.000125 ether);

        vm.prank(alice);
        assertTrue(receipt.transfer(bob, xfer));

        assertEq(receipt.totalSupply(), vault.totalShares(), "receipt supply == totalShares");
        assertGe(vault.totalAssets(), vault.totalShares(), "assets >= shares");

        vm.prank(bob);
        vault.withdraw(xfer);

        assertEq(receipt.totalSupply(), vault.totalShares(), "receipt supply == totalShares after redeem");
        assertGe(vault.totalAssets(), vault.totalShares(), "assets >= shares after redeem");
    }
}
