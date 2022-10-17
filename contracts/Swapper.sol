// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { OnApprove } from "./interfaces/OnApprove.sol";
import "./libraries/FullMath.sol";
import "./libraries/TickMath.sol";
import "./libraries/OracleLibrary.sol";
import "./libraries/Path.sol";

import "hardhat/console.sol";
import "./interfaces/IWTON.sol";
import "./interfaces/ISwapper.sol";
import "./interfaces/ISwapperEvent.sol";

import "./SwapperStorage.sol";

//import contract
//library
//interface


interface IIUniswapV3Pool {
    function token0() external view returns (address);
    function token1() external view returns (address);

    function swap(
        address recipient,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96,
        bytes calldata data
    ) external returns (int256 amount0, int256 amount1);
}

contract Swapper is 
    SwapperStorage,
    OnApprove,
    ISwapper,
    ISwapperEvent
{
    using Path for bytes;
    using SafeERC20 for IERC20;

    /* approveAndCall function */

    function onApprove(
        address sender,
        address spender,
        uint256 transferAmount,
        bytes calldata data
    ) external override returns (bool) {

        (address minimumAmount, address selector, address getTokenAddress)= _decodeApproveData(data);
        uint256 minimumAmount1 = _decodeAddress(minimumAmount);
        uint256 selector1 = _decodeAddress(selector);

        // swap owner's TON to WTON
        if (msg.sender == address(ton)) {
            if(selector1 == 1){
                _tonToToken(sender,getTokenAddress,transferAmount,minimumAmount1,false);
            } else if (selector1 == 2) {
                _tonToTokenHopInput(sender,getTokenAddress,transferAmount,minimumAmount1,false);
            } else if (selector1 == 3) {
                _tonToTokenOutput(sender,getTokenAddress,minimumAmount1,transferAmount,false);
            } else if (selector1 == 4) {
                _tonToTokenHopOutput(sender,getTokenAddress,minimumAmount1,transferAmount,false);
            } else {
                _tonToWTON(sender,transferAmount);
            }
        } else if (msg.sender == address(wton)) {
            if(selector1 == 1){
                _tonToToken(sender,getTokenAddress,transferAmount,minimumAmount1,true);
            } else if (selector1 == 2) {
                _tonToTokenHopInput(sender,getTokenAddress,transferAmount,minimumAmount1,true);
            } else if (selector1 == 3) {
                _tonToTokenOutput(sender,getTokenAddress,minimumAmount1,transferAmount,true);
            } else if (selector1 == 4) {
                _tonToTokenHopOutput(sender,getTokenAddress,minimumAmount1,transferAmount,true);
            } else {
                _wtonToTON(sender,transferAmount);
            }
        }
        return true;
    }

    /* external function */

    /// @inheritdoc ISwapper
    function tonToWton(uint256 _amount) external override {
        _tonToWTON(msg.sender,_amount);  
    }

    /// @inheritdoc ISwapper
    function wtonToTon(uint256 _amount) external override {
        _wtonToTON(msg.sender,_amount);
    }

    /// @inheritdoc ISwapper
    function tonToToken(
        address _address,
        uint256 _amount,
        uint256 _minimumAmount,
        bool _checkWTON
    ) 
        external
        override 
    {  
        _tonToToken(msg.sender,_address,_amount,_minimumAmount,_checkWTON);
    }

    /// @inheritdoc ISwapper
    function tonToTokenExactOutput(
        address _address,
        uint256 _amountOut,
        uint256 _amountInMaximum,
        bool _checkWTON
    )
        external
        override
    {
        _tonToTokenOutput(msg.sender,_address,_amountOut,_amountInMaximum,_checkWTON);
    }

    /// @inheritdoc ISwapper
    function tokenToTon(
        address _address,
        uint256 _amount,
        uint256 _minimumAmount,
        bool _checkWTON,
        bool _wrapEth
    )
        external
        payable
        override
    {
        if (_wrapEth) {
            require(msg.value == _amount, "wrong msg.value");
            require(_address == address(_WETH), "need the wethAddress");
            _WETH.deposit{value: _amount}();
        } else {
            require(msg.value == 0, "msg.value should be 0");
            IERC20(_address).safeTransferFrom(msg.sender,address(this), _amount);
        }
        
        uint256 amountOut = _arraySwapInput(
            address(this),
            _address,
            wton,
            _amount,
            _minimumAmount,
            poolFee
        );
        
        if(_checkWTON) {
            //wton으로 바로 보내줌
            IWTON(wton).transfer(msg.sender,amountOut);
        } else {
            // wton -> ton 으로 변경과 동시에 transfer함
            IWTON(wton).swapToTONAndTransfer(msg.sender,amountOut);
        }

        emit tokenToTON(msg.sender,_address,amountOut,_amount);
    }

    /// @inheritdoc ISwapper
    function tokenToTonExactOutput(
        address _address,
        uint256 _amountOut,
        uint256 _amountInMaximum,
        bool _checkWTON,
        bool _wrapEth
    )
        external
        payable
        override
        returns (uint256 amountIn)
    {
        if (_wrapEth) {
            require(msg.value == _amountInMaximum, "wrong msg.value");
            require(_address == address(_WETH), "need the wethAddress");
            _WETH.deposit{value: _amountInMaximum}();
        } else {
            require(msg.value == 0, "msg.value should be 0");
            IERC20(_address).safeTransferFrom(msg.sender,address(this), _amountInMaximum);
        }

        amountIn = _arraySwapOutput(
            address(this),
            _address,
            wton,
            _amountOut,
            _amountInMaximum,
            poolFee
        );
        
        if(_checkWTON) {
            //wton으로 바로 보내줌
            IWTON(wton).transfer(msg.sender,_amountOut);
        } else {
            // wton -> ton 으로 변경과 동시에 transfer함
            IWTON(wton).swapToTONAndTransfer(msg.sender,_amountOut);
        }

        if (amountIn < _amountInMaximum) {
            console.log("_amountInMaximum - amountIn : %s",_amountInMaximum - amountIn);
            IERC20(_address).transfer(msg.sender, _amountInMaximum - amountIn);
        }

        emit tokenToTONOut(msg.sender,_address,amountIn,_amountOut,_amountInMaximum - amountIn);
    }

    /// @inheritdoc ISwapper
    function tonToTokenHopInput(
        address _address,
        uint256 _amount,
        uint256 _minimumAmount,
        bool _checkWTON
    )
        external
        override 
    {   
        _tonToTokenHopInput(msg.sender,_address,_amount,_minimumAmount,_checkWTON);
    }

    /// @inheritdoc ISwapper
    function tonToTokenHopOutput(
        address _address,
        uint256 _amountOut,
        uint256 _amountInMaximum,
        bool _checkWTON
    )
        external
        override
    {
        _tonToTokenHopOutput(msg.sender,_address,_amountOut,_amountInMaximum,_checkWTON);
    }

    /// @inheritdoc ISwapper
    function tokenToTonHopInput(
        address _address,
        uint256 _amount,
        uint256 _minimumAmount,
        bool _checkWTON
    )
        external
        override
    {
        IERC20(_address).safeTransferFrom(msg.sender,address(this), _amount);

        uint256 amountOut = _arraySwapHopInput(
            address(this),
            _address,
            tos,
            wton,
            _amount,
            _minimumAmount
        );

        if(_checkWTON) {
            //wton으로 바로 보내줌
            IWTON(wton).transfer(msg.sender,amountOut);
        } else {
            // wton -> ton 으로 변경과 동시에 transfer함
            IWTON(wton).swapToTONAndTransfer(msg.sender,amountOut);
        }

        emit tokenToTONHop(msg.sender,_address,amountOut,_amount);
    }

    /// @inheritdoc ISwapper
    function tokenToTonHopOutput(
        address _address,
        uint256 _amountOut,
        uint256 _amountInMaximum,
        bool _checkWTON
    )
        external
        override
    {
        IERC20(_address).safeTransferFrom(msg.sender,address(this), _amountInMaximum);

        uint256 amountIn = _arraySwapHopOutput(
            address(this),
            _address,
            tos,
            wton,
            _amountOut,
            _amountInMaximum
        );

        if(_checkWTON) {
            //wton으로 바로 보내줌
            IWTON(wton).transfer(msg.sender,_amountOut);
        } else {
            // wton -> ton 으로 변경과 동시에 transfer함
            IWTON(wton).swapToTONAndTransfer(msg.sender,_amountOut);
        }

        if (amountIn < _amountInMaximum) {
            console.log("_amountInMaximum - amountIn : %s",_amountInMaximum - amountIn);
            IERC20(_address).transfer(msg.sender, _amountInMaximum - amountIn);
        }

        emit tokenToTONHopOut(msg.sender,_address,amountIn,_amountOut,_amountInMaximum - amountIn);
    }

    /// @inheritdoc ISwapper
    function tokenToToken(
        address _inputaddr,
        address _outputaddr,
        uint256 _amount,
        uint256 _minimumAmount,
        bool _wrapEth
    )   
        external
        payable
        override
    {
        if (_wrapEth) {
            require(msg.value == _amount, "wrong msg.value");
            require(_inputaddr == address(_WETH), "need the wethAddress");
            _WETH.deposit{value: _amount}();
        } else {
            require(msg.value == 0, "msg.value should be 0");
            //token을 받음
            IERC20(_inputaddr).safeTransferFrom(msg.sender,address(this), _amount);
        }

        uint256 amountOut = _arraySwapHopInput(
            msg.sender,
            _inputaddr,
            tos,
            _outputaddr,
            _amount,
            _minimumAmount
        );

        emit tokenToTOKEN(msg.sender,_inputaddr,_outputaddr,amountOut,_amount);
        // console.log("amountOut : %s", amountOut);
    }

    /// @inheritdoc ISwapper
    function tokenToTokenOutput(
        address _inputaddr,
        address _outputaddr,
        uint256 _amountOut,
        uint256 _amountInMaximum,
        bool _wrapEth
    )
        external
        payable
        override
    {
        if (_wrapEth) {
            require(msg.value == _amountInMaximum, "wrong msg.value");
            require(_inputaddr == address(_WETH), "need the wethAddress");
            _WETH.deposit{value: _amountInMaximum}();
        } else {
            require(msg.value == 0, "msg.value should be 0");
            //token을 받음
            IERC20(_inputaddr).safeTransferFrom(msg.sender,address(this), _amountInMaximum);
        }

        uint256 amountIn = _arraySwapHopOutput(
            msg.sender,
            _inputaddr,
            tos,
            _outputaddr,
            _amountOut,
            _amountInMaximum
        );
        console.log("amountIn : %s", amountIn);

        if (amountIn < _amountInMaximum) {
            console.log("_amountInMaximum - amountIn : %s",_amountInMaximum - amountIn);
            IERC20(_inputaddr).transfer(msg.sender, _amountInMaximum - amountIn);
        }

        emit tokenToTOKENOut(msg.sender,_inputaddr,_outputaddr,amountIn,_amountOut,_amountInMaximum - amountIn);
    }


    /// @inheritdoc ISwapper
    function tokenToTokenArray(
        address[] calldata path,
        uint24[] calldata fees,
        uint256 _amount,
        address _getAddress
    ) 
        external 
        override
        returns (uint256 returnAmount)
    {
        uint256 len = path.length;
        require(len > 2, "empty path");
        require(path.length == fees.length + 1, "PATH_FEE_MISMATCH");
        uint256 lastIndex = len - 1;
        uint256 minimumAmount;

        if(len > 2) {
            IERC20(path[0]).safeTransferFrom(msg.sender,address(this), _amount);
            minimumAmount = tokenABQuoter(path[0],path[1],fees[0],_amount)*99/100;
            returnAmount = _arraySwapInput(
                address(this),
                path[0], 
                path[1], 
                _amount, 
                minimumAmount, 
                fees[0]
            );

            for (uint256 i = 1; i < lastIndex - 1; i++) {
                console.log("2,i %s",i);
                minimumAmount = tokenABQuoter(path[i],path[i+1],fees[i],returnAmount)*99/100;
                returnAmount = _arraySwapInput(
                    address(this),
                    path[i],
                    path[i+1],
                    returnAmount,
                    minimumAmount,
                    fees[i]
                );
            }

            minimumAmount = tokenABQuoter(path[lastIndex-1],path[lastIndex],fees[lastIndex-1],returnAmount)*99/100;
            returnAmount = _arraySwapInput(
                    _getAddress,
                    path[lastIndex-1],
                    path[lastIndex],
                    returnAmount,
                    minimumAmount,
                    fees[lastIndex-1]
                );

            emit tokenToTOKENArray(_getAddress, path[0], path[lastIndex], returnAmount, _amount);
        } 
    }

    /* internal function */

    function _tonToToken(
        address _recipient,
        address _address,
        uint256 _amount,
        uint256 _minimumAmount,
        bool _checkWTON
    ) 
        internal
    {
        uint256 wTonSwapAmount;
        if(_checkWTON){
            //WTONamount를 바로 받아서 보냄
            wTonSwapAmount = _amount;
            IERC20(wton).safeTransferFrom(_recipient,address(this), wTonSwapAmount);
        } else {
            //TONamount를 받아서 보냄
            wTonSwapAmount = _toRAY(_amount);
            _needapprove(_amount);
            IERC20(ton).safeTransferFrom(_recipient,address(this), _amount);
            //ton -> wton으로 변경
            IWTON(wton).swapFromTON(_amount);
        }

        uint256 amountOut = _arraySwapInput(
            _recipient,
            wton,
            _address,
            wTonSwapAmount,
            _minimumAmount,
            poolFee
        );

        emit tonToTOKEN(_recipient,_address,amountOut,wTonSwapAmount);
    }

    function _tonToTokenOutput(
        address _recipient,
        address _address,
        uint256 _amountOut,
        uint256 _amountInMaximum,
        bool _checkWTON 
    )
        internal
    {
        uint256 wTonSwapAmount;
        if(_checkWTON){
            //WTONamount를 바로 받아서 보냄
            wTonSwapAmount = _amountInMaximum;
            IERC20(wton).safeTransferFrom(_recipient,address(this), wTonSwapAmount);
        } else {
            //TONamount를 받아서 보냄
            wTonSwapAmount = _toRAY(_amountInMaximum);
            _needapprove(_amountInMaximum);
            IERC20(ton).safeTransferFrom(_recipient,address(this), _amountInMaximum);
            //ton -> wton으로 변경
            IWTON(wton).swapFromTON(_amountInMaximum);
        }

        uint256 amountIn = _arraySwapOutput(
            _recipient,
            wton,
            _address,
            _amountOut,
            wTonSwapAmount,
            poolFee
        );

        if (amountIn < wTonSwapAmount) {
            console.log("wTonSwapAmount - amountIn : %s",wTonSwapAmount - amountIn);            
            IERC20(wton).transfer(_recipient, wTonSwapAmount - amountIn);
        }
        
        emit tonToTOKENOut(_recipient, _address,amountIn,_amountOut,wTonSwapAmount - amountIn);
    }

    function _tonToTokenHopInput(
        address _recipient,
        address _projectToken,
        uint256 _amount,
        uint256 _minimumAmount,
        bool _checkWTON 
    )
        internal
    {
        uint256 wTonSwapAmount;
        if(_checkWTON){
            //WTONamount를 바로 받아서 보냄
            wTonSwapAmount = _amount;
            IERC20(wton).safeTransferFrom(_recipient,address(this), wTonSwapAmount);
        } else {
            //TONamount를 받아서 보냄
            wTonSwapAmount = _toRAY(_amount);
            _needapprove(_amount);
            IERC20(ton).safeTransferFrom(_recipient,address(this), _amount);
            //ton -> wton으로 변경
            IWTON(wton).swapFromTON(_amount);
        }

        uint256 amountOut = _arraySwapHopInput(
            _recipient,
            wton,
            tos,
            _projectToken,
            wTonSwapAmount,
            _minimumAmount
        );

        emit tonToTOKENHop(_recipient,_projectToken,amountOut,_amount);
        // console.log("amountOut : %s", amountOut);
        // IERC20(_projectToken).safeTransfer(msg.sender, amountOut);
    }

    function _tonToTokenHopOutput(
        address _recipient,
        address _getToken,
        uint256 _amountOut,
        uint256 _amountInMaximum,
        bool _checkWTON
    )
        internal
    {
        uint256 wTonSwapAmount;
        if(_checkWTON){
            //WTONamount를 바로 받아서 보냄
            wTonSwapAmount = _amountInMaximum;
            IERC20(wton).safeTransferFrom(_recipient,address(this), wTonSwapAmount);
        } else {
            //TONamount를 받아서 보냄
            wTonSwapAmount = _toRAY(_amountInMaximum);
            _needapprove(_amountInMaximum);
            IERC20(ton).safeTransferFrom(_recipient,address(this), _amountInMaximum);
            //ton -> wton으로 변경
            IWTON(wton).swapFromTON(_amountInMaximum);
        }

        uint256 amountIn = _arraySwapHopOutput(
            _recipient,
            wton,
            tos,
            _getToken,
            _amountOut,
            _amountInMaximum
        );

        if (amountIn < wTonSwapAmount) {
            console.log("wTonSwapAmount - amountIn : %s",wTonSwapAmount - amountIn);            
            IERC20(wton).transfer(_recipient, wTonSwapAmount - amountIn);
        }

        emit tonToTOKENHopOut(_recipient,_getToken,amountIn,_amountOut,wTonSwapAmount - amountIn);
    }

    function _arraySwapInput(
        address _recipient,
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn,
        uint256 _minimumAmount,
        uint24 _fee
    )
        internal
        returns (uint256 amountOut)
    {
        IERC20(_tokenIn).approve(address(uniswapRouter),_amountIn);

        ISwapRouter.ExactInputParams memory params =
            ISwapRouter.ExactInputParams({
                path: abi.encodePacked(_tokenIn, _fee, _tokenOut),
                recipient: _recipient,
                deadline: block.timestamp,
                amountIn: _amountIn,
                amountOutMinimum: _minimumAmount
            });
        amountOut = ISwapRouter(uniswapRouter).exactInput(params);
    }

    function _arraySwapOutput(
        address _recipient,
        address _tokenIn,
        address _tokenOut,
        uint256 _amountOut,
        uint256 _amountInMaximum,
        uint24 _fee
    )
        internal
        returns (uint256 amountIn)
    {
        IERC20(_tokenIn).approve(address(uniswapRouter),_amountInMaximum);
        ISwapRouter.ExactOutputParams memory params =
            ISwapRouter.ExactOutputParams({
                // Path is reversed
                path: abi.encodePacked(_tokenOut, _fee, _tokenIn),
                recipient: _recipient,
                deadline: block.timestamp,
                amountInMaximum: _amountInMaximum,
                amountOut: _amountOut
            });
        
        amountIn = ISwapRouter(uniswapRouter).exactOutput(params);
    }

    function _arraySwapHopInput(
        address _recipient,
        address _inputAddress,
        address _middleAddress,
        address _outputAddress,
        uint256 _amountIn,
        uint256 _minimumAmount
    )
        internal
        returns (uint256 amountOut)
    {
        IERC20(_inputAddress).approve(address(uniswapRouter),_amountIn);
        ISwapRouter.ExactInputParams memory params =
            ISwapRouter.ExactInputParams({
                path: abi.encodePacked(_inputAddress, poolFee, _middleAddress, poolFee, _outputAddress),
                recipient: _recipient,
                deadline: block.timestamp,
                amountIn: _amountIn,
                amountOutMinimum: _minimumAmount
            });
        amountOut = ISwapRouter(uniswapRouter).exactInput(params);
    }

    function _arraySwapHopOutput(
        address _recipient,
        address _inputAddress,
        address _middleAddress,
        address _outputAddress,
        uint256 _amountOut,
        uint256 _amountInMaximum
    )
        internal
        returns (uint256 amountIn)
    {
        IERC20(_inputAddress).approve(address(uniswapRouter),_amountInMaximum);
        ISwapRouter.ExactOutputParams memory params =
            ISwapRouter.ExactOutputParams({
                path: abi.encodePacked(_outputAddress, poolFee, _middleAddress, poolFee, _inputAddress),
                recipient: _recipient,
                deadline: block.timestamp,
                amountInMaximum: _amountInMaximum,
                amountOut: _amountOut
            });
        amountIn = ISwapRouter(uniswapRouter).exactOutput(params);
    }


    function _needapprove(
        uint256 _amount
    ) 
        internal 
    {
        if(IERC20(ton).allowance(address(this),wton) < _amount) {
            IERC20(ton).approve(
                wton,
                type(uint256).max
            );
        }
    }

    function _tonToWTON(address _sender, uint256 _amount) internal {
        _needapprove(_amount);
        IERC20(ton).safeTransferFrom(_sender,address(this), _amount);
        IWTON(wton).swapFromTONAndTransfer(_sender,_amount);

        emit tonToWTON(_sender,_amount);
    }

    // _amount is wton uint
    function _wtonToTON(address _sender, uint256 _amount) internal {
        IERC20(wton).safeTransferFrom(_sender,address(this),_amount);
        IWTON(wton).swapToTONAndTransfer(_sender,_amount);

        emit wtonToTON(_sender,_amount);
    }

    /* internal pure function */

    function _decodeApproveData(
        bytes calldata data
    ) internal pure returns (address approveData,address selector,address getTokenAddress) {
        require(data.length == 60, "data error");
        
        bytes memory data1 = data[20:40];
        bytes memory data2 = data[0:20];
        bytes memory data3 = data[40:60];

        assembly {
            approveData := mload(add(data1, 0x14))
            selector := mload(add(data2, 0x14))
            getTokenAddress := mload(add(data3, 0x14))
        }
    }

    function _decodeAddress(
        address a
    ) internal pure returns (uint256){
        return uint256(uint160(a));
    }
    
    //@dev transform WAD to RAY
    function _toRAY(uint256 v) internal pure returns (uint256) {
        return v * 10 ** 9;
    }

    //@dev transform RAY to WAD
    function _toWAD(uint256 v) internal pure returns (uint256) {
        return v / 10 ** 9;
    }


    /* callstatic function */

    /// @inheritdoc ISwapper
    function multiQuoterInputTokenAmount(
        address _projectToken,
        uint256 inputAmount
    )   
        public
        override
        returns (uint256 wtonAmount, uint256 tonAmount)
    {
        // require(msg.sender == address(0), "need the callstatic call");
         uint256 amountOut1 = v3Quoter.quoteExactInputSingle(
            _projectToken,
            tos,
            3000,
            inputAmount,
            0
        );

        wtonAmount = v3Quoter.quoteExactInputSingle(
            tos,
            wton,
            3000,
            amountOut1,
            0
        );
        
        tonAmount = _toWAD(wtonAmount);
    }

    /// @inheritdoc ISwapper
    function multiQuoterTokenToToken(
        address _firstToken,
        address _secondToken,
        address _thirdToken,
        uint256 inputAmount
    )
        public
        override
        returns (uint256)
    {
        uint256 amountOut1 = v3Quoter.quoteExactInputSingle(
            _firstToken,
            _secondToken,
            3000,
            inputAmount,
            0
        );

        uint256 amountOut2 = v3Quoter.quoteExactInputSingle(
            _secondToken,
            _thirdToken,
            3000,
            amountOut1,
            0
        );

        return amountOut2;
    }

    /// @inheritdoc ISwapper
    function tokenABQuoter(
        address _inputToken,
        address _outputToken,
        uint24 _fee,
        uint256 _inputAmount
    )
        public
        override
        returns (uint256 amountOut)
    {
        amountOut = v3Quoter.quoteExactInputSingle(
            _inputToken,
            _outputToken,
            _fee,
            _inputAmount,
            0
        );
    }

    /// @inheritdoc ISwapper
    function exactOutputQuoter(
        address _inputToken,
        address _outputToken,
        uint24 _fee,
        uint256 _exactOutputAmount
    )
        public
        override
        returns (uint256 amountIn)
    {
        amountIn = v3Quoter.quoteExactOutputSingle(
            _inputToken,
            _outputToken,
            _fee,
            _exactOutputAmount,
            0
        );
    }

    /// @inheritdoc ISwapper
    function multiExactOutputQuoter(
        address _inputToken,
        address _middleToken,
        address _outputToken,
        uint24 _fee,
        uint256 _exactOutputAmount
    )
        public
        override
        returns (uint256 amountIn)
    {
        amountIn = v3Quoter.quoteExactOutputSingle(
            _middleToken,
            _outputToken,
            _fee,
            _exactOutputAmount,
            0
        );
        //TOS -> ARUA 로 변환할때 ARUA를 1받기 위해서 넣어야하는 TOS양

        amountIn = v3Quoter.quoteExactOutputSingle(
            _inputToken,
            _middleToken,
            _fee,
            amountIn,
            0
        );
        //WTON -> TOS로 변환시 넣어야하는 TOS양을 받기 위해서 넣어야하는 WTON양
    }

}