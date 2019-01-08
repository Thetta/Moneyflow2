pragma solidity ^0.5.0;


/**
 * @title IWeiReceiver 
 * @dev Something that needs funds 
*/
contract IWeiReceiver {
	function processFunds(uint _currentFlow) public payable;
}