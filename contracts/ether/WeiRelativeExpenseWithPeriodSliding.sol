pragma solidity ^0.4.23;

import "./WeiExpense.sol";


contract WeiRelativeExpenseWithPeriodSliding is WeiExpense {
	constructor(uint _partsPerMillion, uint _periodHours) public 
		WeiExpense(0, _partsPerMillion, _periodHours, true, true)
	{}
}
