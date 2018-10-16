pragma solidity ^0.4.23;

import "./WeiExpense.sol";


contract WeiAbsoluteExpenseWithPeriodSliding is WeiExpense { 
	constructor(uint _neededWei, uint _periodHours) public
		WeiExpense(_neededWei, 0, _periodHours, false, true)
	{}
}