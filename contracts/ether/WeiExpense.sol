pragma solidity ^0.4.24;

import "../ExpenseBase.sol";

import "../interfaces/IDestination.sol";
import "../interfaces/IWeiReceiver.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title WeiExpense
 * @dev Something that needs money (task, salary, bonus, etc)
 * Should be used in the Moneyflow so will automatically receive Wei.
*/
contract WeiExpense is ExpenseBase, IWeiReceiver, IDestination, Ownable {
	Expense public expense;

	constructor(uint _totalWeiNeeded, uint _minWeiAmount, uint _partsPerMillion, uint _periodHours, bool _isSlidingAmount, bool _isPeriodic) public {
		expense = constructExpense(uint128(_totalWeiNeeded), uint128(_minWeiAmount), uint32(_partsPerMillion), uint32(_periodHours), _isSlidingAmount, _isPeriodic);
	}

	function getReceiverType() public view returns(Type) {
		if(0 != expense.partsPerMillion) {
			return Type.Relative;
		} else {
			return Type.Absolute;
		}
	}

	function processFunds(uint _currentFlow) public payable {
		emit ExpenseProcessFunds(msg.sender, msg.value, _currentFlow);
		expense = processWeiExpenseFunds(expense, _currentFlow, msg.value);
	}

	function getIsMoneyReceived() public view returns(bool) {
		return expense.totalReceived > 0;
	}

	function getNeededWei() public view returns(uint) {
		return expense.totalNeeded;
	}

	function getTotalWeiNeeded(uint _currentFlow)public view returns(uint) {
		return getExpenseTotalNeeded(expense, _currentFlow);
	}

	function getMinWeiNeeded(uint _currentFlow) public view returns(uint) {
		return getExpenseMinNeeded(expense, _currentFlow);
	}

	function getMomentReceived()public view returns(uint) {
		return expense.momentReceived;
	}

	function isNeedsMoney()public view returns(bool) {
		return isExpenseNeeds(expense);
	}

	function getPartsPerMillion()public view returns(uint) {
		return expense.partsPerMillion;
	}

	function flush()public onlyOwner {
		emit ExpenseFlush(owner, address(this).balance);
		owner.transfer(address(this).balance);
		expense.balance = 0;
	}

	function flushTo(address _to) public onlyOwner {
		emit ExpenseFlush(_to, address(this).balance);
		_to.transfer(address(this).balance);
		expense.balance = 0;
	}

	function setNeededWei(uint _totalWeiNeeded) public onlyOwner {
		emit ExpenseSetNeeded(_totalWeiNeeded);
		expense.totalNeeded = uint128(_totalWeiNeeded);
	}

	function setPercents(uint _partsPerMillion) public onlyOwner {
		emit ExpenseSetPercents(_partsPerMillion);
		expense.partsPerMillion = uint32(_partsPerMillion);
	}

	function() public {}
}
