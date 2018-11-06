var WeiTable = artifacts.require('./WeiTable');

var MoneyFlow = artifacts.require('./MoneyFlow');
var IWeiReceiver = artifacts.require('./IWeiReceiver');

var WeiSplitter = artifacts.require('./WeiSplitter');
var WeiAbsoluteExpense = artifacts.require('./WeiAbsoluteExpense');
var WeiRelativeExpense = artifacts.require('./WeiRelativeExpense');
var WeiAbsoluteExpenseWithPeriod = artifacts.require('./WeiAbsoluteExpenseWithPeriod');
var WeiRelativeExpenseWithPeriod = artifacts.require('./WeiRelativeExpenseWithPeriod');

var getEId = o => o.logs.filter(l => l.event == 'NodeAdded')[0].args._eId.toNumber();

function KECCAK256 (x) {
	return web3.sha3(x);
}

const BigNumber = web3.BigNumber;

require('chai')
	.use(require('chai-as-promised'))
	.use(require('chai-bignumber')(BigNumber))
	.should();

function KECCAK256 (x) {
	return web3.sha3(x);
}

async function createStructure (money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends) {
	var o = {};

	o.weiTable = await WeiTable.new();

	o.AllOutpultsId = getEId(await o.weiTable.addTopdownSplitter());
	o.SpendsId = getEId(await o.weiTable.addUnsortedSplitter());
	o.SalariesId = getEId(await o.weiTable.addUnsortedSplitter());
	o.Employee1Id = getEId(await o.weiTable.addAbsoluteExpense(e1 * money, false, false, 0));
	o.Employee2Id = getEId(await o.weiTable.addAbsoluteExpense(e2 * money, false, false, 0));
	o.Employee3Id = getEId(await o.weiTable.addAbsoluteExpense(e3 * money, false, false, 0));
	o.OtherId = getEId(await o.weiTable.addUnsortedSplitter());
	o.OfficeId = getEId(await o.weiTable.addAbsoluteExpense(office * money, false, false, 0));
	o.InternetId = getEId(await o.weiTable.addAbsoluteExpense(internet * money, false, false, 0));
	o.TasksId = getEId(await o.weiTable.addUnsortedSplitter());
	o.Task1Id = getEId(await o.weiTable.addAbsoluteExpense(t1 * money, false, false, 0));
	o.Task2Id = getEId(await o.weiTable.addAbsoluteExpense(t2 * money, false, false, 0));
	o.Task3Id = getEId(await o.weiTable.addAbsoluteExpense(t3 * money, false, false, 0));
	o.BonusesId = getEId(await o.weiTable.addUnsortedSplitter());
	o.Bonus1Id = getEId(await o.weiTable.addRelativeExpense(b1, false, false, 0));
	o.Bonus2Id = getEId(await o.weiTable.addRelativeExpense(b2, false, false, 0));
	o.Bonus3Id = getEId(await o.weiTable.addRelativeExpense(b3, false, false, 0));
	o.RestId = getEId(await o.weiTable.addTopdownSplitter());
	o.DividendsFundId = getEId(await o.weiTable.addFund(dividends * money, false, false, 0));
	o.ReserveFundId = getEId(await o.weiTable.addFund(reserve * money, false, false, 0));
	
	await o.weiTable.addChildAt(o.AllOutpultsId, o.SpendsId);
	await o.weiTable.addChildAt(o.SpendsId, o.SalariesId);
	await o.weiTable.addChildAt(o.SalariesId, o.Employee1Id);
	await o.weiTable.addChildAt(o.SalariesId, o.Employee2Id);
	await o.weiTable.addChildAt(o.SalariesId, o.Employee3Id);
	await o.weiTable.addChildAt(o.SpendsId, o.OtherId);
	await o.weiTable.addChildAt(o.OtherId, o.OfficeId);
	await o.weiTable.addChildAt(o.OtherId, o.InternetId);
	await o.weiTable.addChildAt(o.SpendsId, o.TasksId);
	await o.weiTable.addChildAt(o.TasksId, o.Task1Id);
	await o.weiTable.addChildAt(o.TasksId, o.Task2Id);
	await o.weiTable.addChildAt(o.TasksId, o.Task3Id);
	await o.weiTable.addChildAt(o.AllOutpultsId, o.BonusesId);
	await o.weiTable.addChildAt(o.BonusesId, o.Bonus1Id);
	await o.weiTable.addChildAt(o.BonusesId, o.Bonus2Id);
	await o.weiTable.addChildAt(o.BonusesId, o.Bonus3Id);
	await o.weiTable.addChildAt(o.AllOutpultsId, o.RestId);
	await o.weiTable.addChildAt(o.RestId, o.DividendsFundId);
	await o.weiTable.addChildAt(o.RestId, o.ReserveFundId);
	return o;
}

