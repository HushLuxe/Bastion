// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IBastionShareHook} from "./interfaces/IMezo.sol";

/// @notice Minimal ERC-20 implementation used for the Bastion receipt token (bMUSD).
/// @dev    The receipt is a transferable claim on the vault's MUSD position. It is
///         minted 1:1 on deposit and burned on withdrawal or redemption. Transfers
///         checkpoint yield carry in the vault so transferred bMUSD remains fully
///         redeemable (including its accrued yield from the transfer timestamp).
contract BastionReceipt {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    string public constant name = "Bastion Receipt";
    string public constant symbol = "bMUSD";
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    address public immutable deployer;
    address public vault;

    modifier onlyVault() {
        require(msg.sender == vault, "BastionReceipt: caller is not the vault");
        _;
    }

    constructor() {
        deployer = msg.sender;
    }

    function setVault(address vault_) external {
        require(msg.sender == deployer, "BastionReceipt: not deployer");
        require(vault == address(0), "BastionReceipt: vault already set");
        require(vault_ != address(0), "BastionReceipt: zero vault");
        vault = vault_;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= value, "BastionReceipt: insufficient allowance");
            allowance[from][msg.sender] = allowed - value;
        }
        _transfer(from, to, value);
        return true;
    }

    function mint(address to, uint256 value) external onlyVault {
        require(to != address(0), "BastionReceipt: zero recipient");
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }

    function burn(address from, uint256 value) external onlyVault {
        require(balanceOf[from] >= value, "BastionReceipt: burn exceeds balance");
        balanceOf[from] -= value;
        totalSupply -= value;
        emit Transfer(from, address(0), value);
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0), "BastionReceipt: zero recipient");
        require(balanceOf[from] >= value, "BastionReceipt: transfer exceeds balance");

        IBastionShareHook(vault).onShareTransfer(from, to, value);

        unchecked {
            balanceOf[from] -= value;
            balanceOf[to] += value;
        }
        emit Transfer(from, to, value);
    }
}
