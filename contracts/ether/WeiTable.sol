pragma solidity ^0.4.24;

import "../TableBase.sol";
import "../ExpenseBase.sol";
import "../SplitterBase.sol";

import "../interfaces/IWeiReceiver.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


contract WeiTable is ITable, IWeiReceiver, TableBase {

	function getReceiverType() public view returns(IReceiver.Type) {
		return IReceiver.Type.Table;
	}

	// -------------------- IWEIRECEIVER FUNCTIONS --------------------
	function isNeedsMoney() public view returns(bool) {
		return isNeedsAt(0);
	}

	function getPartsPerMillion() public view returns(uint) {
		return getPartsPerMillionAt(0);
	}

	function processFunds(uint _currentFlow) public payable {
		return processFundsAt(0, _currentFlow, msg.value);
	}

	function getMinWeiNeeded(uint _currentFlow) public view returns(uint) {
		return getMinNeededAt(0, _currentFlow);
	}

	function getTotalWeiNeeded(uint _currentFlow) public view returns(uint) {
		return getTotalNeededAt(0, _currentFlow);
	}

	// -------------------- WEI-SPECIFIC IMPLEMENTATIONS --------------------

	function flushAt(uint _eId) public onlyOwner isCorrectId(_eId) {
		owner.transfer(expenses[_eId].balance);
		emit NodeFlushTo(_eId, owner, expenses[_eId].balance);
		expenses[_eId].balance = 0;
	}

	function flushToAt(uint _eId, address _to) public onlyOwner isCorrectId(_eId) {
		_to.transfer(expenses[_eId].balance);
		emit NodeFlushTo(_eId, _to, expenses[_eId].balance);
		expenses[_eId].balance = 0;
	}

	function processFundsAt(uint _eId, uint _currentFlow, uint _amount) public isCorrectId(_eId) {		
		if(isExpenseAt(_eId)) {		
			expenses[_eId] = processWeiExpenseFunds(expenses[_eId], _currentFlow, _amount);
		} else {
			processWeiSplitterFunds(splitters[_eId], _currentFlow, _amount);
		}
	}		

	function() public {
	}
}