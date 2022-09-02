// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { OnApprove } from "./interfaces/OnApprove.sol";

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

import "./libraries/FullMath.sol";
import "./libraries/TickMath.sol";
import "./libraries/OracleLibrary.sol";

import "./interfaces/IWTON.sol";
import "hardhat/console.sol";

import "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";


interface IIUniswapV3Factory {
    function getPool(address,address,uint24) external view returns (address);
}

interface IIUniswapV3Pool {
    function token0() external view returns (address);
    function token1() external view returns (address);

    function slot0()
        external
        view
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            uint8 feeProtocol,
            bool unlocked
        );

}


contract Swap is OnApprove{
    using SafeERC20 for IERC20;

    address public wton;            //decimal = 27 (RAY)
    address public ton;             //decimal = 18 (WAD)
    address public tos;             //decimal = 18 (WAD)

    uint24 public constant poolFee = 3000;

    ISwapRouter public uniswapRouter;

    IQuoter v3Quoter = IQuoter(0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6);     //mainnet


    constructor(
        address _wton,
        address _ton,
        address _tos,
        address _uniswapRouter
    ) {
        wton = _wton;
        ton = _ton;
        tos = _tos;
        uniswapRouter = ISwapRouter(_uniswapRouter);
    }   

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
    // _amount : tonAmount
    // _address : getTokenAddress
    // _minimumAmount = 최소로 받을 token양
    function tonToToken(
        address _address,
        uint256 _amount,
        uint256 _minimumAmount
    ) 
        public 
    {
        uint256 wTonSwapAmount = _toRAY(_amount);
        needapprove(_amount);

        IERC20(ton).safeTransferFrom(msg.sender,address(this), _amount);
        //ton -> wton으로 변경
        IWTON(wton).swapFromTON(_amount);

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
        // IERC20(_address).safeTransfer(msg.sender, amountOut);
    }

    // 4. token -> TON (TOS -> WTON -> TON)
    // 유저는 컨트랙트에 approve
    // 컨트랙트는 token을 uniswapRouter에 approve 해주어야함
    // _address : tokenAddress
    // _amount : tokenAmount
    // _minimumAmount = 최소로 받을 wton양
    function tokenToTON(
        address _address,
        uint256 _amount,
        uint256 _minimumAmount
    )
        public
    {
        //token을 받음
        IERC20(_address).safeTransferFrom(msg.sender,address(this), _amount);
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
        
        // wton -> ton 으로 변경과 동시에 transfer함
        IWTON(wton).swapToTONAndTransfer(msg.sender,amountOut);
    }

    // 5. TON -> ProjectToken (multiSwap) (TON->WTON->TOS->LYDA)
    // WTON -> TOKEN -> TOKEN의 멀티 스왑 (TON->WTON->TOS->LYDA)
    // poolFee를 따로 받던가 3000 고정이던가
    // _projectToken = 최종적으로 받을 token 주소
    // _amount = 넣을 TON양
    // _minimumAmount = 최소로 받을 Token양
    function tonToTokenMulti(
        address _projectToken,
        uint256 _amount,
        uint256 _minimumAmount
    )
        public 
    {   
        uint256 wTonSwapAmount = _toRAY(_amount);
        needapprove(_amount);
        IERC20(ton).safeTransferFrom(msg.sender,address(this), _amount);
        //ton -> wton으로 변경
        IWTON(wton).swapFromTON(_amount);
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
    function tokenToTonMulti(
        address _projectToken,
        uint256 _amount,
        uint256 _minimumAmount
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
        IWTON(wton).swapToTONAndTransfer(msg.sender,amountOut);
    }

    // 7. ProjectToken -> ProjectToken (LYDA -> TOS -> AURA)
    // ProjectToken -> TOS -> ProjectToken의 멀티 스왑
    function tokenToToken(
        address _inputaddr,
        address _outputaddr,
        uint256 _amount,
        uint256 _minimumAmount
    )   
        public
    {
        IERC20(_inputaddr).safeTransferFrom(msg.sender,address(this), _amount);
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

    function tokenABtest(
        address _tokenA,
        address _tokenB,
        uint256 _amount
    ) 
        public 
    {

        IIUniswapV3Pool pool = IIUniswapV3Pool(getPoolAddress2(_tokenA,_tokenB));

        (uint256 amountOutMinimum, , )
            = limitPrameters(_amount, address(pool), _tokenA, _tokenB, 18);
        console.log("amountOutMinimum : %s", amountOutMinimum);
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

    function getPoolAddress(
        address _token
    ) public view returns(address) {
        address factory = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
        return IIUniswapV3Factory(factory).getPool(wton, _token, 3000);
    }

    function getPoolAddress2(
        address _tokenA,
        address _tokenB
    ) public view returns(address) {
        address factory = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
        return IIUniswapV3Factory(factory).getPool(_tokenA, _tokenB, 3000);
    }


    function getMiniTick(int24 tickSpacings) public pure returns (int24){
           return (TickMath.MIN_TICK / tickSpacings) * tickSpacings ;
    }

    function getMaxTick(int24 tickSpacings) public pure  returns (int24){
           return (TickMath.MAX_TICK / tickSpacings) * tickSpacings ;
    }

    function acceptMinTick(int24 _tick, int24 _tickSpacings, int24 _acceptTickInterval) public pure returns (int24)
    {

        int24 _minTick = getMiniTick(_tickSpacings);
        int24 _acceptMinTick = _tick - (_tickSpacings * _acceptTickInterval);

        if(_minTick < _acceptMinTick) return _acceptMinTick;
        else return _minTick;
    }

    function acceptMaxTick(int24 _tick, int24 _tickSpacings, int24 _acceptTickInterval) public pure returns (int24)
    {
        int24 _maxTick = getMaxTick(_tickSpacings);
        int24 _acceptMinTick = _tick + (_tickSpacings * _acceptTickInterval);

        if(_maxTick < _acceptMinTick) return _maxTick;
        else return _acceptMinTick;
    }

    function getQuoteAtTick(
        int24 tick,
        uint128 amountIn,
        address baseToken,
        address quoteToken
    ) public pure returns (uint256 amountOut) {
        return OracleLibrary.getQuoteAtTick(tick, amountIn, baseToken, quoteToken);
    }

    function limitPrameters(
        uint256 amountIn,
        address _pool,
        address token0,
        address token1,
        int24 acceptTickCounts
    ) public view returns  (uint256 amountOutMinimum, uint256 priceLimit, uint160 sqrtPriceX96Limit)
    {
        IIUniswapV3Pool pool = IIUniswapV3Pool(_pool);
        (, int24 tick,,,,,) =  pool.slot0();

        int24 _tick = tick;
        if(token0 < token1) {
            _tick = tick - acceptTickCounts * 60;
            if(_tick < TickMath.MIN_TICK ) _tick =  TickMath.MIN_TICK ;
        } else {
            _tick = tick + acceptTickCounts * 60;
            if(_tick > TickMath.MAX_TICK ) _tick =  TickMath.MAX_TICK ;
        }
        address token1_ = token1;
        address token0_ = token0;
        return (
              getQuoteAtTick(
                _tick,
                uint128(amountIn),
                token0_,
                token1_
                ),
             getQuoteAtTick(
                _tick,
                uint128(10**27),
                token0_,
                token1_
             ),
             TickMath.getSqrtRatioAtTick(_tick)
        );
    }
}