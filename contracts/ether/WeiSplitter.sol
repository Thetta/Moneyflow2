pragma solidity ^0.4.24;

import "../SplitterBase.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

import "../interfaces/ISplitter.sol";
import "../interfaces/IWeiReceiver.sol";

/**
 * @title WeiSplitter 
 * @dev Will split money from top to down (order matters!). It is possible for some children to not receive money 
 * if they have ended. 
*/
contract WeiSplitter is SplitterBase, ISplitter, IWeiReceiver, Ownable {
	Splitter splitter;

	constructor() public {
		splitter = constructSplitter(false);
	}

	function open() public onlyOwner {
		openSplitter(splitter);
	}

	function close() public onlyOwner {
		closeSplitter(splitter);
	}	

	function getReceiverType() public view returns(Type) {
		return Type.Splitter;
	}

	function getMinWeiNeeded(uint _currentFlow) public view returns(uint) {
		return getSplitterMinNeeded(splitter, _currentFlow);
	}

	function getTotalWeiNeeded(uint _currentFlow)public view returns(uint) {
		return getSplitterTotalNeeded(splitter, _currentFlow);
	}

	function isNeedsMoney() public view returns(bool) {
		return isSplitterNeeds(splitter);
	}

	function processFunds(uint _currentFlow) public payable {
		processWeiSplitterFunds(splitter, _currentFlow, msg.value);
	}

	function addChild(address _newChild) public onlyOwner {
		addChildToSplitter(splitter, 0, _newChild);
	}

	function isOpen() public view returns(bool) {
		return splitter.isOpen;
	}

	function getChildrenCount()public view returns(uint) {
		return splitter.addresses.length;
	}

	function getChild(uint _index)public view returns(address) {
		return splitter.addresses[_index];
	}

	function() public {}	
}