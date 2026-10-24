// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {BastionVault} from "../src/BastionVault.sol";
import {BastionReceipt} from "../src/BastionReceipt.sol";
import {BastionAchievements} from "../src/BastionAchievements.sol";
import {MockMUSD} from "../src/MockMUSD.sol";

contract BastionVaultTest is Test {
    BastionVault internal vault;
    BastionReceipt internal receipt;
    BastionAchievements internal achievements;
    MockMUSD internal musd;

    address internal owner;
    address internal alice;
    address internal bob;

    uint256 internal constant WAD = 1e18;

    function setUp() public {
        owner = makeAddr("owner");
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        musd = new MockMUSD();
        vault = new BastionVault(musd);
        receipt = vault.receipt();
        achievements = vault.achievements();

        _fund(alice, 1_000_000 ether);
        _fund(bob, 1_000_000 ether);
        _fund(owner, 1_000_000 ether);

        // the test contract deploys the vault, so hand ownership to the owner account
        vault.transferOwnership(owner);
    }

    // ────────────────────────── helpers ──────────────────────────

    function _fund(address who, uint256 amount) internal {
        musd.mint(who, amount);
        vm.prank(who);
        musd.approve(address(vault), type(uint256).max);
    }

    function _deposit(address who, uint256 amount) internal {
        vm.prank(who);
        vault.deposit(amount);
    }

    function _debt() internal view returns (uint256) {
        return vault.totalAssets() - vault.yieldBuffer();
    }

    /// @dev Sum of every depositor's shares must equal the receipt's supply.
    function _sumShares(address[] memory users) internal view returns (uint256 total) {
        for (uint256 i = 0; i < users.length; i++) {
            total += vault.sharesOf(users[i]);
        }
    }

    // ────────────────────────── deposit ──────────────────────────

    function test_Deposit_MintsReceiptAndUpdatesState() public {
        _deposit(alice, 100 ether);

        assertEq(receipt.balanceOf(alice), 100 ether, "receipt minted 1:1");
        assertEq(receipt.totalSupply(), 100 ether, "receipt supply");
        assertEq(vault.sharesOf(alice), 100 ether, "shares");
        assertEq(vault.depositedTotalOf(alice), 100 ether, "lifetime deposits");
        assertEq(vault.depositCountOf(alice), 1, "deposit count");
        assertEq(vault.firstDepositAtOf(alice), block.timestamp, "first deposit timestamp");
        assertEq(musd.balanceOf(address(vault)), 100 ether, "vault holds the deposit");
        assertEq(vault.totalShares(), 100 ether, "total shares");
    }

    function test_Deposit_RevertsOnZero() public {
        vm.prank(alice);
        vm.expectRevert(BastionVault.ZeroAmount.selector);
        vault.deposit(0);
    }

    function test_Deposit_RevertsWhenPaused() public {
        vm.prank(owner);
        vault.setPaused(true);

        vm.prank(alice);
        vm.expectRevert(BastionVault.VaultPaused.selector);
        vault.deposit(1 ether);
    }

    function test_Deposit_RevertsWithoutAllowance() public {
        vm.prank(bob);
        musd.approve(address(vault), 0);

        vm.prank(bob);
        vm.expectRevert();
        vault.deposit(10 ether);
    }

    // ────────────────────────── withdraw ──────────────────────────

    function test_Withdraw_ReturnsPrincipalWhenNoYieldAccrued() public {
        _deposit(alice, 100 ether);

        vm.prank(alice);
        (uint256 principal, uint256 yieldPaid) = vault.withdraw(40 ether);

        assertEq(principal, 40 ether, "principal returned");
        assertEq(yieldPaid, 0, "no yield yet");
        assertEq(receipt.balanceOf(alice), 60 ether, "receipt burned");
        assertEq(vault.sharesOf(alice), 60 ether, "shares reduced");
        assertEq(musd.balanceOf(alice), 1_000_000 ether - 100 ether + 40 ether, "MUSD returned");
    }

    function test_Withdraw_All() public {
        _deposit(alice, 100 ether);

        vm.prank(alice);
        (uint256 principal,) = vault.withdrawAll();

        assertEq(principal, 100 ether, "all principal out");
        assertEq(receipt.balanceOf(alice), 0, "no receipt left");
        assertEq(vault.totalShares(), 0, "no shares left");
    }

    function test_Withdraw_RevertsWithoutShares() public {
        vm.prank(alice);
        vm.expectRevert(BastionVault.InsufficientShares.selector);
        vault.withdraw(1 ether);
    }

    function test_Withdraw_RevertsAboveBalance() public {
        _deposit(alice, 10 ether);

        vm.prank(alice);
        vm.expectRevert(BastionVault.InsufficientShares.selector);
        vault.withdraw(11 ether);
    }

    // ────────────────────────── yield ──────────────────────────

    function test_Yield_AccruesOverTime() public {
        vm.prank(owner);
        vault.setRate(1e14); // 0.01% per second
        vm.prank(owner);
        vault.fundYield(50 ether);

        _deposit(alice, 100 ether);

        skip(1000);
        vm.prank(alice);
        vault.claimYield();

        // 1000 seconds at 0.01%/s on 100 MUSD = 10 MUSD
        assertApproxEqAbs(vault.yieldEarnedOf(alice), 10 ether, 1e12, "yield accrued");
        assertEq(musd.balanceOf(alice), 1_000_000 ether - 100 ether + vault.yieldEarnedOf(alice), "yield paid in MUSD");
    }

    function test_Yield_IsPaidFromTheBufferNotPrincipal() public {
        vm.prank(owner);
        vault.setRate(1e14);
        vm.prank(owner);
        vault.fundYield(50 ether);

        _deposit(alice, 100 ether);

        skip(10_000);
        vm.prank(alice);
        vault.withdrawAll();

        // yield paid is capped by the buffer, principal is always fully returned
        assertEq(vault.sharesOf(alice), 0, "no shares");
        // principal comes back in full, yield is capped at the funded buffer
        assertApproxEqAbs(musd.balanceOf(alice), 1_000_000 ether + 50 ether, 1e12, "capped at buffer");
        assertEq(vault.totalShares(), 0, "no principal left");
        assertGe(vault.totalAssets(), vault.totalShares(), "assets still back principal");
        assertEq(vault.totalAssets(), 0, "nothing stranded in the vault");
    }

    function test_Yield_BufferNeverGoesNegative() public {
        vm.prank(owner);
        vault.setRate(1e14);

        _deposit(alice, 100 ether);
        skip(100_000);

        vm.prank(alice);
        vault.withdrawAll();

        assertGe(vault.totalAssets(), vault.totalShares(), "assets back principal");
    }

    function test_SetRate_OnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(BastionVault.NotOwner.selector);
        vault.setRate(1e14);
    }

    function test_FundYield_OnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(BastionVault.NotOwner.selector);
        vault.fundYield(1 ether);
    }

    // ────────────────────────── achievements ──────────────────────────

    function test_Badge_FirstDeposit() public {
        _deposit(alice, 1 ether);
        assertTrue(achievements.earned(0, alice), "first deposit badge");
        assertEq(vault.earnedBadges(alice), 1, "bitmap");
    }

    function test_Badge_Saved100() public {
        _deposit(alice, 100 ether);
        assertTrue(achievements.earned(1, alice), "saved 100 badge");
        assertFalse(achievements.earned(2, alice), "not 500 yet");
    }

    function test_Badge_Saved500() public {
        _deposit(alice, 500 ether);
        assertTrue(achievements.earned(2, alice), "saved 500 badge");
    }

    function test_Badge_Held7Days() public {
        _deposit(alice, 10 ether);
        assertFalse(achievements.earned(3, alice), "not held yet");

        skip(7 days);
        _deposit(alice, 1 ether);
        assertTrue(achievements.earned(3, alice), "held 7 days badge");
    }

    function test_Badge_Held30Days() public {
        _deposit(alice, 10 ether);
        skip(30 days);
        _deposit(alice, 1 ether);
        assertTrue(achievements.earned(4, alice), "held 30 days badge");
    }

    function test_Badge_Yield10() public {
        vm.prank(owner);
        vault.setRate(1e14);
        vm.prank(owner);
        vault.fundYield(20 ether);

        _deposit(alice, 100 ether);
        skip(20_000);
        vm.prank(alice);
        vault.claimYield();

        assertTrue(achievements.earned(5, alice), "earned 10 MUSD in yield badge");
    }

    function test_Badge_MintedOnlyOncePerType() public {
        _deposit(alice, 100 ether);
        uint256 tokenId = achievements.tokenIdByBadge(alice, 1);

        _deposit(alice, 100 ether);
        assertEq(achievements.tokenIdByBadge(alice, 1), tokenId, "same badge, no duplicate");
        assertEq(achievements.balanceOf(alice), 2, "one first-deposit + one saved-100 badge");
    }

    function test_Badge_TokenOwnedByDepositor() public {
        _deposit(alice, 100 ether);
        uint256 tokenId = achievements.tokenIdByBadge(alice, 1);
        assertEq(achievements.ownerOf(tokenId), alice, "badge owner");
        assertEq(achievements.balanceOf(alice), 2, "badges held");
    }

    function test_Badge_OnlyVaultCanMint() public {
        vm.prank(alice);
        vm.expectRevert();
        achievements.mintBadge(alice, 0);
    }

    function test_Badge_MetadataIsOnChain() public {
        _deposit(alice, 100 ether);
        uint256 tokenId = achievements.tokenIdByBadge(alice, 1);
        string memory uri = achievements.tokenURI(tokenId);
        assertGt(bytes(uri).length, 32, "uri present");
        assertTrue(keccak256(bytes(uri)) != keccak256(bytes("")), "uri not empty");
    }

    // ────────────────────────── ownership ──────────────────────────

    function test_TransferOwnership() public {
        vm.prank(owner);
        vault.transferOwnership(alice);
        assertEq(vault.owner(), alice, "owner changed");

        vm.prank(alice);
        vault.setRate(1e14);
        assertEq(vault.ratePerSecond(), 1e14, "new owner can set rate");

        vm.prank(owner);
        vm.expectRevert(BastionVault.NotOwner.selector);
        vault.setRate(1e15);
    }

    // ────────────────────────── invariants & fuzz ──────────────────────────

    function test_Invariant_SolvencyAndShareAccounting() public {
        address[] memory users = new address[](2);
        users[0] = alice;
        users[1] = bob;

        _deposit(alice, 250 ether);
        _deposit(bob, 100 ether);

        vm.prank(owner);
        vault.setRate(1e14);
        vm.prank(owner);
        vault.fundYield(30 ether);

        skip(3600);

        vm.prank(alice);
        vault.withdraw(100 ether);

        assertEq(_sumShares(users), receipt.totalSupply(), "shares match receipt supply");
        assertGe(vault.totalAssets(), vault.totalShares(), "assets back principal");
    }

    function testFuzz_DepositsAndWithdrawalsStaySolvent(uint96 amount, uint96 withdrawAmount) public {
        amount = uint96(bound(amount, 1 ether, 100_000 ether));
        withdrawAmount = uint96(bound(withdrawAmount, 0, amount));

        _deposit(alice, amount);

        if (withdrawAmount > 0) {
            vm.prank(alice);
            vault.withdraw(withdrawAmount);
        }

        assertEq(receipt.totalSupply(), vault.totalShares(), "receipt supply matches shares");
        assertGe(vault.totalAssets(), vault.totalShares(), "principal is always backed");
        assertEq(vault.sharesOf(alice), receipt.balanceOf(alice), "user shares match receipt balance");
    }

    function testFuzz_OnlyOneBadgePerTypeIsEverMinted(uint96 amount) public {
        amount = uint96(bound(amount, 1 ether, 100_000 ether));

        _deposit(alice, amount);
        _deposit(alice, amount);
        _deposit(alice, amount);

        // exactly one badge per satisfied condition, never a duplicate
        uint256 expected = 1;
        if (3 * uint256(amount) >= 100 ether) expected++;
        if (3 * uint256(amount) >= 500 ether) expected++;
        assertEq(achievements.balanceOf(alice), expected, "one badge per condition");
        assertEq(achievements.totalMinted(), expected, "no duplicate badges minted");
    }
}
