// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Minimal interface for Mezo's canonical StabilityPool proxy (0x1CCA7E410eE41739792eA0A24e00349Dd247680e).
interface IStabilityPool {
    function provideToSP(uint256 _amount) external;
    function withdrawFromSP(uint256 _amount) external;
    function getCompoundedMUSDDeposit(address _depositor) external view returns (uint256);
    function getDepositorCollateralGain(address _depositor) external view returns (uint256);
    function getTotalMUSDDeposits() external view returns (uint256);
    function getCollateralBalance() external view returns (uint256);
    function deposits(address _depositor) external view returns (uint256);
}

/// @notice Minimal interface for Mezo Pools Router (0x9a1ff7FE3a0F69959A3fBa1F1e5ee18e1A9CD7E9).
interface IMezoRouter {
    struct Route {
        address from;
        address to;
        bool stable;
        address factory;
    }

    function getAmountsOut(uint256 amountIn, Route[] calldata routes) external view returns (uint256[] memory amounts);

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        Route[] calldata routes,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

/// @notice Hook called by BastionReceipt before balance changes on transfer.
interface IBastionShareHook {
    function onShareTransfer(address from, address to, uint256 value) external;
}