async function totalAndMinNeedsAsserts (money, i, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends) {
	var totalSpend = e1 + e2 + e3 + t1 + t2 + t3 + office + internet;
	var bonusesSpendPercent = (CURRENT_INPUT - totalSpend) / 1000000;
	var rest = CURRENT_INPUT - totalSpend - (bonusesSpendPercent * (b1 + b2 + b3));

	var dividendsAmount = 0;
	var reserveAmount = 0;
	if(rest<=0){

	}else if(rest<=dividends){
		dividendsAmount = rest;
		reserveAmount = 0;
	}else{
		dividendsAmount = dividends;
		reserveAmount = rest - dividendsAmount;
	}
	var allNeeds = totalSpend + (bonusesSpendPercent * (b1 + b2 + b3)) + (dividendsAmount + reserveAmount);

	assert.equal((new web3.BigNumber(i.AllOutpultsTotalNeed).div(money)).toNumber(), allNeeds, `AllOutpults Total Need should be ${allNeeds}`);
	assert.equal((new web3.BigNumber(i.AllOutpultsMinNeed).div(money)).toNumber(), totalSpend, `AllOutpults min Need should be ${totalSpend}`);
	assert.equal((new web3.BigNumber(i.SpendsTotalNeed).div(money)).toNumber(), totalSpend, `Spends Total Need should be ${totalSpend}`);
	assert.equal((new web3.BigNumber(i.SpendsMinNeed).div(money)).toNumber(), totalSpend, `Spends min Need should be ${totalSpend}`);
	assert.equal((new web3.BigNumber(i.SalariesTotalNeed).div(money)).toNumber(), e1 + e2 + e3, `Salaries Total Need should be ${e1 + e2 + e3}`);
	assert.equal((new web3.BigNumber(i.SalariesMinNeed).div(money)).toNumber(), e1 + e2 + e3, `Salaries min Need should be ${e1 + e2 + e3}`);
	assert.equal((new web3.BigNumber(i.OtherTotalNeed).div(money)).toNumber(), office + internet, `Other Total Need should be ${office + internet}`);
	assert.equal((new web3.BigNumber(i.OtherMinNeed).div(money)).toNumber(), office + internet, `Other min Need should be ${office + internet}`);
	assert.equal((new web3.BigNumber(i.TasksTotalNeed).div(money)).toNumber(), t1 + t2 + t3, `Tasks Total Need should be ${t1 + t2 + t3}`);
	assert.equal((new web3.BigNumber(i.TasksMinNeed).div(money)).toNumber(), t1 + t2 + t3, `Tasks min Need should be ${t1 + t2 + t3}`);
	assert.equal((new web3.BigNumber(i.BonusesTotalNeed).div(money)).toNumber(), (b1 + b2 + b3) * CURRENT_INPUT / 1000000, `Bonuses Total Need should be ${(b1 + b2 + b3) * CURRENT_INPUT / 1000000}`);
	assert.equal((new web3.BigNumber(i.BonusesMinNeed).div(money)).toNumber(), 0, `Bonuses min Need should be ${0}`);
	// assert.equal((new web3.BigNumber(i.RestTotalNeed).div(money)).toNumber(), rest, `Rest Total Need should be ${rest}`);
	// assert.equal((new web3.BigNumber(i.RestMinNeed).div(money)).toNumber(), 0, `Rest min Need should be ${0}`);
}

async function getBalances (i) {
	var o = {};
	o.Employee1Balance = await i.weiTable.balanceAt(i.Employee1Id);
	o.Employee2Balance = await i.weiTable.balanceAt(i.Employee2Id);
	o.Employee3Balance = await i.weiTable.balanceAt(i.Employee3Id);
	o.OfficeBalance = await i.weiTable.balanceAt(i.OfficeId);
	o.InternetBalance = await i.weiTable.balanceAt(i.InternetId);
	o.Task1Balance = await i.weiTable.balanceAt(i.Task1Id);
	o.Task2Balance = await i.weiTable.balanceAt(i.Task2Id);
	o.Task3Balance = await i.weiTable.balanceAt(i.Task3Id);
	o.ReserveBalance = await i.weiTable.balanceAt(i.ReserveFundId);
	o.DividendsBalance = await i.weiTable.balanceAt(i.DividendsFundId);
	o.Bonus1Balance = await i.weiTable.balanceAt(i.Bonus1Id);
	o.Bonus2Balance = await i.weiTable.balanceAt(i.Bonus2Id);
	o.Bonus3Balance = await i.weiTable.balanceAt(i.Bonus3Id);
	o.AllOutpultsBalance = await i.weiTable.balanceAt(i.AllOutpultsId);
	o.SpendsBalance = await i.weiTable.balanceAt(i.SpendsId);
	o.SalariesBalance = await i.weiTable.balanceAt(i.SalariesId);
	o.OtherBalance = await i.weiTable.balanceAt(i.OtherId);
	o.TasksBalance = await i.weiTable.balanceAt(i.TasksId);
	o.BonusesBalance = await i.weiTable.balanceAt(i.BonusesId);
	o.RestBalance = await i.weiTable.balanceAt(i.RestId);

	return o;
}

