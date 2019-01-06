pragma solidity ^0.4.24;

import "../bases/ExpenseBase.sol";

import "../interfaces/IDestination.sol";
import "../interfaces/IReceiver.sol";
import "../interfaces/IWeiReceiver.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title WeiExpense
 * @dev Something that needs money (task, salary, bonus, etc)
 * Should be used in the Moneyflow so will automatically receive Wei.
*/
contract WeiExpense is IWeiReceiver, IDestination, ExpenseBase {
	constructor(uint128 _totalNeeded, uint128 _minAmount, uint32 _partsPerMillion, uint32 _periodHours, bool _isSlidingAmount, bool _isPeriodic) ExpenseBase(_totalNeeded, _minAmount, _partsPerMillion, _periodHours, _isSlidingAmount, _isPeriodic) public {}

	function processFunds(uint _currentFlow) public payable {
		emit ExpenseProcessAmount(msg.sender, msg.value, _currentFlow);
		expense = _processAmount(expense, _currentFlow, msg.value);
	}

	function flush() public onlyOwner {
		_processFlushTo(expense);
		emit ExpenseFlush(owner, address(this).balance);
		owner.transfer(address(this).balance);
	}

	function flushTo(address _to) public onlyOwner {
		_processFlushTo(expense);
		emit ExpenseFlush(_to, address(this).balance);
		_to.transfer(address(this).balance);
	}	
}
