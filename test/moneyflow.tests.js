var MoneyFlow = artifacts.require('./MoneyFlow');
var IWeiReceiver = artifacts.require('./IWeiReceiver');

var WeiSplitter = artifacts.require('./WeiSplitter');
var WeiAbsoluteExpense = artifacts.require('./WeiAbsoluteExpense');
var WeiRelativeExpense = artifacts.require('./WeiRelativeExpense');
var WeiAbsoluteExpenseWithPeriod = artifacts.require('./WeiAbsoluteExpenseWithPeriod');
var WeiRelativeExpenseWithPeriod = artifacts.require('./WeiRelativeExpenseWithPeriod');

var WeiAbsoluteExpenseWithPeriodSliding = artifacts.require('./WeiAbsoluteExpenseWithPeriodSliding');
var WeiRelativeExpenseWithPeriodSliding = artifacts.require('./WeiRelativeExpenseWithPeriodSliding');


function KECCAK256 (x) {
	return web3.sha3(x);
}

require('chai')
	.use(require('chai-as-promised'))
	.use(require('chai-bignumber')(web3.BigNumber))
	.should();

async function createStructure (creator, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends) {
	var callParams = { from: creator, gasPrice: 0 };
	var o = {};

	o.AllOutpults = await WeiSplitter.new('AllOutpults', callParams);
	o.Spends = await WeiSplitter.new(callParams);
	o.Salaries = await WeiSplitter.new(callParams);
	o.Employee1 = await WeiAbsoluteExpense.new(e1*money, e1*money, callParams);
	o.Employee2 = await WeiAbsoluteExpense.new(e2*money, e2*money, callParams);
	o.Employee3 = await WeiAbsoluteExpense.new(e3*money, e3*money, callParams);
	o.Other = await WeiSplitter.new(callParams);
	o.Office = await WeiAbsoluteExpense.new(office*money, office*money, callParams);
	o.Internet = await WeiAbsoluteExpense.new(internet*money, internet*money, callParams);
	o.Tasks = await WeiSplitter.new(callParams);
	o.Task1 = await WeiAbsoluteExpense.new(t1*money, t1*money, callParams);
	o.Task2 = await WeiAbsoluteExpense.new(t2*money, t2*money, callParams);
	o.Task3 = await WeiAbsoluteExpense.new(t3*money, t3*money, callParams);
	o.Bonuses = await WeiSplitter.new(callParams);
	o.Bonus1 = await WeiRelativeExpense.new(b1, callParams);
	o.Bonus2 = await WeiRelativeExpense.new(b2, callParams);
	o.Bonus3 = await WeiRelativeExpense.new(b3, callParams);
	o.Rest = await WeiSplitter.new(callParams);
	o.ReserveFund = await WeiRelativeExpenseWithPeriod.new(reserve, 0, callParams);
	o.DividendsFund = await WeiRelativeExpenseWithPeriod.new(dividends, 0, callParams);

	// CONNECTIONS
	await o.AllOutpults.addChild(o.Spends.address, callParams);
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
	await o.AllOutpults.addChild(o.Bonuses.address, callParams);
	await o.Bonuses.addChild(o.Bonus1.address, callParams);
	await o.Bonuses.addChild(o.Bonus2.address, callParams);
	await o.Bonuses.addChild(o.Bonus3.address, callParams);
	await o.AllOutpults.addChild(o.Rest.address, callParams);
	await o.Rest.addChild(o.ReserveFund.address, callParams);
	await o.Rest.addChild(o.DividendsFund.address, callParams);

	return o;
}

