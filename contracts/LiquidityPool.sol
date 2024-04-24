// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LiquidityPool is Ownable {
    using SafeERC20 for IERC20;

    // Mapping of token addresses to mapping of account balances (for each token)
    mapping(IERC20 => mapping(address => uint256)) public liquidity;

    // Mapping to track the reserves for each token in the pool
    mapping(IERC20 => uint256) public reserves;

    // Events for tracking liquidity and trades
    event LiquidityAdded(address indexed provider, IERC20 token, uint256 amount);
    event LiquidityRemoved(address indexed provider, IERC20 token, uint256 amount);
    event TokensSwapped(address indexed user, IERC20 inputToken, IERC20 outputToken, uint256 inputAmount, uint256 outputAmount);

    constructor() Ownable(msg.sender) {}

    function addLiquidity(IERC20 token, uint256 amount) public {
        token.safeTransferFrom(msg.sender, address(this), amount);
        liquidity[token][msg.sender] += amount;
        reserves[token] += amount;
        emit LiquidityAdded(msg.sender, token, amount);
    }

    function removeLiquidity(IERC20 token, uint256 amount) public {
        require(liquidity[token][msg.sender] >= amount, "Insufficient liquidity");
        liquidity[token][msg.sender] -= amount;
        reserves[token] -= amount;
        token.safeTransfer(msg.sender, amount);
        emit LiquidityRemoved(msg.sender, token, amount);
    }

    function swapTokens(IERC20 inputToken, IERC20 outputToken, uint256 inputAmount) public {
        require(address(inputToken) != address(outputToken), "Input and output tokens must be different");
        uint256 inputReserve = reserves[inputToken];
        uint256 outputReserve = reserves[outputToken];
        
        require(inputReserve > 0 && outputReserve > 0, "Insufficient reserves");

        inputToken.safeTransferFrom(msg.sender, address(this), inputAmount);
        uint256 outputAmount = getOutputAmount(inputAmount, inputReserve, outputReserve);

        // Update reserves after the swap
        reserves[inputToken] += inputAmount;
        reserves[outputToken] -= outputAmount;

        outputToken.safeTransfer(msg.sender, outputAmount);
        emit TokensSwapped(msg.sender, inputToken, outputToken, inputAmount, outputAmount);
    }

    // Pricing logic using the constant product formula (x * y = k)
    function getOutputAmount(uint256 inputAmount, uint256 inputReserve, uint256 outputReserve) private pure returns (uint256) {
        require(inputAmount > 0, "Input amount must be greater than zero");
        uint256 inputAmountWithFee = inputAmount * 997; // applying a 0.3% fee
        uint256 numerator = inputAmountWithFee * outputReserve;
        uint256 denominator = (inputReserve * 1000) + inputAmountWithFee;
        return numerator / denominator;
    }

    // Allows the owner to withdraw any token from the contract (emergency use)
    function withdrawTokens(IERC20 token, uint256 amount) public onlyOwner {
        require(reserves[token] >= amount, "Insufficient balance in reserves");
        reserves[token] -= amount;
        token.safeTransfer(msg.sender, amount);
    }
}