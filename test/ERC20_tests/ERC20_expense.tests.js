var IReceiver = artifacts.require('./IReceiver');

var StandardToken = artifacts.require('./ERC20Token');

var ERC20Splitter = artifacts.require('./ERC20Splitter');
var ERC20AbsoluteExpense = artifacts.require('./ERC20AbsoluteExpense');
var ERC20RelativeExpense = artifacts.require('./ERC20RelativeExpense');
var ERC20AbsoluteExpenseWithPeriod = artifacts.require('./ERC20AbsoluteExpenseWithPeriod');
var ERC20RelativeExpenseWithPeriod = artifacts.require('./ERC20RelativeExpenseWithPeriod');

var ERC20AbsoluteExpenseWithPeriodSliding = artifacts.require('./ERC20AbsoluteExpenseWithPeriodSliding');
var ERC20RelativeExpenseWithPeriodSliding = artifacts.require('./ERC20RelativeExpenseWithPeriodSliding');

async function passHours (hours) {
	await web3.currentProvider.sendAsync({
		jsonrpc: '2.0',
		method: 'evm_increaseTime',
		params: [3600 * hours * 1000],
		id: new Date().getTime(),
	}, function (err) { if (err) console.log('err:', err); });
}


async function checkMinNeed (targets, flowArr, needArr) {
	for(var i=0; i<targets.length; i++) {
		assert.equal((await targets[i].getMinNeeded(flowArr[i]*1e14)).toNumber() / 1e14, needArr[i]);	
	}
}

async function checkTotalNeed (targets, flowArr, needArr) {
	for(var i=0; i<targets.length; i++) {
		assert.equal((await targets[i].getTotalNeeded(flowArr[i]*1e14)).toNumber() / 1e14, needArr[i]);	
	}
}		

async function checkIsNeed (targets, needArr) {
	for(var i=0; i<targets.length; i++) {
		assert.equal((await targets[i].isNeeds()), needArr[i]);	
	}
}	

function KECCAK256 (x) {
	return web3.sha3(x);
}

require('chai')
	.use(require('chai-as-promised'))
	.use(require('chai-bignumber')(web3.BigNumber))
	.should();

async function createStructure(token, creator, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends) {
	var callParams = { from: creator, gasPrice: 0 };
	var o = {};

	o.AllOutputs = await ERC20Splitter.new(token.address,callParams);
	o.Spends = await ERC20Splitter.new(token.address,callParams);
	o.Salaries = await ERC20Splitter.new(token.address,callParams);
	o.Employee1 = await ERC20AbsoluteExpense.new(token.address,e1*tokenAmount, e1*tokenAmount, callParams);
	o.Employee2 = await ERC20AbsoluteExpense.new(token.address,e2*tokenAmount, e2*tokenAmount, callParams);
	o.Employee3 = await ERC20AbsoluteExpense.new(token.address,e3*tokenAmount, e3*tokenAmount, callParams);
	o.Other = await ERC20Splitter.new(token.address,callParams);
	o.Office = await ERC20AbsoluteExpense.new(token.address,office*tokenAmount, office*tokenAmount, callParams);
	o.Internet = await ERC20AbsoluteExpense.new(token.address,internet*tokenAmount, internet*tokenAmount, callParams);
	o.Tasks = await ERC20Splitter.new(token.address,callParams);
	o.Task1 = await ERC20AbsoluteExpense.new(token.address,t1*tokenAmount, t1*tokenAmount, callParams);
	o.Task2 = await ERC20AbsoluteExpense.new(token.address,t2*tokenAmount, t2*tokenAmount, callParams);
	o.Task3 = await ERC20AbsoluteExpense.new(token.address,t3*tokenAmount, t3*tokenAmount, callParams);
	o.Bonuses = await ERC20Splitter.new(token.address,callParams);
	o.Bonus1 = await ERC20RelativeExpense.new(token.address,b1, callParams);
	o.Bonus2 = await ERC20RelativeExpense.new(token.address,b2, callParams);
	o.Bonus3 = await ERC20RelativeExpense.new(token.address,b3, callParams);
	o.Rest = await ERC20Splitter.new(token.address,callParams);
	o.ReserveFund = await ERC20RelativeExpense.new(token.address,reserve, callParams);
	o.DividendsFund = await ERC20RelativeExpense.new(token.address,dividends, callParams);

	// CONNECTIONS
	await o.AllOutputs.addChild(o.Spends.address, callParams);
	await o.Spends.addChild(o.Salaries.address, callParams);
	await o.Salaries.addChild(o.Employee1.address, callParams);
	await o.Salaries.addChild(o.Employee2.address, callParams);
	await o.Salaries.addChild(o.Employee3.address, callParams);
	await o.Spends.addChild(o.Other.address, callParams);
	await o.Other.addChild(o.Office.address, callParams);
	await o.Other.addChild(o.Internet.address, callParams);
	await o.Spends.addChild(o.Tasks.address, callParams);
	await o.Tasks.addChild(o.Task1.address, callParams);
	await o.Tasks.addChild(o.Task2.address, callParams);
	await o.Tasks.addChild(o.Task3.address, callParams);
	await o.AllOutputs.addChild(o.Bonuses.address, callParams);
	await o.Bonuses.addChild(o.Bonus1.address, callParams);
	await o.Bonuses.addChild(o.Bonus2.address, callParams);
	await o.Bonuses.addChild(o.Bonus3.address, callParams);
	await o.AllOutputs.addChild(o.Rest.address, callParams);
	await o.Rest.addChild(o.ReserveFund.address, callParams);
	await o.Rest.addChild(o.DividendsFund.address, callParams);

	return o;
}

async function totalAndMinNeedsAsserts (i, CURRENT_INPUT, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends) {
	var totalSpend = e1 + e2 + e3 + t1 + t2 + t3 + office + internet;
	var bonusesSpendPercent = (CURRENT_INPUT - totalSpend) / 1000000;
	var fundsPercent = (CURRENT_INPUT - totalSpend - bonusesSpendPercent*(b1 + b2 + b3)) / 1000000;

	var allNeeds = totalSpend + bonusesSpendPercent*(b1 + b2 + b3) + fundsPercent*(reserve + dividends);

	assert.equal(i.AllOutputsTotalNeed.toNumber() / tokenAmount, allNeeds, `AllOutputs Total Need should be ${allNeeds}`);
	assert.equal(i.AllOutputsMinNeed.toNumber() / tokenAmount, totalSpend, `AllOutputs min Need should be ${totalSpend}`);
	assert.equal(i.SpendsTotalNeed.toNumber() / tokenAmount, totalSpend, `Spends Total Need should be ${totalSpend}`);
	assert.equal(i.SpendsMinNeed.toNumber() / tokenAmount, totalSpend, `Spends min Need should be ${totalSpend}`);
	assert.equal(i.SalariesTotalNeed.toNumber() / tokenAmount, e1 + e2 + e3, `Salaries Total Need should be ${e1 + e2 + e3}`);
	assert.equal(i.SalariesMinNeed.toNumber() / tokenAmount, e1 + e2 + e3, `Salaries min Need should be ${e1 + e2 + e3}`);
	assert.equal(i.OtherTotalNeed.toNumber() / tokenAmount, office + internet, `Other Total Need should be ${office + internet}`);
	assert.equal(i.OtherMinNeed.toNumber() / tokenAmount, office + internet, `Other min Need should be ${office + internet}`);
	assert.equal(i.TasksTotalNeed.toNumber() / tokenAmount, t1 + t2 + t3, `Tasks Total Need should be ${t1 + t2 + t3}`);
	assert.equal(i.TasksMinNeed.toNumber() / tokenAmount, t1 + t2 + t3, `Tasks min Need should be ${t1 + t2 + t3}`);
	assert.equal(i.BonusesTotalNeed.toNumber() / tokenAmount, (b1 + b2 + b3)*CURRENT_INPUT / 1000000, `Bonuses Total Need should be ${(b1 + b2 + b3)*CURRENT_INPUT / 1000000}`);
	assert.equal(i.BonusesMinNeed.toNumber() / tokenAmount, 0, `Bonuses min Need should be ${0}`);
	assert.equal(i.RestTotalNeed.toNumber() / tokenAmount, (reserve + dividends)*CURRENT_INPUT / 1000000, `Rest Total Need should be ${(reserve + dividends)*CURRENT_INPUT / 1000000}`);
	assert.equal(i.RestMinNeed.toNumber() / tokenAmount, 0, `Rest min Need should be ${0}`);
}

