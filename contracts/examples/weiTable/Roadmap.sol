pragma solidity ^0.5.0;

import "../../ether/WeiTable.sol";


// this contract is an owner() of weiTable; so, no one else can modify scheme
// while this contract have no modifying methods, the scheme is constant
contract Roadmap {
	WeiTable weiTable;
	uint roadmap;
	uint milestone1;
	uint milestone2;
	uint milestone3;

	constructor(uint128 _sum1, uint128 _sum2, uint128 _sum3) public {
		weiTable = new WeiTable();
		weiTable.addSplitter();
		roadmap = weiTable.getLastNodeId();

		weiTable.addAbsoluteExpense(_sum1, 0, false, false, 0);
		milestone1 = weiTable.getLastNodeId();

		weiTable.addAbsoluteExpense(_sum2, 0, false, false, 0);
		milestone2 = weiTable.getLastNodeId();

		weiTable.addAbsoluteExpense(_sum3, 0, false, false, 0);
		milestone3 = weiTable.getLastNodeId();

		weiTable.addChildAt(roadmap, milestone1);
		weiTable.addChildAt(roadmap, milestone2);
		weiTable.addChildAt(roadmap, milestone3);
	}

	function() external {}
}