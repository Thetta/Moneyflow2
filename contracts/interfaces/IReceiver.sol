pragma solidity ^0.4.24;


/**
 * @title IReceiver 
 * @dev Something that needs funds 
*/
contract IReceiver {
	// If this output needs more funds -> will return true
	// If this output does not need more funds -> will return false 
	function isNeedsMoney() public view returns(bool);

	// WeiReceiver should process all tokens here (hold it or send it somewhere else)
	function processFunds(uint _currentFlow) public payable;
}