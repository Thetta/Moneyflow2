pragma solidity ^0.4.24;

import "../bases/TableBase.sol";
import "../bases/ExpenseBase.sol";
import "../bases/SplitterBase.sol";

import "../interfaces/IReceiver.sol";
import "../interfaces/IWeiReceiver.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


contract WeiTable is ITable, IReceiver, IWeiReceiver, TableBase {
	// -------------------- WEI-SPECIFIC IMPLEMENTATIONS --------------------

	function processFunds(uint _currentFlow) public payable {
		return _processAmountAt(0, _currentFlow, msg.value);
	}

	function flushAt(uint _eId) public onlyOwner isCorrectId(_eId) {
		owner.transfer(expenses[_eId].balance);
		_processFlushToAt(_eId, owner);
	}

	function flushToAt(uint _eId, address _to) public onlyOwner isCorrectId(_eId) {
		_to.transfer(expenses[_eId].balance);
		_processFlushToAt(_eId, _to);
	}
}