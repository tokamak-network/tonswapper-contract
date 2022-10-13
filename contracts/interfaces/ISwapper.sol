// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.0;

interface ISwapper {

    ///////////////////////////////////////
    /// external function
    //////////////////////////////////////

    /**
     * @dev                TON -> WTON swap
     * @param _amount      TON amount to be swapped (input ton uint)
     */
    function tonToWton(uint256 _amount) external;

    /**
     * @dev                WTON -> TON swap
     * @param _amount      WTON amount to be swapped (input wton uint)
     */
    function wtonToTON(uint256 _amount) external;

    /**
     * @dev                     TON -> WTON -> Token (token have a wton pool)
     * @param _address          get Token Address
     * @param _amount           input Amount (if _checkWTON is true, amount is wtonAmount. _checkWTON is false, amount is tonAmount)
     * @param _minimumAmount    MinimumAmount of tokens to receive
     * @param _checkWTON        Check whether input token is TON or WTON
     */
    function tonToToken(
        address _address,
        uint256 _amount,
        uint256 _minimumAmount,
        bool _checkWTON
    )   external;

    /**
     * @dev                     TON -> WTON -> Token (token have a wton pool)
     * @param _address          get Token Address
     * @param _amountOut        Amount of tokens to receive
     * @param _amountInMaximum  The maximum amount of tokens put in to receive the amount of tokens (if _checkWTON is true, amount is wtonAmount. _checkWTON is false, amount is tonAmount)
     * @param _checkWTON        Check whether input token is TON or WTON
     */
    function tonToTokenExactOutput(
        address _address,
        uint256 _amountOut,
        uint256 _amountInMaximum,
        bool _checkWTON
    )   external;

    /**
     * @dev                     Token -> WTON -> TON (token have a wton pool)
     * @param _address          input Token Address
     * @param _amount           input Amount
     * @param _minimumAmount    MinimumAmount of tokens to receive (if _checkWTON is true, get WTON. _checkWTON is false, get TON)
     * @param _checkWTON        Check whether output token is TON or WTON
     * @param _wrapEth          Check whether input token is ETH or ERC20Token
     */
     function tokenToTon(
        address _address,
        uint256 _amount,
        uint256 _minimumAmount,
        bool _checkWTON,
        bool _wrapEth
    )   
        external 
        payable;

    /**
     * @dev                     Token -> WTON -> TON (token have a wton pool)
     * @param _address          input Token Address
     * @param _amountOut        Amount of tokens to receive (if _checkWTON is true, get WTON. _checkWTON is false, get TON)
     * @param _amountInMaximum  The maximum amount of tokens put in to receive the amount of tokens
     * @param _checkWTON        Check whether output token is TON or WTON
     * @param _wrapEth          Check whether input token is ETH or ERC20Token
     */    
    function tokenToTonExactOutput(
        address _address,
        uint256 _amountOut,
        uint256 _amountInMaximum,
        bool _checkWTON,
        bool _wrapEth
    )
        external
        payable
        returns (uint256 amountIn);

    /**
     * @dev                     TON -> WTON -> TOS -> Token (token have a tos pool)
     * @param _address          get Token Address
     * @param _amount           input Amount (if _checkWTON is true, amount is wtonAmount. _checkWTON is false, amount is tonAmount)
     * @param _minimumAmount    MinimumAmount of tokens to receive
     * @param _checkWTON        Check whether input token is TON or WTON
     */ 
    function tonToTokenHopInput(
        address _address,
        uint256 _amount,
        uint256 _minimumAmount,
        bool _checkWTON
    )
        external;

    /**
     * @dev                     Token -> WTON -> TON (token have a wton pool)
     * @param _address          get Token Address
     * @param _amountOut        Amount of tokens to receive
     * @param _amountInMaximum  The maximum amount of tokens put in to receive the amount of tokens (if _checkWTON is true, amount is wtonAmount. _checkWTON is false, amount is tonAmount)
     * @param _checkWTON        Check whether output token is TON or WTON
     */ 
    function tonToTokenHopOutput(
        address _address,
        uint256 _amountOut,
        uint256 _amountInMaximum,
        bool _checkWTON
    )
        external;

    /**
     * @dev                     Token -> TOS -> WTON -> TON (token have a tos pool)
     * @param _address          input Token Address
     * @param _amount           input Amount
     * @param _minimumAmount    MinimumAmount of tokens to receive (if _checkWTON is true, get WTON. _checkWTON is false, get TON)
     * @param _checkWTON        Check whether output token is TON or WTON
     */
    function tokenToTonHopInput(
        address _address,
        uint256 _amount,
        uint256 _minimumAmount,
        bool _checkWTON
    )
        external;

