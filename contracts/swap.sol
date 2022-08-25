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

    ISwapRouter public uniswapRouter;

    IQuoter v3Quoter = IQuoter(0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6);     //mainnet


    constructor(
        address _wton,
        address _ton,
        address _uniswapRouter
    ) {
        wton = _wton;
        ton = _ton;
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
            1e20,
            0
        );
        console.log("amountOut1 : %s", amountOut1);
        return amountOut1;
    }

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

    // 1. ton to wton (this function need execute before  the TON approve -> this address)
    function tonToWton(uint256 _amount) public {
        uint256 allowance = IERC20(ton).allowance(address(this),wton);
        uint256 wTonSwapAmount = _toRAY(_amount);
        // console.log("tonAmount:%s",_amount);
        // console.log("wTonAmount:%s",wTonSwapAmount);
        
        if(allowance < _amount) {
            console.log("start the ton contract approve");
            needapprove(_amount);
        }

        IERC20(ton).safeTransferFrom(msg.sender,address(this), _amount);
        // console.log("Ton Balance before :%s", IERC20(ton).balanceOf(address(this)));
        // console.log("WTon Balance before :%s", IERC20(wton).balanceOf(address(this)));
        
        IWTON(wton).swapFromTON(_amount);

        // console.log("Ton2 Balance before :%s", IERC20(ton).balanceOf(address(this)));
        // console.log("WTon2 Balance before :%s", IERC20(wton).balanceOf(address(this)));
        IERC20(wton).safeTransfer(msg.sender,wTonSwapAmount);   
    }

    // 2. wton to ton (this function execute before need the WTON approve -> this address)
    function wtonToTON(uint256 _amount) public {
        uint256 allowance = IERC20(wton).allowance(address(this),ton);
        uint256 tonSwapAmount = _toWAD(_amount);

        console.log("msg.sender : %s", msg.sender);
        console.log("address(this) : %s", address(this));

        if(allowance < _amount) {
            console.log("start the wton contract approve");
            needapproveWton();
        }

        IERC20(wton).safeTransferFrom(msg.sender,address(this),_amount);
        IWTON(wton).swapToTONAndTransfer(msg.sender,_amount);
        // IWTON(wton).swapToTON(_amount);
        // IERC20(ton).safeTransfer(msg.sender,tonSwapAmount);   
    }

    // 3. ton to token
    // _amount : tonAmount
    // _address : getTokenAddress
    function tonToToken(
        uint256 _amount,
        address _address
    ) 
        public 
    {
        uint256 allowance = IERC20(ton).allowance(address(this),wton);
        // uint256 wTonSwapAmount = _toRAY(_amount);

        if(allowance < _amount) {
            needapprove(_amount);
        }

        IERC20(ton).safeTransferFrom(msg.sender,address(this), _amount);
        //ton -> wton으로 변경
        IWTON(wton).swapFromTON(_amount);

        IIUniswapV3Pool pool = IIUniswapV3Pool(getPoolAddress(_address));
        require(address(pool) != address(0), "pool didn't exist");

        (uint160 sqrtPriceX96, int24 tick,,,,,) =  pool.slot0();
        require(sqrtPriceX96 > 0, "pool is not initialized");

        int24 timeWeightedAverageTick = OracleLibrary.consult(address(pool), 120);

        require(
            acceptMinTick(timeWeightedAverageTick, 60, 8) <= tick
            && tick < acceptMaxTick(timeWeightedAverageTick, 60, 8),
            "It's not allowed changed tick range."
        );

        (uint256 amountOutMinimum, , uint160 sqrtPriceLimitX96)
            = limitPrameters(_amount, address(pool), wton, _address, 18);
        console.log("amountOutMinimum : %s", amountOutMinimum);


        uint256 wtonAmount = IERC20(wton).balanceOf(address(this));
        IERC20(wton).approve(address(uniswapRouter),wtonAmount);
        
        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: wton,
                tokenOut: _address,
                fee: 3000,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: wtonAmount,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: sqrtPriceLimitX96
            });

        // wton -> token 변경
        uint256 amountOut = ISwapRouter(uniswapRouter).exactInputSingle(params);
        IERC20(_address).safeTransfer(msg.sender, amountOut);
    }

    // 4. token -> TON
    // 유저는 컨트랙트에 approve
    // 컨트랙트는 token을 uniswapRouter에 approve 해주어야함
    // _amount : tokenAmount
    // _address : tokenAddress
    function tokenToTON(
        uint256 _amount,
        address _address
    )
        public
    {
        IERC20(_address).safeTransferFrom(msg.sender,address(this), _amount);

        IIUniswapV3Pool pool = IIUniswapV3Pool(getPoolAddress(_address));
        console.log("address(pool) : %s", address(pool));
        address token0 = pool.token0();
        console.log("token0 : %s", token0);
        address token1 = pool.token1();
        console.log("token1 : %s", token1);

        require(address(pool) != address(0), "pool didn't exist");

        (uint160 sqrtPriceX96, int24 tick,,,,,) =  pool.slot0();
        require(sqrtPriceX96 > 0, "pool is not initialized");

        int24 timeWeightedAverageTick = OracleLibrary.consult(address(pool), 120);

        require(
            acceptMinTick(timeWeightedAverageTick, 60, 8) <= tick
            && tick < acceptMaxTick(timeWeightedAverageTick, 60, 8),
            "It's not allowed changed tick range."
        );

        (uint256 amountOutMinimum, , uint160 sqrtPriceLimitX96)
            = limitPrameters(_amount, address(pool), token0, token1, 18);
        console.log("amountOutMinimum : %s", amountOutMinimum);

        // uint256 newAmount = IERC20(_address).balanceOf(address(this));
        // console.log("newAmount : %s", newAmount);

        IERC20(_address).approve(address(uniswapRouter),_amount);

        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: _address,
                tokenOut: wton,
                fee: 3000,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: _amount,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: sqrtPriceLimitX96
            });

        // token -> wton 변경
        uint256 amountOut = ISwapRouter(uniswapRouter).exactInputSingle(params);
        
        // wton -> ton 으로 변경과 동시에 transfer함
        IWTON(wton).swapToTONAndTransfer(msg.sender,amountOut);
    }

    // 5. TON -> ProjectToken (multiSwap)
    // WTON -> TOKEN -> TOKEN의 멀티 스왑
    function tonToTokenMulti(
        uint256 _amount
    )
        public 
    {
        ISwapRouter.ExactInputParams memory params =
            ISwapRouter.ExactInputParams({
                path: abi.encodePacked(DAI, poolFee, USDC, poolFee, WETH9),
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0
            });
    }

    function tokenABtest(
        address _tokenA,
        address _tokenB,
        uint256 _amount
    ) 
        public 
    {

        IIUniswapV3Pool pool = IIUniswapV3Pool(getPoolAddress2(_tokenA,_tokenB));

        (uint256 amountOutMinimum, , uint160 sqrtPriceLimitX96)
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

    function needapproveWton() public {
        IERC20(wton).approve(
            ton,
            type(uint256).max
        );
    }

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
    function _wtonToTON(address _sender, uint256 _amount) internal {
        // _amount is wton uint
        uint256 allowance = IERC20(wton).allowance(address(this),ton);
        uint256 tonSwapAmount = _toWAD(_amount);
        console.log("approveAndCall msg.sender : %s", msg.sender);
        console.log("approveAndCall address(this) : %s", address(this));
        console.log("approveAndCall wton address : %s", wton);
        if(allowance < _amount) {
            console.log("start the wton contract approveAndCall");
            needapproveWton();
        }
        console.log("Check Point#4");
        IERC20(wton).safeTransferFrom(_sender,address(this),_amount);
        console.log("approveAndCall WTon Balance before : %s", IERC20(wton).balanceOf(address(this)));
        // IWTON(wton).swapToTONAndTransfer(_sender,_amount);

        IWTON(wton).swapToTON(_amount);
        console.log("Check Point#5");
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