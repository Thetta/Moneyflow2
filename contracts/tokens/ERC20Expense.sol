pragma solidity ^0.4.24;

import "../bases/ExpenseBase.sol";

import "../interfaces/IDestination.sol";
import "../interfaces/IReceiver.sol";
import "../interfaces/ITokenReceiver.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/token/ERC20/ERC20.sol";


/**
 * @title ERC20Expense
 * @dev Something that needs money (task, salary, bonus, etc)
 * Should be used in the Moneyflow so will automatically receive ERC20.
*/
contract ERC20Expense is ITokenReceiver, IDestination, ExpenseBase {
	ERC20 public token;

	constructor(address _tokenAddress, uint128 _totalNeeded, uint128 _minAmount, uint32 _partsPerMillion, uint32 _periodHours, bool _isSlidingAmount, bool _isPeriodic)
		ExpenseBase(_totalNeeded, _minAmount, _partsPerMillion, _periodHours, _isSlidingAmount, _isPeriodic) public 
	{
		token = ERC20(_tokenAddress);
	}

	event ProcessTokensExpense(address sender, address target, uint _value);
	function processTokens(uint _currentFlow, uint _value) public {
		require(_value <= token.allowance(msg.sender, address(this)));
		token.transferFrom(msg.sender, address(this), _value);
		emit ProcessTokensExpense(msg.sender, address(this), _value);
		expense = _processAmount(expense, _currentFlow, _value);
	}

	function flush() public onlyOwner {
		token.transfer(owner, expense.balance);
		expense = _processFlushTo(expense, owner);
	}

	function flushTo(address _to) public onlyOwner {
		token.transfer(_to, expense.balance);
		expense = _processFlushTo(expense, _to);	
	}	
}
