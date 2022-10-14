// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.0;

interface ISwapperEvent {

    /// @dev                     TON -> WTON
    /// @param recipient         recipient Address
    /// @param amount            swapped ton amount
    event tonToWTON(address recipient, uint256 amount);

    /// @dev                     WTON -> TON
    /// @param recipient         recipient Address
    /// @param amount            swapped wton amount
    event wtonToTON(address recipient, uint256 amount);

    /// @dev                     TON -> WTON -> Token (exactInput)
    /// @param recipient         recipient Address
    /// @param tokenAddr         token Address
    /// @param amountOut         amountOut
    /// @param amountIn          amountIn
    event tonToTOKEN(address recipient, address tokenAddr, uint256 amountOut, uint256 amountIn);

    /// @dev                     TON -> WTON -> Token (exactOutput)
    /// @param recipient         recipient Address
    /// @param tokenAddr         token Address
    /// @param amountOut         amountOut
    /// @param amountIn          amountIn
    /// @param refund            refund
    event tonToTOKENOut(address recipient, address tokenAddr, uint256 amountIn, uint256 amountOut, uint256 refund);

    /// @dev                     Token -> WTON -> TON (exactInput)
    /// @param recipient         recipient Address
    /// @param tokenAddr         token Address
    /// @param amountOut         amountOut
    /// @param amountIn          amountIn
    event tokenToTON(address recipient, address tokenAddr, uint256 amountOut, uint256 amountIn);

    /// @dev                     Token -> WTON -> TON (exactOutput)
    /// @param recipient         recipient Address
    /// @param tokenAddr         token Address
    /// @param amountOut         amountOut
    /// @param amountIn          amountIn
    /// @param refund            refund
    event tokenToTONOut(address recipient, address tokenAddr, uint256 amountIn, uint256 amountOut, uint256 refund);
    

    /// @dev                     TON -> WTON -> TOS -> Token (exactInput)
    /// @param recipient         recipient Address
    /// @param tokenAddr         token Address
    /// @param amountOut         amountOut
    /// @param amountIn          amountIn
    event tonToTOKENHop(address recipient, address tokenAddr, uint256 amountOut, uint256 amountIn);

    /// @dev                     TON -> WTON -> TOS -> Token (exactOutput)
    /// @param recipient         recipient Address
    /// @param tokenAddr         token Address
    /// @param amountOut         amountOut
    /// @param amountIn          amountIn
    /// @param refund            refund
    event tonToTOKENHopOut(address recipient, address tokenAddr, uint256 amountIn, uint256 amountOut, uint256 refund);

    /// @dev                     Token -> TOS -> WTON -> TON (exactInput)
    /// @param recipient         recipient Address
    /// @param tokenAddr         token Address
    /// @param amountOut         amountOut
    /// @param amountIn          amountIn
    event tokenToTONHop(address recipient, address tokenAddr, uint256 amountOut, uint256 amountIn);

    /// @dev                     Token -> TOS -> WTON -> TON (exactOutput)
    /// @param recipient         recipient Address
    /// @param tokenAddr         token Address
    /// @param amountOut         amountOut
    /// @param amountIn          amountIn
    /// @param refund            refund
    event tokenToTONHopOut(address recipient, address tokenAddr, uint256 amountIn, uint256 amountOut, uint256 refund);

    /// @dev                     Token -> TOS -> Token (exactInput)
    /// @param recipient         recipient Address
    /// @param inputAddr         input Address
    /// @param outputAddr        output Address
    /// @param amountOut         amountOut
    /// @param amountIn          amountIn
    event tokenToTOKEN(address recipient, address inputAddr, address outputAddr, uint256 amountOut, uint256 amountIn);

    /// @dev                     Token -> TOS -> Token (exactOutput)
    /// @param recipient         recipient Address
    /// @param inputAddr         input Address
    /// @param outputAddr        output Address
    /// @param amountOut         amountOut
    /// @param amountIn          amountIn
    /// @param refund            refund
    event tokenToTOKENOut(address recipient, address inputAddr, address outputAddr, uint256 amountIn, uint256 amountOut, uint256 refund);


    /// @dev                     Token -> ? -> Token (exactInput)
    /// @param recipient         recipient Address
    /// @param inputAddr         input Address
    /// @param outputAddr        output Address
    /// @param amountOut         amountOut
    /// @param amountIn          amountIn
    event tokenToTOKENArray(address recipient, address inputAddr, address outputAddr, uint256 amountOut, uint256 amountIn);
}