pragma solidity ^0.4.24;

import "../../ether/WeiFund.sol";
import "../../ether/WeiTopDownSplitter.sol";


contract Roadmap {

	constructor(uint _sum1, uint _sum2, uint _sum3) {
		WeiTopDownSplitter roadmap = new WeiTopDownSplitter("Roadmap");

		WeiFund milestone1 = new WeiFund(_sum1, false, false, 0);
		WeiFund milestone2 = new WeiFund(_sum2, false, false, 0);
		WeiFund milestone3 = new WeiFund(_sum3, false, false, 0);
		roadmap.addChild(milestone1);
		roadmap.addChild(milestone2);
		roadmap.addChild(milestone3);
	}
}