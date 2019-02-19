pragma solidity ^0.5.0;

import "../../ether/WeiTable.sol";

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";


// this contract is an owner() of weiTable; so, no one else can modify scheme
contract Budget is Ownable {
	WeiTable weiTable;
	uint bubgetEntry;
	uint spends;
	uint salaries;
	uint oneTimeUtils;
	uint tasks;
	uint funds;
	uint bonuses;

	uint32 budgetPeriod;

	constructor(uint32 _budgetPeriod) public {
		weiTable = new WeiTable();
		budgetPeriod = _budgetPeriod;
		createLayout();

		uint128[] memory employeeSalariesArr = new uint128[](3);
		employeeSalariesArr[0] = 10e18;
		employeeSalariesArr[1] = 20e18;
		employeeSalariesArr[2] = 20e18;
		addEmployees(employeeSalariesArr);

		uint32[] memory bonusesArr = new uint32[](3);
		bonusesArr[0] = 10000;
		bonusesArr[1] = 20000;
		bonusesArr[2] = 20000;
		addBonuses(bonusesArr);

		uint128[] memory tasksArr = new uint128[](3);
		tasksArr[0] = 0.1e18;
		tasksArr[1] = 0.3e18;
		tasksArr[2] = 0.5e18;
		addTasks(tasksArr);

		uint128[] memory utilsArr = new uint128[](2);
		utilsArr[0] = 2e18;
		utilsArr[1] = 3e18;
		addUtils(utilsArr);

		uint128[] memory fundsArr = new uint128[](2);
		fundsArr[0] = 20000*1e18;
		fundsArr[1] = 20000000*1e18;
		addFunds(fundsArr);
	}

	function createLayout() internal {
		weiTable.addSplitter();
		bubgetEntry = weiTable.getLastNodeId();
		
		weiTable.addSplitter();
		spends = weiTable.getLastNodeId();
		
		weiTable.addSplitter();
		salaries = weiTable.getLastNodeId();

		weiTable.addSplitter();
		tasks = weiTable.getLastNodeId();
	
		weiTable.addSplitter();
		bonuses = weiTable.getLastNodeId();

		weiTable.addSplitter();
		oneTimeUtils = weiTable.getLastNodeId();
		
		weiTable.addSplitter();
		funds = weiTable.getLastNodeId();

		weiTable.addChildAt(bubgetEntry, spends);
		weiTable.addChildAt(spends, salaries);
		weiTable.addChildAt(spends, oneTimeUtils);
		weiTable.addChildAt(spends, bonuses);
		weiTable.addChildAt(spends, tasks);
		weiTable.addChildAt(bubgetEntry, funds);
	}

	function addEmployees(uint128[] memory _employeeSalaries) public onlyOwner {
		for(uint i=0; i<_employeeSalaries.length; i++) {
			weiTable.addAbsoluteExpense(_employeeSalaries[i], _employeeSalaries[i], true, true, budgetPeriod);
			uint employee = weiTable.getLastNodeId();
			weiTable.addChildAt(salaries, employee);
		}
	}

	function addBonuses(uint32[] memory _bonuses) public onlyOwner {
		for(uint i=0; i<_bonuses.length; i++) {
			weiTable.addRelativeExpense(_bonuses[i], true, true, budgetPeriod);
			uint bonus = weiTable.getLastNodeId();
			weiTable.addChildAt(bonuses, bonus);
		}
	}

	function addTasks(uint128[] memory _tasks) public onlyOwner {
		for(uint i=0; i<_tasks.length; i++) {
			weiTable.addAbsoluteExpense(_tasks[i], _tasks[i], false, false, 0);
			uint task = weiTable.getLastNodeId();
			weiTable.addChildAt(tasks, task);
		}
	}

	function addUtils(uint128[] memory _oneTimeUtils) public onlyOwner {
		for(uint i=0; i<_oneTimeUtils.length; i++) {
			weiTable.addAbsoluteExpense(_oneTimeUtils[i], _oneTimeUtils[i], false, false, 0);
			uint oneTimeUtil = weiTable.getLastNodeId();
			weiTable.addChildAt(oneTimeUtils, oneTimeUtil);
		}
	}

	function addFunds(uint128[] memory _funds) public onlyOwner {
		for(uint i=0; i<_funds.length; i++) {
			weiTable.addAbsoluteExpense(_funds[i], 0, false, false, 0);
			uint fund = weiTable.getLastNodeId();
			weiTable.addChildAt(funds, fund);
		}
	}

	function() external {}
}