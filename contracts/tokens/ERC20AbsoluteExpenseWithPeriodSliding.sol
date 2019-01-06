pragma solidity ^0.4.24;

import "./ERC20Expense.sol";


contract ERC20AbsoluteExpenseWithPeriodSliding is ERC20Expense { 
	constructor(address _tokenAddress, uint128 _minAmount, uint128 _totalNeeded, uint32 _periodHours) public
		ERC20Expense(_tokenAddress, _minAmount, _totalNeeded, 0, _periodHours, true, true)
	{}
}