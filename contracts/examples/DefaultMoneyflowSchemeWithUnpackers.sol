pragma solidity ^0.4.23;

import "./DefaultMoneyflowScheme.sol";


// TODO:
contract DefaultMoneyflowSchemeWithUnpackers is DefaultMoneyflowScheme {
	constructor(
			address _fundOutput, 
			uint _percentsReserve, 
			uint _dividendsReserve) public 
		DefaultMoneyflowScheme(_fundOutput,_percentsReserve,_dividendsReserve)
	{
	}

	function addNewTaskGeneric(bytes32[] _params) view public {
		IReceiver _iwr = IReceiver(address(_params[0]));
		addNewTask(_iwr);
	}

	// TODO: add unpackers for all methods of the Scheme
}
