// SPDX-License-Identifier: AGPL-3.0
pragma solidity >=0.7.5;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IWTON.sol";

contract swap {
    using SafeERC20 for IERC20;

    address public wton;            //decimal = 27
    address public ton;             //decimal = 18

    constructor(
        address _wton,
        address _ton
    ) {
        wton = _wton;
        ton = _ton;
    }   

    // 1. ton to wton (this function execute before need the TON approve -> this address)
    function tonToWton(uint256 _amount) {
        IERC20(ton).safeTransferFrom(msg.sender,address(this),_amount);
        IWTON(wton).swapFromTON(_amount);
        IERC20(ton).safeTransfer(msg.sender,_amount);   
    }


    // 2. wton to ton (this function execute before need the WTON approve -> this address)
    function wtonToTON(uint256 _amount) {
        IERC20(wton).safeTransferFrom(msg.sender,address(this),_amount);
        IWTON(wton).swapToTON(_amount);
        IERC20(ton).safeTransfer(msg.sender,_amount);   
    }

    /*
    first, just test the this functions -> account1, account2 before TONamount, WTONamount -> after TONamount, WTONAmount
    next, you fixed decimal calcul -> exact execute!   
    you deploy ton, wton that need
    */
}