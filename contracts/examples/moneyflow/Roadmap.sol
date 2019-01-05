pragma solidity ^0.4.24;

import "../../ether/WeiAbsoluteExpense.sol";
import "../../ether/WeiSplitter.sol";


contract Roadmap {

	constructor(uint128 _sum1, uint128 _sum2, uint128 _sum3) {
		WeiSplitter roadmap = new WeiSplitter();

		WeiAbsoluteExpense milestone1 = new WeiAbsoluteExpense(0, _sum1);
		WeiAbsoluteExpense milestone2 = new WeiAbsoluteExpense(0, _sum2);
		WeiAbsoluteExpense milestone3 = new WeiAbsoluteExpense(0, _sum3);
		roadmap.addChild(milestone1);
		roadmap.addChild(milestone2);
		roadmap.addChild(milestone3);
	}

	function() public {}
}