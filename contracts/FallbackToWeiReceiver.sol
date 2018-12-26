pragma solidity ^0.4.23;

import "./interfaces/IReceiver.sol";


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

	function()public payable {
		IReceiver iwr = IReceiver(output);
		iwr.processFunds.value(msg.value)(msg.value);
	}
}