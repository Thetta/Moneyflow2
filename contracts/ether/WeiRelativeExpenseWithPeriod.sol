pragma solidity ^0.4.24;

import "./WeiExpense.sol";


contract WeiRelativeExpenseWithPeriod is WeiExpense {
	constructor(uint _partsPerMillion, uint _periodHours) public 
		WeiExpense(0, 0, _partsPerMillion, _periodHours, false, true)
	{}
}
