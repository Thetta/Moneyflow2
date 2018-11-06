pragma solidity ^0.4.23;

import "./WeiExpense.sol";


contract WeiAbsoluteExpenseWithPeriod is WeiExpense { 
	constructor(uint _minWeiAmount, uint _totalWeiNeed, uint _periodHours) public
		WeiExpense(_minWeiAmount, _totalWeiNeed, 0, _periodHours, false, true)
	{}
}