async function getBalances (token, i) {
	var o = {};
	o.Employee1Balance = await token.balanceOf(i.Employee1.address);
	o.Employee2Balance = await token.balanceOf(i.Employee2.address);
	o.Employee3Balance = await token.balanceOf(i.Employee3.address);
	o.OfficeBalance = await token.balanceOf(i.Office.address);
	o.InternetBalance = await token.balanceOf(i.Internet.address);
	o.Task1Balance = await token.balanceOf(i.Task1.address);
	o.Task2Balance = await token.balanceOf(i.Task2.address);
	o.Task3Balance = await token.balanceOf(i.Task3.address);
	o.Reserve3Balance = await token.balanceOf(i.ReserveFund.address);
	o.Dividends3Balance = await token.balanceOf(i.DividendsFund.address);
	o.Bonus1Balance = await token.balanceOf(i.Bonus1.address);
	o.Bonus2Balance = await token.balanceOf(i.Bonus2.address);
	o.Bonus3Balance = await token.balanceOf(i.Bonus3.address);
	o.AllOutputsBalance = await token.balanceOf(i.AllOutputs.address);
	o.SpendsBalance = await token.balanceOf(i.Spends.address);
	o.SalariesBalance = await token.balanceOf(i.Salaries.address);
	o.OtherBalance = await token.balanceOf(i.Other.address);
	o.TasksBalance = await token.balanceOf(i.Tasks.address);
	o.BonusesBalance = await token.balanceOf(i.Bonuses.address);
	o.RestBalance = await token.balanceOf(i.Rest.address);

	return o;
}

async function getSplitterParams (i, CURRENT_INPUT, tokenAmount, creator) {
	var o = {};
	o.AllOutputsTotalNeed = await i.AllOutputs.getTotalNeeded(CURRENT_INPUT*tokenAmount);
	o.AllOutputsMinNeed = await i.AllOutputs.getMinNeeded(CURRENT_INPUT*tokenAmount);
	o.AllOutputsChildrenCount = await i.AllOutputs.getChildrenCount();
	o.SpendsTotalNeed = await i.Spends.getTotalNeeded(CURRENT_INPUT*tokenAmount);
	o.SpendsMinNeed = await i.Spends.getMinNeeded(CURRENT_INPUT*tokenAmount);
	o.SpendsChildrenCount = await i.Spends.getChildrenCount();
	o.SalariesTotalNeed = await i.Salaries.getTotalNeeded(CURRENT_INPUT*tokenAmount);
	o.SalariesMinNeed = await i.Salaries.getMinNeeded(CURRENT_INPUT*tokenAmount);
	o.SalariesChildrenCount = await i.Salaries.getChildrenCount();
	o.OtherTotalNeed = await i.Other.getTotalNeeded(CURRENT_INPUT*tokenAmount);
	o.OtherMinNeed = await i.Other.getMinNeeded(CURRENT_INPUT*tokenAmount);
	o.OtherChildrenCount = await i.Other.getChildrenCount();
	o.TasksTotalNeed = await i.Tasks.getTotalNeeded(CURRENT_INPUT*tokenAmount);
	o.TasksMinNeed = await i.Tasks.getMinNeeded(CURRENT_INPUT*tokenAmount);
	o.TasksChildrenCount = await i.Tasks.getChildrenCount();
	o.BonusesTotalNeed = await i.Bonuses.getTotalNeeded(CURRENT_INPUT*tokenAmount);
	o.BonusesMinNeed = await i.Bonuses.getMinNeeded(CURRENT_INPUT*tokenAmount);
	o.BonusesChildrenCount = await i.Bonuses.getChildrenCount();
	o.RestTotalNeed = await i.Rest.getTotalNeeded(CURRENT_INPUT*tokenAmount);
	o.RestMinNeed = await i.Rest.getMinNeeded(CURRENT_INPUT*tokenAmount);
	o.RestChildrenCount = await i.Rest.getChildrenCount();

	return o;
}

async function structureAsserts (i) {
	assert.equal(i.AllOutputsChildrenCount.toNumber(), 3, 'Children count should be 3');
	assert.equal(i.SpendsChildrenCount.toNumber(), 3, 'Children count should be 3');
	assert.equal(i.SalariesChildrenCount.toNumber(), 3, 'Children count should be 3');
	assert.equal(i.OtherChildrenCount.toNumber(), 2, 'Children count should be 2');
	assert.equal(i.TasksChildrenCount.toNumber(), 3, 'Children count should be 3');
	assert.equal(i.BonusesChildrenCount.toNumber(), 3, 'Children count should be 3');
	assert.equal(i.RestChildrenCount.toNumber(), 2, 'Children count should be 2');
}

async function balancesAsserts (i, CURRENT_INPUT, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends) {
	var totalSpend = e1 + e2 + e3 + t1 + t2 + t3 + office + internet;
	var bonusesSpendPercent = (CURRENT_INPUT - totalSpend) / 1000000;
	var fundsPercent = (CURRENT_INPUT - totalSpend - bonusesSpendPercent*(b1 + b2 + b3)) / 1000000;

	assert.equal(i.Employee1Balance.toNumber() / tokenAmount, e1, `Employee1 balance should be ${e1} tokenAmount`);
	assert.equal(i.Employee2Balance.toNumber() / tokenAmount, e2, `Employee2 balance should be ${e2} tokenAmount`);
	assert.equal(i.Employee3Balance.toNumber() / tokenAmount, e3, `Employee3 balance should be ${e3} tokenAmount`);
	assert.equal(i.OfficeBalance.toNumber() / tokenAmount, office, `Office balance should be ${office} tokenAmount`);
	assert.equal(i.InternetBalance.toNumber() / tokenAmount, internet, `Internet balance should be ${internet} tokenAmount`);
	assert.equal(i.Task1Balance.toNumber() / tokenAmount, t1, `Task1 balance should be ${t1} tokenAmount`);
	assert.equal(i.Task2Balance.toNumber() / tokenAmount, t2, `Task2 balance should be ${t2} tokenAmount`);
	assert.equal(i.Task3Balance.toNumber() / tokenAmount, t3, `Task3 balance should be ${t3} tokenAmount`);

	assert.equal(i.Bonus1Balance.toNumber() / tokenAmount, bonusesSpendPercent*b1, `Bonus1 balance should be ${bonusesSpendPercent*b1} tokenAmount`);
	assert.equal(i.Bonus2Balance.toNumber() / tokenAmount, bonusesSpendPercent*b2, `Bonus2 balance should be ${bonusesSpendPercent*b2} tokenAmount`);
	assert.equal(i.Bonus3Balance.toNumber() / tokenAmount, bonusesSpendPercent*b3, `Bonus3 balance should be ${bonusesSpendPercent*b3} tokenAmount`);

	assert.equal(i.Reserve3Balance.toNumber() / tokenAmount, fundsPercent*reserve, `Reserve3 balance should be ${fundsPercent*reserve} tokenAmount`);
	assert.equal(i.Dividends3Balance.toNumber() / tokenAmount, fundsPercent*dividends, `Dividends3 balance should be ${fundsPercent*dividends} tokenAmount`);
}

