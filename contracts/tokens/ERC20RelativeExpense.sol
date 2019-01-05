pragma solidity ^0.4.24;

import "./ERC20Expense.sol";


contract ERC20RelativeExpense is ERC20Expense {
	constructor(address _tokenAddress, uint32 _partsPerMillion) public 
		ERC20Expense(_tokenAddress, 0, 0, _partsPerMillion, 0, false, false)
	{}
}