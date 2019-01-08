pragma solidity ^0.5.0;

import "../libs/SplitterLib.sol";

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "../interfaces/ISplitter.sol";
import "../interfaces/IReceiver.sol";


/**
 * @title Splitter 
 * @dev Will split money from top to down (order matters!). It is possible for some children to not receive money 
 * if they have ended. 
*/
contract SplitterBase is SplitterLib, IReceiver, ISplitter, Ownable {
	Splitter splitter;

	constructor() public {
		splitter = _constructSplitter(false);
	}
	
	// --------------------- UNIVERSAL INTERFACE --------------------- 
	function getMinNeeded(uint _currentFlow) public view returns(uint) {
		return _getMinNeeded(splitter, _currentFlow);
	}

	function getTotalNeeded(uint _currentFlow) public view returns(uint) {
		return _getTotalNeeded(splitter, _currentFlow);
	}

	function isNeeds() public view returns(bool) {
		return _isNeeds(splitter);
	}

	function open() public onlyOwner {
		_open(splitter);
	}

	function close() public onlyOwner {
		_close(splitter);
	}

	function getReceiverType() public view returns(Type) {
		return Type.Splitter;
	}

	function addChild(address _newChild) public onlyOwner {
		_addChild(splitter, 0, _newChild);
	}

	function isOpen() public view returns(bool) {
		return splitter.isOpen;
	}

	function getChildrenCount() public view returns(uint) {
		return splitter.addresses.length;
	}

	function getChild(uint _index) public view returns(address) {
		return splitter.addresses[_index];
	}

	function() external {}	
}