async function splitterBalancesAsserts (i, tokenAmount, allOutpultsBalance, spendsBalance, salariesBalance, otherBalance, tasksBalance, bonusesBalance, restBalance) {
	assert.equal(i.AllOutputsBalance.toNumber() / tokenAmount, allOutpultsBalance, `AllOutputs balance should be ${allOutpultsBalance} tokenAmount`);
	assert.equal(i.SpendsBalance.toNumber() / tokenAmount, spendsBalance, `Spends balance should be ${spendsBalance} tokenAmount`);
	assert.equal(i.SalariesBalance.toNumber() / tokenAmount, salariesBalance, `Salaries balance should be ${salariesBalance} tokenAmount`);
	assert.equal(i.OtherBalance.toNumber() / tokenAmount, otherBalance, `Other balance should be ${otherBalance} tokenAmount`);
	assert.equal(i.TasksBalance.toNumber() / tokenAmount, tasksBalance, `Tasks balance should be ${tasksBalance} tokenAmount`);
	assert.equal(i.BonusesBalance.toNumber() / tokenAmount, bonusesBalance, `Bonuses balance should be ${bonusesBalance} tokenAmount`);
	assert.equal(i.RestBalance.toNumber() / tokenAmount, restBalance, `Rest balance should be ${restBalance} tokenAmount`);
}

