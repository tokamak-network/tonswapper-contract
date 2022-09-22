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

        console.log("Check Point#1");
        (address minimumAmount, address selector, address getTokenAddress)= _decodeApproveData(data);
        console.log("minimumAmount : %s",minimumAmount);
        console.log("selector : %s",selector);
        console.log("getTokenAddress : %s",getTokenAddress);
        uint256 minimumAmount1 = _decodeAddress(minimumAmount);
        uint256 selector1 = _decodeAddress(selector);
        console.log("minimumAmount1 : %s",minimumAmount1);
        console.log("selector1 : %s",selector1);

        // swap owner's TON to WTON
        if (msg.sender == address(ton)) {
            if(selector1 == 1){
                console.log("selector = 1, ton ApproveAndCall");
                tonToToken(sender,getTokenAddress,transferAmount,minimumAmount1,false);
            } else if (selector1 == 2) {
                console.log("selector = 2, ton ApproveAndCall");
                tonToTokenMulti(sender,getTokenAddress,transferAmount,minimumAmount1,false);
            } else {
                console.log("ton no selectorData");
                _tonToWTON(sender,transferAmount);
            }
        } else if (msg.sender == address(wton)) {
            if(selector1 == 1){
                console.log("selector = 1, wton ApproveAndCall");
                tonToToken(sender,getTokenAddress,transferAmount,minimumAmount1,true);
            } else if (selector1 == 2) {
                console.log("selector = 2");
                tonToTokenMulti(sender,getTokenAddress,transferAmount,minimumAmount1,true);
            } else {
                 console.log("wton no selectorData");
                _wtonToTON(sender,transferAmount);
            }
        }
        return true;
    }

    function _decodeApproveData(
        bytes calldata data
    ) internal view returns (address approveData,address selector,address getTokenAddress) {
        // require(data.length == 0x60);
        console.log(data.length);
        bytes memory data1 = data[20:40];
        bytes memory data2 = data[0:20];
        bytes memory data3 = data[40:60];
        console.log(data1.length);
        console.log(data2.length);
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

    // 1 Token -> ? WTON
    function quoterTest(
        address _token
    )
        public 
        returns (uint256)
    {
        uint256 amountOut1 = v3Quoter.quoteExactInputSingle(
            _token,
            wton,
            3000,
            1e18,
            0
        );
        console.log("amountOut1 : %s", amountOut1);
        return amountOut1;
    }

    // 1 WTON -> ? Token
    function quoterTest2(
        address _token
    ) 
        public 
        returns (uint256)
    {
        uint256 amountOut2 = v3Quoter.quoteExactInputSingle(
            wton,
            _token,
            3000,
            1e27,
            0
        );
        console.log("amountOut2 : %s", amountOut2);
        return amountOut2;
    }

    //WTON -> A -> B
    function multiQuoterInputWTONAmount(
        address _secondToken,
        address _thirdToken,
        uint256 inputAmount
    )
        public
        returns (uint256)
    {
        uint256 amountOut1 = v3Quoter.quoteExactInputSingle(
            wton,
            _secondToken,
            3000,
            inputAmount,
            0
        );
        console.log("amountOut1 : %s", amountOut1);

        uint256 amountOut2 = v3Quoter.quoteExactInputSingle(
            _secondToken,
            _thirdToken,
            3000,
            amountOut1,
            0
        );
        console.log("amountOut2 : %s", amountOut2);
        return amountOut2;
    }

    //TON -> WTON -> A -> B
    function multiQuoterInputTONAmount(
        address _secondToken,
        address _thirdToken,
        uint256 inputAmount
    )
        public
        returns (uint256)
    {   
        uint256 wTonSwapAmount = _toRAY(inputAmount);

        uint256 amountOut1 = v3Quoter.quoteExactInputSingle(
            wton,
            _secondToken,
            3000,
            wTonSwapAmount,
            0
        );
        console.log("amountOut1 : %s", amountOut1);

        uint256 amountOut2 = v3Quoter.quoteExactInputSingle(
            _secondToken,
            _thirdToken,
            3000,
            amountOut1,
            0
        );
        console.log("amountOut2 : %s", amountOut2);
        return amountOut2;
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
        console.log("amountOut1 : %s", amountOut1);

        wtonAmount = v3Quoter.quoteExactInputSingle(
            tos,
            wton,
            3000,
            amountOut1,
            0
        );
        
        tonAmount = _toWAD(wtonAmount);
        console.log("wtonAmount : %s", wtonAmount);
        console.log("tonAmount : %s", tonAmount);
        return (wtonAmount,tonAmount);
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
        console.log("amountOut1 : %s", amountOut1);

        uint256 amountOut2 = v3Quoter.quoteExactInputSingle(
            _secondToken,
            _thirdToken,
            3000,
            amountOut1,
            0
        );
        console.log("amountOut2 : %s", amountOut2);
        return amountOut2;
    }

    function tokenABQuoter(
        address _inputToken,
        address _outputToken,
        uint24 _fee,
        uint256 _inputAmount
    )
        public
        returns (uint256)
    {
        uint256 amountOut1 = v3Quoter.quoteExactInputSingle(
            _inputToken,
            _outputToken,
            _fee,
            _inputAmount,
            0
        );
        return amountOut1;
    }

    // 1. ton to wton (this function need execute before  the TON approve -> this address)
    function tonToWton(uint256 _amount) public {
        _tonToWTON(msg.sender,_amount);  
    }

    // 2. wton to ton (this function execute before need the WTON approve -> this address)
    function wtonToTON(uint256 _amount) public {
        _wtonToTON(msg.sender,_amount);
        // IERC20(wton).safeTransferFrom(msg.sender,address(this),_amount);
        // IWTON(wton).swapToTONAndTransfer(msg.sender,_amount);
    }

    // 3. ton to token (TON -> WTON -> TOS)
    // _recipient : 실행하고 받는 주소
    // _address : getTokenAddress
    // _amount : tonAmount (_checkWTON이 true면 wtonAmount, _checkWTON이 false면 tonAmount)
    // _minimumAmount : 최소로 받을 token양
    // _checkWTON : WTON -> token으로로 변경할 것인지?
    function tonToToken(
        address _recipient,
        address _address,
        uint256 _amount,
        uint256 _minimumAmount,
        bool _checkWTON
    ) 
        public 
    {  
        uint256 wTonSwapAmount;
        if(_checkWTON){
            //WTONamount를 바로 받아서 보냄
            wTonSwapAmount = _amount;
            IERC20(wton).safeTransferFrom(_recipient,address(this), wTonSwapAmount);
        } else {
            //TONamount를 받아서 보냄
            wTonSwapAmount = _toRAY(_amount);
            needapprove(_amount);
            IERC20(ton).safeTransferFrom(_recipient,address(this), _amount);
            //ton -> wton으로 변경
            IWTON(wton).swapFromTON(_amount);
        }

        IERC20(wton).approve(address(uniswapRouter),wTonSwapAmount);
    
        ISwapRouter.ExactInputParams memory params =
            ISwapRouter.ExactInputParams({
                path: abi.encodePacked(wton, poolFee, _address),
                recipient: _recipient,
                deadline: block.timestamp,
                amountIn: wTonSwapAmount,
                amountOutMinimum: _minimumAmount
            });
        // wton -> token 변경
        uint256 amountOut = ISwapRouter(uniswapRouter).exactInput(params);
    }

    // 4. token -> TON (TOS -> WTON -> TON)
    // 유저는 컨트랙트에 approve
    // 컨트랙트는 token을 uniswapRouter에 approve 해주어야함
    // _address : tokenAddress
    // _amount : tokenAmount
    // _minimumAmount : 최소로 받을 wton양
    // _checkWTON : 최종 받는 토큰을 TON으로 받을 것인지 WTON으로 받을 것인지? (true = wton으로 받음, false = ton으로 받음)
    // _wrapEth : eth로 입금할때 체크 (eth로 가능하게함) (eth로 입금할 경우 true, 그외의 토큰 false)
    function tokenToTON(
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
            //token을 받음
            IERC20(_address).safeTransferFrom(msg.sender,address(this), _amount);
        }
        //token을 wton으로 변경하기 위한 사전 허락
        IERC20(_address).approve(address(uniswapRouter),_amount);
        
        ISwapRouter.ExactInputParams memory params =
            ISwapRouter.ExactInputParams({
                path: abi.encodePacked(_address, poolFee, wton),
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: _amount,
                amountOutMinimum: _minimumAmount
            });

        // token -> wton 변경
        uint256 amountOut = ISwapRouter(uniswapRouter).exactInput(params);
        
        if(_checkWTON) {
            //wton으로 바로 보내줌
            IWTON(wton).transfer(msg.sender,amountOut);
        } else {
            // wton -> ton 으로 변경과 동시에 transfer함
            IWTON(wton).swapToTONAndTransfer(msg.sender,amountOut);
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
        address _recipient,
        address _projectToken,
        uint256 _amount,
        uint256 _minimumAmount,
        bool _checkWTON
    )
        public 
    {   
        uint256 wTonSwapAmount;
        if(_checkWTON){
            //WTONamount를 바로 받아서 보냄
            wTonSwapAmount = _amount;
            IERC20(wton).safeTransferFrom(_recipient,address(this), wTonSwapAmount);
        } else {
            //TONamount를 받아서 보냄
            wTonSwapAmount = _toRAY(_amount);
            needapprove(_amount);
            IERC20(ton).safeTransferFrom(_recipient,address(this), _amount);
            //ton -> wton으로 변경
            IWTON(wton).swapFromTON(_amount);
        }
        console.log("wtonAmount : %s", wTonSwapAmount);

        IERC20(wton).approve(address(uniswapRouter),wTonSwapAmount);

        ISwapRouter.ExactInputParams memory params =
            ISwapRouter.ExactInputParams({
                path: abi.encodePacked(wton, poolFee, tos, poolFee, _projectToken),
                recipient: _recipient,
                deadline: block.timestamp,
                amountIn: wTonSwapAmount,
                amountOutMinimum: _minimumAmount
            });
        uint256 amountOut = ISwapRouter(uniswapRouter).exactInput(params);
        console.log("amountOut : %s", amountOut);
        // IERC20(_projectToken).safeTransfer(msg.sender, amountOut);
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
        IERC20(_projectToken).approve(address(uniswapRouter),_amount);

        ISwapRouter.ExactInputParams memory params =
            ISwapRouter.ExactInputParams({
                path: abi.encodePacked(_projectToken, poolFee, tos, poolFee, wton),
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: _amount,
                amountOutMinimum: _minimumAmount
            });
        uint256 amountOut = ISwapRouter(uniswapRouter).exactInput(params);
        console.log("amountOut : %s", amountOut);

        if(_checkWTON) {
            //wton으로 바로 보내줌
            IWTON(wton).transfer(msg.sender,amountOut);
        } else {
            // wton -> ton 으로 변경과 동시에 transfer함
            IWTON(wton).swapToTONAndTransfer(msg.sender,amountOut);
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

        IERC20(_inputaddr).approve(address(uniswapRouter),_amount);

        ISwapRouter.ExactInputParams memory params =
            ISwapRouter.ExactInputParams({
                path: abi.encodePacked(_inputaddr, poolFee, tos, poolFee, _outputaddr),
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: _amount,
                amountOutMinimum: _minimumAmount
            });
        uint256 amountOut = ISwapRouter(uniswapRouter).exactInput(params);
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
            returnAmount = _arraySwap(
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
                returnAmount = _arraySwap(
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
            returnAmount = _arraySwap(
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

    // _recipient = 받는사람
    // _tokenIn = 들어갈 토큰
    // _tokenOut = 나올 토큰
    // _amount = 들어갈 토큰 양
    // _minimumAmount = 나올 토큰의 최소양
    // _fee = pool의 fee
    function _arraySwap(
        address _recipient,
        address _tokenIn,
        address _tokenOut,
        uint256 _amount,
        uint256 _minimumAmount,
        uint24 _fee
    )
        public
        returns (uint256 amountOut)
    {
        IERC20(_tokenIn).approve(address(uniswapRouter),_amount);

        ISwapRouter.ExactInputParams memory params =
            ISwapRouter.ExactInputParams({
                path: abi.encodePacked(_tokenIn, _fee, _tokenOut),
                recipient: _recipient,
                deadline: block.timestamp,
                amountIn: _amount,
                amountOutMinimum: _minimumAmount
            });
        amountOut = ISwapRouter(uniswapRouter).exactInput(params);
    }


    function needapprove(
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
        needapprove(_amount);
        uint256 wTonSwapAmount = _toRAY(_amount);
        console.log("Check Point#4");
        IERC20(ton).safeTransferFrom(_sender,address(this), _amount);
        IWTON(wton).swapFromTON(_amount);
        IERC20(wton).safeTransfer(_sender,wTonSwapAmount);   
    }


    //먼저 ton을 wton으로 변경해놔야 추후 ton으로 변경가능함
    // _amount is wton uint
    function _wtonToTON(address _sender, uint256 _amount) internal {
        uint256 tonSwapAmount = _toWAD(_amount);
        IERC20(wton).safeTransferFrom(_sender,address(this),_amount);
        // IWTON(wton).swapToTONAndTransfer(_sender,_amount);
        IWTON(wton).swapToTON(_amount);
        IERC20(ton).safeTransfer(_sender,tonSwapAmount);   
    }

    /* view function */
    
    //@dev transform WAD to RAY
    function _toRAY(uint256 v) internal pure returns (uint256) {
        return v * 10 ** 9;
    }

    //@dev transform RAY to WAD
    function _toWAD(uint256 v) internal pure returns (uint256) {
        return v / 10 ** 9;
    }

}