pragma solidity ^0.4.24;

import "./ExpenseLib.sol";

import "./interfaces/IDestination.sol";
import "./interfaces/IReceiver.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title WeiExpense
 * @dev Something that needs money (task, salary, bonus, etc)
 * Should be used in the Moneyflow so will automatically receive Wei.
*/
contract ExpenseBase is ExpenseLib, IReceiver, IDestination, Ownable {
	Expense public expense;
	
	function getReceiverType() public view returns(Type) {
		if(0 != expense.partsPerMillion) {
			return Type.Relative;
		} else {
			return Type.Absolute;
		}
	}

	function processFunds(uint _currentFlow) public payable {
		emit ExpenseProcessFunds(msg.sender, msg.value, _currentFlow);
		expense = _processFunds(expense, _currentFlow, msg.value);
	}

	function getIsMoneyReceived() public view returns(bool) {
		return expense.totalReceived > 0;
	}

	function getNeededWei() public view returns(uint) {
		return expense.totalNeeded;
	}

	function getTotalNeeded(uint _currentFlow)public view returns(uint) {
		return _getTotalNeeded(expense, _currentFlow);
	}

	function getMinNeeded(uint _currentFlow) public view returns(uint) {
		return _getMinNeeded(expense, _currentFlow);
	}

	function getMomentReceived()public view returns(uint) {
		return expense.momentReceived;
	}

	function isNeeds()public view returns(bool) {
		return _isNeeds(expense);
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
