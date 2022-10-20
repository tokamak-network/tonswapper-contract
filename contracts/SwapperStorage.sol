//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.1;

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";
import "./interfaces/IWETH.sol";

contract SwapperStorage  {

    address public wton;            //decimal = 27 (RAY)
    address public ton;             //decimal = 18 (WAD)
    address public tos;             //decimal = 18 (WAD)

    IWETH public _WETH;

    uint24 public constant poolFee = 3000;

    ISwapRouter public uniswapRouter;

    IQuoter v3Quoter = IQuoter(0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6);     //mainnet

}