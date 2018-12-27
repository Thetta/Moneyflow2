pragma solidity ^0.4.24;


/**
 * @title IWeiReceiver 
 * @dev Something that needs funds 
*/
contract IWeiReceiver {
	function processFunds(uint _currentFlow) public payable;
}