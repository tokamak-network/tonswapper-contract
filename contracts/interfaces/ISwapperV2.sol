// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

interface ISwapperV2 {

    function exactInput(
        ISwapRouter.ExactInputParams memory params,
        bool _wrapEth,
        bool _inputWrapWTON,
        bool _outputUnwrapTON
    )
        external
        payable
        returns (uint256 amountOut);

    function exactOutput(
        ISwapRouter.ExactOutputParams memory params,
        bool _wrapEth,
        bool _inputWrapWTON,
        bool _outputUnwrapTON
    )
        external
        payable
        returns (uint256 amountIn);


    function decodeLastPool(bytes memory path)
        external
        pure
        returns (
            address tokenA,
            address tokenB,
            uint24 fee
        );
}