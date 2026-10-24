// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {BastionVault} from "../src/BastionVault.sol";
import {MockMUSD} from "../src/MockMUSD.sol";

/// @notice Deploys the Bastion vault.
/// @dev    On Mezo Testnet the vault uses the canonical MUSD contract. On any other
///         chain (a local anvil) it deploys a mock MUSD so the flow can be rehearsed.
///
///         Usage:
///           forge script script/DeployBastion.s.sol --rpc-url $RPC_URL \
///             --private-key $PRIVATE_KEY --broadcast
contract DeployBastion is Script {
    uint256 public constant MEZO_CHAIN_ID = 31611;
    address public constant MEZO_MUSD = 0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503;

    function run() external returns (BastionVault vault, address musd) {
        uint256 pk = vm.envOr("PRIVATE_KEY", uint256(0));
        if (pk != 0) {
            vm.startBroadcast(pk);
        } else {
            vm.startBroadcast();
        }

        musd = vm.envOr("MUSD_ADDRESS", address(0));
        if (musd == address(0)) {
            if (block.chainid == MEZO_CHAIN_ID && MEZO_MUSD.code.length > 0) {
                musd = MEZO_MUSD;
            } else {
                musd = address(new MockMUSD());
            }
        }

        vault = new BastionVault(MockMUSD(payable(musd)));

        vm.stopBroadcast();

        console.log("----------------------------------------------------------");
        console.log("Bastion deployed");
        console.log("----------------------------------------------------------");
        console.log("BastionVault :", address(vault));
        console.log("Receipt      :", address(vault.receipt()));
        console.log("Achievements :", address(vault.achievements()));
        console.log("MUSD         :", musd);
        console.log("Owner        :", vault.owner());
        console.log("Chain id     :", block.chainid);
        console.log("----------------------------------------------------------");
    }
}
