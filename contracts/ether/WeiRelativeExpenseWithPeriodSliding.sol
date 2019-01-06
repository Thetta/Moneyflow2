pragma solidity ^0.4.24;

import "./WeiExpense.sol";


contract WeiRelativeExpenseWithPeriodSliding is WeiExpense {
	constructor(uint32 _partsPerMillion, uint32 _periodHours) public 
		WeiExpense(0, 0, _partsPerMillion, _periodHours, true, true)
	{}
}
