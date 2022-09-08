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
  
        // swap owner's TON to WTON
        if (msg.sender == address(ton)) {
            console.log("Check Point#2");
            _tonToWTON(sender,transferAmount);
        } else if (msg.sender == address(wton)) {
            console.log("Check Point#3");
            _wtonToTON(sender,transferAmount);
        }
        return true;
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

    function pathCheck(
        address inputToken,
        address outputToken,
        uint24 fee
    )
        public
        view
        returns (bool)
    {
        bytes memory path = abi.encodePacked(inputToken, fee, outputToken);
        bool hasMultiplePools = path.hasMultiplePools();
        (address tokenIn, address tokenOut, uint24 fee_) = path.decodeFirstPool();
        console.log("tokenIn : %s", tokenIn);
        console.log("tokenOut : %s", tokenOut);
        console.log("fee : %s", fee_);
        console.log("hasMultiplePools : %s", hasMultiplePools);

        return hasMultiplePools;
    }

    // function quoteExactInput(bytes memory path, uint256 amountIn) external override returns (uint256 amountOut) {
    //     while (true) {
    //         bool hasMultiplePools = path.hasMultiplePools();

    //         (address tokenIn, address tokenOut, uint24 fee) = path.decodeFirstPool();

    //         // the outputs of prior swaps become the inputs to subsequent ones
    //         amountIn = quoteExactInputSingle(tokenIn, tokenOut, fee, amountIn, 0);

    //         // decide whether to continue or terminate
    //         if (hasMultiplePools) {
    //             path = path.skipToken();
    //         } else {
    //             return amountIn;
    //         }
    //     }
    // } 

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
    // _amount : tonAmount (_checkWTON이 true면 wtonAmount, _checkWTON이 false면 tonAmount)
    // _address : getTokenAddress
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
        uint256 wTonSwapAmount;
        if(_checkWTON){
            //WTONamount를 바로 받아서 보냄
            wTonSwapAmount = _amount;
            IERC20(wton).safeTransferFrom(msg.sender,address(this), wTonSwapAmount);
        } else {
            //TONamount를 받아서 보냄
            wTonSwapAmount = _toRAY(_amount);
            needapprove(_amount);
            IERC20(ton).safeTransferFrom(msg.sender,address(this), _amount);
            //ton -> wton으로 변경
            IWTON(wton).swapFromTON(_amount);
        }

        IERC20(wton).approve(address(uniswapRouter),wTonSwapAmount);
    
        ISwapRouter.ExactInputParams memory params =
            ISwapRouter.ExactInputParams({
                path: abi.encodePacked(wton, poolFee, _address),
                recipient: msg.sender,
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
    // _checkWTON : 최종 받는 토큰을 TON으로 받을 것인지 WTON으로 받을 것인지?
    // _wrapEth : eth로 입금할때 체크 (eth로 가능하게함)
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
        uint256 wTonSwapAmount;
        if(_checkWTON){
            //WTONamount를 바로 받아서 보냄
            wTonSwapAmount = _amount;
            IERC20(wton).safeTransferFrom(msg.sender,address(this), wTonSwapAmount);
        } else {
            //TONamount를 받아서 보냄
            wTonSwapAmount = _toRAY(_amount);
            needapprove(_amount);
            IERC20(ton).safeTransferFrom(msg.sender,address(this), _amount);
            //ton -> wton으로 변경
            IWTON(wton).swapFromTON(_amount);
        }
        console.log("wtonAmount : %s", wTonSwapAmount);

        IERC20(wton).approve(address(uniswapRouter),wTonSwapAmount);

        ISwapRouter.ExactInputParams memory params =
            ISwapRouter.ExactInputParams({
                path: abi.encodePacked(wton, poolFee, tos, poolFee, _projectToken),
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: wTonSwapAmount,
                amountOutMinimum: _minimumAmount
            });
        uint256 amountOut = ISwapRouter(uniswapRouter).exactInput(params);
        console.log("amountOut : %s", amountOut);
        // IERC20(_projectToken).safeTransfer(msg.sender, amountOut);
    }

    // 6, ProjectToken -> TON (multiSwap) (AURA -> TOS -> WTON -> TON)
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

    function needapprove(
        uint256 _amount
    ) 
        public 
    {
        if(IERC20(ton).allowance(address(this),wton) < _amount) {
            IERC20(ton).approve(
                wton,
                type(uint256).max
            );
        }
    }

    // function needapproveWton() public {
    //     IERC20(wton).approve(
    //         ton,
    //         type(uint256).max
    //     );
    // }

    /* internal function */

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