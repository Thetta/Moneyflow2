pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;
import "../libs/ExpenseLib.sol";

import "../interfaces/IDestination.sol";
import "../interfaces/IReceiver.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title WeiExpense
 * @dev Something that needs money (task, salary, bonus, etc)
 * Should be used in the Moneyflow so will automatically receive Wei.
*/
contract ExpenseBase is ExpenseLib, IReceiver, Ownable {
	Expense public expense;
	
	function getReceiverType() public view returns(Type) {
		if(0 != expense.partsPerMillion) {
			return Type.Relative;
		} else {
			return Type.Absolute;
		}
	}

	function getExpenseParams() public view returns(uint128 totalNeeded, uint128 minAmount, uint32 partsPerMillion, uint32 periodHours, uint32 momentReceived, uint128 balance, uint128 totalReceived, uint32 momentCreated) {
		totalNeeded = expense.totalNeeded;
		minAmount = expense.minAmount;
		partsPerMillion = expense.partsPerMillion;
		periodHours = expense.periodHours;
		momentReceived = expense.momentReceived;
		balance = expense.balance;
		totalReceived = expense.totalReceived;
		momentCreated = expense.momentCreated;
	}

	function getTotalNeeded(uint _currentFlow) public view returns(uint) {
		return _getTotalNeeded(expense, _currentFlow);
	}

	function getMinNeeded(uint _currentFlow) public view returns(uint) {
		return _getMinNeeded(expense, _currentFlow);
	}

	function isNeeds() public view returns(bool) {
		return _isNeeds(expense);
	}

	function setNeededWei(uint _totalNeeded) public onlyOwner {
		emit ExpenseSetNeeded(_totalNeeded);
		expense.totalNeeded = uint128(_totalNeeded);
	}

	function setPercents(uint _partsPerMillion) public onlyOwner {
		emit ExpenseSetPercents(_partsPerMillion);
		expense.partsPerMillion = uint32(_partsPerMillion);
	}

	function() public {}
}