async function totalAndMinNeedsAsserts (i, CURRENT_INPUT, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends) {
	var totalSpend = e1 + e2 + e3 + t1 + t2 + t3 + office + internet;
	var bonusesSpendPercent = (CURRENT_INPUT - totalSpend) / 1000000;
	var fundsPercent = (CURRENT_INPUT - totalSpend - bonusesSpendPercent*(b1 + b2 + b3)) / 1000000;

	var allNeeds = totalSpend + bonusesSpendPercent*(b1 + b2 + b3) + fundsPercent*(reserve + dividends);

	assert.equal(i.AllOutpultsTotalNeed.toNumber() / money, allNeeds, `AllOutpults Total Need should be ${allNeeds}`);
	assert.equal(i.AllOutpultsMinNeed.toNumber() / money, totalSpend, `AllOutpults min Need should be ${totalSpend}`);
	assert.equal(i.SpendsTotalNeed.toNumber() / money, totalSpend, `Spends Total Need should be ${totalSpend}`);
	assert.equal(i.SpendsMinNeed.toNumber() / money, totalSpend, `Spends min Need should be ${totalSpend}`);
	assert.equal(i.SalariesTotalNeed.toNumber() / money, e1 + e2 + e3, `Salaries Total Need should be ${e1 + e2 + e3}`);
	assert.equal(i.SalariesMinNeed.toNumber() / money, e1 + e2 + e3, `Salaries min Need should be ${e1 + e2 + e3}`);
	assert.equal(i.OtherTotalNeed.toNumber() / money, office + internet, `Other Total Need should be ${office + internet}`);
	assert.equal(i.OtherMinNeed.toNumber() / money, office + internet, `Other min Need should be ${office + internet}`);
	assert.equal(i.TasksTotalNeed.toNumber() / money, t1 + t2 + t3, `Tasks Total Need should be ${t1 + t2 + t3}`);
	assert.equal(i.TasksMinNeed.toNumber() / money, t1 + t2 + t3, `Tasks min Need should be ${t1 + t2 + t3}`);
	assert.equal(i.BonusesTotalNeed.toNumber() / money, (b1 + b2 + b3)*CURRENT_INPUT / 1000000, `Bonuses Total Need should be ${(b1 + b2 + b3)*CURRENT_INPUT / 1000000}`);
	assert.equal(i.BonusesMinNeed.toNumber() / money, 0, `Bonuses min Need should be ${0}`);
	assert.equal(i.RestTotalNeed.toNumber() / money, (reserve + dividends)*CURRENT_INPUT / 1000000, `Rest Total Need should be ${(reserve + dividends)*CURRENT_INPUT / 1000000}`);
	assert.equal(i.RestMinNeed.toNumber() / money, 0, `Rest min Need should be ${0}`);
}

async function getBalances (i) {
	var o = {};
	o.Employee1Balance = await web3.eth.getBalance(i.Employee1.address);
	o.Employee2Balance = await web3.eth.getBalance(i.Employee2.address);
	o.Employee3Balance = await web3.eth.getBalance(i.Employee3.address);
	o.OfficeBalance = await web3.eth.getBalance(i.Office.address);
	o.InternetBalance = await web3.eth.getBalance(i.Internet.address);
	o.Task1Balance = await web3.eth.getBalance(i.Task1.address);
	o.Task2Balance = await web3.eth.getBalance(i.Task2.address);
	o.Task3Balance = await web3.eth.getBalance(i.Task3.address);
	o.Reserve3Balance = await web3.eth.getBalance(i.ReserveFund.address);
	o.Dividends3Balance = await web3.eth.getBalance(i.DividendsFund.address);
	o.Bonus1Balance = await web3.eth.getBalance(i.Bonus1.address);
	o.Bonus2Balance = await web3.eth.getBalance(i.Bonus2.address);
	o.Bonus3Balance = await web3.eth.getBalance(i.Bonus3.address);
	o.AllOutpultsBalance = await web3.eth.getBalance(i.AllOutpults.address);
	o.SpendsBalance = await web3.eth.getBalance(i.Spends.address);
	o.SalariesBalance = await web3.eth.getBalance(i.Salaries.address);
	o.OtherBalance = await web3.eth.getBalance(i.Other.address);
	o.TasksBalance = await web3.eth.getBalance(i.Tasks.address);
	o.BonusesBalance = await web3.eth.getBalance(i.Bonuses.address);
	o.RestBalance = await web3.eth.getBalance(i.Rest.address);

	return o;
}

