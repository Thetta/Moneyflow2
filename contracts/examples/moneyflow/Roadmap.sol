pragma solidity ^0.4.24;

import "../../ether/WeiAbsoluteExpense.sol";
import "../../ether/WeiSplitter.sol";


contract Roadmap {

	constructor(uint _sum1, uint _sum2, uint _sum3) {
		WeiSplitter roadmap = new WeiSplitter();

		WeiAbsoluteExpense milestone1 = new WeiAbsoluteExpense(_sum1, 0);
		WeiAbsoluteExpense milestone2 = new WeiAbsoluteExpense(_sum2, 0);
		WeiAbsoluteExpense milestone3 = new WeiAbsoluteExpense(_sum3, 0);
		roadmap.addChild(milestone1);
		roadmap.addChild(milestone2);
		roadmap.addChild(milestone3);
	}

	function() public {}
}