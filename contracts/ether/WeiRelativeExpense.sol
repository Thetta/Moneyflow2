pragma solidity ^0.5.0;

import "./WeiExpense.sol";


contract WeiRelativeExpense is WeiExpense {
	constructor(uint32 _partsPerMillion) public 
		WeiExpense(0, 0, _partsPerMillion, 0, false, false)
	{}
}