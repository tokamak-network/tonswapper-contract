// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { OnApprove } from "./interfaces/OnApprove.sol";
import "./libraries/FullMath.sol";
import "./libraries/TickMath.sol";
import "./libraries/OracleLibrary.sol";
import "./libraries/Path.sol";

import "./interfaces/IWTON.sol";
import "hardhat/console.sol";

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
    OnApprove
{
    using Path for bytes;
    using SafeERC20 for IERC20;

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
                _tonToTokenMulti(sender,getTokenAddress,transferAmount,minimumAmount1,false);
            } else {
                _tonToWTON(sender,transferAmount);
            }
        } else if (msg.sender == address(wton)) {
            if(selector1 == 1){
                _tonToToken(sender,getTokenAddress,transferAmount,minimumAmount1,true);
            } else if (selector1 == 2) {
                _tonToTokenMulti(sender,getTokenAddress,transferAmount,minimumAmount1,true);
            } else {
                _wtonToTON(sender,transferAmount);
            }
        }
        return true;
    }


    //token -> TOS -> WTON
    function multiQuoterInputTokenAmount(
        address _projectToken,
        uint256 inputAmount
    )   
        public
        returns (uint256 wtonAmount, uint256 tonAmount)
    {
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

    //token -> TOS -> token
    //token -> WTON -> token
    //_firstToken = token
    //_secondToken = TOS or WTON
    //_thirdToken = token
    function multiQuoterTokenToToken(
        address _firstToken,
        address _secondToken,
        address _thirdToken,
        uint256 inputAmount
    )
        public
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

    function tokenABQuoter(
        address _inputToken,
        address _outputToken,
        uint24 _fee,
        uint256 _inputAmount
    )
        public
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

    function exactOutputQuoter(
        address _inputToken,
        address _outputToken,
        uint24 _fee,
        uint256 _exactOutputAmount
    )
        public
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

    function multiExactOutputQuoter(
        address _inputToken,
        address _outputToken,
        uint24 _fee,
        uint256 _exactOutputAmount
    )
        public
        returns (uint256 amountIn)
    {
        amountIn = v3Quoter.quoteExactOutputSingle(
            _inputToken,
            tos,
            _fee,
            _exactOutputAmount,
            0
        );

        amountIn = v3Quoter.quoteExactOutputSingle(
            tos,
            _outputToken,
            _fee,
            amountIn,
            0
        );
    }

    // 1. ton to wton (this function need execute before  the TON approve -> this address)
    function tonToWton(uint256 _amount) public {
        _tonToWTON(msg.sender,_amount);  
    }

    // 2. wton to ton (this function execute before need the WTON approve -> this address)
    function wtonToTON(uint256 _amount) public {
        _wtonToTON(msg.sender,_amount);
    }

    // 3. ton to token (TON -> WTON -> TOS)
    // _recipient : 실행하고 받는 주소
    // _address : getTokenAddress
    // _amount : tonAmount (_checkWTON이 true면 wtonAmount, _checkWTON이 false면 tonAmount)
    // _minimumAmount : 최소로 받을 token양
    // _checkWTON : WTON -> token으로로 변경할 것인지?
    function tonToToken(
        address _address,
        uint256 _amount,
        uint256 _minimumAmount,
        bool _checkWTON
    ) 
        public 
    {  
        _tonToToken(msg.sender,_address,_amount,_minimumAmount,_checkWTON);
    }

    // TON -> WTON -> Token
    // ?의 TON or wton을 넣어서 (남은 금액은 wton으로 돌려줌)
    function tonToTokenExactOutput(
        address _address,
        uint256 _amountOut,
        uint256 _amountInMaximum,
        bool _checkWTON
    )
        public
    {
        _tonToTokenOutput(msg.sender,_address,_amountOut,_amountInMaximum,_checkWTON);
    }

    // 4. token -> TON (TOS -> WTON -> TON)
    // 유저는 컨트랙트에 approve
    // 컨트랙트는 token을 uniswapRouter에 approve 해주어야함
    // _address : tokenAddress
    // _amount : tokenAmount
    // _minimumAmount : 최소로 받을 wton양
    // _checkWTON : 최종 받는 토큰을 TON으로 받을 것인지 WTON으로 받을 것인지? (true = wton으로 받음, false = ton으로 받음)
    // _wrapEth : eth로 입금할때 체크 (eth로 가능하게함) (eth로 입금할 경우 true, 그외의 토큰 false)
    function tokenToTon(
        address _address,
        uint256 _amount,
        uint256 _minimumAmount,
        bool _checkWTON,
        bool _wrapEth
    )
        public
        payable
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
    }

    // token -> TON (정확한 output)
    function tokenToTonExactOutput(
        address _address,
        uint256 _amountOut,
        uint256 _amountInMaximum,
        bool _checkWTON,
        bool _wrapEth
    )
        public
        payable
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
    }

    // 5. TON -> ProjectToken (multihop Swap) (TON->WTON->TOS->LYDA)
    // WTON -> TOKEN -> TOKEN의 멀티 스왑 (TON->WTON->TOS->LYDA)
    // poolFee를 따로 받던가 3000 고정이던가
    // _recipient : 실행하고 받는 주소
    // _projectToken = 최종적으로 받을 token 주소
    // _amount = 넣을 TON양
    // _minimumAmount = 최소로 받을 Token양
    // _checkWTON = 초기 token을 wton으로 받을 것인지? (wton -> tos -> lyda)
    function tonToTokenMulti(
        address _projectToken,
        uint256 _amount,
        uint256 _minimumAmount,
        bool _checkWTON
    )
        public 
    {   
        _tonToTokenMulti(msg.sender,_projectToken,_amount,_minimumAmount,_checkWTON);
    }

    function tonToTokenHopOutput(
        address _getToken,
        uint256 _amountOut,
        uint256 _amountInMaximum,
        bool _checkWTON
    )
        public
    {
        _tonToTokenHopOutput(msg.sender,_getToken,_amountOut,_amountInMaximum,_checkWTON);
    }

    // 6, ProjectToken -> TON (multihop) (AURA -> TOS -> WTON -> TON)
    // AURA -> TOS -> WTON의 멀티스왑
    // 최종적으로 WTON -> TON 으로 변경 후 보냄
    // _projectToken = 바꿀려고하는 token 주소
    // _amount = 넣을 Token 양
    // _minimumAmount = 최소로 받을 WTON 양
    // _checkWTON = 토큰을 WTON으로 받을 것인지 TON으로 받을 것인지
    function tokenToTonMulti(
        address _projectToken,
        uint256 _amount,
        uint256 _minimumAmount,
        bool _checkWTON
    )
        public
    {
        IERC20(_projectToken).safeTransferFrom(msg.sender,address(this), _amount);

        uint256 amountOut = _arraySwapHopInput(
            address(this),
            _projectToken,
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
    }

    function tokenToTonHopOutput(
        address _inputToken,
        uint256 _amountOut,
        uint256 _amountInMaximum,
        bool _checkWTON
    )
        public
    {
        IERC20(_inputToken).safeTransferFrom(msg.sender,address(this), _amountInMaximum);

        uint256 amountIn = _arraySwapHopOutput(
            address(this),
            _inputToken,
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
            IERC20(_inputToken).transfer(msg.sender, _amountInMaximum - amountIn);
        }
    }

    // 7. ProjectToken -> ProjectToken (LYDA -> TOS -> AURA)
    // ProjectToken -> TOS -> ProjectToken의 멀티 스왑
    // _wrapEth : eth로 입금할때 체크 (eth로 가능하게함) (ETH -> TOS -> LYDA)
    function tokenToToken(
        address _inputaddr,
        address _outputaddr,
        uint256 _amount,
        uint256 _minimumAmount,
        bool _wrapEth
    )   
        public
        payable
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
        console.log("amountOut : %s", amountOut);
    }


    //DAI -> ETH -> WTON 
    function tokenToTokenArray(
        address[] calldata path,
        uint24[] calldata fees,
        uint256 _amount,
        address _getAddress
    ) 
        public 
        returns (uint256 returnAmount)
    {
        uint256 len = path.length;
        console.log("len : %s", len);
        require(len > 0, "empty path");
        require(path.length == fees.length + 1, "PATH_FEE_MISMATCH");
        uint256 lastIndex = len - 1;
        uint256 minimumAmount;

        if(len > 2) {
            IERC20(path[0]).safeTransferFrom(msg.sender,address(this), _amount);
            minimumAmount = tokenABQuoter(path[0],path[1],fees[0],_amount)*95/100;
            returnAmount = _arraySwapInput(
                address(this),
                path[0], 
                path[1], 
                _amount, 
                minimumAmount, 
                fees[0]
            );
            console.log("1");
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
            console.log("3");
            minimumAmount = tokenABQuoter(path[lastIndex-1],path[lastIndex],fees[lastIndex-1],returnAmount)*99/100;
            returnAmount = _arraySwapInput(
                    _getAddress,
                    path[lastIndex-1],
                    path[lastIndex],
                    returnAmount,
                    minimumAmount,
                    fees[lastIndex-1]
                );
        } else {

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
    }

    function _tonToTokenMulti(
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

        console.log("amountOut : %s", amountOut);
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
    }

    // _recipient = 받는사람
    // _tokenIn = 들어갈 토큰
    // _tokenOut = 나올 토큰
    // _amount = 들어갈 토큰 양
    // _minimumAmount = 나올 토큰의 최소양
    // _fee = pool의 fee
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
    }


    //먼저 ton을 wton으로 변경해놔야 추후 ton으로 변경가능함
    // _amount is wton uint
    function _wtonToTON(address _sender, uint256 _amount) internal {
        IERC20(wton).safeTransferFrom(_sender,address(this),_amount);
        IWTON(wton).swapToTONAndTransfer(_sender,_amount);
    }

    /* view function */

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

}