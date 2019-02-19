pragma solidity ^0.5.0;

import "../bases/TableBase.sol";
import "../bases/ExpenseBase.sol";
import "../bases/SplitterBase.sol";

import "../interfaces/IReceiver.sol";
import "../interfaces/IWeiReceiver.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";


contract WeiTable is ITable, IReceiver, IWeiReceiver, TableBase {
	// -------------------- WEI-SPECIFIC IMPLEMENTATIONS --------------------

	function processFunds(uint _currentFlow) public payable {
		return _processAmountAt(0, _currentFlow, msg.value);
	}

	function flushAt(uint _eId) public onlyOwner isCorrectId(_eId) {
		address payable ownerPayable = address(uint160(owner()));
		ownerPayable.transfer(expenses[_eId].balance);
		emit NodeFlushTo(_eId, owner(), expenses[_eId].balance);
		_processFlushToAt(_eId);
	}

	function flushToAt(uint _eId, address _to) public onlyOwner isCorrectId(_eId) {
		address payable toPayable = address(uint160(_to));
		toPayable.transfer(expenses[_eId].balance);
		emit NodeFlushTo(_eId, _to, expenses[_eId].balance);
		_processFlushToAt(_eId);
	}
}