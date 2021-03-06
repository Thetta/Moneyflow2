pragma solidity ^0.5.0;

import "../bases/SplitterBase.sol";

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

import "../interfaces/ISplitter.sol";
import "../interfaces/ITokenReceiver.sol";
import "../interfaces/IReceiver.sol";


/**
 * @title Splitter 
 * @dev Will split money from top to down (order matters!). It is possible for some children to not receive money 
 * if they have ended. 
*/
contract ERC20Splitter is ITokenReceiver, SplitterBase {
	ERC20 public token;

	constructor(address _tokenAddress) SplitterBase() public {
		token = ERC20(_tokenAddress);
	}

	function _elementProcessing(address _target, uint _currentFlow, uint _value) internal {
		token.approve(_target, _value);
		ITokenReceiver(_target).processTokens(_currentFlow, _value);
	}

	function processTokens(uint _currentFlow, uint _value) public {
		require(_value <= token.allowance(msg.sender, address(this)));
		token.transferFrom(msg.sender, address(this), _value);
		_processAmount(splitter, _currentFlow, _value);
	}		
}