// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {BastionVault} from "../src/BastionVault.sol";
import {BastionReceipt} from "../src/BastionReceipt.sol";
import {BastionAchievements} from "../src/BastionAchievements.sol";
import {IERC20} from "../src/IERC20.sol";
import {IMezoRouter, IStabilityPool} from "../src/interfaces/IMezo.sol";

/// @notice Deploys BastionReceipt, BastionAchievements, and BastionVault wired to
///         Mezo Testnet's canonical MUSD, StabilityPool, and Pools Router.
contract DeployBastion is Script {
    uint256 public constant MEZO_CHAIN_ID = 31611;

    // Verified canonical Mezo Testnet addresses
    address public constant MEZO_MUSD = 0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503;
    address public constant MEZO_BTC_TOKEN = 0x7b7C000000000000000000000000000000000000;
    address public constant MEZO_STABILITY_POOL = 0x1CCA7E410eE41739792eA0A24e00349Dd247680e;
    address public constant MEZO_ROUTER = 0x9a1ff7FE3a0F69959A3fBa1F1e5ee18e1A9CD7E9;
    address public constant MEZO_POOL_FACTORY = 0x4947243CC818b627A5D06d14C4eCe7398A23Ce1A;

    uint256 public constant DEFAULT_PROTOCOL_FEE_BPS = 1000; // 10% of realized yield

    function run() external returns (BastionVault vault, BastionReceipt receipt, BastionAchievements achievements) {
        uint256 pk = vm.envOr("PRIVATE_KEY", uint256(0));
        address deployer = pk != 0 ? vm.addr(pk) : msg.sender;
        address treasury = vm.envOr("TREASURY_ADDRESS", deployer);
        uint256 feeBps = vm.envOr("PROTOCOL_FEE_BPS", DEFAULT_PROTOCOL_FEE_BPS);

        if (pk != 0) {
            vm.startBroadcast(pk);
        } else {
            vm.startBroadcast();
        }

        address musd = vm.envOr("MUSD_ADDRESS", address(0));
        if (musd == address(0)) {
            require(block.chainid == MEZO_CHAIN_ID && MEZO_MUSD.code.length > 0, "DeployBastion: missing MUSD");
            musd = MEZO_MUSD;
        }

        receipt = new BastionReceipt();
        achievements = new BastionAchievements();
        vault = new BastionVault(
            IERC20(musd),
            IERC20(MEZO_BTC_TOKEN),
            IStabilityPool(MEZO_STABILITY_POOL),
            IMezoRouter(MEZO_ROUTER),
            MEZO_POOL_FACTORY,
            treasury,
            feeBps,
            receipt,
            achievements
        );
        receipt.setVault(address(vault));
        achievements.setVault(address(vault));

        vm.stopBroadcast();

        console.log("----------------------------------------------------------");
        console.log("Bastion Wave 2 deployed");
        console.log("----------------------------------------------------------");
        console.log("BastionVault        :", address(vault));
        console.log("BastionReceipt      :", address(receipt));
        console.log("BastionAchievements :", address(achievements));
        console.log("MUSD                :", musd);
        console.log("StabilityPool       :", MEZO_STABILITY_POOL);
        console.log("Router              :", MEZO_ROUTER);
        console.log("Treasury            :", treasury);
        console.log("Protocol Fee (bps)  :", feeBps);
        console.log("Owner               :", vault.owner());
        console.log("Chain id            :", block.chainid);
        console.log("----------------------------------------------------------");
    }
}
