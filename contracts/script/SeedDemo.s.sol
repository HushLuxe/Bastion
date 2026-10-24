// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {BastionVault} from "../src/BastionVault.sol";
import {IERC20} from "../src/IERC20.sol";

/// @notice Prepares a deployed Bastion vault for the demo:
///         - funds the yield buffer so accrued yield can actually be paid
///         - sets the demo yield rate
///         - makes a demo deposit so achievements unlock on camera
///
///         Usage:
///           ANNEX_ADDRESS=0x... forge script script/SeedDemo.s.sol --rpc-url $RPC_URL \
///             --private-key $PRIVATE_KEY --broadcast
contract SeedDemo is Script {
    function run() external returns (uint256 shares) {
        address vaultAddr = vm.envAddress("BASTION_ADDRESS");
        uint256 bufferAmount = vm.envOr("BUFFER_AMOUNT", uint256(40 ether));
        uint256 depositAmount = vm.envOr("DEPOSIT_AMOUNT", uint256(120 ether));
        uint256 rate = vm.envOr("RATE_PER_SECOND", uint256(1e14)); // 0.01% per second

        uint256 pk = vm.envOr("PRIVATE_KEY", uint256(0));
        if (pk != 0) {
            vm.startBroadcast(pk);
        } else {
            vm.startBroadcast();
        }

        BastionVault vault = BastionVault(vaultAddr);
        IERC20 musd = vault.asset();

        // approve the vault for the buffer and the demo deposit
        musd.approve(vaultAddr, type(uint256).max);

        vault.setRate(rate);
        vault.fundYield(bufferAmount);
        shares = vault.deposit(depositAmount);

        vm.stopBroadcast();

        console.log("----------------------------------------------------------");
        console.log("Bastion demo state");
        console.log("----------------------------------------------------------");
        console.log("Vault        :", vaultAddr);
        console.log("Buffer funded:", bufferAmount);
        console.log("Rate / second:", rate);
        console.log("Deposit      :", depositAmount);
        console.log("Shares       :", shares);
        console.log("Badges minted:", vault.achievements().balanceOf(vault.owner()));
        console.log("----------------------------------------------------------");
    }
}
