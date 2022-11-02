//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.1;

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";
import "./interfaces/IWETH.sol";

contract SwapperStorage  {

    address public wton;            //decimal = 27 (RAY)
    address public ton;             //decimal = 18 (WAD)
    address public tos;             //decimal = 18 (WAD)

    uint256 internal free = 1;

    IWETH public _WETH;
    
    ISwapRouter public uniswapRouter;

    /// @dev Check if a function is used or not
    modifier ifFree {
        require(free == 1, "LockId is already in use");
        free = 0;
        _;
        free = 1;
    }
}