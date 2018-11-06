pragma solidity ^0.4.24;

import "./WeiExpense.sol";


contract WeiAbsoluteExpense is WeiExpense {
	constructor(uint _minWeiAmount, uint _totalWeiNeed) public 
		WeiExpense(_minWeiAmount, _totalWeiNeed, 0, 0, false, false)
	{}
}