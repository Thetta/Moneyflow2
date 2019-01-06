pragma solidity ^0.4.24;

import "./IReceiver.sol";
import "./IReceiver.sol";


contract ITable {
	function getPartsPerMillionAt(uint _eId) public view returns(uint ppm);
	function isNeedsAt(uint _eId) public view returns(bool);
	function getMinNeededAt(uint _eId, uint _currentFlow) public view returns(uint);
	function getTotalNeededAt(uint _eId, uint _currentFlow) public view returns(uint);
	function balanceAt(uint _eId) public view returns(uint);
	function addChildAt(uint _splitterId, uint _childId) public;
	function isExpenseAt(uint _eId) public view returns(bool isExpense);
	function isSplitterAt(uint _eId) public view returns(bool isSplitter);
	function openAt(uint _eId) public;
	function closeAt(uint _eId) public;
	function isOpenAt(uint _eId) public view returns(bool);
	function getChildrenCountAt(uint _eId) public view returns(uint);
	function getChildIdAt(uint _eId, uint _index) public view returns(uint);
	function flushAt(uint _eId) public;
	function flushToAt(uint _eId, address _to) public;

	function getReceiverTypeAt(uint _eId) public view returns(IReceiver.Type);
}