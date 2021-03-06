pragma solidity ^0.5.0;

import "./WeiExpense.sol";


contract WeiRelativeExpenseWithPeriod is WeiExpense {
	constructor(uint32 _partsPerMillion, uint32 _periodHours) public 
		WeiExpense(0, 0, _partsPerMillion, _periodHours, false, true)
	{}
}
