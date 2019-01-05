pragma solidity ^0.4.24;

import "../ether/WeiRelativeExpenseWithPeriod.sol";
import "../ether/WeiSplitter.sol";
import "../ether/WeiAbsoluteExpense.sol";


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
	WeiSplitter root;

	WeiSplitter spends; 
	WeiSplitter bonuses; 
	WeiSplitter rest; 

	WeiSplitter salaries; 
	WeiSplitter other; 
	WeiSplitter tasks; 

	WeiRelativeExpenseWithPeriod reserveFund;
	WeiRelativeExpenseWithPeriod dividendsFund;

	constructor(
		address _fundOutput, 
		uint32 _percentsReserve, 
		uint32 _dividendsReserve) 
	{
		require(0x0 != _fundOutput);

		// root = new WeiSplitter();

		// spends = new WeiSplitter();
		// bonuses = new WeiSplitter();
		// rest = new WeiSplitter();

		// salaries = new WeiSplitter();
		// other = new WeiSplitter();
		// tasks = new WeiSplitter();

		// // // use .setPercents() to change 
		// reserveFund = new WeiAbsoluteExpense(0, _fundOutput, 0, 0, false, false);

		// // use .setPercents() to change 
		// dividendsFund = new WeiAbsoluteExpense(0, _fundOutput, 0, 0, false, false);

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

	function getRootReceiver() public view returns(IReceiver) {
		return root;
	}

	function deployRoot() public {
		// root = new WeiSplitter();
	}

////////////////////////////////////////////////////////////////
	// use MoneyflowAuto to add new task with voting! 
	function addNewTask(IReceiver _wr) view public {
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