async function getSplitterParams (i, CURRENT_INPUT, money, creator) {
	var o = {};
	o.AllOutpultsTotalNeed = await i.AllOutpults.getTotalWeiNeeded(CURRENT_INPUT*money, { from: creator });
	o.AllOutpultsMinNeed = await i.AllOutpults.getMinWeiNeeded(0);/*minNeedFix*/
	o.AllOutpultsChildrenCount = await i.AllOutpults.getChildrenCount();
	o.SpendsTotalNeed = await i.Spends.getTotalWeiNeeded(CURRENT_INPUT*money, { from: creator });
	o.SpendsMinNeed = await i.Spends.getMinWeiNeeded(0);/*minNeedFix*/
	o.SpendsChildrenCount = await i.Spends.getChildrenCount();
	o.SalariesTotalNeed = await i.Salaries.getTotalWeiNeeded(CURRENT_INPUT*money, { from: creator });
	o.SalariesMinNeed = await i.Salaries.getMinWeiNeeded(0);/*minNeedFix*/
	o.SalariesChildrenCount = await i.Salaries.getChildrenCount();
	o.OtherTotalNeed = await i.Other.getTotalWeiNeeded(CURRENT_INPUT*money, { from: creator });
	o.OtherMinNeed = await i.Other.getMinWeiNeeded(0);/*minNeedFix*/
	o.OtherChildrenCount = await i.Other.getChildrenCount();
	o.TasksTotalNeed = await i.Tasks.getTotalWeiNeeded(CURRENT_INPUT*money, { from: creator });
	o.TasksMinNeed = await i.Tasks.getMinWeiNeeded(0);/*minNeedFix*/
	o.TasksChildrenCount = await i.Tasks.getChildrenCount();
	o.BonusesTotalNeed = await i.Bonuses.getTotalWeiNeeded(CURRENT_INPUT*money, { from: creator });
	o.BonusesMinNeed = await i.Bonuses.getMinWeiNeeded(0);/*minNeedFix*/
	o.BonusesChildrenCount = await i.Bonuses.getChildrenCount();
	o.RestTotalNeed = await i.Rest.getTotalWeiNeeded(CURRENT_INPUT*money, { from: creator });
	o.RestMinNeed = await i.Rest.getMinWeiNeeded(0);/*minNeedFix*/
	o.RestChildrenCount = await i.Rest.getChildrenCount();

	return o;
}

async function structureAsserts (i) {
	assert.equal(i.AllOutpultsChildrenCount.toNumber(), 3, 'Children count should be 3');
	assert.equal(i.SpendsChildrenCount.toNumber(), 3, 'Children count should be 3');
	assert.equal(i.SalariesChildrenCount.toNumber(), 3, 'Children count should be 3');
	assert.equal(i.OtherChildrenCount.toNumber(), 2, 'Children count should be 2');
	assert.equal(i.TasksChildrenCount.toNumber(), 3, 'Children count should be 3');
	assert.equal(i.BonusesChildrenCount.toNumber(), 3, 'Children count should be 3');
	assert.equal(i.RestChildrenCount.toNumber(), 2, 'Children count should be 2');
}

async function balancesAsserts (i, CURRENT_INPUT, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends) {
	var totalSpend = e1 + e2 + e3 + t1 + t2 + t3 + office + internet;
	var bonusesSpendPercent = (CURRENT_INPUT - totalSpend) / 1000000;
	var fundsPercent = (CURRENT_INPUT - totalSpend - bonusesSpendPercent*(b1 + b2 + b3)) / 1000000;

	assert.equal(i.Employee1Balance.toNumber() / money, e1, `Employee1 balance should be ${e1} money`);
	assert.equal(i.Employee2Balance.toNumber() / money, e2, `Employee2 balance should be ${e2} money`);
	assert.equal(i.Employee3Balance.toNumber() / money, e3, `Employee3 balance should be ${e3} money`);
	assert.equal(i.OfficeBalance.toNumber() / money, office, `Office balance should be ${office} money`);
	assert.equal(i.InternetBalance.toNumber() / money, internet, `Internet balance should be ${internet} money`);
	assert.equal(i.Task1Balance.toNumber() / money, t1, `Task1 balance should be ${t1} money`);
	assert.equal(i.Task2Balance.toNumber() / money, t2, `Task2 balance should be ${t2} money`);
	assert.equal(i.Task3Balance.toNumber() / money, t3, `Task3 balance should be ${t3} money`);

	assert.equal(i.Bonus1Balance.toNumber() / money, bonusesSpendPercent*b1, `Bonus1 balance should be ${bonusesSpendPercent*b1} money`);
	assert.equal(i.Bonus2Balance.toNumber() / money, bonusesSpendPercent*b2, `Bonus2 balance should be ${bonusesSpendPercent*b2} money`);
	assert.equal(i.Bonus3Balance.toNumber() / money, bonusesSpendPercent*b3, `Bonus3 balance should be ${bonusesSpendPercent*b3} money`);

	assert.equal(i.Reserve3Balance.toNumber() / money, fundsPercent*reserve, `Reserve3 balance should be ${fundsPercent*reserve} money`);
	assert.equal(i.Dividends3Balance.toNumber() / money, fundsPercent*dividends, `Dividends3 balance should be ${fundsPercent*dividends} money`);
}

