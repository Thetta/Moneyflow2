pragma solidity ^0.4.24;

import "./WeiExpense.sol";


contract WeiAbsoluteExpenseWithPeriodSliding is WeiExpense { 
	constructor(uint128 _minAmount, uint128 _totalWeiNeed, uint32 _periodHours) public
		WeiExpense(_minAmount, _totalWeiNeed, 0, _periodHours, true, true)
	{}
}