contract('ERC20Expense', (accounts) => {
	var token;
	var store;
	var daoBase;

	var issueTokens;
	var manageGroups;
	var addNewProposal;
	var upgradeDaoContract;
	var addNewTask;
	var startTask;
	var startBounty;
	var modifyMoneyscheme;
	var withdrawDonations;
	var setRootERC20Receiver;
	var burnTokens;

	var tokenAmount = 1e10;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[3];

	beforeEach(async () => {
		token = await StandardToken.new();
		await token.mint(accounts[0], 1e15);
		await token.mint(accounts[1], 1e15);
		await token.mint(accounts[2], 1e15);
		await token.mint(accounts[3], 1e15);
		await token.mint(accounts[4], 1e15);
		await token.mint(accounts[5], 1e15);
		await token.mint(accounts[6], 1e15);
		await token.mint(accounts[7], 1e15);
		await token.mint(accounts[8], 1e15);
		await token.mint(accounts[9], 1e15);		
	});

	it('1: Should revert when trying to add rel to abs splitter', async () => {
		var abs = await ERC20AbsoluteExpense.new(token.address,1e15, 1e15);
		var splitter = await ERC20Splitter.new(token.address);
		var rel = await ERC20RelativeExpense.new(token.address,500000);
		await splitter.addChild(abs.address);
		await splitter.addChild(rel.address).should.be.rejectedWith('revert');
	});


	it('2: should process tokenAmount with ERC20AbsoluteExpenseWithPeriod, then 25 hours, then tokenAmount needs again', async () => {
		var timePeriod = 25;
		var callParams = { from: creator, gasPrice: 0 };
		var struct = {};
		var balance0 = await token.balanceOf(creator);

		Employee1 = await ERC20AbsoluteExpenseWithPeriod.new(token.address,1000*tokenAmount, 1000*tokenAmount, timePeriod, callParams);

		await token.approve(Employee1.address, 1000*tokenAmount, {from:outsider});
		await Employee1.processTokens(1000*tokenAmount, 1000*tokenAmount, {from: outsider, gasPrice: 0 });
		await Employee1.flush({ from: outsider }).should.be.rejectedWith('revert');
		await Employee1.flush({ from: creator, gasPrice: 0 });

		var balance = await token.balanceOf(creator);
		assert.equal((new web3.BigNumber(balance).sub(balance0)).toNumber(), 1000*tokenAmount, 'Should get tokenAmount');

		var needsEmployee1 = await Employee1.isNeeds({ from: creator });
		assert.equal(needsEmployee1, false, 'Dont need tokenAmount, because he got it');

		await passHours(timePeriod);
		var needsEmployee2 = await Employee1.isNeeds({ from: creator });
		assert.equal(needsEmployee2, true, 'Need tokenAmount, because 24 hours passed');

		var need = await Employee1.getTotalNeeded(10000*tokenAmount);
		assert.equal(need.toNumber(), 1000*tokenAmount);

		var min = await Employee1.getMinNeeded(10000*tokenAmount);
		assert.equal(min.toNumber(), 1000*tokenAmount);

		await token.approve(Employee1.address, 1000*tokenAmount, {from:outsider});
		await Employee1.processTokens(1000*tokenAmount, 1000*tokenAmount, {from: outsider, gasPrice: 0 });
		await Employee1.flush({ from: creator, gasPrice: 0 });

		var balance2 = await token.balanceOf(creator);
		assert.equal((new web3.BigNumber(balance2).sub(balance0)).toNumber(), 2000*tokenAmount, 'Should get tokenAmount');

		var needsEmployee3 = await Employee1.isNeeds({ from: creator });
		assert.equal(needsEmployee3, false, 'Dont need tokenAmount, because he got it');
	});

	it('3: should process tokenAmount with ERC20AbsoluteExpenseWithPeriod, then 75 hours, then tokenAmount needs again x3', async () => {
		var timePeriod = 25;
		var callParams = { from: creator, gasPrice: 0 };
		var struct = {};
		var balance0 = await token.balanceOf(creator);
		Employee1 = await ERC20AbsoluteExpenseWithPeriodSliding.new(token.address,1000*tokenAmount, 1000*tokenAmount, timePeriod, callParams);

		await token.approve(Employee1.address, 1000*tokenAmount, {from:outsider});

		await Employee1.processTokens(1000*tokenAmount, 1000*tokenAmount, {from: outsider, gasPrice: 0 });

		await Employee1.flush({ from: outsider }).should.be.rejectedWith('revert');
		await Employee1.flush({ from: creator, gasPrice: 0 });

		var balance = await token.balanceOf(creator);

		assert.equal(balance.toNumber() - balance0.toNumber(), 1000*tokenAmount, 'Should get tokenAmount');

		var needsEmployee1 = await Employee1.isNeeds({ from: creator });

		assert.equal(needsEmployee1, false, 'Dont need tokenAmount, because he got it');
		var need = await Employee1.getTotalNeeded(10000*tokenAmount);
		assert.equal(need.toNumber(), 0);

		await passHours(1*timePeriod);
		var need = await Employee1.getTotalNeeded(10000*tokenAmount);
		assert.equal(need.toNumber(), 1000*tokenAmount);

		await passHours(1*timePeriod);
		var need = await Employee1.getTotalNeeded(10000*tokenAmount);
		assert.equal(need.toNumber(), 2000*tokenAmount);

		await passHours(1*timePeriod);
		var need = await Employee1.getTotalNeeded(10000*tokenAmount);
		assert.equal(need.toNumber(), 3000*tokenAmount);

		var needsEmployee2 = await Employee1.isNeeds({ from: creator });
		assert.equal(needsEmployee2, true, 'Need tokenAmount, because 24 hours passed');

		await token.approve(Employee1.address, 4000*tokenAmount, {from:outsider});
		await Employee1.processTokens(4000*tokenAmount, 4000*tokenAmount, {from: outsider, gasPrice: 0 }).should.be.rejectedWith('revert');
		await token.approve(Employee1.address, 2000*tokenAmount, {from:outsider});
		await Employee1.processTokens(2000*tokenAmount, 2000*tokenAmount, {from: outsider, gasPrice: 0 }).should.be.rejectedWith('revert');

		await token.approve(Employee1.address, 3000*tokenAmount, {from:outsider});
		await Employee1.processTokens(3000*tokenAmount, 3000*tokenAmount, {from: outsider, gasPrice: 0 });
		await Employee1.flush({ from: creator, gasPrice: 0 });

		var balance2 = await token.balanceOf(creator);
		assert.equal(balance2.toNumber() - balance0.toNumber(), 4000*tokenAmount, 'Should get tokenAmount');

		var needsEmployee3 = await Employee1.isNeeds({ from: creator });
		assert.equal(needsEmployee3, false, 'Dont need tokenAmount, because he got it');
	});

	it('4: Splitter should access tokenAmount then close then not accept', async () => {
		var callParams = { from: creator, gasPrice: 0 };
		var balance0 = await token.balanceOf(creator);

		var tax = await ERC20RelativeExpense.new(token.address,1000000, callParams);

		Splitter = await ERC20Splitter.new(token.address,callParams);
		await Splitter.addChild(tax.address, callParams);

		var need1 = await Splitter.isNeeds({ from: creator });
		var totalNeed1 = await Splitter.getTotalNeeded(1000*tokenAmount);
		assert.equal(need1, true, 'should need tokenAmount');
		assert.equal(totalNeed1.toNumber(), 1000*tokenAmount, 'should be 10% of 1000 tokenAmount');

		await Splitter.close(callParams);

		var need3 = await Splitter.isNeeds({ from: creator });
		var totalNeed3 = await Splitter.getTotalNeeded(1000*tokenAmount);
		assert.equal(need3, false, 'should not need tokenAmount');
		assert.equal(totalNeed3.toNumber(), 0, 'should be 0 tokenAmount');

		await token.approve(Splitter.address, 1000*tokenAmount, {from:outsider});
		await Splitter.processTokens(1000*tokenAmount, 1000*tokenAmount, {from: outsider, gasPrice: 0 }).should.be.rejectedWith('revert');
		await Splitter.open(callParams);

		var need3 = await Splitter.isNeeds({ from: creator });
		var totalNeed3 = await Splitter.getTotalNeeded(1000*tokenAmount);
		assert.equal(need3, true, 'should not need tokenAmount');
		assert.equal(totalNeed3.toNumber(), 1000*tokenAmount, 'should be 0 tokenAmount');

		await token.approve(Splitter.address, 1000*tokenAmount, {from:outsider});
		await Splitter.processTokens(1000*tokenAmount, 1000*tokenAmount, {from: outsider, gasPrice: 0 })
	
		var taxBalance = await token.balanceOf(tax.address);
		assert.equal(taxBalance.toNumber(), 1000*tokenAmount, 'Tax receiver should get 100 tokenAmount');

	});

	it('5: should process tokenAmount with ERC20Splitter + 3 ERC20AbsoluteExpense', async () => {
		// create ERC20Splitter
		var erc20TopDownSplitter = await ERC20Splitter.new(token.address);

		var erc20AbsoluteExpense1 = await ERC20AbsoluteExpense.new(token.address,1*tokenAmount, 1*tokenAmount, { from: creator, gasPrice: 0 });
		var erc20AbsoluteExpense2 = await ERC20AbsoluteExpense.new(token.address,2*tokenAmount, 2*tokenAmount, { from: creator, gasPrice: 0 });
		var erc20AbsoluteExpense3 = await ERC20AbsoluteExpense.new(token.address,3*tokenAmount, 3*tokenAmount, { from: creator, gasPrice: 0 });

		// // add 3 ERC20AbsoluteExpense outputs to the splitter
		await erc20TopDownSplitter.addChild(erc20AbsoluteExpense1.address);
		await erc20TopDownSplitter.addChild(erc20AbsoluteExpense2.address);
		await erc20TopDownSplitter.addChild(erc20AbsoluteExpense3.address);

		// now send some tokenAmount to the revenue endpoint
		await token.approve(erc20TopDownSplitter.address, 6*tokenAmount, {from:creator});
		await erc20TopDownSplitter.processTokens(6*tokenAmount, 6*tokenAmount, {from: creator });

		// tokenAmount should end up in the outputs
		var erc20AbsoluteExpense1Balance = await token.balanceOf(erc20AbsoluteExpense1.address);
		assert.equal(erc20AbsoluteExpense1Balance.toNumber(), 1*tokenAmount, 'resource point received tokenAmount from splitter');

		var erc20AbsoluteExpense2Balance = await token.balanceOf(erc20AbsoluteExpense2.address);
		assert.equal(erc20AbsoluteExpense2Balance.toNumber(), 2*tokenAmount, 'resource point received tokenAmount from splitter');

		var erc20AbsoluteExpense3Balance = await token.balanceOf(erc20AbsoluteExpense3.address);
		assert.equal(erc20AbsoluteExpense3Balance.toNumber(), 3*tokenAmount, 'resource point received tokenAmount from splitter');
	});

	it('6: should process tokenAmount with ERC20Splitter + 3 ERC20AbsoluteExpense', async () => {
		// create ERC20Splitter
		var erc20UnsortedSplitter = await ERC20Splitter.new(token.address);

		var erc20AbsoluteExpense1 = await ERC20AbsoluteExpense.new(token.address,1*tokenAmount, 1*tokenAmount, { from: creator, gasPrice: 0 });
		var erc20AbsoluteExpense2 = await ERC20AbsoluteExpense.new(token.address,2*tokenAmount, 2*tokenAmount, { from: creator, gasPrice: 0 });
		var erc20AbsoluteExpense3 = await ERC20AbsoluteExpense.new(token.address,3*tokenAmount, 3*tokenAmount, { from: creator, gasPrice: 0 });

		// // add 3 ERC20AbsoluteExpense outputs to the splitter
		await erc20UnsortedSplitter.addChild(erc20AbsoluteExpense1.address);
		await erc20UnsortedSplitter.addChild(erc20AbsoluteExpense2.address);
		await erc20UnsortedSplitter.addChild(erc20AbsoluteExpense3.address);

		// now send some tokenAmount to the revenue endpoint
		await token.approve(erc20UnsortedSplitter.address, 6*tokenAmount, {from:creator});
		await erc20UnsortedSplitter.processTokens(6*tokenAmount, 6*tokenAmount, {from: creator });

		// tokenAmount should end up in the outputs
		var erc20AbsoluteExpense1Balance = await token.balanceOf(erc20AbsoluteExpense1.address);
		assert.equal(erc20AbsoluteExpense1Balance.toNumber(), 1*tokenAmount, 'resource point received tokenAmount from splitter');

		var erc20AbsoluteExpense2Balance = await token.balanceOf(erc20AbsoluteExpense2.address);
		assert.equal(erc20AbsoluteExpense2Balance.toNumber(), 2*tokenAmount, 'resource point received tokenAmount from splitter');

		var erc20AbsoluteExpense3Balance = await token.balanceOf(erc20AbsoluteExpense3.address);
		assert.equal(erc20AbsoluteExpense3Balance.toNumber(), 3*tokenAmount, 'resource point received tokenAmount from splitter');
	});

	it('7: should process tokenAmount in structure o-> o-> o-o-o', async () => {
		var AllOutputs = await ERC20Splitter.new(token.address,{ from: creator, gasPrice: 0 });
		var Salaries = await ERC20Splitter.new(token.address,{ from: creator, gasPrice: 0 });

		var Employee1 = await ERC20AbsoluteExpense.new(token.address,1000*tokenAmount, 1000*tokenAmount, { from: creator, gasPrice: 0 });
		var Employee2 = await ERC20AbsoluteExpense.new(token.address,1500*tokenAmount, 1500*tokenAmount, { from: creator, gasPrice: 0 });
		var Employee3 = await ERC20AbsoluteExpense.new(token.address,800*tokenAmount, 800*tokenAmount, { from: creator, gasPrice: 0 });

		await AllOutputs.addChild(Salaries.address, { from: creator, gasPrice: 0 });

		await Salaries.addChild(Employee1.address, { from: creator, gasPrice: 0 });
		await Salaries.addChild(Employee2.address, { from: creator, gasPrice: 0 });
		await Salaries.addChild(Employee3.address, { from: creator, gasPrice: 0 });

		var Employee1Needs = await Employee1.getTotalNeeded(3300*tokenAmount);
		assert.equal(Employee1Needs.toNumber() / tokenAmount, 1000, 'Employee1 Needs 1000 tokenAmount');
		var Employee2Needs = await Employee2.getTotalNeeded(3300*tokenAmount);
		assert.equal(Employee2Needs.toNumber() / tokenAmount, 1500, 'Employee1 Needs 1500 tokenAmount');
		var Employee3Needs = await Employee3.getTotalNeeded(3300*tokenAmount);
		assert.equal(Employee3Needs.toNumber() / tokenAmount, 800, 'Employee1 Needs 800 tokenAmount');

		var SalariesNeeds = await Salaries.getTotalNeeded(3300*tokenAmount);
		assert.equal(SalariesNeeds.toNumber() / tokenAmount, 3300, 'Salaries Needs 3300 tokenAmount');

		var SalariesMinNeeds = await Salaries.getMinNeeded(3300*tokenAmount);
		assert.equal(SalariesNeeds.toNumber() / tokenAmount, 3300, 'Salaries min Needs 3300 tokenAmount');

		var AllOutputsNeeds = await AllOutputs.getTotalNeeded(3300*tokenAmount);
		assert.equal(AllOutputsNeeds.toNumber() / tokenAmount, 3300, 'AllOutputs Needs 3300 tokenAmount');
		var MinOutpultsNeeds = await AllOutputs.getMinNeeded(3300*tokenAmount);
		assert.equal(AllOutputsNeeds.toNumber() / tokenAmount, 3300, 'AllOutputs Needs min 3300 tokenAmount');
		var OutputChildrenCount = await AllOutputs.getChildrenCount();
		assert.equal(OutputChildrenCount.toNumber(), 1, 'OutputChildrenCount should be 1');
		var SalariesChildrenCount = await Salaries.getChildrenCount();
		assert.equal(SalariesChildrenCount.toNumber(), 3, 'SalariesChildrenCount should be 3');

		var th = await token.approve(Salaries.address, 3300*tokenAmount, {from:creator});
			await Salaries.processTokens(3300*tokenAmount, 3300*tokenAmount, {from: creator, gasPrice: 0 });
	});

	it('8: should process tokenAmount in structure o-> o-o-o, while minAmount != totalAmount', async () => {
		var Salaries = await ERC20Splitter.new(token.address,{ from: creator, gasPrice: 0 });

		var Employee1 = await ERC20AbsoluteExpense.new(token.address,1000*tokenAmount, 500*tokenAmount, { from: creator, gasPrice: 0 });
		var Employee2 = await ERC20AbsoluteExpense.new(token.address,800*tokenAmount, 200*tokenAmount, { from: creator, gasPrice: 0 });
		var Employee3 = await ERC20AbsoluteExpense.new(token.address,1500*tokenAmount, 500*tokenAmount, { from: creator, gasPrice: 0 });

		await Salaries.addChild(Employee1.address, { from: creator, gasPrice: 0 });
		await Salaries.addChild(Employee2.address, { from: creator, gasPrice: 0 });
		await Salaries.addChild(Employee3.address, { from: creator, gasPrice: 0 });

		var Employee1Needs = await Employee1.getTotalNeeded(3300*tokenAmount);
		assert.equal(Employee1Needs.toNumber() / tokenAmount, 1000);
		var Employee2Needs = await Employee2.getTotalNeeded(3300*tokenAmount);
		assert.equal(Employee2Needs.toNumber() / tokenAmount, 800);
		var Employee3Needs = await Employee3.getTotalNeeded(3300*tokenAmount);
		assert.equal(Employee3Needs.toNumber() / tokenAmount, 1500);

		var SalariesNeeds = await Salaries.getTotalNeeded(3300*tokenAmount);
		assert.equal(SalariesNeeds.toNumber() / tokenAmount, 3300, 'Salaries Needs 3300 tokenAmount');

		assert.equal((await Salaries.getMinNeeded(100*tokenAmount)).toNumber() / tokenAmount, 0);
		assert.equal((await Salaries.getMinNeeded(200*tokenAmount)).toNumber() / tokenAmount, 200);
		assert.equal((await Salaries.getMinNeeded(300*tokenAmount)).toNumber() / tokenAmount, 200);
		assert.equal((await Salaries.getMinNeeded(400*tokenAmount)).toNumber() / tokenAmount, 400);
		assert.equal((await Salaries.getMinNeeded(500*tokenAmount)).toNumber() / tokenAmount, 500);
		assert.equal((await Salaries.getMinNeeded(600*tokenAmount)).toNumber() / tokenAmount, 500);
		assert.equal((await Salaries.getMinNeeded(700*tokenAmount)).toNumber() / tokenAmount, 700);
		assert.equal((await Salaries.getMinNeeded(800*tokenAmount)).toNumber() / tokenAmount, 700);
		assert.equal((await Salaries.getMinNeeded(900*tokenAmount)).toNumber() / tokenAmount, 900);
		assert.equal((await Salaries.getMinNeeded(1000*tokenAmount)).toNumber() / tokenAmount, 1000);
		assert.equal((await Salaries.getMinNeeded(1100*tokenAmount)).toNumber() / tokenAmount, 1000);
		assert.equal((await Salaries.getMinNeeded(1200*tokenAmount)).toNumber() / tokenAmount, 1200);
		assert.equal((await Salaries.getMinNeeded(1300*tokenAmount)).toNumber() / tokenAmount, 1200);
		assert.equal((await Salaries.getMinNeeded(1400*tokenAmount)).toNumber() / tokenAmount, 1400);
		assert.equal((await Salaries.getMinNeeded(1500*tokenAmount)).toNumber() / tokenAmount, 1400);
		assert.equal((await Salaries.getMinNeeded(1600*tokenAmount)).toNumber() / tokenAmount, 1600);
		assert.equal((await Salaries.getMinNeeded(1700*tokenAmount)).toNumber() / tokenAmount, 1600);
		assert.equal((await Salaries.getMinNeeded(1800*tokenAmount)).toNumber() / tokenAmount, 1800);
		assert.equal((await Salaries.getMinNeeded(1900*tokenAmount)).toNumber() / tokenAmount, 1800);
		assert.equal((await Salaries.getMinNeeded(2000*tokenAmount)).toNumber() / tokenAmount, 1800);
		assert.equal((await Salaries.getMinNeeded(2100*tokenAmount)).toNumber() / tokenAmount, 1800);
		assert.equal((await Salaries.getMinNeeded(2200*tokenAmount)).toNumber() / tokenAmount, 1800);
		assert.equal((await Salaries.getMinNeeded(2300*tokenAmount)).toNumber() / tokenAmount, 2300);
		assert.equal((await Salaries.getMinNeeded(2400*tokenAmount)).toNumber() / tokenAmount, 2300);
		assert.equal((await Salaries.getMinNeeded(2500*tokenAmount)).toNumber() / tokenAmount, 2300);
		assert.equal((await Salaries.getMinNeeded(2600*tokenAmount)).toNumber() / tokenAmount, 2300);
		assert.equal((await Salaries.getMinNeeded(2700*tokenAmount)).toNumber() / tokenAmount, 2300);
		assert.equal((await Salaries.getMinNeeded(2800*tokenAmount)).toNumber() / tokenAmount, 2800);
		assert.equal((await Salaries.getMinNeeded(2900*tokenAmount)).toNumber() / tokenAmount, 2800);
		assert.equal((await Salaries.getMinNeeded(3000*tokenAmount)).toNumber() / tokenAmount, 2800);
		assert.equal((await Salaries.getMinNeeded(3100*tokenAmount)).toNumber() / tokenAmount, 2800);
		assert.equal((await Salaries.getMinNeeded(3200*tokenAmount)).toNumber() / tokenAmount, 2800);
		assert.equal((await Salaries.getMinNeeded(3300*tokenAmount)).toNumber() / tokenAmount, 3300);
		assert.equal((await Salaries.getMinNeeded(3400*tokenAmount)).toNumber() / tokenAmount, 3300);
		assert.equal((await Salaries.getMinNeeded(3500*tokenAmount)).toNumber() / tokenAmount, 3300);

		var th = await token.approve(Salaries.address, 700*tokenAmount, {from:creator});
			await Salaries.processTokens(700*tokenAmount, 700*tokenAmount, {from: creator, gasPrice: 0 });
		
		assert.equal((await Salaries.getMinNeeded(100*tokenAmount)).toNumber() / tokenAmount, 0);
		assert.equal((await Salaries.getMinNeeded(200*tokenAmount)).toNumber() / tokenAmount, 200);
		assert.equal((await Salaries.getMinNeeded(300*tokenAmount)).toNumber() / tokenAmount, 200);
		assert.equal((await Salaries.getMinNeeded(400*tokenAmount)).toNumber() / tokenAmount, 400);
		assert.equal((await Salaries.getMinNeeded(500*tokenAmount)).toNumber() / tokenAmount, 500);
		assert.equal((await Salaries.getMinNeeded(600*tokenAmount)).toNumber() / tokenAmount, 500);
		assert.equal((await Salaries.getMinNeeded(700*tokenAmount)).toNumber() / tokenAmount, 700);
		assert.equal((await Salaries.getMinNeeded(800*tokenAmount)).toNumber() / tokenAmount, 700);
		assert.equal((await Salaries.getMinNeeded(900*tokenAmount)).toNumber() / tokenAmount, 900);
		assert.equal((await Salaries.getMinNeeded(1000*tokenAmount)).toNumber() / tokenAmount, 900);
		assert.equal((await Salaries.getMinNeeded(1100*tokenAmount)).toNumber() / tokenAmount, 1100);
		assert.equal((await Salaries.getMinNeeded(1200*tokenAmount)).toNumber() / tokenAmount, 1100);
		assert.equal((await Salaries.getMinNeeded(1300*tokenAmount)).toNumber() / tokenAmount, 1100);
		assert.equal((await Salaries.getMinNeeded(1400*tokenAmount)).toNumber() / tokenAmount, 1100);
		assert.equal((await Salaries.getMinNeeded(1500*tokenAmount)).toNumber() / tokenAmount, 1100);
		assert.equal((await Salaries.getMinNeeded(1600*tokenAmount)).toNumber() / tokenAmount, 1600);
		assert.equal((await Salaries.getMinNeeded(1700*tokenAmount)).toNumber() / tokenAmount, 1600);
		assert.equal((await Salaries.getMinNeeded(1800*tokenAmount)).toNumber() / tokenAmount, 1600);
		assert.equal((await Salaries.getMinNeeded(1900*tokenAmount)).toNumber() / tokenAmount, 1600);
		assert.equal((await Salaries.getMinNeeded(2000*tokenAmount)).toNumber() / tokenAmount, 1600);
		assert.equal((await Salaries.getMinNeeded(2100*tokenAmount)).toNumber() / tokenAmount, 2100);
		assert.equal((await Salaries.getMinNeeded(2200*tokenAmount)).toNumber() / tokenAmount, 2100);
		assert.equal((await Salaries.getMinNeeded(2300*tokenAmount)).toNumber() / tokenAmount, 2100);
		assert.equal((await Salaries.getMinNeeded(2400*tokenAmount)).toNumber() / tokenAmount, 2100);
		assert.equal((await Salaries.getMinNeeded(2500*tokenAmount)).toNumber() / tokenAmount, 2100);
		assert.equal((await Salaries.getMinNeeded(2600*tokenAmount)).toNumber() / tokenAmount, 2600);
		assert.equal((await Salaries.getMinNeeded(2700*tokenAmount)).toNumber() / tokenAmount, 2600);
		assert.equal((await Salaries.getMinNeeded(2800*tokenAmount)).toNumber() / tokenAmount, 2600);
		assert.equal((await Salaries.getMinNeeded(2900*tokenAmount)).toNumber() / tokenAmount, 2600);
		assert.equal((await Salaries.getMinNeeded(3000*tokenAmount)).toNumber() / tokenAmount, 2600);
		assert.equal((await Salaries.getMinNeeded(3100*tokenAmount)).toNumber() / tokenAmount, 2600);
		assert.equal((await Salaries.getMinNeeded(3200*tokenAmount)).toNumber() / tokenAmount, 2600);
		assert.equal((await Salaries.getMinNeeded(3300*tokenAmount)).toNumber() / tokenAmount, 2600);
		assert.equal((await Salaries.getMinNeeded(3400*tokenAmount)).toNumber() / tokenAmount, 2600);
		assert.equal((await Salaries.getMinNeeded(3500*tokenAmount)).toNumber() / tokenAmount, 2600);

		var th = await token.approve(Salaries.address, 900*tokenAmount, {from:creator});
			await Salaries.processTokens(900*tokenAmount, 900*tokenAmount, {from: creator, gasPrice: 0 });

		assert.equal((await Salaries.getMinNeeded(100*tokenAmount)).toNumber() / tokenAmount, 0);
		assert.equal((await Salaries.getMinNeeded(200*tokenAmount)).toNumber() / tokenAmount, 200);
		assert.equal((await Salaries.getMinNeeded(300*tokenAmount)).toNumber() / tokenAmount, 200);
		assert.equal((await Salaries.getMinNeeded(400*tokenAmount)).toNumber() / tokenAmount, 200);
		assert.equal((await Salaries.getMinNeeded(500*tokenAmount)).toNumber() / tokenAmount, 200);
		assert.equal((await Salaries.getMinNeeded(600*tokenAmount)).toNumber() / tokenAmount, 200);
		assert.equal((await Salaries.getMinNeeded(700*tokenAmount)).toNumber() / tokenAmount, 700);
		assert.equal((await Salaries.getMinNeeded(800*tokenAmount)).toNumber() / tokenAmount, 700);
		assert.equal((await Salaries.getMinNeeded(900*tokenAmount)).toNumber() / tokenAmount, 700);
		assert.equal((await Salaries.getMinNeeded(1000*tokenAmount)).toNumber() / tokenAmount, 700);
		assert.equal((await Salaries.getMinNeeded(1100*tokenAmount)).toNumber() / tokenAmount, 700);
		assert.equal((await Salaries.getMinNeeded(1200*tokenAmount)).toNumber() / tokenAmount, 1200);
		assert.equal((await Salaries.getMinNeeded(1300*tokenAmount)).toNumber() / tokenAmount, 1200);
		assert.equal((await Salaries.getMinNeeded(1400*tokenAmount)).toNumber() / tokenAmount, 1200);
		assert.equal((await Salaries.getMinNeeded(1500*tokenAmount)).toNumber() / tokenAmount, 1200);
		assert.equal((await Salaries.getMinNeeded(1600*tokenAmount)).toNumber() / tokenAmount, 1200);
		assert.equal((await Salaries.getMinNeeded(1700*tokenAmount)).toNumber() / tokenAmount, 1700);
		assert.equal((await Salaries.getMinNeeded(1800*tokenAmount)).toNumber() / tokenAmount, 1700);
		assert.equal((await Salaries.getMinNeeded(1900*tokenAmount)).toNumber() / tokenAmount, 1700);
		assert.equal((await Salaries.getMinNeeded(2000*tokenAmount)).toNumber() / tokenAmount, 1700);
		assert.equal((await Salaries.getMinNeeded(2100*tokenAmount)).toNumber() / tokenAmount, 1700);
		assert.equal((await Salaries.getMinNeeded(2200*tokenAmount)).toNumber() / tokenAmount, 1700);
		assert.equal((await Salaries.getMinNeeded(2300*tokenAmount)).toNumber() / tokenAmount, 1700);
		assert.equal((await Salaries.getMinNeeded(2400*tokenAmount)).toNumber() / tokenAmount, 1700);
		assert.equal((await Salaries.getMinNeeded(2500*tokenAmount)).toNumber() / tokenAmount, 1700);
		assert.equal((await Salaries.getMinNeeded(2600*tokenAmount)).toNumber() / tokenAmount, 1700);
		assert.equal((await Salaries.getMinNeeded(2700*tokenAmount)).toNumber() / tokenAmount, 1700);
		assert.equal((await Salaries.getMinNeeded(2800*tokenAmount)).toNumber() / tokenAmount, 1700);
		assert.equal((await Salaries.getMinNeeded(2900*tokenAmount)).toNumber() / tokenAmount, 1700);
		assert.equal((await Salaries.getMinNeeded(3000*tokenAmount)).toNumber() / tokenAmount, 1700);
		assert.equal((await Salaries.getMinNeeded(3100*tokenAmount)).toNumber() / tokenAmount, 1700);
		assert.equal((await Salaries.getMinNeeded(3200*tokenAmount)).toNumber() / tokenAmount, 1700);
		assert.equal((await Salaries.getMinNeeded(3300*tokenAmount)).toNumber() / tokenAmount, 1700);
		assert.equal((await Salaries.getMinNeeded(3400*tokenAmount)).toNumber() / tokenAmount, 1700);
		assert.equal((await Salaries.getMinNeeded(3500*tokenAmount)).toNumber() / tokenAmount, 1700);

		var th = await token.approve(Salaries.address, 200*tokenAmount, {from:creator});
			await Salaries.processTokens(200*tokenAmount, 200*tokenAmount, {from: creator, gasPrice: 0 });

		var th = await token.approve(Salaries.address, 1500*tokenAmount, {from:creator});
			await Salaries.processTokens(1500*tokenAmount, 1500*tokenAmount, {from: creator, gasPrice: 0 });

		var th = await token.approve(Salaries.address, 200*tokenAmount, {from:creator});
			await Salaries.processTokens(200*tokenAmount, 200*tokenAmount, {from: creator, gasPrice: 0 }).should.be.rejectedWith('revert');
	});

	it('9: should process tokenAmount with a scheme just like in the paper: 75/25 others, send MORE than minNeed; ', async () => {
		const CURRENT_INPUT = 30900;
		var e1 = 1000;
		var e2 = 1500;
		var e3 = 800;
		var office = 500;
		var internet = 300;
		var t1 = 500;
		var t2 = 300;
		var t3 = 1000;
		var b1 = 10000;
		var b2 = 10000;
		var b3 = 20000;
		var reserve = 750000;
		var dividends = 250000;

		var struct = await createStructure(token, creator, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);

		var splitterParams = await getSplitterParams(struct, CURRENT_INPUT, tokenAmount, creator);

		await totalAndMinNeedsAsserts(splitterParams, CURRENT_INPUT, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await token.approve(struct.AllOutputs.address, CURRENT_INPUT*tokenAmount, {from:creator});
		await struct.AllOutputs.processTokens(CURRENT_INPUT*tokenAmount, CURRENT_INPUT*tokenAmount, {from: creator, gasPrice: 0 });

		var balances = await getBalances(token, struct);
		await balancesAsserts(balances, CURRENT_INPUT, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await splitterBalancesAsserts(balances, tokenAmount, 0, 0, 0, 0, 0, 0, 0);
	});

	it('10: should process tokenAmount with a scheme just like in the paper: 75/25 others, send EQUAL to minNeed', async () => {
		const CURRENT_INPUT = 5900;
		var e1 = 1000;
		var e2 = 1500;
		var e3 = 800;
		var office = 500;
		var internet = 300;
		var t1 = 500;
		var t2 = 300;
		var t3 = 1000;
		var b1 = 10000;
		var b2 = 10000;
		var b3 = 20000;
		var reserve = 750000;
		var dividends = 250000;

		var struct = await createStructure(token, creator, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		var splitterParams = await getSplitterParams(struct, CURRENT_INPUT, tokenAmount, creator);

		await totalAndMinNeedsAsserts(splitterParams, CURRENT_INPUT, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);
		// console.log('------------ struct.AllOutputs.address ', struct);
		await token.approve(struct.AllOutputs.address, CURRENT_INPUT*tokenAmount, {from:creator});
		await struct.AllOutputs.processTokens(CURRENT_INPUT*tokenAmount, CURRENT_INPUT*tokenAmount, {from: creator, gasPrice: 0 });

		var balances = await getBalances(token, struct);
		await balancesAsserts(balances, CURRENT_INPUT, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, 0, 0, 0, 0, 0);
		await splitterBalancesAsserts(balances, tokenAmount, 0, 0, 0, 0, 0, 0, 0);
	});

	it('11: should not process tokenAmount: send LESS than minNeed', async () => {
		const CURRENT_INPUT = 5900;
		var e1 = 1000;
		var e2 = 1500;
		var e3 = 800;
		var office = 500;
		var internet = 300;
		var t1 = 500;
		var t2 = 300;
		var t3 = 1000;
		var b1 = 10000;
		var b2 = 10000;
		var b3 = 20000;
		var reserve = 750000;
		var dividends = 250000;

		var struct = await createStructure(token, creator, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		var splitterParams = await getSplitterParams(struct, CURRENT_INPUT, tokenAmount, creator);
		await totalAndMinNeedsAsserts(splitterParams, CURRENT_INPUT, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await token.approve(struct.AllOutputs.address, 1000*tokenAmount, {from:creator});
		await struct.AllOutputs.processTokens(1000*tokenAmount, 1000*tokenAmount, {from: creator }).should.be.rejectedWith('revert');
		await token.approve(struct.AllOutputs.address, 1000*tokenAmount, {from:creator});
		await struct.AllOutputs.processTokens(1000000*tokenAmount, 1000*tokenAmount, {from: creator }).should.be.rejectedWith('revert');
		await token.approve(struct.AllOutputs.address, 1000000*tokenAmount, {from:creator});
		await struct.AllOutputs.processTokens(1000*tokenAmount, 1000000*tokenAmount, {from: creator }).should.be.rejectedWith('revert');
	});

	it('12: should process tokenAmount with a scheme just like in the paper: 10/15 others, send MORE than minNeed; ', async () => {
		const CURRENT_INPUT = 20900;
		var e1 = 1000;
		var e2 = 1500;
		var e3 = 800;
		var office = 500;
		var internet = 300;
		var t1 = 500;
		var t2 = 300;
		var t3 = 1000;
		var b1 = 10000;
		var b2 = 10000;
		var b3 = 20000;
		var reserve = 850000;
		var dividends = 150000;

		var struct = await createStructure(token, creator, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		var splitterParams = await getSplitterParams(struct, CURRENT_INPUT, tokenAmount, creator);
		await totalAndMinNeedsAsserts(splitterParams, CURRENT_INPUT, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await token.approve(struct.AllOutputs.address, CURRENT_INPUT*tokenAmount, {from:creator});
		await struct.AllOutputs.processTokens(CURRENT_INPUT*tokenAmount, CURRENT_INPUT*tokenAmount, {from: creator, gasPrice: 0 });

		var balances = await getBalances(token, struct);
		await balancesAsserts(balances, CURRENT_INPUT, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await splitterBalancesAsserts(balances, tokenAmount, 0, 0, 0, 0, 0, 0, 0);
	});

	it('13: should NOT process tokenAmount (splitter can not accumulate tokenAmount) with a scheme just like in the paper: 10/15 others, send MORE than minNeed; ', async () => {
		const CURRENT_INPUT = 20900;
		var e1 = 1000;
		var e2 = 1500;
		var e3 = 800;
		var office = 500;
		var internet = 300;
		var t1 = 500;
		var t2 = 300;
		var t3 = 1000;
		var b1 = 10000;
		var b2 = 10000;
		var b3 = 20000;
		var reserve = 100000;
		var dividends = 150000;

		var struct = await createStructure(token, creator, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		var splitterParams = await getSplitterParams(struct, CURRENT_INPUT, tokenAmount, creator);
		await totalAndMinNeedsAsserts(splitterParams, CURRENT_INPUT, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await token.approve(struct.AllOutputs.address, CURRENT_INPUT*tokenAmount, {from:creator});
		await struct.AllOutputs.processTokens(CURRENT_INPUT*tokenAmount, CURRENT_INPUT*tokenAmount, {from: creator, gasPrice: 0 }).should.be.rejectedWith('revert');
	});

	it('14: should process tokenAmount with a scheme just like in the paper: 10/15 others, send EQUAL to minNeed; ', async () => {
		const CURRENT_INPUT = 5900;
		var e1 = 1000;
		var e2 = 1500;
		var e3 = 800;
		var office = 500;
		var internet = 300;
		var t1 = 500;
		var t2 = 300;
		var t3 = 1000;
		var b1 = 10000;
		var b2 = 10000;
		var b3 = 20000;
		var reserve = 100000;
		var dividends = 150000;

		var struct = await createStructure(token, creator, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		var splitterParams = await getSplitterParams(struct, CURRENT_INPUT, tokenAmount, creator);
		await totalAndMinNeedsAsserts(splitterParams, CURRENT_INPUT, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await token.approve(struct.AllOutputs.address, CURRENT_INPUT*tokenAmount, {from:creator});
		await struct.AllOutputs.processTokens(CURRENT_INPUT*tokenAmount, CURRENT_INPUT*tokenAmount, {from: creator, gasPrice: 0 });

		var balances = await getBalances(token, struct);
		await balancesAsserts(balances, CURRENT_INPUT, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, 0, 0, 0, 0, 0);
		await splitterBalancesAsserts(balances, tokenAmount, 0, 0, 0, 0, 0, 0, 0);
	});

	it('15: should not process tokenAmount: send LESS than minNeed; ', async () => {
		const CURRENT_INPUT = 30900;
		var e1 = 1000;
		var e2 = 1500;
		var e3 = 800;
		var office = 500;
		var internet = 300;
		var t1 = 500;
		var t2 = 300;
		var t3 = 1000;
		var b1 = 10000;
		var b2 = 10000;
		var b3 = 20000;
		var reserve = 100000;
		var dividends = 150000;

		var struct = await createStructure(token, creator, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		var splitterParams = await getSplitterParams(struct, CURRENT_INPUT, tokenAmount, creator);
		await totalAndMinNeedsAsserts(splitterParams, CURRENT_INPUT, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await token.approve(struct.AllOutputs.address, 1000*tokenAmount, {from:creator});
		await struct.AllOutputs.processTokens(1000*tokenAmount, 1000*tokenAmount, {from: creator }).should.be.rejectedWith('revert');
		await token.approve(struct.AllOutputs.address, 1000*tokenAmount, {from:creator});
		await struct.AllOutputs.processTokens(1000000*tokenAmount, 1000*tokenAmount, {from: creator }).should.be.rejectedWith('revert');
		await token.approve(struct.AllOutputs.address, 1000000*tokenAmount, {from:creator});
		await struct.AllOutputs.processTokens(1000*tokenAmount, 1000000*tokenAmount, {from: creator }).should.be.rejectedWith('revert');
	});

	it('16: should process tokenAmount with ERC20Splitter + 3 ERC20RelativeExpenseWithPeriod', async () => {
		// create ERC20Splitter
		var splitter = await ERC20Splitter.new(token.address);

		var rel1 = await ERC20RelativeExpenseWithPeriod.new(token.address,100000, 24, { from: creator, gasPrice: 0 });
		var rel2 = await ERC20RelativeExpenseWithPeriod.new(token.address,250000, 24, { from: creator, gasPrice: 0 });
		var rel3 = await ERC20RelativeExpenseWithPeriod.new(token.address,370000, 48, { from: creator, gasPrice: 0 });

		// // add 3 rel expense outputs to the splitter
		await splitter.addChild(rel1.address);
		await splitter.addChild(rel2.address);
		await splitter.addChild(rel3.address);
		
		var targets = [splitter, rel1, rel2, rel3];
		var flowArr = [1000, 1000, 1000, 1000];

		await checkMinNeed(targets, flowArr, [0, 0, 0, 0]);
		await checkTotalNeed(targets, flowArr, [720, 100, 250, 370]);
		await checkIsNeed(targets, [true, true, true, true]);

		// now send some tokenAmount to the revenue endpoint
		await token.approve(splitter.address, 720*tokenAmount, {from:creator});
		await splitter.processTokens(1000*tokenAmount, 720*tokenAmount, {from: creator});

		assert.equal((await token.balanceOf(rel1.address)).toNumber(), 100*tokenAmount);
		assert.equal((await token.balanceOf(rel2.address)).toNumber(), 250*tokenAmount);
		assert.equal((await token.balanceOf(rel3.address)).toNumber(), 370*tokenAmount);

		await checkMinNeed(targets, flowArr, [0, 0, 0, 0]);
		await checkTotalNeed(targets, flowArr, [0, 0, 0, 0]);
		await checkIsNeed(targets, [false, false, false, false]);

		await passHours(24);

		await checkMinNeed(targets, flowArr, [0, 0, 0, 0]);
		await checkTotalNeed(targets, flowArr, [350, 100, 250, 0]);
		await checkIsNeed(targets, [true, true, true, false]);

		await passHours(24);

		await checkMinNeed(targets, flowArr, [0, 0, 0, 0]);
		await checkTotalNeed(targets, flowArr, [720, 100, 250, 370]);
		await checkIsNeed(targets, [true, true, true, true]);

		await token.approve(splitter.address, 720*tokenAmount, {from:creator});
		await splitter.processTokens(1000*tokenAmount, 720*tokenAmount, {from: creator });

		await checkMinNeed(targets, flowArr, [0, 0, 0, 0]);
		await checkTotalNeed(targets, flowArr, [0, 0, 0, 0]);
		await checkIsNeed(targets, [false, false, false, false]);

		// tokenAmount should end up in the outputs
		assert.equal((await token.balanceOf(rel1.address)).toNumber(), 200*tokenAmount);
		assert.equal((await token.balanceOf(rel2.address)).toNumber(), 500*tokenAmount);
		assert.equal((await token.balanceOf(rel3.address)).toNumber(), 740*tokenAmount);

		await passHours(24);	

		await checkMinNeed(targets, flowArr, [0, 0, 0, 0]);
		await checkTotalNeed(targets, flowArr, [350, 100, 250, 0]);
		await checkIsNeed(targets, [true, true, true, false]);

		await token.approve(splitter.address, 350*tokenAmount, {from:creator});
		await splitter.processTokens(1000*tokenAmount, 350*tokenAmount, {from: creator });	
		
		await checkMinNeed(targets, flowArr, [0, 0, 0, 0]);
		await checkTotalNeed(targets, flowArr, [0, 0, 0, 0]);
		await checkIsNeed(targets, [false, false, false, false]);		
	});
});