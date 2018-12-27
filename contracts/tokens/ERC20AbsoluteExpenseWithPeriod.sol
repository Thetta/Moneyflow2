pragma solidity ^0.4.24;

import "./ERC20Expense.sol";


contract ERC20AbsoluteExpenseWithPeriod is ERC20Expense { 
	constructor(address _tokenAddress, uint _minERC20Amount, uint _totalERC20Need, uint _periodHours) public
		ERC20Expense(_tokenAddress, _minERC20Amount, _totalERC20Need, 0, _periodHours, false, true)
	{}
}