async function getSplitterParams (money, i, CURRENT_INPUT) {
	var o = {};
	o.AllOutpultsTotalNeed = await i.weiTable.getTotalWeiNeededAt(i.AllOutpultsId, CURRENT_INPUT * money);
	o.AllOutpultsMinNeed = await i.weiTable.getMinWeiNeededAt(i.AllOutpultsId);
	o.AllOutpultsChildrenCount = await i.weiTable.getChildrenCountAt(i.AllOutpultsId);
	o.SpendsTotalNeed = await i.weiTable.getTotalWeiNeededAt(i.SpendsId, CURRENT_INPUT * money);
	o.SpendsMinNeed = await i.weiTable.getMinWeiNeededAt(i.SpendsId);
	o.SpendsChildrenCount = await i.weiTable.getChildrenCountAt(i.SpendsId);
	o.SalariesTotalNeed = await i.weiTable.getTotalWeiNeededAt(i.SalariesId, CURRENT_INPUT * money);
	o.SalariesMinNeed = await i.weiTable.getMinWeiNeededAt(i.SalariesId);
	o.SalariesChildrenCount = await i.weiTable.getChildrenCountAt(i.SalariesId);
	o.OtherTotalNeed = await i.weiTable.getTotalWeiNeededAt(i.OtherId, CURRENT_INPUT * money);
	o.OtherMinNeed = await i.weiTable.getMinWeiNeededAt(i.OtherId);
	o.OtherChildrenCount = await i.weiTable.getChildrenCountAt(i.OtherId);
	o.TasksTotalNeed = await i.weiTable.getTotalWeiNeededAt(i.TasksId, CURRENT_INPUT * money);
	o.TasksMinNeed = await i.weiTable.getMinWeiNeededAt(i.TasksId);
	o.TasksChildrenCount = await i.weiTable.getChildrenCountAt(i.TasksId);
	o.BonusesTotalNeed = await i.weiTable.getTotalWeiNeededAt(i.BonusesId, CURRENT_INPUT * money);
	o.BonusesMinNeed = await i.weiTable.getMinWeiNeededAt(i.BonusesId);
	o.BonusesChildrenCount = await i.weiTable.getChildrenCountAt(i.BonusesId);
	o.RestTotalNeed = await i.weiTable.getTotalWeiNeededAt(i.RestId, CURRENT_INPUT * money);
	o.RestMinNeed = await i.weiTable.getMinWeiNeededAt(i.RestId);
	o.RestChildrenCount = await i.weiTable.getChildrenCountAt(i.RestId);

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

async function balancesAsserts (money, i, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends) {
	var totalSpend = e1 + e2 + e3 + t1 + t2 + t3 + office + internet;
	var bonusesSpendPercent = (CURRENT_INPUT - totalSpend) / 1000000;
	var rest = CURRENT_INPUT - totalSpend - (bonusesSpendPercent * (b1 + b2 + b3));

	var dividendsAmount = 0;
	var reserveAmount = 0;
	if((rest<=dividends)&&(rest>0)){
		dividendsAmount = rest;
		reserveAmount = 0;
	}else{
		dividendsAmount = dividends;
		reserveAmount = rest - dividendsAmount;
	}
	
	 assert.equal((new web3.BigNumber(i.Employee1Balance).div(money)).toNumber(), e1, `Employee1 balance should be ${e1} money`);
	 assert.equal((new web3.BigNumber(i.Employee2Balance).div(money)).toNumber(), e2, `Employee2 balance should be ${e2} money`);
	 assert.equal((new web3.BigNumber(i.Employee3Balance).div(money)).toNumber(), e3, `Employee3 balance should be ${e3} money`);
	 assert.equal((new web3.BigNumber(i.OfficeBalance).div(money)).toNumber(), office, `Office balance should be ${office} money`);
	 assert.equal((new web3.BigNumber(i.InternetBalance).div(money)).toNumber(), internet, `Internet balance should be ${internet} money`);
	 assert.equal((new web3.BigNumber(i.Task1Balance).div(money)).toNumber(), t1, `Task1 balance should be ${t1} money`);
	 assert.equal((new web3.BigNumber(i.Task2Balance).div(money)).toNumber(), t2, `Task2 balance should be ${t2} money`);
	 assert.equal((new web3.BigNumber(i.Task3Balance).div(money)).toNumber(), t3, `Task3 balance should be ${t3} money`);
	 assert.equal((new web3.BigNumber(i.Bonus1Balance).div(money)).toNumber(), bonusesSpendPercent * b1, `Bonus1 balance should be ${bonusesSpendPercent * b1} money`);
	 assert.equal((new web3.BigNumber(i.Bonus2Balance).div(money)).toNumber(), bonusesSpendPercent * b2, `Bonus2 balance should be ${bonusesSpendPercent * b2} money`);
	 assert.equal((new web3.BigNumber(i.Bonus3Balance).div(money)).toNumber(), bonusesSpendPercent * b3, `Bonus3 balance should be ${bonusesSpendPercent * b3} money`);
	 assert.equal((new web3.BigNumber(i.DividendsBalance).div(money)).toNumber(), dividendsAmount, `Dividends balance should be ${dividendsAmount} money`);
	 assert.equal((new web3.BigNumber(i.ReserveBalance).div(money)).toNumber(), reserveAmount, `Reserve balance should be ${reserveAmount} money`);
	
}

contract('WeiTable tests', (accounts) => {
	var token;
	var store;
	var daoBase;
	var moneyflowInstance;

	var neededAmount = 1e15;
	var isPeriodic = false;
	var isAccumulateDebt = false;
	var periodHours = 0;
	var output = '0x0';

	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[3];

	beforeEach(async () => {
		moneyflowInstance = await MoneyFlow.new();
	});

	// // 0->•abs
	it('should process money with WeiSplitter + 3 WeiAbsoluteExpense', async () => {
		let weiTable = await WeiTable.new();
		var output1 = await WeiAbsoluteExpense.new(neededAmount);
		var output2 = await WeiAbsoluteExpense.new(2 * neededAmount);
		var output3 = await WeiAbsoluteExpense.new(3 * neededAmount);
		let topDownSplitterId =  getEId(await weiTable.addTopdownSplitter());
		let AbsoluteExpense1Id = getEId(await weiTable.addAbsoluteExpense(1 * neededAmount, isPeriodic, isAccumulateDebt, periodHours));
		let AbsoluteExpense2Id = getEId(await weiTable.addAbsoluteExpense(2 * neededAmount, isPeriodic, isAccumulateDebt, periodHours));
		let AbsoluteExpense3Id = getEId(await weiTable.addAbsoluteExpense(3 * neededAmount, isPeriodic, isAccumulateDebt, periodHours));

		// add 3 WeiAbsoluteExpense outputs to the splitter
		await weiTable.addChildAt(topDownSplitterId, AbsoluteExpense1Id);
		await weiTable.addChildAt(topDownSplitterId, AbsoluteExpense2Id);
		await weiTable.addChildAt(topDownSplitterId, AbsoluteExpense3Id);

		var id1 = await weiTable.getChildIdAt(topDownSplitterId, 0);
		var id2 = await weiTable.getChildIdAt(topDownSplitterId, 1);
		var id3 = await weiTable.getChildIdAt(topDownSplitterId, 2);

		assert.equal(id1, AbsoluteExpense1Id);
		assert.equal(id2, AbsoluteExpense2Id);
		assert.equal(id3, AbsoluteExpense3Id);

		// add WeiSplitter to the moneyflow
		await moneyflowInstance.setRootWeiReceiver(weiTable.address);

		var revenueEndpointAddress = await moneyflowInstance.getRevenueEndpoint();

		assert.equal(revenueEndpointAddress, weiTable.address, 'weiTopDownSplitter.address saved in moneyflowInstance as revenueEndpointAddress');
	
		var totalNeed = await weiTable.getTotalWeiNeeded(6 * neededAmount);
		assert.equal(totalNeed, 6 * neededAmount);
		var minNeed = await weiTable.getMinWeiNeeded();
		assert.equal(minNeed, 6 * neededAmount);
		var need1 = await weiTable.isNeedsMoney();
		// now send some money to the revenue endpoint
		await weiTable.processFunds(6 * neededAmount, { value: 6 * neededAmount, from: creator });
		assert.equal(need1, true);
		// money should end up in the outputs
		var absoluteExpense1Balance = await weiTable.balanceAt(AbsoluteExpense1Id);
		assert.equal(absoluteExpense1Balance.toNumber(), 1 * neededAmount, 'resource point received money from splitter');

		var absoluteExpense2Balance = await weiTable.balanceAt(AbsoluteExpense2Id);
		assert.equal(absoluteExpense2Balance.toNumber(), 2 * neededAmount, 'resource point received money from splitter');

		var absoluteExpense3Balance = await weiTable.balanceAt(AbsoluteExpense3Id);
		assert.equal(absoluteExpense3Balance.toNumber(), 3 * neededAmount, 'resource point received money from splitter');

		var totalNeed = await weiTable.getTotalWeiNeeded(6 * neededAmount);
		assert.equal(totalNeed.toNumber(), 0 * neededAmount);
		var minNeed = await weiTable.getMinWeiNeeded();
		assert.equal(minNeed.toNumber(), 0 * neededAmount);

		var need2 = await weiTable.isNeedsMoney();
		assert.equal(need2, false);

		var b1 = await web3.eth.getBalance(accounts[9]);
		await weiTable.flushToAt(AbsoluteExpense1Id, accounts[9], { gasPrice: 0 });
		var b2 = await web3.eth.getBalance(accounts[9]);
		assert.equal(b2.toNumber() - b1.toNumber(), 1 * neededAmount);

		var b1 = await web3.eth.getBalance(accounts[9]);
		await weiTable.flushToAt(AbsoluteExpense2Id, accounts[9], { gasPrice: 0 });
		var b2 = await web3.eth.getBalance(accounts[9]);
		assert.equal(b2.toNumber() - b1.toNumber(), 2 * neededAmount);

		var b1 = await web3.eth.getBalance(accounts[9]);
		await weiTable.flushToAt(AbsoluteExpense3Id, accounts[9], { gasPrice: 0 });
		var b2 = await web3.eth.getBalance(accounts[9]);
		assert.equal(b2.toNumber() - b1.toNumber(), 3 * neededAmount);

		var absoluteExpense1Balance = await weiTable.balanceAt(AbsoluteExpense1Id);
		assert.equal(absoluteExpense1Balance.toNumber(), 0 * neededAmount, 'resource point received money from splitter');

		var absoluteExpense2Balance = await weiTable.balanceAt(AbsoluteExpense2Id);
		assert.equal(absoluteExpense2Balance.toNumber(), 0 * neededAmount, 'resource point received money from splitter');

		var absoluteExpense3Balance = await weiTable.balanceAt(AbsoluteExpense3Id);
		assert.equal(absoluteExpense3Balance.toNumber(), 0 * neededAmount, 'resource point received money from splitter');
		var need2 = await weiTable.isNeedsMoney();
	});

	it('should process money with WeiSplitter + 3 WeiAbsoluteExpense', async () => {
		let weiTable = await WeiTable.new();
		
		let unsortedSplitterId = getEId(await weiTable.addUnsortedSplitter());
		let AbsoluteExpense1Id = getEId(await weiTable.addAbsoluteExpense(neededAmount, isPeriodic, isAccumulateDebt, periodHours));
		let AbsoluteExpense2Id = getEId(await weiTable.addAbsoluteExpense(2 * neededAmount, isPeriodic, isAccumulateDebt, periodHours));
		let AbsoluteExpense3Id = getEId(await weiTable.addAbsoluteExpense(3 * neededAmount, isPeriodic, isAccumulateDebt, periodHours));

		await weiTable.addChildAt(unsortedSplitterId, AbsoluteExpense1Id);
		await weiTable.addChildAt(unsortedSplitterId, AbsoluteExpense2Id);
		await weiTable.addChildAt(unsortedSplitterId, AbsoluteExpense3Id);

		// add WeiSplitter to the moneyflow
		await moneyflowInstance.setRootWeiReceiver(weiTable.address);

		var revenueEndpointAddress = await moneyflowInstance.getRevenueEndpoint();

		assert.equal(revenueEndpointAddress, weiTable.address, 'weiTopDownSplitter.address saved in moneyflowInstance as revenueEndpointAddress');

		// now send some money to the revenue endpoint
		let totalNeed = await weiTable.getTotalWeiNeeded(6 * neededAmount);
		assert.equal(totalNeed, 6 * neededAmount);
		let minNeed = await weiTable.getMinWeiNeeded();
		assert.equal(minNeed, 6 * neededAmount);

		await weiTable.processFunds(6 * neededAmount, { value: 6 * neededAmount, from: creator });
		// money should end up in the outputs
		var absoluteExpense1Balance = await weiTable.balanceAt(AbsoluteExpense1Id);
		assert.equal(absoluteExpense1Balance.toNumber(), 1 * neededAmount, 'resource point received money from splitter');

		var absoluteExpense2Balance = await weiTable.balanceAt(AbsoluteExpense2Id);
		assert.equal(absoluteExpense2Balance.toNumber(), 2 * neededAmount, 'resource point received money from splitter');

		var absoluteExpense3Balance = await weiTable.balanceAt(AbsoluteExpense3Id);
		assert.equal(absoluteExpense3Balance.toNumber(), 3 * neededAmount, 'resource point received money from splitter');
	});

	it('should process money with WeiSplitter + 2 WeiAbsoluteExpense + WeiRelativeExpense', async () => {
		let weiTable = await WeiTable.new();

		let topDownSplitterId = getEId(await weiTable.addTopdownSplitter());
		let AbsoluteExpense1Id = getEId(await weiTable.addAbsoluteExpense(neededAmount, isPeriodic, isAccumulateDebt, periodHours));
		let RelativeExpense1Id = getEId(await weiTable.addRelativeExpense(500000, isPeriodic, isAccumulateDebt, periodHours));
		let AbsoluteExpense3Id = getEId(await weiTable.addAbsoluteExpense(neededAmount, isPeriodic, isAccumulateDebt, periodHours));

		// add 3 WeiAbsoluteExpense outputs to the splitter
		await weiTable.addChildAt(topDownSplitterId, AbsoluteExpense1Id);
		await weiTable.addChildAt(topDownSplitterId, RelativeExpense1Id);
		await weiTable.addChildAt(topDownSplitterId, AbsoluteExpense3Id);

		// add WeiSplitter to the moneyflow
		await moneyflowInstance.setRootWeiReceiver(weiTable.address);

		var id1 = await weiTable.getChildIdAt(topDownSplitterId, 0);
		var id2 = await weiTable.getChildIdAt(topDownSplitterId, 1);
		var id3 = await weiTable.getChildIdAt(topDownSplitterId, 2);

		var revenueEndpointAddress = await moneyflowInstance.getRevenueEndpoint();

		assert.equal(revenueEndpointAddress, weiTable.address, 'weiTopDownSplitter.address saved in moneyflowInstance as revenueEndpointAddress');
	
		let totalNeed = await weiTable.getTotalWeiNeeded(3 * neededAmount);
		assert.equal(totalNeed.toNumber(), 3 * neededAmount);
		let minNeed = await weiTable.getMinWeiNeeded();
		assert.equal(minNeed.toNumber(), 3 * neededAmount);

		// now send some money to the revenue endpoint
		await weiTable.processFunds(3 * neededAmount, { value: 3 * neededAmount, from: creator });

		// money should end up in the outputs
		var absoluteExpense1Balance = await weiTable.balanceAt(AbsoluteExpense1Id);
		assert.equal(absoluteExpense1Balance.toNumber(), 1 * neededAmount, 'resource point received money from splitter');

		var relativeExpense2Balance = await weiTable.balanceAt(RelativeExpense1Id);
		assert.equal(relativeExpense2Balance.toNumber(), 1 * neededAmount, 'resource point received money from splitter');

		var absoluteExpense3Balance = await weiTable.balanceAt(AbsoluteExpense3Id);
		assert.equal(absoluteExpense3Balance.toNumber(), 1 * neededAmount, 'resource point received money from splitter');
	});

	it('should process money with WeiSplitter + 2 WeiAbsoluteExpense + WeiRelativeExpense', async () => {
		let weiTable = await WeiTable.new();

		let SplitterId = getEId(await weiTable.addUnsortedSplitter());
		let AbsoluteExpense1Id = getEId(await weiTable.addAbsoluteExpense(neededAmount, isPeriodic, isAccumulateDebt, periodHours));
		let RelativeExpense1Id = getEId(await weiTable.addRelativeExpense(900000, isPeriodic, isAccumulateDebt, periodHours));
		let AbsoluteExpense3Id = getEId(await weiTable.addAbsoluteExpense(neededAmount, isPeriodic, isAccumulateDebt, periodHours));

		// add 3 WeiAbsoluteExpense outputs to the splitter
		await weiTable.addChildAt(SplitterId, AbsoluteExpense1Id);
		await weiTable.addChildAt(SplitterId, RelativeExpense1Id);
		await weiTable.addChildAt(SplitterId, AbsoluteExpense3Id);

		// add WeiSplitter to the moneyflow
		await moneyflowInstance.setRootWeiReceiver(weiTable.address);

		var revenueEndpointAddress = await moneyflowInstance.getRevenueEndpoint();

		global.assert.equal(revenueEndpointAddress, weiTable.address, 'weiSplitter.address saved in moneyflowInstance as revenueEndpointAddress');
	
		let totalNeed = await weiTable.getTotalWeiNeeded(20 * neededAmount);
		global.assert.equal(totalNeed.toNumber(), 20 * neededAmount);
		let minNeed = await weiTable.getMinWeiNeeded();
		global.assert.equal(minNeed.toNumber(), 20 * neededAmount);

		// now send some money to the revenue endpoint
		await weiTable.processFunds(20 * neededAmount, { value: 20 * neededAmount, from: creator });

		// money should end up in the outputs
		var absoluteExpense1Balance = await weiTable.balanceAt(AbsoluteExpense1Id);
		global.assert.equal(absoluteExpense1Balance.toNumber(), 1 * neededAmount, 'resource point received money from splitter');

		var relativeExpense2Balance = await weiTable.balanceAt(RelativeExpense1Id);
		global.assert.equal(relativeExpense2Balance.toNumber(), 18 * neededAmount, 'resource point received money from splitter');

		var absoluteExpense3Balance = await weiTable.balanceAt(AbsoluteExpense3Id);
		global.assert.equal(absoluteExpense3Balance.toNumber(), 1 * neededAmount, 'resource point received money from splitter');
	});

	it('should process money with a scheme just like in the paper: 75/25 others, send MORE than minNeed; ', async () => {
		const money = 1e12;
		const CURRENT_INPUT = 30900;
		let e1 = 1000;
		let e2 = 1500;
		let e3 = 800;
		let office = 500;
		let internet = 300;
		let t1 = 500;
		let t2 = 300;
		let t3 = 1000;
		// 5900
		let b1 = 10000;
		let b2 = 10000;
		let b3 = 20000;
		//4% of 25K = 1000
		let reserve = 1000000;
		let dividends = 10000;

		let struct = await createStructure(money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		let splitterParams = await getSplitterParams(money, struct, CURRENT_INPUT, creator);
		await totalAndMinNeedsAsserts(money, splitterParams, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await struct.weiTable.processFunds(CURRENT_INPUT * money, { value: CURRENT_INPUT * money, gasPrice: 0 });

		let balances = await getBalances(struct);
		await balancesAsserts(money, balances, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
	});

	it('should process money with a scheme just like in the paper: 75/25 others, send EQUAL to minNeed', async () => {
		const money = 1e12;
		const CURRENT_INPUT = 5900;
		let e1 = 1000;
		let e2 = 1500;
		let e3 = 800;
		let office = 500;
		let internet = 300;
		let t1 = 500;
		let t2 = 300;
		let t3 = 1000;
		let b1 = 10000;
		let b2 = 10000;
		let b3 = 20000;
		let reserve = 1000000;
		let dividends = 2500;

		let struct = await createStructure(money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		let splitterParams = await getSplitterParams(money, struct, CURRENT_INPUT, creator);
		await totalAndMinNeedsAsserts(money, splitterParams, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await struct.weiTable.processFunds(CURRENT_INPUT * money, { value: CURRENT_INPUT * money, gasPrice: 0 });

		let balances = await getBalances(struct);
		await balancesAsserts(money, balances, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, 0, 0, 0, 0, 0);
	});

	it('should not process money: send LESS than minNeed', async () => {
		const money = 1e12;
		const CURRENT_INPUT = 5900;
		let e1 = 1000;
		let e2 = 1500;
		let e3 = 800;
		let office = 500;
		let internet = 300;
		let t1 = 500;
		let t2 = 300;
		let t3 = 1000;
		let b1 = 10000;
		let b2 = 10000;
		let b3 = 20000;
		let reserve = 1000000;
		let dividends = 10000;

		let struct = await createStructure(money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		let splitterParams = await getSplitterParams(money, struct, CURRENT_INPUT, creator);
		await totalAndMinNeedsAsserts(money, splitterParams, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await struct.weiTable.processFunds(CURRENT_INPUT * money / 100, { value: CURRENT_INPUT * money, gasPrice: 0 }).should.be.rejectedWith('revert');
		await struct.weiTable.processFunds(CURRENT_INPUT * money, { value: CURRENT_INPUT * money / 100, gasPrice: 0 }).should.be.rejectedWith('revert');
		await struct.weiTable.processFunds(CURRENT_INPUT * money / 100, { value: CURRENT_INPUT * money, gasPrice: 0 }).should.be.rejectedWith('revert');
	});

	it('should process money with a scheme just like in the paper: 10/15 others, send MORE than minNeed; ', async () => {
		const money = 1e12;
		const CURRENT_INPUT = 20900;
		let e1 = 1000;
		let e2 = 1500;
		let e3 = 800;
		let office = 500;
		let internet = 300;
		let t1 = 500;
		let t2 = 300;
		let t3 = 1000;
		// 5900 -> 4% of 15000 -> 
		let b1 = 10000;
		let b2 = 10000;
		let b3 = 20000;
		let reserve = 1000000;
		let dividends = 1500;

		let struct = await createStructure(money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		let splitterParams = await getSplitterParams(money, struct, CURRENT_INPUT, creator);
		await totalAndMinNeedsAsserts(money, splitterParams, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await struct.weiTable.processFunds(CURRENT_INPUT * money, { value: CURRENT_INPUT * money, gasPrice: 0 });

		let balances = await getBalances(struct);
		await balancesAsserts(money, balances, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
	});

	it('should process money with a scheme just like in the paper: 10/15 others, send EQUAL to minNeed; ', async () => {
		const money = 1e12;
		const CURRENT_INPUT = 5900;
		let e1 = 1000;
		let e2 = 1500;
		let e3 = 800;
		let office = 500;
		let internet = 300;
		let t1 = 500;
		let t2 = 300;
		let t3 = 1000;
		let b1 = 10000;
		let b2 = 10000;
		let b3 = 20000;
		let reserve = 1000000;
		let dividends = 1500;

		let struct = await createStructure(money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		let splitterParams = await getSplitterParams(money, struct, CURRENT_INPUT, creator);
		await totalAndMinNeedsAsserts(money, splitterParams, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await struct.weiTable.processFunds(CURRENT_INPUT * money, { value: CURRENT_INPUT * money, gasPrice: 0 });

		let balances = await getBalances(struct);
		await balancesAsserts(money, balances, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, 0, 0, 0, 0, 0);
	});

	it('should not process money: send LESS than minNeed; ', async () => {
		const money = 1e12;
		const CURRENT_INPUT = 30900;
		let e1 = 1000;
		let e2 = 1500;
		let e3 = 800;
		let office = 500;
		let internet = 300;
		let t1 = 500;
		let t2 = 300;
		let t3 = 1000;
		let b1 = 10000;
		let b2 = 10000;
		let b3 = 20000;
		let reserve = 1000000;
		let dividends = 1500;

		let struct = await createStructure(money, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		let splitterParams = await getSplitterParams(money, struct, CURRENT_INPUT, creator);
		await totalAndMinNeedsAsserts(money, splitterParams, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await struct.weiTable.processFunds(CURRENT_INPUT * money / 100, { value: CURRENT_INPUT * money, gasPrice: 0 }).should.be.rejectedWith('revert');
		await struct.weiTable.processFunds(CURRENT_INPUT * money, { value: CURRENT_INPUT * money / 100, gasPrice: 0 }).should.be.rejectedWith('revert');
		await struct.weiTable.processFunds(CURRENT_INPUT * money / 100, { value: CURRENT_INPUT * money, gasPrice: 0 }).should.be.rejectedWith('revert');
	});

	it('should process money when opened and not process when closed with WeiSplitter + 3 WeiAbsoluteExpense', async () => {
		let weiTable = await WeiTable.new();

		let topDownSplitterId = getEId(await weiTable.addTopdownSplitter());
		let AbsoluteExpense1Id = getEId(await weiTable.addAbsoluteExpense(neededAmount, isPeriodic, isAccumulateDebt, periodHours));
		let AbsoluteExpense2Id = getEId(await weiTable.addAbsoluteExpense(2 * neededAmount, isPeriodic, isAccumulateDebt, periodHours));
		let AbsoluteExpense3Id = getEId(await weiTable.addAbsoluteExpense(3 * neededAmount, isPeriodic, isAccumulateDebt, periodHours));

		// add 3 WeiAbsoluteExpense outputs to the splitter
		await weiTable.addChildAt(topDownSplitterId, AbsoluteExpense1Id);
		await weiTable.addChildAt(topDownSplitterId, AbsoluteExpense2Id);
		await weiTable.addChildAt(topDownSplitterId, AbsoluteExpense3Id);

		// add WeiSplitter to the moneyflow
		await moneyflowInstance.setRootWeiReceiver(weiTable.address);

		var revenueEndpointAddress = await moneyflowInstance.getRevenueEndpoint();

		assert.equal(revenueEndpointAddress, weiTable.address, 'weiTopDownSplitter.address saved in moneyflowInstance as revenueEndpointAddress');
	
		var totalNeed = await weiTable.getTotalWeiNeeded(6 * neededAmount);
		assert.equal(totalNeed, 6 * neededAmount);
		var minNeed = await weiTable.getMinWeiNeeded();
		assert.equal(minNeed, 6 * neededAmount);

		var isOpen1At = await weiTable.isOpenAt(AbsoluteExpense1Id);
		var isOpen2At = await weiTable.isOpenAt(AbsoluteExpense2Id);
		var isOpen3At = await weiTable.isOpenAt(AbsoluteExpense3Id);
		assert.equal(isOpen1At, true);
		assert.equal(isOpen2At, true);
		assert.equal(isOpen3At, true);

		await weiTable.closeAt(AbsoluteExpense3Id);

		var totalNeed = await weiTable.getTotalWeiNeeded(6 * neededAmount);
		assert.equal(totalNeed, 3 * neededAmount);
		var minNeed = await weiTable.getMinWeiNeeded();
		assert.equal(minNeed, 3 * neededAmount);

		await weiTable.closeAt(AbsoluteExpense1Id);

		var totalNeed = await weiTable.getTotalWeiNeeded(6 * neededAmount);
		assert.equal(totalNeed, 2 * neededAmount);
		var minNeed = await weiTable.getMinWeiNeeded();
		assert.equal(minNeed, 2 * neededAmount);

		var isOpen1At = await weiTable.isOpenAt(AbsoluteExpense1Id);
		var isOpen2At = await weiTable.isOpenAt(AbsoluteExpense2Id);
		var isOpen3At = await weiTable.isOpenAt(AbsoluteExpense3Id);
		assert.equal(isOpen1At, false);
		assert.equal(isOpen2At, true);
		assert.equal(isOpen3At, false);

		await weiTable.openAt(AbsoluteExpense3Id);
		var isOpen1At = await weiTable.isOpenAt(AbsoluteExpense1Id);
		var isOpen2At = await weiTable.isOpenAt(AbsoluteExpense2Id);
		var isOpen3At = await weiTable.isOpenAt(AbsoluteExpense3Id);
		assert.equal(isOpen1At, false);
		assert.equal(isOpen2At, true);
		assert.equal(isOpen3At, true);

		// now send some money to the revenue endpoint
		await weiTable.processFunds(5 * neededAmount, { value: 5 * neededAmount, from: creator });

		// money should end up in the outputs
		var absoluteExpense1Balance = await weiTable.balanceAt(AbsoluteExpense1Id);
		assert.equal(absoluteExpense1Balance.toNumber(), 0 * neededAmount, 'resource point received money from splitter');

		var absoluteExpense2Balance = await weiTable.balanceAt(AbsoluteExpense2Id);
		assert.equal(absoluteExpense2Balance.toNumber(), 2 * neededAmount, 'resource point received money from splitter');

		var absoluteExpense3Balance = await weiTable.balanceAt(AbsoluteExpense3Id);
		assert.equal(absoluteExpense3Balance.toNumber(), 3 * neededAmount, 'resource point received money from splitter');
	});
});
