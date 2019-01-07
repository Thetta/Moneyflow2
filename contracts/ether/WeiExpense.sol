pragma solidity ^0.5.0;

import "../bases/ExpenseBase.sol";

import "../interfaces/IDestination.sol";
import "../interfaces/IReceiver.sol";
import "../interfaces/IWeiReceiver.sol";

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";


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
		address payable ownerPayable = address(uint160(owner()));
		_processFlushTo(expense);
		emit ExpenseFlush(ownerPayable, address(this).balance);
		ownerPayable.transfer(address(this).balance);
	}

	function flushTo(address _to) public onlyOwner {
		address payable toPayable = address(uint160(_to));
		_processFlushTo(expense);
		emit ExpenseFlush(toPayable, address(this).balance);
		toPayable.transfer(address(this).balance);
	}	
}
