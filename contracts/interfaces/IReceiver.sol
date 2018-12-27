pragma solidity ^0.4.24;


/**
 * @title IReceiver 
 * @dev Something that needs funds 
*/
contract IReceiver {
	enum Type {
		Absolute,
		Relative,
		Splitter,
		Table
	}

	// If this output needs more funds -> will return true
	// If this output does not need more funds -> will return false 
	function isNeeds() public view returns(bool);

	// Receiver should process all funds here (hold it or send it somewhere else)
	// function processFunds(uint _currentFlow) public payable;

	function getMinNeeded(uint _inputWei) public view returns(uint);

	// In case we have absolute output -> will return fixed amount that is equal to 'getMinNeeded'
	// In case we have relative output -> will calculate percents of _inputWei 
	function getTotalNeeded(uint _inputWei) public view returns(uint);

	function getReceiverType() public view returns(Type);	
}