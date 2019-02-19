pragma solidity ^0.5.0;

import "./WeiExpense.sol";


contract WeiAbsoluteExpense is WeiExpense {
	constructor(uint128 _minAmount, uint128 _totalWeiNeed) public 
		WeiExpense(_minAmount, _totalWeiNeed, 0, 0, false, false)
	{}
}