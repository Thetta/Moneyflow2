pragma solidity ^0.4.24;

import "./interfaces/IWeiReceiver.sol";


/**
 * @title FallbackToWeiReceiver
 * @dev Easy-to-use wrapper to convert fallback -> processFunds()
 * fallback -> processFunds
*/
contract FallbackToWeiReceiver {
	address output = 0x0;

	// _output should be IReceiver
	constructor(address _output) public {
		output = _output;
	}

	function() public payable {
		IWeiReceiver iwr = IWeiReceiver(output);
		iwr.processFunds.value(msg.value)(msg.value);
	}
}