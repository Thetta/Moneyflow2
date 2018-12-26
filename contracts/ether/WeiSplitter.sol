pragma solidity ^0.4.24;

import "../SplitterBase.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

import "../interfaces/ISplitter.sol";
import "../interfaces/IReceiver.sol";


/**
 * @title Splitter 
 * @dev Will split money from top to down (order matters!). It is possible for some children to not receive money 
 * if they have ended. 
*/
contract WeiSplitter is SplitterBase {
	constructor() public {
		splitter = _constructSplitter(false);
	}

	function _elementProcessing(address _target, uint _flow, uint _need) internal {
		IReceiver(_target).processFunds.value(_need)(_flow); 
	}	
}