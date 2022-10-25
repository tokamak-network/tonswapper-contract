// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

interface ISwapperV2 {

    ///////////////////////////////////////
    /// external function
    //////////////////////////////////////
    
    /**
     * @dev
     * @param params            params is swap information (recipient, path, amountIn, minimumAmountOut)
     * @param _wrapEth          if input the ETH, _wrapEth is true
     * @param _inputWrapWTON    if input the TON, _inputWrapWTON is true
     * @param _outputUnwrapTON  if output get TON, _outputUnwrapTON is true
     */
    function exactInput(
        ISwapRouter.ExactInputParams memory params,
        bool _wrapEth,
        bool _inputWrapWTON,
        bool _outputUnwrapTON
    )
        external
        payable
        returns (uint256 amountOut);

    /**
     * @dev
     * @param params            params is swap information (recipient, path, amountInMaximum, amountOut)
     * @param _wrapEth          if input the ETH, _wrapEth is true
     * @param _inputWrapWTON    if input the TON, _inputWrapWTON is true
     * @param _outputUnwrapTON  if output get TON, _outputUnwrapTON is true
     */
    function exactOutput(
        ISwapRouter.ExactOutputParams memory params,
        bool _wrapEth,
        bool _inputWrapWTON,
        bool _outputUnwrapTON
    )
        external
        payable
        returns (uint256 amountIn);

    /**
     * @dev
     * @param path             path indicates the path of the token being swapped.
     */
    function decodeLastPool(bytes memory path)
        external
        pure
        returns (
            address tokenA,
            address tokenB,
            uint24 fee
        );
}