pragma solidity ^0.4.24;

import "./ERC20Expense.sol";


contract ERC20RelativeExpenseWithPeriod is ERC20Expense {
	constructor(address _tokenAddress, uint _partsPerMillion, uint _periodHours) public 
		ERC20Expense(_tokenAddress, 0, 0, _partsPerMillion, _periodHours, false, true)
	{}
}
