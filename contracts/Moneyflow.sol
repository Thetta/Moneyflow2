pragma solidity ^0.4.22;
import "./interfaces/IMoneyflow.sol";

import "./FallbackToWeiReceiver.sol";
import "./ether/WeiAbsoluteExpense.sol";
import "./ether/WeiExpense.sol";
import "./ether/WeiRelativeExpenseWithPeriod.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title MoneyFlow 
 * @dev Reference (typical example) implementation of IMoneyflow
 * Use it or modify as you like. Please see tests
 * No elements are directly available. Work with all children only throught the methods like 
 * 'setRootWeiReceiverGeneric', etc
*/
contract MoneyFlow is IMoneyflow, Ownable {
	WeiRelativeExpenseWithPeriod donationEndpoint;
	// by default - this is 0x0, please use setWeiReceiver method
	// this can be a ISplitter (top-down or unsorted)
	IWeiReceiver rootReceiver;

	FallbackToWeiReceiver donationF2WR;
	FallbackToWeiReceiver revenueF2WR;

	event MoneyFlowWithdrawDonations(address _by, address _to, uint _balance);
	event MoneyFlowSetRootWeiReceiver(address _sender, address _receiver);

	constructor() public {
		// do not set output!
		donationEndpoint = new WeiRelativeExpenseWithPeriod(1000000, 0);
		donationF2WR = new FallbackToWeiReceiver(donationEndpoint);
	}

// IMoneyflow:
	// will withdraw donations
	function withdrawDonationsTo(address _out) public {
		emit MoneyFlowWithdrawDonations(msg.sender, _out, address(donationEndpoint).balance);
		donationEndpoint.flushTo(_out);
	}

	function getDonationEndpoint() public view returns(IWeiReceiver) {
		return donationEndpoint;
	}

	function getRevenueEndpoint() public view returns(IWeiReceiver) {
		return rootReceiver;
	}

	function getDonationEndpointAddress() public view returns(address) {
		return address(donationF2WR);
	}

	function getRevenueEndpointAddress() public view returns(address) {
		return address(revenueF2WR);
	}

	function setRootWeiReceiverGeneric(bytes32[] _params) public {
		IWeiReceiver receiver = IWeiReceiver(address(_params[0]));
		setRootWeiReceiver(receiver);
	}

	function withdrawDonationsToGeneric(bytes32[] _params) public {
		address out = address(_params[0]);
		withdrawDonationsTo(out);
	}

// WeiReceivers:
	// receiver can be a splitter, fund or event task
	// _receiver can be 0x0!
	function setRootWeiReceiver(IWeiReceiver _receiver) public {
		emit MoneyFlowSetRootWeiReceiver(msg.sender, address(_receiver));
		rootReceiver = _receiver;
		revenueF2WR = new FallbackToWeiReceiver(address(rootReceiver));
	}

///////////////////
	function() public {
		// non payable
	}
}
