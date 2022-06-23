// SPDX-License-Identifier: MIT
pragma solidity >= 0.7.6;
pragma abicoder v2;


import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { OnApprove } from "./interfaces/OnApprove.sol";

import "./interfaces/IWTON.sol";
import "hardhat/console.sol";

contract Swap {
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
        uint256 tonAmount,
        bytes calldata data
    ) external returns (bool) {
        
        console.log(owner);
        console.log(spender);
        console.log(tonAmount);
        console.log(data);

        require(msg.sender == address(ton), 
            "WTON: only accept TON approve callback");

        
        // swap owner's TON to WTON
        
        // tonToWton(tonAmount);
        

        // wtonToTON(tonAmount);
        // uint256 wtonAmount = _toRAY(tonAmount);
        // (address depositManager, address layer2) = _decodeTONApproveData(data);

        // // approve WTON to DepositManager
        // _approve(owner, depositManager, wtonAmount);

        // // call DepositManager.onApprove to deposit WTON
        // bytes memory depositManagerOnApproveData = _encodeDepositManagerOnApproveData(layer2);

        // _callOnApprove(owner, depositManager, wtonAmount, depositManagerOnApproveData);

        return true;
    }
    function approveAndCallTontoWton(address spender, uint256 amount, bytes memory data) public returns (bool) {
        require(approve(spender, amount), "No sufficient Ton.");
        OnApprove(msg.sender, spender, amount, data);
        return true;
    }

    function approveAndCallWtontoTon(address spender, uint256 amount, bytes memory data) public returns (bool) {
        require(approve(spender, amount), "No sufficient Wton.");
        OnApprove(msg.sender, spender, amount, data);
        return true;
    }

    // 1. ton to wton (this function execute before need the TON approve -> this address)
    function tonToWton(uint256 _amount) public {
        uint256 allowance = IERC20(ton).allowance(address(this),wton);
        uint256 wTonSwapAmount = _toRAY(_amount);
        console.log("tonAmount:%s",_amount);
        console.log("wTonAmount:%s",wTonSwapAmount);
        
        if(allowance < _amount) {
            needapprove();
        }
        IERC20(ton).safeTransferFrom(msg.sender,address(this),_amount);
        IWTON(wton).swapFromTON(_amount);
        IERC20(wton).safeTransfer(msg.sender,wTonSwapAmount);   
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