// SPDX-License-Identifier: MIT

pragma solidity >= 0.7.6;
pragma abicoder v2;


import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IWTON.sol";

contract Swap {
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
    function tonToWton(uint256 _amount) public {
        uint256 allowance = IERC20(ton).allowance(address(this),wton);
        if(allowance < _amount) {
            needapprove();
        }
        IERC20(ton).safeTransferFrom(msg.sender,address(this),_amount);
        IWTON(wton).swapFromTON(_amount);
        IERC20(wton).safeTransfer(msg.sender,_amount);   
    }

    function needapprove() public {
        IERC20(ton).approve(
            wton,
            type(uint256).max
        );
    }

    // 2. wton to ton (this function execute before need the WTON approve -> this address)
    function wtonToTON(uint256 _amount) public {
        IERC20(wton).safeTransferFrom(msg.sender,address(this),_amount);
        IWTON(wton).swapToTON(_amount);
        IERC20(ton).safeTransfer(msg.sender,_amount);   
    }
}