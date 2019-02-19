pragma solidity ^0.5.0;

import "./ERC20Expense.sol";


contract ERC20RelativeExpenseWithPeriod is ERC20Expense {
	constructor(address _tokenAddress, uint32 _partsPerMillion, uint32 _periodHours) public 
		ERC20Expense(_tokenAddress, 0, 0, _partsPerMillion, _periodHours, false, true)
	{}
}
