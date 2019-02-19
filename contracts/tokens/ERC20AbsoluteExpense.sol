pragma solidity ^0.5.0;

import "./ERC20Expense.sol";


contract ERC20AbsoluteExpense is ERC20Expense {
	constructor(address _tokenAddress, uint128 _minAmount, uint128 _totalNeeded) public 
		ERC20Expense(_tokenAddress, _minAmount, _totalNeeded, 0, 0, false, false)
	{}
}