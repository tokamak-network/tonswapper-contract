// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { OnApprove } from "./interfaces/OnApprove.sol";

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

import "./interfaces/IWTON.sol";
import "hardhat/console.sol";


contract Swap is OnApprove{
    using SafeERC20 for IERC20;

    address public wton;            //decimal = 27 (RAY)
    address public ton;             //decimal = 18 (WAD)

    ISwapRouter public uniswapRouter;


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

    // 1. ton to wton (this function need execute before  the TON approve -> this address)
    function tonToWton(uint256 _amount) public {
        uint256 allowance = IERC20(ton).allowance(address(this),wton);
        uint256 wTonSwapAmount = _toRAY(_amount);
        // console.log("tonAmount:%s",_amount);
        // console.log("wTonAmount:%s",wTonSwapAmount);
        
        if(allowance < _amount) {
            console.log("start the ton contract approve");
            needapprove();
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
    function tonToToken(
        uint256 _amount,
        address _address
    ) 
        public 
    {
        uint256 allowance = IERC20(ton).allowance(address(this),wton);
        // uint256 wTonSwapAmount = _toRAY(_amount);

        if(allowance < _amount) {
            needapprove();
        }

        IERC20(ton).safeTransferFrom(msg.sender,address(this), _amount);
        //ton -> wton으로 변경
        IWTON(wton).swapFromTON(_amount);

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
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });
        // wton -> token 변경
        uint256 amountOut = ISwapRouter(uniswapRouter).exactInputSingle(params);
        IERC20(_address).safeTransfer(msg.sender, amountOut);
    }

    function needapprove() public {
        IERC20(ton).approve(
            wton,
            type(uint256).max
        );
    }

    function needapproveWton() public {
        IERC20(wton).approve(
            ton,
            type(uint256).max
        );
    }

    /* internal function */
    function _tonToWTON(address _sender, uint256 _amount) internal {
        uint256 allowance = IERC20(ton).allowance(address(this),wton);
        uint256 wTonSwapAmount = _toRAY(_amount);
        if(allowance < _amount) {
            console.log("start the ton contract approveAndCall");
            needapprove();
        }
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
}