pragma solidity ^0.4.24;

import "../bases/TableBase.sol";
import "../bases/ExpenseBase.sol";
import "../bases/SplitterBase.sol";

import "../interfaces/IReceiver.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


contract WeiTable is ITable, IReceiver, TableBase {
	// -------------------- WEI-SPECIFIC IMPLEMENTATIONS --------------------

	function flushAt(uint _eId) public onlyOwner isCorrectId(_eId) {
		owner.transfer(expenses[_eId].balance);
		_processFlushToAt(_eId, owner);
	}

	function flushToAt(uint _eId, address _to) public onlyOwner isCorrectId(_eId) {
		_to.transfer(expenses[_eId].balance);
		_processFlushToAt(_eId, _to);
	}

	function _tableProcessing(address _target, uint _eId, uint _flow, uint _need) internal {
		_processFundsAt(_eId, _flow, _need);
	}

	function() public {
	}
}