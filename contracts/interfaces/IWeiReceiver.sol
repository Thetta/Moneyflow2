pragma solidity ^0.4.23;

import "./IReceiver.sol";


// IWeiReceiver does not store funds!
//
// There are 2 types of Outputs:
// "Absolute": fixed amount of Wei
// "Relative": percents of input 
contract IWeiReceiver is IReceiver {

	enum Type {
		Absolute,
		Relative,
		Splitter,
		Table
	}

	// Will calculate only absolute outputs, but not take into account the Percents
	function getMinWeiNeeded(uint _inputWei) public view returns(uint);

	// In case we have absolute output -> will return fixed amount that is equal to 'getMinWeiNeeded'
	// In case we have relative output -> will calculate percents of _inputWei 
	function getTotalWeiNeeded(uint _inputWei) public view returns(uint);

	function getReceiverType() public view returns(Type);
}