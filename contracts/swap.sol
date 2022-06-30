// SPDX-License-Identifier: MIT
pragma solidity >= 0.7.6;
pragma abicoder v2;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { OnApprove } from "./interfaces/OnApprove.sol";
import "./interfaces/IWTON.sol";
import "hardhat/console.sol";


contract Swap is OnApprove{
    using SafeERC20 for IERC20;

    address public wton;            //decimal = 27 (RAY)
    address public ton;             //decimal = 18 (WAD)

    constructor(
        address _wton,
        address _ton
    ) {
        wton = _wton;
        ton = _ton;
    }   

    function onApprove(
        address owner,
        address spender,
        uint256 transferAmount,
        bytes calldata data
    ) external override returns (bool) {

        console.log("Check Point#1");
        console.log("Owner:", owner);
        console.log("Spender:", spender);
        console.log("Transfer Amount:", transferAmount);
        console.log("Ton Address:", address(ton));
        console.log("WTon Address:", address(wton));
        console.log("Messg sender:", msg.sender);
        


        // swap owner's TON to WTON
        if (msg.sender == address(ton)) {
            tonToWton(transferAmount);
        } else if (msg.sender == address(wton)) {
            wtonToTON(transferAmount);
        }
        return true;
    }

    // 1. ton to wton (this function need execute before  the TON approve -> this address)
    function tonToWton(uint256 _amount) public {
        // uint256 allowance = IERC20(ton).allowance(address(this),wton);
        uint256 wTonSwapAmount = _toRAY(_amount);
        console.log("tonAmount:%s",_amount);
        console.log("wTonAmount:%s",wTonSwapAmount);
        
        // if(allowance < _amount) {
        //     needapprove();
        // }
        // IERC20(ton).safeTransferFrom(msg.sender,address(this),_amount);
        console.log("Ton Balance before :%s", IERC20(ton).balanceOf(msg.sender));
        console.log("WTon Balance before :%s", IERC20(wton).balanceOf(msg.sender));
        
        IWTON(wton).swapFromTON(_amount);
        //IERC20(wton).safeTransfer(msg.sender,wTonSwapAmount);   
    }

    // 2. wton to ton (this function execute before need the WTON approve -> this address)
    function wtonToTON(uint256 _amount) public {
        uint256 allowance = IERC20(wton).allowance(address(this),ton);
        uint256 tonSwapAmount = _toWAD(_amount);
        
        if(allowance < _amount) {
            needapproveWton();
        }

        IERC20(wton).safeTransferFrom(msg.sender,address(this),_amount);
        IWTON(wton).swapToTON(_amount);
        IERC20(ton).safeTransfer(msg.sender,tonSwapAmount);   
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
    
    //@dev transform WAD to RAY
    function _toRAY(uint256 v) internal pure returns (uint256) {
        return v * 10 ** 9;
    }

    //@dev transform RAY to WAD
    function _toWAD(uint256 v) internal pure returns (uint256) {
        return v / 10 ** 9;
    }
}