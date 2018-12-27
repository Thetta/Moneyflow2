pragma solidity ^0.4.24;

import "./WeiExpense.sol";


contract WeiRelativeExpense is WeiExpense {
	constructor(uint _partsPerMillion) public 
		WeiExpense(0, 0, _partsPerMillion, 0, false, false)
	{}
}