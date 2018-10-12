pragma solidity ^0.4.23;

import "../ether/WeiRelativeExpenseWithPeriod.sol";
import "../ether/WeiTopDownSplitter.sol";
import "../ether/WeiUnsortedSplitter.sol";

/**
 * @title FallbackToWeiReceiver
 * @dev This contract should be used to automatically instantiate Default moneyscheme for a DAO.
 * Use it as example. You can setup your own moneyflow.  
 * THIS IS A WORKING example!
 *
 * Layout:
 * 
 * Root - top-down splitter 
 *		Spends - unsorted splitter
 *			Salaries - unsorted splitter 
 *			Other - unsorted splitter 
 *			Tasks - unsorted splitter
 *		Bonuses - unsorted splitter
 *		Rest - unsorted splitter
 *			ReserveFund - fund 
 *			DividendsFund - fund
*/
contract DefaultMoneyflowScheme {
	WeiTopDownSplitter root;

	WeiUnsortedSplitter spends; 
	WeiUnsortedSplitter bonuses; 
	WeiUnsortedSplitter rest; 

	WeiUnsortedSplitter salaries; 
	WeiUnsortedSplitter other; 
	WeiUnsortedSplitter tasks; 

	WeiRelativeExpenseWithPeriod reserveFund;
	WeiRelativeExpenseWithPeriod dividendsFund;

	constructor(
		address _fundOutput, 
		uint _percentsReserve, 
		uint _dividendsReserve) 
	{
		require(0x0 != _fundOutput);

		// root = new WeiTopDownSplitter("root");

		// spends = new WeiUnsortedSplitter("spends");
		// bonuses = new WeiUnsortedSplitter("bonuses");
		// rest = new WeiUnsortedSplitter("rest");

		// salaries = new WeiUnsortedSplitter("salaries");
		// other = new WeiUnsortedSplitter("other");
		// tasks = new WeiUnsortedSplitter("tasks");

		// // // use .setPercents() to change 
		// reserveFund = new WeiFund(_fundOutput, true, _percentsReserve);

		// // use .setPercents() to change 
		// dividendsFund = new WeiFund(_fundOutput, true, _dividendsReserve);

		// spends.addChild(salaries);
		// spends.addChild(other);
		// spends.addChild(tasks);

		// // This contract is itself a top down (Root) splitter
		// // just call a 'processFunds(uint _currentFlow)' method and it will
		// root.addChild(spends);
		// root.addChild(bonuses);
		// root.addChild(rest);

		// rest.addChild(reserveFund);
		// rest.addChild(dividendsFund);
	}

	function getRootReceiver() public view returns(IWeiReceiver) {
		return root;
	}

	function deployRoot() public {
		root = new WeiTopDownSplitter("root");
	}

////////////////////////////////////////////////////////////////
	// use MoneyflowAuto to add new task with voting! 
	function addNewTask(IWeiReceiver _wr) view public {
		// 1 - add new task immediately
		//tasks.addChild(_wr);
	}

	// if _employee is not in the flow -> will add new WeiAbsoluteExpense
	// if _employee is already in the flow -> will update the needed amount, i.e. call setNeededWei()
	function setSalaryForEmployee(address _employee, uint _weiPerMonth) view public {
		// TODO: is voting required? Move voting to MoneyflowAuto!

		// TODO: implement

		// 0 - check if _employee is employee 
		// TODO: WARNING!!!!!!!! Hard-coded type
		// require(daoBase.isGroupMember("Employees", _employee));

		// 1 - employee already added? 

		// 2 - modify or add 
	}

	function setBonusForEmployee(address _employee, uint _bonusPercentsPerMonth) view public {
		// TODO: is voting required? Move voting to MoneyflowAuto!

		// TODO: implement
	}

	// to "remove" the spend -> set (_weiPerMonth==0)
	// this method WILL NOT really remove the item!
	function setOtherSpend(string _name, uint _weiPerMonth) view public {
		// TODO: is voting required? Move voting to MoneyflowAuto!

		// TODO: implement
	}

	function flushReseveFundTo(address _to) view public {
		// TODO:
	}

	// TODO: Currently dividens fund is just another type of Reserve fund (because DividendFund is not implemented yet) 
	function flushDividendsFundTo(address _to) view public {
		// TODO:
	}
}