async function splitterBalancesAsserts (i, money, allOutpultsBalance, spendsBalance, salariesBalance, otherBalance, tasksBalance, bonusesBalance, restBalance) {
	assert.equal(i.AllOutpultsBalance.toNumber() / money, allOutpultsBalance, `AllOutpults balance should be ${allOutpultsBalance} money`);
	assert.equal(i.SpendsBalance.toNumber() / money, spendsBalance, `Spends balance should be ${spendsBalance} money`);
	assert.equal(i.SalariesBalance.toNumber() / money, salariesBalance, `Salaries balance should be ${salariesBalance} money`);
	assert.equal(i.OtherBalance.toNumber() / money, otherBalance, `Other balance should be ${otherBalance} money`);
	assert.equal(i.TasksBalance.toNumber() / money, tasksBalance, `Tasks balance should be ${tasksBalance} money`);
	assert.equal(i.BonusesBalance.toNumber() / money, bonusesBalance, `Bonuses balance should be ${bonusesBalance} money`);
	assert.equal(i.RestBalance.toNumber() / money, restBalance, `Rest balance should be ${restBalance} money`);
}

contract('Moneyflow', (accounts) => {
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
	var setRootWeiReceiver;
	var burnTokens;

	var money = 1e14;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[3];

	it('Should revert when some money stays on splitter (U-> abs-rel50%)', async () => {
		var abs = await WeiAbsoluteExpense.new(1e15, 1e15);
		var splitter = await WeiSplitter.new();
		var rel = await WeiRelativeExpense.new(500000);
		await splitter.addChild(abs.address);
		await splitter.addChild(rel.address);
		await splitter.processFunds(1e16, { value: 1e16 }).should.be.rejectedWith('revert');
	});


	it('should process money with WeiAbsoluteExpenseWithPeriod, then 25 hours, then money needs again', async () => {
		var timePeriod = 25;
		var callParams = { from: creator, gasPrice: 0 };
		var struct = {};
		var balance0 = await web3.eth.getBalance(creator);

		Employee1 = await WeiAbsoluteExpenseWithPeriodSliding.new(1000*money, 1000*money, timePeriod, callParams);

		await Employee1.processFunds(1000*money, { value: 1000*money, from: outsider, gasPrice: 0 });
		await Employee1.flush({ from: outsider }).should.be.rejectedWith('revert');
		await Employee1.flush({ from: creator, gasPrice: 0 });

		var balance = await web3.eth.getBalance(creator);
		assert.equal(balance.toNumber() - balance0.toNumber(), 1000*money, 'Should get money');

		var needsEmployee1 = await Employee1.isNeedsMoney({ from: creator });
		assert.equal(needsEmployee1, false, 'Dont need money, because he got it');

		await web3.currentProvider.sendAsync({
			jsonrpc: '2.0',
			method: 'evm_increaseTime',
			params: [3600*25*1000],
			id: new Date().getTime(),
		}, function (err) { if (err) console.log('err:', err); });

		var needsEmployee2 = await Employee1.isNeedsMoney({ from: creator });
		assert.equal(needsEmployee2, true, 'Need money, because 24 hours passed');

		await Employee1.processFunds(1000*money, { value: 1000*money, from: outsider, gasPrice: 0 });
		await Employee1.flush({ from: creator, gasPrice: 0 });

		var balance2 = await web3.eth.getBalance(creator);
		assert.equal(balance2.toNumber() - balance0.toNumber(), 2000*money, 'Should get money');

		var needsEmployee3 = await Employee1.isNeedsMoney({ from: creator });
		assert.equal(needsEmployee3, false, 'Dont need money, because he got it');
	});

	it('should process money with WeiAbsoluteExpenseWithPeriod, then 75 hours, then money needs again x3', async () => {
		var timePeriod = 25;
		var callParams = { from: creator, gasPrice: 0 };
		var struct = {};
		var balance0 = await web3.eth.getBalance(creator);
		Employee1 = await WeiAbsoluteExpenseWithPeriodSliding.new(1000*money, 1000*money, timePeriod, callParams);

		var multi1 = await Employee1.getDebtMultiplier();
		assert.equal(multi1.toNumber(), 1, '0 hours => x1');

		await Employee1.processFunds(1000*money, { value: 1000*money, from: outsider, gasPrice: 0 });
		await Employee1.flush({ from: outsider }).should.be.rejectedWith('revert');
		await Employee1.flush({ from: creator, gasPrice: 0 });

		var balance = await web3.eth.getBalance(creator);

		assert.equal(balance.toNumber() - balance0.toNumber(), 1000*money, 'Should get money');

		var needsEmployee1 = await Employee1.isNeedsMoney({ from: creator });
		assert.equal(needsEmployee1, false, 'Dont need money, because he got it');

		await web3.currentProvider.sendAsync({
			jsonrpc: '2.0',
			method: 'evm_increaseTime',
			params: [3600*75*1000],
			id: new Date().getTime(),
		}, function (err) { if (err) console.log('err:', err); });

		// var periodHours = await Employee1.periodHours();
		// var MomentReceived2 = await Employee1.momentReceived();

		var multi2 = await Employee1.getDebtMultiplier();
		assert.equal(multi2.toNumber(), 3, '75 hours => x3');

		var needsEmployee2 = await Employee1.isNeedsMoney({ from: creator });
		assert.equal(needsEmployee2, true, 'Need money, because 24 hours passed');

		await Employee1.processFunds(4000*money, { value: 4000*money, from: outsider, gasPrice: 0 }).should.be.rejectedWith('revert');
		await Employee1.processFunds(2000*money, { value: 2000*money, from: outsider, gasPrice: 0 }).should.be.rejectedWith('revert');

		await Employee1.processFunds(3000*money, { value: 3000*money, from: outsider, gasPrice: 0 });
		await Employee1.flush({ from: creator, gasPrice: 0 });

		var balance2 = await web3.eth.getBalance(creator);
		assert.equal(balance2.toNumber() - balance0.toNumber(), 4000*money, 'Should get money');

		var needsEmployee3 = await Employee1.isNeedsMoney({ from: creator });
		assert.equal(needsEmployee3, false, 'Dont need money, because he got it');
	});

	it('Splitter should access money then close then not accept', async () => {
		var callParams = { from: creator, gasPrice: 0 };
		var struct = {};
		var balance0 = await web3.eth.getBalance(creator);

		var tax = await WeiRelativeExpenseWithPeriod.new(1000000, 0, callParams);

		Splitter = await WeiSplitter.new(callParams);
		await Splitter.addChild(tax.address, callParams);

		var need1 = await Splitter.isNeedsMoney({ from: creator });
		var totalNeed1 = await Splitter.getTotalWeiNeeded(1000*money);
		assert.equal(need1, true, 'should need money');
		assert.equal(totalNeed1.toNumber(), 1000*money, 'should be 10% of 1000 money');

		await Splitter.processFunds(1000*money, { value: 1000*money, from: outsider, gasPrice: 0 });

		var taxBalance = await web3.eth.getBalance(tax.address);
		assert.equal(taxBalance.toNumber(), 1000*money, 'Tax receiver should get 100 money');

		var need2 = await Splitter.isNeedsMoney({ from: creator });
		var totalNeed2 = await Splitter.getTotalWeiNeeded(1000*money);
		assert.equal(need2, true, 'should need money');
		assert.equal(totalNeed2.toNumber(), 1000*money, 'should be 10% of 1000 money');

		await Splitter.close(callParams);

		var need3 = await Splitter.isNeedsMoney({ from: creator });
		var totalNeed3 = await Splitter.getTotalWeiNeeded(1000*money);
		assert.equal(need3, false, 'should not need money');
		assert.equal(totalNeed3.toNumber(), 0, 'should be 0 money');

		await Splitter.processFunds(1000*money, { value: 1000*money, from: outsider, gasPrice: 0 }).should.be.rejectedWith('revert');
	});

	it('should process money with WeiSplitter + 3 WeiAbsoluteExpense', async () => {
		// create WeiSplitter
		var weiTopDownSplitter = await WeiSplitter.new();

		var weiAbsoluteExpense1 = await WeiAbsoluteExpense.new(1*money, 1*money, { from: creator, gasPrice: 0 });
		var weiAbsoluteExpense2 = await WeiAbsoluteExpense.new(2*money, 2*money, { from: creator, gasPrice: 0 });
		var weiAbsoluteExpense3 = await WeiAbsoluteExpense.new(3*money, 3*money, { from: creator, gasPrice: 0 });

		// // add 3 WeiAbsoluteExpense outputs to the splitter
		await weiTopDownSplitter.addChild(weiAbsoluteExpense1.address);
		await weiTopDownSplitter.addChild(weiAbsoluteExpense2.address);
		await weiTopDownSplitter.addChild(weiAbsoluteExpense3.address);

		// now send some money to the revenue endpoint
		await weiTopDownSplitter.processFunds(6*money, { value: 6*money, from: creator });

		// money should end up in the outputs
		var weiAbsoluteExpense1Balance = await web3.eth.getBalance(weiAbsoluteExpense1.address);
		assert.equal(weiAbsoluteExpense1Balance.toNumber(), 1*money, 'resource point received money from splitter');

		var weiAbsoluteExpense2Balance = await web3.eth.getBalance(weiAbsoluteExpense2.address);
		assert.equal(weiAbsoluteExpense2Balance.toNumber(), 2*money, 'resource point received money from splitter');

		var weiAbsoluteExpense3Balance = await web3.eth.getBalance(weiAbsoluteExpense3.address);
		assert.equal(weiAbsoluteExpense3Balance.toNumber(), 3*money, 'resource point received money from splitter');
	});

	it('should process money with WeiSplitter + 2 WeiAbsoluteExpense + WeiRelativeExpense', async () => {
		// create WeiSplitter
		var weiTopDownSplitter = await WeiSplitter.new();

		var weiAbsoluteExpense1 = await WeiAbsoluteExpense.new(money, money, { from: creator, gasPrice: 0 });
		var weiRelativeExpense1 = await WeiRelativeExpense.new(500000, { from: creator, gasPrice: 0 });
		var weiAbsoluteExpense3 = await WeiAbsoluteExpense.new(money, money, { from: creator, gasPrice: 0 });

		// // add 3 WeiAbsoluteExpense outputs to the splitter
		await weiTopDownSplitter.addChild(weiAbsoluteExpense1.address);
		await weiTopDownSplitter.addChild(weiRelativeExpense1.address);
		await weiTopDownSplitter.addChild(weiAbsoluteExpense3.address);

		// now send some money to the revenue endpoint
		var minNeed = await weiTopDownSplitter.getMinWeiNeeded(0);/*minNeedFix*/
		assert.equal(minNeed, 3*money);

		await weiTopDownSplitter.processFunds(3*money, { value: 3*money, from: creator });

		// money should end up in the outputs
		var weiAbsoluteExpense1Balance = await web3.eth.getBalance(weiAbsoluteExpense1.address);
		assert.equal(weiAbsoluteExpense1Balance.toNumber(), money, 'resource point received money from splitter');

		var weiRelativeExpense1Balance = await web3.eth.getBalance(weiRelativeExpense1.address);
		assert.equal(weiRelativeExpense1Balance.toNumber(), money, 'resource point received money from splitter');

		var weiAbsoluteExpense3Balance = await web3.eth.getBalance(weiAbsoluteExpense3.address);
		assert.equal(weiAbsoluteExpense3Balance.toNumber(), money, 'resource point received money from splitter');
	});

	it('should process money with WeiSplitter + 2 WeiAbsoluteExpense + WeiRelativeExpense', async () => {
		// create WeiSplitter
		var weiUnsortedSplitter = await WeiSplitter.new();

		var weiAbsoluteExpense1 = await WeiAbsoluteExpense.new(money, money, { from: creator, gasPrice: 0 });
		var weiRelativeExpense1 = await WeiRelativeExpense.new(900000, { from: creator, gasPrice: 0 });
		var weiAbsoluteExpense3 = await WeiAbsoluteExpense.new(money, money, { from: creator, gasPrice: 0 });

		// // add 3 WeiAbsoluteExpense outputs to the splitter
		await weiUnsortedSplitter.addChild(weiAbsoluteExpense1.address);
		await weiUnsortedSplitter.addChild(weiRelativeExpense1.address);
		await weiUnsortedSplitter.addChild(weiAbsoluteExpense3.address);

		// now send some money to the revenue endpoint

		var minNeed = await weiUnsortedSplitter.getMinWeiNeeded(0);/*minNeedFix*/
		assert.equal(minNeed, 20*money);

		await weiUnsortedSplitter.processFunds(20*money, { value: 20*money, from: creator });

		// money should end up in the outputs
		var weiAbsoluteExpense1Balance = await web3.eth.getBalance(weiAbsoluteExpense1.address);
		assert.equal(weiAbsoluteExpense1Balance.toNumber(), money, 'resource point received money from splitter');

		var weiRelativeExpense1Balance = await web3.eth.getBalance(weiRelativeExpense1.address);
		assert.equal(weiRelativeExpense1Balance.toNumber(), 18*money, 'resource point received money from splitter');

		var weiAbsoluteExpense3Balance = await web3.eth.getBalance(weiAbsoluteExpense3.address);
		assert.equal(weiAbsoluteExpense3Balance.toNumber(), money, 'resource point received money from splitter');
	});

	it('should process money with WeiSplitter + 3 WeiAbsoluteExpense', async () => {
		// create WeiSplitter
		var weiUnsortedSplitter = await WeiSplitter.new();

		var weiAbsoluteExpense1 = await WeiAbsoluteExpense.new(1*money, 1*money, { from: creator, gasPrice: 0 });
		var weiAbsoluteExpense2 = await WeiAbsoluteExpense.new(2*money, 2*money, { from: creator, gasPrice: 0 });
		var weiAbsoluteExpense3 = await WeiAbsoluteExpense.new(3*money, 3*money, { from: creator, gasPrice: 0 });

		// // add 3 WeiAbsoluteExpense outputs to the splitter
		await weiUnsortedSplitter.addChild(weiAbsoluteExpense1.address);
		await weiUnsortedSplitter.addChild(weiAbsoluteExpense2.address);
		await weiUnsortedSplitter.addChild(weiAbsoluteExpense3.address);

		// now send some money to the revenue endpoint
		await weiUnsortedSplitter.processFunds(6*money, { value: 6*money, from: creator });

		// money should end up in the outputs
		var weiAbsoluteExpense1Balance = await web3.eth.getBalance(weiAbsoluteExpense1.address);
		assert.equal(weiAbsoluteExpense1Balance.toNumber(), 1*money, 'resource point received money from splitter');

		var weiAbsoluteExpense2Balance = await web3.eth.getBalance(weiAbsoluteExpense2.address);
		assert.equal(weiAbsoluteExpense2Balance.toNumber(), 2*money, 'resource point received money from splitter');

		var weiAbsoluteExpense3Balance = await web3.eth.getBalance(weiAbsoluteExpense3.address);
		assert.equal(weiAbsoluteExpense3Balance.toNumber(), 3*money, 'resource point received money from splitter');
	});

	it('should process money in structure o-> o-> o-o-o', async () => {
		var AllOutpults = await WeiSplitter.new({ from: creator, gasPrice: 0 });
		var Salaries = await WeiSplitter.new({ from: creator, gasPrice: 0 });

		var Employee1 = await WeiAbsoluteExpense.new(1000*money, 1000*money, { from: creator, gasPrice: 0 });
		var Employee2 = await WeiAbsoluteExpense.new(1500*money, 1500*money, { from: creator, gasPrice: 0 });
		var Employee3 = await WeiAbsoluteExpense.new(800*money, 800*money, { from: creator, gasPrice: 0 });

		await AllOutpults.addChild(Salaries.address, { from: creator, gasPrice: 0 });

		await Salaries.addChild(Employee1.address, { from: creator, gasPrice: 0 });
		await Salaries.addChild(Employee2.address, { from: creator, gasPrice: 0 });
		await Salaries.addChild(Employee3.address, { from: creator, gasPrice: 0 });

		var Employee1Needs = await Employee1.getTotalWeiNeeded(3300*money);
		assert.equal(Employee1Needs.toNumber() / money, 1000, 'Employee1 Needs 1000 money');
		var Employee2Needs = await Employee2.getTotalWeiNeeded(3300*money);
		assert.equal(Employee2Needs.toNumber() / money, 1500, 'Employee1 Needs 1500 money');
		var Employee3Needs = await Employee3.getTotalWeiNeeded(3300*money);
		assert.equal(Employee3Needs.toNumber() / money, 800, 'Employee1 Needs 800 money');

		var SalariesNeeds = await Salaries.getTotalWeiNeeded(3300*money);
		assert.equal(SalariesNeeds.toNumber() / money, 3300, 'Salaries Needs 3300 money');

		var SalariesMinNeeds = await Salaries.getMinWeiNeeded(0);/*minNeedFix*/
		assert.equal(SalariesNeeds.toNumber() / money, 3300, 'Salaries min Needs 3300 money');

		var AllOutpultsNeeds = await AllOutpults.getTotalWeiNeeded(3300*money);
		assert.equal(AllOutpultsNeeds.toNumber() / money, 3300, 'AllOutpults Needs 3300 money');
		var MinOutpultsNeeds = await AllOutpults.getMinWeiNeeded(0);/*minNeedFix*/
		assert.equal(AllOutpultsNeeds.toNumber() / money, 3300, 'AllOutpults Needs min 3300 money');
		var OutputChildrenCount = await AllOutpults.getChildrenCount();
		assert.equal(OutputChildrenCount.toNumber(), 1, 'OutputChildrenCount should be 1');
		var SalariesChildrenCount = await Salaries.getChildrenCount();
		assert.equal(SalariesChildrenCount.toNumber(), 3, 'SalariesChildrenCount should be 3');

		var th = await Salaries.processFunds(3300*money, { value: 3300*money, from: creator, gasPrice: 0 });
	});

	it('should process money with a scheme just like in the paper: 75/25 others, send MORE than minNeed; ', async () => {
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

		var struct = await createStructure(creator, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);

		var splitterParams = await getSplitterParams(struct, CURRENT_INPUT, money, creator);

		await totalAndMinNeedsAsserts(splitterParams, CURRENT_INPUT, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await struct.AllOutpults.processFunds(CURRENT_INPUT*money, { value: CURRENT_INPUT*money, from: creator, gasPrice: 0 });

		var balances = await getBalances(struct);
		await balancesAsserts(balances, CURRENT_INPUT, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await splitterBalancesAsserts(balances, money, 0, 0, 0, 0, 0, 0, 0);
	});

	it('should process money with a scheme just like in the paper: 75/25 others, send EQUAL to minNeed', async () => {
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

		var struct = await createStructure(creator, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		var splitterParams = await getSplitterParams(struct, CURRENT_INPUT, money, creator);

		await totalAndMinNeedsAsserts(splitterParams, CURRENT_INPUT, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await struct.AllOutpults.processFunds(CURRENT_INPUT*money, { value: CURRENT_INPUT*money, from: creator, gasPrice: 0 });

		var balances = await getBalances(struct);
		await balancesAsserts(balances, CURRENT_INPUT, money, e1, e2, e3, office, internet, t1, t2, t3, 0, 0, 0, 0, 0);
		await splitterBalancesAsserts(balances, money, 0, 0, 0, 0, 0, 0, 0);
	});

	it('should not process money: send LESS than minNeed', async () => {
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

		var struct = await createStructure(creator, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		var splitterParams = await getSplitterParams(struct, CURRENT_INPUT, money, creator);
		await totalAndMinNeedsAsserts(splitterParams, CURRENT_INPUT, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await struct.AllOutpults.processFunds(1000*money, { value: 1000*money, from: creator }).should.be.rejectedWith('revert');
		await struct.AllOutpults.processFunds(1000000*money, { value: 1000*money, from: creator }).should.be.rejectedWith('revert');
		await struct.AllOutpults.processFunds(1000*money, { value: 1000000*money, from: creator }).should.be.rejectedWith('revert');
	});

	it('should process money with a scheme just like in the paper: 10/15 others, send MORE than minNeed; ', async () => {
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

		var struct = await createStructure(creator, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		var splitterParams = await getSplitterParams(struct, CURRENT_INPUT, money, creator);
		await totalAndMinNeedsAsserts(splitterParams, CURRENT_INPUT, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await struct.AllOutpults.processFunds(CURRENT_INPUT*money, { value: CURRENT_INPUT*money, from: creator, gasPrice: 0 });

		var balances = await getBalances(struct);
		await balancesAsserts(balances, CURRENT_INPUT, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await splitterBalancesAsserts(balances, money, 0, 0, 0, 0, 0, 0, 0);
	});

	it('should NOT process money (splitter can not accumulate money) with a scheme just like in the paper: 10/15 others, send MORE than minNeed; ', async () => {
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

		var struct = await createStructure(creator, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		var splitterParams = await getSplitterParams(struct, CURRENT_INPUT, money, creator);
		await totalAndMinNeedsAsserts(splitterParams, CURRENT_INPUT, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await struct.AllOutpults.processFunds(CURRENT_INPUT*money, { value: CURRENT_INPUT*money, from: creator, gasPrice: 0 }).should.be.rejectedWith('revert');
	});

	it('should process money with a scheme just like in the paper: 10/15 others, send EQUAL to minNeed; ', async () => {
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

		var struct = await createStructure(creator, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		var splitterParams = await getSplitterParams(struct, CURRENT_INPUT, money, creator);
		await totalAndMinNeedsAsserts(splitterParams, CURRENT_INPUT, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await struct.AllOutpults.processFunds(CURRENT_INPUT*money, { value: CURRENT_INPUT*money, from: creator, gasPrice: 0 });

		var balances = await getBalances(struct);
		await balancesAsserts(balances, CURRENT_INPUT, money, e1, e2, e3, office, internet, t1, t2, t3, 0, 0, 0, 0, 0);
		await splitterBalancesAsserts(balances, money, 0, 0, 0, 0, 0, 0, 0);
	});

	it('should not process money: send LESS than minNeed; ', async () => {
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

		var struct = await createStructure(creator, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		var splitterParams = await getSplitterParams(struct, CURRENT_INPUT, money, creator);
		await totalAndMinNeedsAsserts(splitterParams, CURRENT_INPUT, money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await struct.AllOutpults.processFunds(1000*money, { value: 1000*money, from: creator }).should.be.rejectedWith('revert');
		await struct.AllOutpults.processFunds(1000000*money, { value: 1000*money, from: creator }).should.be.rejectedWith('revert');
		await struct.AllOutpults.processFunds(1000*money, { value: 1000000*money, from: creator }).should.be.rejectedWith('revert');
	});
});
