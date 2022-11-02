// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

import "../common/ProxyAccessCommon.sol";

/**
 * @title ERC20Mock
 * @dev Very simple ERC20 Token example, where all tokens are pre-assigned to the creator.
 * Note they can later distribute these tokens as they wish using `transfer` and other
 * `ERC20` functions.
 */

contract ERC20Mock is ProxyAccessCommon, ERC20, ERC20Burnable {
    uint256 public constant INITIAL_SUPPLY = 1000000000 * (10**18);
    /**
     * @dev Constructor that gives msg.sender all of existing tokens.
     */
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);
        _setupRole(ADMIN_ROLE, msg.sender);
        _mint(_msgSender(), INITIAL_SUPPLY);
    }

    function mint(address to, uint256 amount) public virtual {
        require(hasRole(ADMIN_ROLE, _msgSender()), "ERC20Mock : mint need ADMIN");
        _mint(to, amount);
    }
}
