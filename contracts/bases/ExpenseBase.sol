pragma solidity ^0.4.24;

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

	constructor(uint128 _totalNeeded, uint128 _minAmount, uint32 _partsPerMillion, uint32 _periodHours, bool _isSlidingAmount, bool _isPeriodic) public {
		expense = _constructExpense(_totalNeeded, _minAmount, _partsPerMillion, _periodHours, _isSlidingAmount, _isPeriodic);
	}
	
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

	function setTotalNeeded(uint128 _totalNeeded) public onlyOwner {
		require(expense.partsPerMillion == 0);
		require(_totalNeeded > 0);
		require(expense.minAmount <= _totalNeeded);
		if(expense.minAmount != 0) {
			require((_totalNeeded % expense.minAmount) == 0);
		}

		emit ExpenseSetTotalNeeded(_totalNeeded);
		expense.totalNeeded = _totalNeeded;
	}

	function setMinAmount(uint128 _minAmount) public onlyOwner {
		require(expense.partsPerMillion == 0);
		require(_minAmount <= expense.totalNeeded);
		require(_minAmount == uint128(_minAmount));
		if(_minAmount != 0) {
			require((expense.totalNeeded % _minAmount) == 0);
		}

		emit ExpenseSetMinAmount(_minAmount);
		expense.minAmount = _minAmount;
	}	

	function setPercents(uint32 _partsPerMillion) public onlyOwner {
		require(expense.totalNeeded == 0);
		require(_partsPerMillion <= 1e7);
		emit ExpenseSetPercents(_partsPerMillion);
		expense.partsPerMillion = _partsPerMillion;
	}

	function() public {}
}
