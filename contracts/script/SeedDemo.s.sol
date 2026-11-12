// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {BastionVault} from "../src/BastionVault.sol";
import {IERC20} from "../src/IERC20.sol";

/// @notice Seeds an initial savings goal and MUSD deposit into BastionVault on Mezo Testnet.
///
///         Usage:
///           BASTION_ADDRESS=0x... forge script script/SeedDemo.s.sol --rpc-url $RPC_URL \
///             --private-key $PRIVATE_KEY --broadcast
contract SeedDemo is Script {
    function run() external returns (uint256 goalId, uint256 shares) {
        address vaultAddr = vm.envAddress("BASTION_ADDRESS");
        uint256 targetAmount = vm.envOr("GOAL_TARGET", uint256(40 ether));
        uint256 durationDays = vm.envOr("GOAL_DAYS", uint256(30));
        uint256 depositAmount = vm.envOr("DEPOSIT_AMOUNT", uint256(20 ether));

        uint256 pk = vm.envOr("PRIVATE_KEY", uint256(0));
        if (pk != 0) {
            vm.startBroadcast(pk);
        } else {
            vm.startBroadcast();
        }

        BastionVault vault = BastionVault(payable(vaultAddr));
        IERC20 musd = vault.asset();

        musd.approve(vaultAddr, depositAmount);
        goalId = vault.createGoal("Bitcoin Reserve", targetAmount, durationDays);
        shares = vault.depositToGoal(goalId, depositAmount);

        vm.stopBroadcast();

        console.log("----------------------------------------------------------");
        console.log("Bastion goal & deposit seeded");
        console.log("----------------------------------------------------------");
        console.log("Vault           :", vaultAddr);
        console.log("Goal ID         :", goalId);
        console.log("Deposit         :", depositAmount);
        console.log("Shares (bMUSD)  :", shares);
        console.log("SP Deposit      :", vault.stabilityPoolDeposit());
        console.log("----------------------------------------------------------");
    }
}
