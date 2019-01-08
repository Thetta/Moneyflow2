pragma solidity ^0.5.0;

import "../../ether/WeiAbsoluteExpense.sol";
import "../../ether/WeiSplitter.sol";


contract Roadmap {

	constructor(uint128 _sum1, uint128 _sum2, uint128 _sum3) public {
		WeiSplitter roadmap = new WeiSplitter();

		WeiAbsoluteExpense milestone1 = new WeiAbsoluteExpense(0, _sum1);
		WeiAbsoluteExpense milestone2 = new WeiAbsoluteExpense(0, _sum2);
		WeiAbsoluteExpense milestone3 = new WeiAbsoluteExpense(0, _sum3);
		roadmap.addChild(address(milestone1));
		roadmap.addChild(address(milestone2));
		roadmap.addChild(address(milestone3));
	}

	function() external {}
}