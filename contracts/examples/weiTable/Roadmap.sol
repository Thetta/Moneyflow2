pragma solidity ^0.4.24;

import "../../WeiTable.sol";


// this contract is an owner of weiTable; so, no one else can modify scheme
// while this contract have no modifying methods, the scheme is constant
contract Roadmap {
	WeiTable weiTable;
	uint roadmap;
	uint milestone1;
	uint milestone2;
	uint milestone3;

	constructor(uint _sum1, uint _sum2, uint _sum3) {
		WeiTable weiTable = new WeiTable();
		weiTable.addTopdownSplitter();
		uint roadmap = weiTable.getLastNodeId();

		weiTable.addFund(_sum1, false, false, 0);
		uint milestone1 = weiTable.getLastNodeId();

		weiTable.addFund(_sum2, false, false, 0);
		uint milestone2 = weiTable.getLastNodeId();

		weiTable.addFund(_sum3, false, false, 0);
		uint milestone3 = weiTable.getLastNodeId();

		weiTable.addChildAt(roadmap, milestone1);
		weiTable.addChildAt(roadmap, milestone2);
		weiTable.addChildAt(roadmap, milestone3);
	}
}