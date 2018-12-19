pragma solidity ^0.4.24;

import "../../WeiTable.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";


// this contract is an owner of weiTable; so, no one else can modify scheme
contract Budget is Ownable {
	WeiTable weiTable;
	uint bubgetEntry;
	uint spends;
	uint salaries;
	uint oneTimeUtils;
	uint tasks;
	uint funds;
	uint bonuses;

	uint budgetPeriod;

	constructor(uint _budgetPeriod) {
		WeiTable weiTable = new WeiTable();
		budgetPeriod = _budgetPeriod;
		createLayout();

		uint[] employeeSalaries;
		employeeSalaries.push(10e18);
		employeeSalaries.push(20e18);
		employeeSalaries.push(20e18);
		addEmployees(employeeSalaries);

		uint[] bonuses;
		bonuses.push(10000);
		bonuses.push(20000);
		bonuses.push(20000);
		addBonuses(bonuses);

		uint[] tasks;
		tasks.push(0.1e18);
		tasks.push(0.3e18);
		tasks.push(0.5e18);
		addTasks(tasks);

		uint[] utils;
		utils.push(2e18);
		utils.push(3e18);
		addUtils(utils);

		uint[] funds;
		funds.push(20000*1e18);
		funds.push(20000000*1e18);
		addFunds(funds);
	}

	function createLayout() internal {
		weiTable.addSplitter();
		uint bubgetEntry = weiTable.getLastNodeId();
		
		weiTable.addSplitter();
		uint spends = weiTable.getLastNodeId();
		
		weiTable.addSplitter();
		uint salaries = weiTable.getLastNodeId();

		weiTable.addSplitter();
		uint tasks = weiTable.getLastNodeId();
	
		weiTable.addSplitter();
		uint bonuses = weiTable.getLastNodeId();

		weiTable.addSplitter();
		uint oneTimeUtils = weiTable.getLastNodeId();
		
		weiTable.addSplitter();
		uint funds = weiTable.getLastNodeId();

		weiTable.addChildAt(bubgetEntry, spends);
		weiTable.addChildAt(spends, salaries);
		weiTable.addChildAt(spends, oneTimeUtils);
		weiTable.addChildAt(spends, bonuses);
		weiTable.addChildAt(spends, tasks);
		weiTable.addChildAt(bubgetEntry, funds);
	}

	function addEmployees(uint[] _employeeSalaries) public onlyOwner {
		for(uint i=0; i<_employeeSalaries.length; i++) {
			weiTable.addAbsoluteExpense(_employeeSalaries[i], _employeeSalaries[i], true, true, budgetPeriod);
			uint employee = weiTable.getLastNodeId();
			weiTable.addChildAt(salaries, employee);
		}
	}

	function addBonuses(uint[] _bonuses) public onlyOwner {
		for(uint i=0; i<_bonuses.length; i++) {
			weiTable.addRelativeExpense(_bonuses[i], true, true, budgetPeriod);
			uint bonus = weiTable.getLastNodeId();
			weiTable.addChildAt(bonuses, bonus);
		}
	}

	function addTasks(uint[] _tasks) public onlyOwner {
		for(uint i=0; i<_tasks.length; i++) {
			weiTable.addRelativeExpense(_tasks[i], false, false, 0);
			uint task = weiTable.getLastNodeId();
			weiTable.addChildAt(tasks, task);
		}
	}

	function addUtils(uint[] _oneTimeUtils) public onlyOwner {
		for(uint i=0; i<_oneTimeUtils.length; i++) {
			weiTable.addRelativeExpense(_oneTimeUtils[i], false, false, 0);
			uint oneTimeUtil = weiTable.getLastNodeId();
			weiTable.addChildAt(oneTimeUtils, oneTimeUtil);
		}
	}

	function addFunds(uint[] _funds) public onlyOwner {
		for(uint i=0; i<_funds.length; i++) {
			weiTable.addAbsoluteExpense(_funds[i], 0, false, false, 0);
			uint fund = weiTable.getLastNodeId();
			weiTable.addChildAt(funds, fund);
		}
	}	
}