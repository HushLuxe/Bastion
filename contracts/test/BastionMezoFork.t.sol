// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {BastionVault} from "../src/BastionVault.sol";
import {BastionReceipt} from "../src/BastionReceipt.sol";
import {BastionAchievements} from "../src/BastionAchievements.sol";
import {IERC20} from "../src/IERC20.sol";
import {IMezoRouter, IStabilityPool} from "../src/interfaces/IMezo.sol";

/// @notice Integration test against live Mezo Testnet contracts (via --fork-url).
///         Skipped automatically when running locally without MEZO_FORK=1.
contract BastionMezoForkTest is Test {
    address constant MEZO_MUSD = 0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503;
    address constant MEZO_BTC = 0x7b7C000000000000000000000000000000000000;
    address constant MEZO_SP = 0x1CCA7E410eE41739792eA0A24e00349Dd247680e;
    address constant MEZO_ROUTER = 0x9a1ff7FE3a0F69959A3fBa1F1e5ee18e1A9CD7E9;
    address constant MEZO_FACTORY = 0x4947243CC818b627A5D06d14C4eCe7398A23Ce1A;

    // Funded Mezo Testnet address holding canonical MUSD
    address constant MUSD_HOLDER = 0x222dCAfe7bfba7Da1207BA2F3CDD7e4B42F9B672;

    function test_MezoFork_DepositIntoStabilityPoolTransferAndWithdraw() public {
        if (vm.envOr("MEZO_FORK", uint256(0)) == 0) return;

        vm.createSelectFork("https://rpc.test.mezo.org");

        // Foundry's local EVM does not emulate Mezo's native oracle precompile (0x7b7c...0015)
        // invoked by PriceFeed during StabilityPool.withdrawFromSP; stub PriceFeed with live price.
        vm.mockCall(
            0x86bCF0841622a5dAC14A313a15f96A95421b9366,
            abi.encodeWithSignature("fetchPrice()"),
            abi.encode(72_500 ether)
        );

        address treasury = makeAddr("treasury");
        address bob = makeAddr("bob");

        BastionReceipt receipt = new BastionReceipt();
        BastionAchievements achievements = new BastionAchievements();
        BastionVault vault = new BastionVault(
            IERC20(MEZO_MUSD),
            IERC20(MEZO_BTC),
            IStabilityPool(MEZO_SP),
            IMezoRouter(MEZO_ROUTER),
            MEZO_FACTORY,
            treasury,
            1000,
            receipt,
            achievements
        );
        receipt.setVault(address(vault));
        achievements.setVault(address(vault));

        uint256 depositAmt = 20 ether;
        vm.startPrank(MUSD_HOLDER);
        IERC20(MEZO_MUSD).approve(address(vault), depositAmt);
        uint256 goalId = vault.createGoal("Fork Verification Goal", 20 ether, 30);
        vault.depositToGoal(goalId, depositAmt);

        // Verify live Mezo StabilityPool received the exact MUSD deposit
        assertEq(IStabilityPool(MEZO_SP).getCompoundedMUSDDeposit(address(vault)), depositAmt, "SP deposit");
        assertEq(receipt.balanceOf(MUSD_HOLDER), depositAmt, "bMUSD minted");
        assertTrue(achievements.earned(vault.GOAL_100_VANGUARD(), MUSD_HOLDER), "vanguard badge minted");

        // Transfer 5 bMUSD to Bob and have Bob redeem real MUSD from StabilityPool
        assertTrue(receipt.transfer(bob, 5 ether), "bMUSD transfer");
        vm.stopPrank();

        uint256 bobBefore = IERC20(MEZO_MUSD).balanceOf(bob);
        vm.prank(bob);
        (uint256 bobPrincipal,) = vault.redeem(5 ether);
        assertEq(bobPrincipal, 5 ether, "Bob redeemed 5 MUSD");
        assertEq(IERC20(MEZO_MUSD).balanceOf(bob), bobBefore + 5 ether, "Bob received canonical MUSD");

        // Original depositor withdraws remaining 15 bMUSD
        vm.prank(MUSD_HOLDER);
        (uint256 holderPrincipal,) = vault.withdrawAll();
        assertEq(holderPrincipal, 15 ether, "Holder withdrew 15 MUSD");
        assertEq(IStabilityPool(MEZO_SP).getCompoundedMUSDDeposit(address(vault)), 0, "SP position exited cleanly");
    }
}
