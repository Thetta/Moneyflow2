pragma solidity ^0.5.0;

import "./WeiExpense.sol";


contract WeiAbsoluteExpenseWithPeriod is WeiExpense { 
	constructor(uint128 _minAmount, uint128 _totalWeiNeed, uint32 _periodHours) public
		WeiExpense(_minAmount, _totalWeiNeed, 0, _periodHours, false, true)
	{}
}