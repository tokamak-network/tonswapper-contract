// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.0;

import "./SwapperStorage.sol";
import "./proxy/BaseProxy.sol";


contract SwapperProxy is
    SwapperStorage,
    BaseProxy
{

    function initialize(
        address _wton,
        address _ton,
        address _tos,
        address _uniswapRouter
    )
        external onlyProxyOwner
    {
        require(address(tos) == address(0), "already initialized.");
        wton = _wton;
        ton = _ton;
        tos = _tos;
        uniswapRouter = ISwapRouter(_uniswapRouter);
    }

}