    /**
     * @dev                     Token -> TOS -> WTON -> TON (token have a tos pool)
     * @param _address          input Token Address
     * @param _amountOut        Amount of tokens to receive (if _checkWTON is true, get WTON. _checkWTON is false, get TON)
     * @param _amountInMaximum  The maximum amount of tokens put in to receive the amount of tokens
     * @param _checkWTON        Check whether output token is TON or WTON
     */
    function tokenToTonHopOutput(
        address _address,
        uint256 _amountOut,
        uint256 _amountInMaximum,
        bool _checkWTON
    )
        external;
    
    /**
     * @dev                     Token -> TOS -> Token (token have a tos pool)
     * @param _inputaddr        input Token Address
     * @param _outputaddr       output Token Address
     * @param _amount           input Amount
     * @param _minimumAmount    MinimumAmount of tokens to receive 
     * @param _wrapEth          Check whether input token is ETH or ERC20Token
     */
    function tokenToToken(
        address _inputaddr,
        address _outputaddr,
        uint256 _amount,
        uint256 _minimumAmount,
        bool _wrapEth
    )   
        external
        payable;

    /**
     * @dev                     Token -> TOS -> Token (token have a tos pool)
     * @param _inputaddr        input Token Address
     * @param _outputaddr       output Token Address
     * @param _amountOut        output Amount
     * @param _amountInMaximum  The maximum amount of tokens put in to receive the amount of tokens
     * @param _wrapEth          Check whether input token is ETH or ERC20Token
     */
    function tokenToTokenOutput(
        address _inputaddr,
        address _outputaddr,
        uint256 _amountOut,
        uint256 _amountInMaximum,
        bool _wrapEth
    )
        external
        payable;

    /**
     * @dev                     Token -> TOS -> Token (token have a tos pool)
     * @param path              address array
     * @param fees              fee array
     * @param _amount           inputAmount
     * @param _getAddress       recipient Address
     */
    function tokenToTokenArray(
        address[] calldata path,
        uint24[] calldata fees,
        uint256 _amount,
        address _getAddress
    )
        external
        returns (uint256 returnAmount);


    ///////////////////////////////////////
    /// callstatic function
    //////////////////////////////////////

    /**
     * @dev                     Token -> TOS -> WTON (token have a tos pool) Know how much TON and WTON can get
     * @param _projectToken     inputToken Address
     * @param inputAmount       inputAmount
     */
    function multiQuoterInputTokenAmount(
        address _projectToken,
        uint256 inputAmount
    )   
        external
        returns (uint256 wtonAmount, uint256 tonAmount);

    /**
     * @dev                     firstToken -> secondToken -> thirdToken (token have a tos, wton pool) Know how much token can get
     * @param _firstToken       inputToken Address
     * @param _secondToken      secondToken Address
     * @param _thirdToken       getToken Address
     * @param inputAmount       inputAmount
     */
    function multiQuoterTokenToToken(
        address _firstToken,
        address _secondToken,
        address _thirdToken,
        uint256 inputAmount
    )
        external
        returns (uint256);
    
    /**
     * @dev                     Token -> Token Know how much token can get
     * @param _inputToken       inputToken Address
     * @param _outputToken      outputToken Address
     * @param _fee              fee
     * @param _inputAmount       inputAmount
     */
    function tokenABQuoter(
        address _inputToken,
        address _outputToken,
        uint24 _fee,
        uint256 _inputAmount
    )
        external
        returns (uint256 amountOut);


    /**
     * @dev                         Token -> Token Know how much token inputAmount
     * @param _inputToken           inputToken Address
     * @param _outputToken          outputToken Address
     * @param _fee                  fee
     * @param _exactOutputAmount    outputAmount
     */
    function exactOutputQuoter(
        address _inputToken,
        address _outputToken,
        uint24 _fee,
        uint256 _exactOutputAmount
    )
        external
        returns (uint256 amountIn);

    /**
     * @dev                         inputToken -> middleToken -> outputToken Know how much token inputAmount
     * @param _inputToken           inputToken Address
     * @param _middleToken          middle Address
     * @param _outputToken          outputToken Address
     * @param _fee                  fee
     * @param _exactOutputAmount    outputAmount
     */
    function multiExactOutputQuoter(
        address _inputToken,
        address _middleToken,
        address _outputToken,
        uint24 _fee,
        uint256 _exactOutputAmount
    )
        external
        returns (uint256 amountIn);
}