pragma solidity ^0.4.24;


/**
 * @title ITokenReceiver 
 * @dev Something that needs tokens 
*/
contract ITokenReceiver {
	function processTokens(uint _currentFlow, uint _value) public;
}