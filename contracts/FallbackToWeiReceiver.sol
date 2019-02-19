pragma solidity ^0.5.0;

import "./interfaces/IWeiReceiver.sol";


/**
 * @title FallbackToWeiReceiver
 * @dev Easy-to-use wrapper to convert fallback -> processFunds()
 * fallback -> processFunds
*/
contract FallbackToWeiReceiver {
	address output = address(0);

	// _output should be IReceiver
	constructor(address _output) public {
		output = _output;
	}

	function() external payable {
		IWeiReceiver iwr = IWeiReceiver(output);
		iwr.processFunds.value(msg.value)(msg.value);
	}
}