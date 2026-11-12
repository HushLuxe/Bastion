// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "../../src/IERC20.sol";
import {IMezoRouter, IStabilityPool} from "../../src/interfaces/IMezo.sol";
import {MockMUSD} from "../../src/MockMUSD.sol";

/// @notice Local mock for Mezo's BTCCaller ERC-20 precompile wrapper (0x7b7C...).
contract MockBTCCaller is IERC20 {
    string public constant name = "Bitcoin";
    string public constant symbol = "BTC";
    uint8 public constant decimals = 18;

    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => uint256) public spent;

    function totalSupply() external pure returns (uint256) {
        return 21_000_000 ether;
    }

    function balanceOf(address account) external view returns (uint256) {
        return account.balance > spent[account] ? account.balance - spent[account] : 0;
    }

    function transfer(address, uint256) external pure returns (bool) {
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= value, "MockBTC: insufficient allowance");
            allowance[from][msg.sender] = allowed - value;
        }
        require(from.balance - spent[from] >= value, "MockBTC: insufficient balance");
        spent[from] += value;
        return true;
    }
}

/// @notice Local mock for Mezo StabilityPool (0x1CCA7E410eE41739792eA0A24e00349Dd247680e).
contract MockStabilityPool is IStabilityPool {
    IERC20 public immutable musd;

    mapping(address => uint256) public deposits;
    mapping(address => uint256) public compounded;
    mapping(address => uint256) public collateralGains;
    uint256 public totalDeposits;
    uint256 public totalCollateral;
    bool public blockWithdrawals;

    constructor(IERC20 musd_) {
        musd = musd_;
    }

    receive() external payable {
        totalCollateral += msg.value;
    }

    function setBlockWithdrawals(bool blocked) external {
        blockWithdrawals = blocked;
    }

    function simulateLiquidation(address depositor, uint256 musdOffset, uint256 btcGain) external payable {
        require(msg.value == btcGain, "MockSP: msg.value != btcGain");
        require(compounded[depositor] >= musdOffset, "MockSP: offset > deposit");
        compounded[depositor] -= musdOffset;
        totalDeposits -= musdOffset;
        collateralGains[depositor] += btcGain;
        totalCollateral += btcGain;
    }

    function provideToSP(uint256 _amount) external {
        require(_amount > 0, "MockSP: zero amount");
        require(musd.transferFrom(msg.sender, address(this), _amount), "MockSP: transferFrom failed");

        uint256 gain = collateralGains[msg.sender];
        if (gain > 0) {
            collateralGains[msg.sender] = 0;
            totalCollateral -= gain;
            (bool ok,) = payable(msg.sender).call{value: gain}("");
            require(ok, "MockSP: btc send failed");
        }

        compounded[msg.sender] += _amount;
        deposits[msg.sender] = compounded[msg.sender];
        totalDeposits += _amount;
    }

    function withdrawFromSP(uint256 _amount) external {
        if (_amount > 0) {
            require(!blockWithdrawals, "MockSP: undercollateralized troves");
        }
        uint256 current = compounded[msg.sender];
        uint256 toWithdraw = _amount > current ? current : _amount;
        if (toWithdraw > 0) {
            compounded[msg.sender] = current - toWithdraw;
            deposits[msg.sender] = compounded[msg.sender];
            totalDeposits -= toWithdraw;
            require(musd.transfer(msg.sender, toWithdraw), "MockSP: musd transfer failed");
        }

        uint256 gain = collateralGains[msg.sender];
        if (gain > 0) {
            collateralGains[msg.sender] = 0;
            totalCollateral -= gain;
            (bool ok,) = payable(msg.sender).call{value: gain}("");
            require(ok, "MockSP: btc send failed");
        }
    }

    function getCompoundedMUSDDeposit(address _depositor) external view returns (uint256) {
        return compounded[_depositor];
    }

    function getDepositorCollateralGain(address _depositor) external view returns (uint256) {
        return collateralGains[_depositor];
    }

    function getTotalMUSDDeposits() external view returns (uint256) {
        return totalDeposits;
    }

    function getCollateralBalance() external view returns (uint256) {
        return totalCollateral;
    }
}

/// @notice Local mock for Mezo Pools Router (0x9a1ff7FE3a0F69959A3fBa1F1e5ee18e1A9CD7E9).
contract MockMezoRouter is IMezoRouter {
    MockMUSD public immutable musd;
    IERC20 public immutable btcToken;
    uint256 public musdPerBtc = 80_000 ether; // 1 BTC = 80,000 MUSD

    constructor(MockMUSD musd_, IERC20 btcToken_) {
        musd = musd_;
        btcToken = btcToken_;
    }

    function setPrice(uint256 musdPerBtc_) external {
        musdPerBtc = musdPerBtc_;
    }

    function getAmountsOut(uint256 amountIn, Route[] calldata) external view returns (uint256[] memory amounts) {
        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = (amountIn * musdPerBtc) / 1e18;
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        Route[] calldata routes,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(block.timestamp <= deadline, "MockRouter: expired");
        require(
            routes.length == 1 && routes[0].from == address(btcToken) && routes[0].to == address(musd),
            "MockRouter: bad route"
        );
        require(btcToken.transferFrom(msg.sender, address(this), amountIn), "MockRouter: pull btc failed");

        uint256 out = (amountIn * musdPerBtc) / 1e18;
        require(out >= amountOutMin, "MockRouter: slippage");
        musd.mint(to, out);

        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = out;
    }
}
