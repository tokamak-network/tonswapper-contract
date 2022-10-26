// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { OnApprove } from "./interfaces/OnApprove.sol";

import "./libraries/Path.sol";

import "./interfaces/IWTON.sol";
import "./interfaces/ISwapperV2.sol";
import "./interfaces/ISwapperV2Event.sol";

import "./SwapperStorage.sol";

import "hardhat/console.sol";

contract SwapperV2 is
    SwapperStorage,
    ISwapperV2,
    ISwapperV2Event
{
    using Path for bytes;
    using SafeERC20 for IERC20;
    using BytesLib for bytes;

    /* approveAndCall function */

    function onApprove(
        address sender,
        address spender,
        uint256 transferAmount,
        bytes calldata data
    ) external returns (bool) {
        require(msg.sender == address(ton) || msg.sender == address(wton),
        "sender is not ton or wton.") ;

        uint256 len = data.length;
        require(len >= 163, "data.length need the 163 over");
        bool outputUnwrapTONbool = (data.toUint8(len-1) == 0?false:true);
        bool inputWrapWTONbool = (data.toUint8(len-2) == 0?false:true);
        bool wrapEthbool = (data.toUint8(len-3) == 0?false:true);
        bytes memory paramsData = data.slice(1, len-3);
        uint256 paramsDataLen = paramsData.length;

        if (data.toUint8(0) > 0) {
            ISwapRouter.ExactOutputParams memory param =
                ISwapRouter.ExactOutputParams({
                    path: paramsData.slice(0, paramsDataLen-116-1),
                    recipient: paramsData.toAddress(paramsDataLen-116-1),
                    deadline: block.timestamp,
                    amountOut: paramsData.toUint256(paramsDataLen-64-1),
                    amountInMaximum: paramsData.toUint256(paramsDataLen-32-1)
                });

            _exactOutput(sender, param, wrapEthbool, inputWrapWTONbool, outputUnwrapTONbool);

        } else {
            ISwapRouter.ExactInputParams memory param =
                ISwapRouter.ExactInputParams({
                    path: paramsData.slice(0, paramsDataLen-116-1),
                    recipient: paramsData.toAddress(paramsDataLen-116-1),
                    deadline: block.timestamp,
                    amountIn: paramsData.toUint256(paramsDataLen-64-1),
                    amountOutMinimum: paramsData.toUint256(paramsDataLen-32-1)
                });

            _exactInput(sender, param, wrapEthbool, inputWrapWTONbool, outputUnwrapTONbool);
        }

        return true;
    }

    /* external function */

    /// @inheritdoc ISwapperV2
    function exactInput(
        ISwapRouter.ExactInputParams memory params,
        bool _wrapEth,
        bool _inputWrapWTON,
        bool _outputUnwrapTON
    )
        external
        payable
        override
        returns (uint256 amountOut)
    {
        return _exactInput(
            msg.sender,
            params,
            _wrapEth,
            _inputWrapWTON,
            _outputUnwrapTON
        );
    }

    /// @inheritdoc ISwapperV2
    function exactOutput(
        ISwapRouter.ExactOutputParams memory params,
        bool _wrapEth,
        bool _inputWrapWTON,
        bool _outputUnwrapTON
    )
        external
        payable
        override
        returns (uint256 amountIn)
    {
        return _exactOutput(
            msg.sender,
            params,
            _wrapEth,
            _inputWrapWTON,
            _outputUnwrapTON
        );
    }

    /* internal function */

    function _needapprove(
        uint256 _amount
    )
        internal
    {
        if(IERC20(ton).allowance(address(this), wton) < _amount) {
            IERC20(ton).approve(
                wton,
                type(uint256).max
            );
        }
    }

    function _exactInit(
        address sender,
        bytes memory path,
        uint256 amountIn,
        bool _wrapEth,
        bool _inputWrapWTON,
        bool _outputUnwrapTON,
        bool _reversePath
    )
        internal
        returns (uint256 numPools, address tokenIn, address tokenOut, address lastTokenOut, uint24 fee)
    {

        numPools = Path.numPools(path);
        require(numPools > 0, "wrong path");
        // address tokenOut;
        if (_reversePath) {
            (tokenOut, tokenIn, fee) = decodeLastPool(path);
            (lastTokenOut,,) = Path.decodeFirstPool(path);
        } else {
            (tokenIn, tokenOut, fee) = Path.decodeFirstPool(path);
            (,lastTokenOut,) = decodeLastPool(path);
        }

        require(tokenIn != tokenOut, "same tokenIn , tokenOut");

        if (_wrapEth) require(tokenIn == address(_WETH), "tokenIn is not WETH");
        if (_inputWrapWTON) require(tokenIn == address(wton), "tokenIn is not WTON");

        if (_outputUnwrapTON && numPools == 1) {
            require(tokenOut == address(wton), "tokenOut is not WTON");
        } else if (_outputUnwrapTON) {
            require(lastTokenOut == address(wton), "tokenOut is not WTON");
        }

        if (_wrapEth) {
            require(msg.value == amountIn, "wrong msg.value");
            _WETH.deposit{value: amountIn}();
        } else {
            require(msg.value == 0, "msg.value should be 0");

            if (_inputWrapWTON) {
                uint256 tonAmount = amountIn / 1e9;
                _needapprove(tonAmount);

                IERC20(ton).safeTransferFrom(sender, address(this), tonAmount);
                require(IWTON(wton).swapFromTON(tonAmount),"wton swapFromTON fail");
            } else {
                IERC20(tokenIn).safeTransferFrom(sender, address(this), amountIn);
            }
        }
    }    

    function _exactInput(
        address sender,
        ISwapRouter.ExactInputParams memory params,
        bool _wrapEth,
        bool _inputWrapWTON,
        bool _outputUnwrapTON
    )
        internal
        returns (uint256 amountOut)
    {
        require(params.recipient == sender, "recipient is not sender");

        (uint256 numPools, address tokenIn, address tokenOut, address lastTokenOut, uint24 fee) = _exactInit(
            sender,
            params.path,
            params.amountIn,
            _wrapEth,
            _inputWrapWTON,
            _outputUnwrapTON,
            false
            );

        address recipient = params.recipient;
        if (_outputUnwrapTON) recipient = address(this);

        IERC20(tokenIn).approve(address(uniswapRouter), params.amountIn);

        if (numPools == 1) {
            ISwapRouter.ExactInputSingleParams memory param =
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    fee: fee,
                    recipient: recipient,
                    deadline: block.timestamp + 12,
                    amountIn: params.amountIn,
                    amountOutMinimum: params.amountOutMinimum,
                    sqrtPriceLimitX96: 0
                });

            amountOut = ISwapRouter(uniswapRouter).exactInputSingle(param);
        } else {
            params.recipient = recipient;
            params.deadline = block.timestamp + 12;
            amountOut = ISwapRouter(uniswapRouter).exactInput(params);
        }

        if (_outputUnwrapTON) IWTON(wton).swapToTONAndTransfer(sender, amountOut);

        emit exactInputEvent(
            recipient,
            tokenIn,
            lastTokenOut,
            params.amountIn,
            amountOut
        );
    }


    function _exactOutput(
        address sender,
        ISwapRouter.ExactOutputParams memory params,
        bool _wrapEth,
        bool _inputWrapWTON,
        bool _outputUnwrapTON
    )
        internal
        returns (uint256 amountIn)
    {
        require(params.recipient == sender, "recipient is not sender");

        (uint256 numPools, address tokenIn, address tokenOut, address lastTokenOut, uint24 fee) = _exactInit(
            sender,
            params.path,
            params.amountInMaximum,
            _wrapEth,
            _inputWrapWTON,
            _outputUnwrapTON,
            true
        );

        address recipient = params.recipient;
        if (_outputUnwrapTON) recipient = address(this);

        if (IERC20(tokenIn).allowance(address(this), address(uniswapRouter)) < params.amountInMaximum ){
            IERC20(tokenIn).approve(address(uniswapRouter), params.amountInMaximum);
        }

        if (numPools == 1) {
            if (_inputWrapWTON) params.amountInMaximum = (params.amountInMaximum / 1e9) * 1e9;
            ISwapRouter.ExactOutputSingleParams memory param =
                ISwapRouter.ExactOutputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    fee: fee,
                    recipient: recipient,
                    deadline: block.timestamp,
                    amountOut: params.amountOut,
                    amountInMaximum: params.amountInMaximum,
                    sqrtPriceLimitX96: 0
                });

            amountIn = ISwapRouter(uniswapRouter).exactOutputSingle(param);

        } else {
            params.path = params.path;
            params.recipient = recipient;
            params.deadline = block.timestamp + 12;
            amountIn = ISwapRouter(uniswapRouter).exactOutput(params);
        }

        if (_outputUnwrapTON) IWTON(wton).swapToTONAndTransfer(sender, params.amountOut);
        uint256 refund;
        uint256 amountOut1 = params.amountOut;
        sender = sender;
        if (amountIn < params.amountInMaximum) {
            refund = params.amountInMaximum - amountIn;
            IERC20(tokenIn).transfer(sender, refund);
        }

        emit exactOutputEvent(
            sender,
            tokenIn,
            lastTokenOut,
            amountIn,
            amountOut1,
            refund
        );
    }

    /* pure function */

    /// @inheritdoc ISwapperV2
    function decodeLastPool(bytes memory path)
        public
        pure
        override
        returns (
            address tokenA,
            address tokenB,
            uint24 fee
        )
    {
        uint256 ONE_PATH_SIZE = 43;
        bytes memory data = path.slice(path.length-ONE_PATH_SIZE, ONE_PATH_SIZE);
        tokenA = data.toAddress(0);
        fee = data.toUint24(20);
        tokenB = data.toAddress(23);
    }

}