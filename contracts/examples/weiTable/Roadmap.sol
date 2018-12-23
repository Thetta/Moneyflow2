pragma solidity ^0.4.24;

import "../../ether/WeiTable.sol";


// this contract is an owner of weiTable; so, no one else can modify scheme
// while this contract have no modifying methods, the scheme is constant
contract Roadmap {
	WeiTable weiTable;
	uint roadmap;
	uint milestone1;
	uint milestone2;
	uint milestone3;

	constructor(uint128 _sum1, uint128 _sum2, uint128 _sum3) {
		WeiTable weiTable = new WeiTable();
		weiTable.addSplitter();
		uint roadmap = weiTable.getLastNodeId();

		weiTable.addAbsoluteExpense(_sum1, 0, false, false, 0);
		uint milestone1 = weiTable.getLastNodeId();

		weiTable.addAbsoluteExpense(_sum2, 0, false, false, 0);
		uint milestone2 = weiTable.getLastNodeId();

		weiTable.addAbsoluteExpense(_sum3, 0, false, false, 0);
		uint milestone3 = weiTable.getLastNodeId();

		weiTable.addChildAt(roadmap, milestone1);
		weiTable.addChildAt(roadmap, milestone2);
		weiTable.addChildAt(roadmap, milestone3);
	}

	function() public {}
}