pragma solidity ^0.4.24;

import "../bases/SplitterBase.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

import "../interfaces/ISplitter.sol";
import "../interfaces/IWeiReceiver.sol";
import "../interfaces/IReceiver.sol";


/**
 * @title Splitter 
 * @dev Will split money from top to down (order matters!). It is possible for some children to not receive money 
 * if they have ended. 
*/
contract WeiSplitter is IWeiReceiver, SplitterBase {
	constructor() SplitterBase() public {}

	function _elementProcessing(address _target, uint _flow, uint _need) internal {
		IWeiReceiver(_target).processFunds.value(_need)(_flow); 
	}	

	function processFunds(uint _currentFlow) public payable {
		_processAmount(splitter, _currentFlow, msg.value);
	}
}