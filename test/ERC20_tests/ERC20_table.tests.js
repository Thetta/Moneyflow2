var ERC20Table = artifacts.require('./ERC20Table');
var IReceiver = artifacts.require('./IReceiver');

var StandardToken = artifacts.require('./ERC20Token');

var ERC20Splitter = artifacts.require('./ERC20Splitter');
var ERC20AbsoluteExpense = artifacts.require('./ERC20AbsoluteExpense');
var ERC20RelativeExpense = artifacts.require('./ERC20RelativeExpense');
var ERC20AbsoluteExpenseWithPeriod = artifacts.require('./ERC20AbsoluteExpenseWithPeriod');
var ERC20RelativeExpenseWithPeriod = artifacts.require('./ERC20RelativeExpenseWithPeriod');

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

async function createStructure(token, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends) {
	var o = {};
	o.erc20Table = await ERC20Table.new(token.address);

	o.AllOutputsId = getEId(await o.erc20Table.addSplitter());
	o.SpendsId = getEId(await o.erc20Table.addSplitter());
	o.SalariesId = getEId(await o.erc20Table.addSplitter());
	o.Employee1Id = getEId(await o.erc20Table.addAbsoluteExpense(e1 * tokenAmount, e1 * tokenAmount, false, false, 0));
	o.Employee2Id = getEId(await o.erc20Table.addAbsoluteExpense(e2 * tokenAmount, e2 * tokenAmount, false, false, 0));
	o.Employee3Id = getEId(await o.erc20Table.addAbsoluteExpense(e3 * tokenAmount, e3 * tokenAmount, false, false, 0));
	o.OtherId = getEId(await o.erc20Table.addSplitter());
	o.OfficeId = getEId(await o.erc20Table.addAbsoluteExpense(office * tokenAmount, office * tokenAmount, false, false, 0));
	o.InternetId = getEId(await o.erc20Table.addAbsoluteExpense(internet * tokenAmount, internet * tokenAmount, false, false, 0));
	o.TasksId = getEId(await o.erc20Table.addSplitter());
	o.Task1Id = getEId(await o.erc20Table.addAbsoluteExpense(t1 * tokenAmount, t1 * tokenAmount, false, false, 0));
	o.Task2Id = getEId(await o.erc20Table.addAbsoluteExpense(t2 * tokenAmount, t2 * tokenAmount, false, false, 0));
	o.Task3Id = getEId(await o.erc20Table.addAbsoluteExpense(t3 * tokenAmount, t3 * tokenAmount, false, false, 0));
	o.BonusesId = getEId(await o.erc20Table.addSplitter());
	o.Bonus1Id = getEId(await o.erc20Table.addRelativeExpense(b1, false, false, 0));
	o.Bonus2Id = getEId(await o.erc20Table.addRelativeExpense(b2, false, false, 0));
	o.Bonus3Id = getEId(await o.erc20Table.addRelativeExpense(b3, false, false, 0));
	o.RestId = getEId(await o.erc20Table.addSplitter());
	o.DividendsFundId = getEId(await o.erc20Table.addAbsoluteExpense(dividends * tokenAmount, 0, false, false, 0));
	o.ReserveFundId = getEId(await o.erc20Table.addAbsoluteExpense(reserve * tokenAmount, 0, false, false, 0));
	
	await o.erc20Table.addChildAt(o.AllOutputsId, o.SpendsId);
	await o.erc20Table.addChildAt(o.SpendsId, o.SalariesId);
	await o.erc20Table.addChildAt(o.SalariesId, o.Employee1Id);
	await o.erc20Table.addChildAt(o.SalariesId, o.Employee2Id);
	await o.erc20Table.addChildAt(o.SalariesId, o.Employee3Id);
	await o.erc20Table.addChildAt(o.SpendsId, o.OtherId);
	await o.erc20Table.addChildAt(o.OtherId, o.OfficeId);
	await o.erc20Table.addChildAt(o.OtherId, o.InternetId);
	await o.erc20Table.addChildAt(o.SpendsId, o.TasksId);
	await o.erc20Table.addChildAt(o.TasksId, o.Task1Id);
	await o.erc20Table.addChildAt(o.TasksId, o.Task2Id);
	await o.erc20Table.addChildAt(o.TasksId, o.Task3Id);
	await o.erc20Table.addChildAt(o.AllOutputsId, o.BonusesId);
	await o.erc20Table.addChildAt(o.BonusesId, o.Bonus1Id);
	await o.erc20Table.addChildAt(o.BonusesId, o.Bonus2Id);
	await o.erc20Table.addChildAt(o.BonusesId, o.Bonus3Id);
	await o.erc20Table.addChildAt(o.AllOutputsId, o.RestId);
	await o.erc20Table.addChildAt(o.RestId, o.DividendsFundId);
	await o.erc20Table.addChildAt(o.RestId, o.ReserveFundId);
	return o;
}

async function totalAndMinNeedsAsserts (tokenAmount, i, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends) {
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

	assert.equal((new web3.BigNumber(i.AllOutputsTotalNeed).div(tokenAmount)).toNumber(), allNeeds, `AllOutputs Total Need should be ${allNeeds}`);
	assert.equal((new web3.BigNumber(i.AllOutputsMinNeed).div(tokenAmount)).toNumber(), totalSpend, `AllOutputs min Need should be ${totalSpend}`);
	assert.equal((new web3.BigNumber(i.SpendsTotalNeed).div(tokenAmount)).toNumber(), totalSpend, `Spends Total Need should be ${totalSpend}`);
	assert.equal((new web3.BigNumber(i.SpendsMinNeed).div(tokenAmount)).toNumber(), totalSpend, `Spends min Need should be ${totalSpend}`);
	assert.equal((new web3.BigNumber(i.SalariesTotalNeed).div(tokenAmount)).toNumber(), e1 + e2 + e3, `Salaries Total Need should be ${e1 + e2 + e3}`);
	assert.equal((new web3.BigNumber(i.SalariesMinNeed).div(tokenAmount)).toNumber(), e1 + e2 + e3, `Salaries min Need should be ${e1 + e2 + e3}`);
	assert.equal((new web3.BigNumber(i.OtherTotalNeed).div(tokenAmount)).toNumber(), office + internet, `Other Total Need should be ${office + internet}`);
	assert.equal((new web3.BigNumber(i.OtherMinNeed).div(tokenAmount)).toNumber(), office + internet, `Other min Need should be ${office + internet}`);
	assert.equal((new web3.BigNumber(i.TasksTotalNeed).div(tokenAmount)).toNumber(), t1 + t2 + t3, `Tasks Total Need should be ${t1 + t2 + t3}`);
	assert.equal((new web3.BigNumber(i.TasksMinNeed).div(tokenAmount)).toNumber(), t1 + t2 + t3, `Tasks min Need should be ${t1 + t2 + t3}`);
	assert.equal((new web3.BigNumber(i.BonusesTotalNeed).div(tokenAmount)).toNumber(), (b1 + b2 + b3) * CURRENT_INPUT / 1000000, `Bonuses Total Need should be ${(b1 + b2 + b3) * CURRENT_INPUT / 1000000}`);
	assert.equal((new web3.BigNumber(i.BonusesMinNeed).div(tokenAmount)).toNumber(), 0, `Bonuses min Need should be ${0}`);
	assert.equal((new web3.BigNumber(i.RestTotalNeed).div(tokenAmount)).toNumber(), CURRENT_INPUT, `Rest Total Need should be ${rest}`);
	assert.equal((new web3.BigNumber(i.RestMinNeed).div(tokenAmount)).toNumber(), 0, `Rest min Need should be ${0}`);
}

async function getBalances (i) {
	var o = {};
	o.Employee1Balance = await i.erc20Table.balanceAt(i.Employee1Id);
	o.Employee2Balance = await i.erc20Table.balanceAt(i.Employee2Id);
	o.Employee3Balance = await i.erc20Table.balanceAt(i.Employee3Id);
	o.OfficeBalance = await i.erc20Table.balanceAt(i.OfficeId);
	o.InternetBalance = await i.erc20Table.balanceAt(i.InternetId);
	o.Task1Balance = await i.erc20Table.balanceAt(i.Task1Id);
	o.Task2Balance = await i.erc20Table.balanceAt(i.Task2Id);
	o.Task3Balance = await i.erc20Table.balanceAt(i.Task3Id);
	o.ReserveBalance = await i.erc20Table.balanceAt(i.ReserveFundId);
	o.DividendsBalance = await i.erc20Table.balanceAt(i.DividendsFundId);
	o.Bonus1Balance = await i.erc20Table.balanceAt(i.Bonus1Id);
	o.Bonus2Balance = await i.erc20Table.balanceAt(i.Bonus2Id);
	o.Bonus3Balance = await i.erc20Table.balanceAt(i.Bonus3Id);
	o.AllOutputsBalance = await i.erc20Table.balanceAt(i.AllOutputsId);
	o.SpendsBalance = await i.erc20Table.balanceAt(i.SpendsId);
	o.SalariesBalance = await i.erc20Table.balanceAt(i.SalariesId);
	o.OtherBalance = await i.erc20Table.balanceAt(i.OtherId);
	o.TasksBalance = await i.erc20Table.balanceAt(i.TasksId);
	o.BonusesBalance = await i.erc20Table.balanceAt(i.BonusesId);
	o.RestBalance = await i.erc20Table.balanceAt(i.RestId);

	return o;
}

async function getSplitterParams (tokenAmount, i, CURRENT_INPUT) {
	var o = {};
	o.AllOutputsTotalNeed = await i.erc20Table.getTotalNeededAt(i.AllOutputsId, CURRENT_INPUT * tokenAmount);
	o.AllOutputsMinNeed = await i.erc20Table.getMinNeededAt(i.AllOutputsId, CURRENT_INPUT * tokenAmount);
	o.AllOutputsChildrenCount = await i.erc20Table.getChildrenCountAt(i.AllOutputsId);
	o.SpendsTotalNeed = await i.erc20Table.getTotalNeededAt(i.SpendsId, CURRENT_INPUT * tokenAmount);
	o.SpendsMinNeed = await i.erc20Table.getMinNeededAt(i.SpendsId, CURRENT_INPUT * tokenAmount);
	o.SpendsChildrenCount = await i.erc20Table.getChildrenCountAt(i.SpendsId);
	o.SalariesTotalNeed = await i.erc20Table.getTotalNeededAt(i.SalariesId, CURRENT_INPUT * tokenAmount);
	o.SalariesMinNeed = await i.erc20Table.getMinNeededAt(i.SalariesId, CURRENT_INPUT * tokenAmount);
	o.SalariesChildrenCount = await i.erc20Table.getChildrenCountAt(i.SalariesId);
	o.OtherTotalNeed = await i.erc20Table.getTotalNeededAt(i.OtherId, CURRENT_INPUT * tokenAmount);
	o.OtherMinNeed = await i.erc20Table.getMinNeededAt(i.OtherId, CURRENT_INPUT * tokenAmount);
	o.OtherChildrenCount = await i.erc20Table.getChildrenCountAt(i.OtherId);
	o.TasksTotalNeed = await i.erc20Table.getTotalNeededAt(i.TasksId, CURRENT_INPUT * tokenAmount);
	o.TasksMinNeed = await i.erc20Table.getMinNeededAt(i.TasksId, CURRENT_INPUT * tokenAmount);
	o.TasksChildrenCount = await i.erc20Table.getChildrenCountAt(i.TasksId);
	o.BonusesTotalNeed = await i.erc20Table.getTotalNeededAt(i.BonusesId, CURRENT_INPUT * tokenAmount);
	o.BonusesMinNeed = await i.erc20Table.getMinNeededAt(i.BonusesId, CURRENT_INPUT * tokenAmount);
	o.BonusesChildrenCount = await i.erc20Table.getChildrenCountAt(i.BonusesId);
	o.RestTotalNeed = await i.erc20Table.getTotalNeededAt(i.RestId, CURRENT_INPUT * tokenAmount);
	o.RestMinNeed = await i.erc20Table.getMinNeededAt(i.RestId, CURRENT_INPUT * tokenAmount);
	o.RestChildrenCount = await i.erc20Table.getChildrenCountAt(i.RestId);

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

async function balancesAsserts (tokenAmount, i, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends) {
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
	
	 assert.equal((new web3.BigNumber(i.Employee1Balance).div(tokenAmount)).toNumber(), e1, `Employee1 balance should be ${e1} tokenAmount`);
	 assert.equal((new web3.BigNumber(i.Employee2Balance).div(tokenAmount)).toNumber(), e2, `Employee2 balance should be ${e2} tokenAmount`);
	 assert.equal((new web3.BigNumber(i.Employee3Balance).div(tokenAmount)).toNumber(), e3, `Employee3 balance should be ${e3} tokenAmount`);
	 assert.equal((new web3.BigNumber(i.OfficeBalance).div(tokenAmount)).toNumber(), office, `Office balance should be ${office} tokenAmount`);
	 assert.equal((new web3.BigNumber(i.InternetBalance).div(tokenAmount)).toNumber(), internet, `Internet balance should be ${internet} tokenAmount`);
	 assert.equal((new web3.BigNumber(i.Task1Balance).div(tokenAmount)).toNumber(), t1, `Task1 balance should be ${t1} tokenAmount`);
	 assert.equal((new web3.BigNumber(i.Task2Balance).div(tokenAmount)).toNumber(), t2, `Task2 balance should be ${t2} tokenAmount`);
	 assert.equal((new web3.BigNumber(i.Task3Balance).div(tokenAmount)).toNumber(), t3, `Task3 balance should be ${t3} tokenAmount`);
	 assert.equal((new web3.BigNumber(i.Bonus1Balance).div(tokenAmount)).toNumber(), bonusesSpendPercent * b1, `Bonus1 balance should be ${bonusesSpendPercent * b1} tokenAmount`);
	 assert.equal((new web3.BigNumber(i.Bonus2Balance).div(tokenAmount)).toNumber(), bonusesSpendPercent * b2, `Bonus2 balance should be ${bonusesSpendPercent * b2} tokenAmount`);
	 assert.equal((new web3.BigNumber(i.Bonus3Balance).div(tokenAmount)).toNumber(), bonusesSpendPercent * b3, `Bonus3 balance should be ${bonusesSpendPercent * b3} tokenAmount`);
	 assert.equal((new web3.BigNumber(i.DividendsBalance).div(tokenAmount)).toNumber(), dividendsAmount, `Dividends balance should be ${dividendsAmount} tokenAmount`);
	 assert.equal((new web3.BigNumber(i.ReserveBalance).div(tokenAmount)).toNumber(), reserveAmount, `Reserve balance should be ${reserveAmount} tokenAmount`);
	
}

contract('ERC20Table tests', (accounts) => {
	var token;
	var store;
	var daoBase;

	var tokenAmount = 1e12;
	var isPeriodic = false;
	var isAccumulateDebt = false;
	var periodHours = 0;
	var output = '0x0';

	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[3];

	beforeEach(async () => {
		token = await StandardToken.new();
		await token.mint(accounts[0], 1e30);
		await token.mint(accounts[1], 1e30);
		await token.mint(accounts[2], 1e30);
		await token.mint(accounts[3], 1e30);
		await token.mint(accounts[4], 1e30);
		await token.mint(accounts[5], 1e30);
		await token.mint(accounts[6], 1e30);
		await token.mint(accounts[7], 1e30);
		await token.mint(accounts[8], 1e30);
		await token.mint(accounts[9], 1e30);
	});

	// 0->•abs
	it('1: should process tokenAmount with ERC20Splitter + 3 ERC20AbsoluteExpense', async () => {
		let erc20Table = await ERC20Table.new(token.address);
		var output1 = await ERC20AbsoluteExpense.new(token.address,tokenAmount, tokenAmount);
		var output2 = await ERC20AbsoluteExpense.new(token.address,2 * tokenAmount, 2 * tokenAmount);
		var output3 = await ERC20AbsoluteExpense.new(token.address,3 * tokenAmount, 3 * tokenAmount);
		let splitterId =  getEId(await erc20Table.addSplitter());
		let AbsoluteExpense1Id = getEId(await erc20Table.addAbsoluteExpense(1 * tokenAmount, 1 * tokenAmount, isPeriodic, isAccumulateDebt, periodHours));
		let AbsoluteExpense2Id = getEId(await erc20Table.addAbsoluteExpense(2 * tokenAmount, 2 * tokenAmount, isPeriodic, isAccumulateDebt, periodHours));
		let AbsoluteExpense3Id = getEId(await erc20Table.addAbsoluteExpense(3 * tokenAmount, 3 * tokenAmount, isPeriodic, isAccumulateDebt, periodHours));

		// add 3 ERC20AbsoluteExpense outputs to the splitter
		await erc20Table.addChildAt(splitterId, AbsoluteExpense1Id);
		await erc20Table.addChildAt(splitterId, AbsoluteExpense2Id);
		await erc20Table.addChildAt(splitterId, AbsoluteExpense3Id);

		var id1 = await erc20Table.getChildIdAt(splitterId, 0);
		var id2 = await erc20Table.getChildIdAt(splitterId, 1);
		var id3 = await erc20Table.getChildIdAt(splitterId, 2);

		assert.equal(id1, AbsoluteExpense1Id);
		assert.equal(id2, AbsoluteExpense2Id);
		assert.equal(id3, AbsoluteExpense3Id);

		var totalNeed = await erc20Table.getTotalNeeded(6 * tokenAmount);
		assert.equal(totalNeed, 6 * tokenAmount);
		var minNeed = await erc20Table.getMinNeeded(0);/*minNeedFix*/
		assert.equal(minNeed, 6 * tokenAmount);
		var need1 = await erc20Table.isNeeds();
		assert.equal(need1, true);
		// now send some tokenAmount to the revenue endpoint
		await token.approve(erc20Table.address, 6 * tokenAmount, {from:creator});
		await erc20Table.processTokens(6 * tokenAmount, 6 * tokenAmount, {from: creator });
		
		// tokenAmount should end up in the outputs
		var absoluteExpense1Balance = await erc20Table.balanceAt(AbsoluteExpense1Id);
		assert.equal(absoluteExpense1Balance.toNumber(), 1 * tokenAmount, 'resource point received tokenAmount from splitter');

		var absoluteExpense2Balance = await erc20Table.balanceAt(AbsoluteExpense2Id);
		assert.equal(absoluteExpense2Balance.toNumber(), 2 * tokenAmount, 'resource point received tokenAmount from splitter');

		var absoluteExpense3Balance = await erc20Table.balanceAt(AbsoluteExpense3Id);
		assert.equal(absoluteExpense3Balance.toNumber(), 3 * tokenAmount, 'resource point received tokenAmount from splitter');

		assert.equal((await erc20Table.getTotalNeededAt(AbsoluteExpense1Id, 6 * tokenAmount)).toNumber(), 0);
		assert.equal((await erc20Table.getTotalNeededAt(AbsoluteExpense2Id, 6 * tokenAmount)).toNumber(), 0);
		assert.equal((await erc20Table.getTotalNeededAt(AbsoluteExpense3Id, 6 * tokenAmount)).toNumber(), 0);	

		var totalNeed = await erc20Table.getTotalNeeded(6 * tokenAmount);
		assert.equal(totalNeed.toNumber(), 0 * tokenAmount);
		var minNeed = await erc20Table.getMinNeeded(0);/*minNeedFix*/
		assert.equal(minNeed.toNumber(), 0 * tokenAmount);

		var need2 = await erc20Table.isNeeds();
		assert.equal(need2, false);

		var b1 = await token.balanceOf(accounts[9]);
		await erc20Table.flushToAt(AbsoluteExpense1Id, accounts[9], { gasPrice: 0 });
		var b2 = await token.balanceOf(accounts[9]);
		assert.equal(b2.sub(b1).toNumber(), 1 * tokenAmount);

		var b1 = await token.balanceOf(accounts[9]);
		await erc20Table.flushToAt(AbsoluteExpense2Id, accounts[9], { gasPrice: 0 });
		var b2 = await token.balanceOf(accounts[9]);
		assert.equal(b2.sub(b1).toNumber(), 2 * tokenAmount);

		var b1 = await token.balanceOf(accounts[9]);
		await erc20Table.flushToAt(AbsoluteExpense3Id, accounts[9], { gasPrice: 0 });
		var b2 = await token.balanceOf(accounts[9]);
		assert.equal(b2.sub(b1).toNumber(), 3 * tokenAmount);

		var absoluteExpense1Balance = await erc20Table.balanceAt(AbsoluteExpense1Id);
		assert.equal(absoluteExpense1Balance.toNumber(), 0 * tokenAmount, 'resource point received tokenAmount from splitter');

		var absoluteExpense2Balance = await erc20Table.balanceAt(AbsoluteExpense2Id);
		assert.equal(absoluteExpense2Balance.toNumber(), 0 * tokenAmount, 'resource point received tokenAmount from splitter');

		var absoluteExpense3Balance = await erc20Table.balanceAt(AbsoluteExpense3Id);
		assert.equal(absoluteExpense3Balance.toNumber(), 0 * tokenAmount, 'resource point received tokenAmount from splitter');
		var need2 = await erc20Table.isNeeds();
	});

	it('2: should process tokenAmount with ERC20Splitter + 3 ERC20AbsoluteExpense', async () => {
		let erc20Table = await ERC20Table.new(token.address);
		
		let unsortedSplitterId = getEId(await erc20Table.addSplitter());
		let AbsoluteExpense1Id = getEId(await erc20Table.addAbsoluteExpense(tokenAmount, tokenAmount, isPeriodic, isAccumulateDebt, periodHours));
		let AbsoluteExpense2Id = getEId(await erc20Table.addAbsoluteExpense(2 * tokenAmount, 2 * tokenAmount, isPeriodic, isAccumulateDebt, periodHours));
		let AbsoluteExpense3Id = getEId(await erc20Table.addAbsoluteExpense(3 * tokenAmount, 3 * tokenAmount, isPeriodic, isAccumulateDebt, periodHours));

		await erc20Table.addChildAt(unsortedSplitterId, AbsoluteExpense1Id);
		await erc20Table.addChildAt(unsortedSplitterId, AbsoluteExpense2Id);
		await erc20Table.addChildAt(unsortedSplitterId, AbsoluteExpense3Id);

		// now send some tokenAmount to the revenue endpoint
		let totalNeed = await erc20Table.getTotalNeeded(6 * tokenAmount);
		assert.equal(totalNeed, 6 * tokenAmount);
		let minNeed = await erc20Table.getMinNeeded(0);/*minNeedFix*/
		assert.equal(minNeed, 6 * tokenAmount);

		await token.approve(erc20Table.address, 6 * tokenAmount, {from:creator});
		await erc20Table.processTokens(6 * tokenAmount, 6 * tokenAmount, {from: creator });
		// tokenAmount should end up in the outputs
		var absoluteExpense1Balance = await erc20Table.balanceAt(AbsoluteExpense1Id);
		assert.equal(absoluteExpense1Balance.toNumber(), 1 * tokenAmount, 'resource point received tokenAmount from splitter');

		var absoluteExpense2Balance = await erc20Table.balanceAt(AbsoluteExpense2Id);
		assert.equal(absoluteExpense2Balance.toNumber(), 2 * tokenAmount, 'resource point received tokenAmount from splitter');

		var absoluteExpense3Balance = await erc20Table.balanceAt(AbsoluteExpense3Id);
		assert.equal(absoluteExpense3Balance.toNumber(), 3 * tokenAmount, 'resource point received tokenAmount from splitter');
	});

	it('3: should process tokenAmount with a scheme just like in the paper: 75/25 others, send MORE than minNeed; ', async () => {
		const tokenAmount = 1e12;
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
		let reserve = 750000;
		let dividends = 250000;

		let struct = await createStructure(token, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		let splitterParams = await getSplitterParams(tokenAmount, struct, CURRENT_INPUT, creator);
		await totalAndMinNeedsAsserts(tokenAmount, splitterParams, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await token.approve(struct.erc20Table.address, CURRENT_INPUT * tokenAmount, {from:creator});
		await struct.erc20Table.processTokens(CURRENT_INPUT * tokenAmount, CURRENT_INPUT * tokenAmount, {from: creator, gasPrice: 0 });

		let balances = await getBalances(struct);
		await balancesAsserts(tokenAmount, balances, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
	});

	it('4: should process tokenAmount with a scheme just like in the paper: 75/25 others, send EQUAL to minNeed', async () => {
		const tokenAmount = 1e12;
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
		let reserve = 750000;
		let dividends = 250000;

		let struct = await createStructure(token, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		let splitterParams = await getSplitterParams(tokenAmount, struct, CURRENT_INPUT, creator);
		await totalAndMinNeedsAsserts(tokenAmount, splitterParams, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await token.approve(struct.erc20Table.address, CURRENT_INPUT * tokenAmount, {from:creator});
		await struct.erc20Table.processTokens(CURRENT_INPUT * tokenAmount, CURRENT_INPUT * tokenAmount, {from: creator, gasPrice: 0 });

		let balances = await getBalances(struct);
		await balancesAsserts(tokenAmount, balances, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, 0, 0, 0, 0, 0);
	});

	it('5: should not process tokenAmount: send LESS than minNeed', async () => {
		const tokenAmount = 1e12;
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
		let reserve = 750000;
		let dividends = 250000;

		let struct = await createStructure(token, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		let splitterParams = await getSplitterParams(tokenAmount, struct, CURRENT_INPUT, creator);
		await totalAndMinNeedsAsserts(tokenAmount, splitterParams, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await token.approve(struct.erc20Table.address, CURRENT_INPUT * tokenAmount, {from:creator});
		await struct.erc20Table.processTokens(CURRENT_INPUT * tokenAmount / 100, CURRENT_INPUT * tokenAmount, {from: creator, gasPrice: 0 }).should.be.rejectedWith('revert');
		await token.approve(struct.erc20Table.address, CURRENT_INPUT * tokenAmount / 100, {from:creator});
		await struct.erc20Table.processTokens(CURRENT_INPUT * tokenAmount, CURRENT_INPUT * tokenAmount / 100, {from: creator, gasPrice: 0 }).should.be.rejectedWith('revert');
		await token.approve(struct.erc20Table.address, CURRENT_INPUT * tokenAmount, {from:creator});
		await struct.erc20Table.processTokens(CURRENT_INPUT * tokenAmount / 100, CURRENT_INPUT * tokenAmount, {from: creator, gasPrice: 0 }).should.be.rejectedWith('revert');
	});

	it('6: should process tokenAmount with a scheme just like in the paper: 10/15 others, send MORE than minNeed; ', async () => {
		const tokenAmount = 1e12;
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
		let reserve = 750000;
		let dividends = 250000;

		let struct = await createStructure(token, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		let splitterParams = await getSplitterParams(tokenAmount, struct, CURRENT_INPUT, creator);
		await totalAndMinNeedsAsserts(tokenAmount, splitterParams, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await token.approve(struct.erc20Table.address, CURRENT_INPUT * tokenAmount, {from:creator});
		await struct.erc20Table.processTokens(CURRENT_INPUT * tokenAmount, CURRENT_INPUT * tokenAmount, {from: creator, gasPrice: 0 });

		let balances = await getBalances(struct);
		await balancesAsserts(tokenAmount, balances, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
	});

	it('7: should process tokenAmount with a scheme just like in the paper: 10/15 others, send EQUAL to minNeed; ', async () => {
		const tokenAmount = 1e12;
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
		let reserve = 750000;
		let dividends = 250000;

		let struct = await createStructure(token, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		let splitterParams = await getSplitterParams(tokenAmount, struct, CURRENT_INPUT, creator);
		await totalAndMinNeedsAsserts(tokenAmount, splitterParams, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await token.approve(struct.erc20Table.address, CURRENT_INPUT * tokenAmount, {from:creator});
		await struct.erc20Table.processTokens(CURRENT_INPUT * tokenAmount, CURRENT_INPUT * tokenAmount, {from: creator, gasPrice: 0 });

		let balances = await getBalances(struct);
		await balancesAsserts(tokenAmount, balances, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, 0, 0, 0, 0, 0);
	});

	it('8: should not process tokenAmount: send LESS than minNeed; ', async () => {
		const tokenAmount = 1e12;
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
		let reserve = 750000;
		let dividends = 250000;

		let struct = await createStructure(token, tokenAmount, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		let splitterParams = await getSplitterParams(tokenAmount, struct, CURRENT_INPUT, creator);
		await totalAndMinNeedsAsserts(tokenAmount, splitterParams, CURRENT_INPUT, e1, e2, e3, office, internet, t1, t2, t3, b1, b2, b3, reserve, dividends);
		await structureAsserts(splitterParams);

		await token.approve(struct.erc20Table.address, CURRENT_INPUT * tokenAmount, {from:creator});
		await struct.erc20Table.processTokens(CURRENT_INPUT * tokenAmount / 100, CURRENT_INPUT * tokenAmount, {from: creator, gasPrice: 0 }).should.be.rejectedWith('revert');
		await token.approve(struct.erc20Table.address, CURRENT_INPUT * tokenAmount / 100, {from:creator});
		await struct.erc20Table.processTokens(CURRENT_INPUT * tokenAmount, CURRENT_INPUT * tokenAmount / 100, {from: creator, gasPrice: 0 }).should.be.rejectedWith('revert');
		await token.approve(struct.erc20Table.address, CURRENT_INPUT * tokenAmount, {from:creator});
		await struct.erc20Table.processTokens(CURRENT_INPUT * tokenAmount / 100, CURRENT_INPUT * tokenAmount, {from: creator, gasPrice: 0 }).should.be.rejectedWith('revert');
	});

	it('9: should process tokenAmount when opened and not process when closed with ERC20Splitter + 3 ERC20AbsoluteExpense', async () => {
		let erc20Table = await ERC20Table.new(token.address);

		let splitterId = getEId(await erc20Table.addSplitter());
		let AbsoluteExpense1Id = getEId(await erc20Table.addAbsoluteExpense(tokenAmount, tokenAmount, isPeriodic, isAccumulateDebt, periodHours));
		let AbsoluteExpense2Id = getEId(await erc20Table.addAbsoluteExpense(2 * tokenAmount, 2 * tokenAmount, isPeriodic, isAccumulateDebt, periodHours));
		let AbsoluteExpense3Id = getEId(await erc20Table.addAbsoluteExpense(3 * tokenAmount, 3 * tokenAmount, isPeriodic, isAccumulateDebt, periodHours));

		// add 3 ERC20AbsoluteExpense outputs to the splitter
		await erc20Table.addChildAt(splitterId, AbsoluteExpense1Id);
		await erc20Table.addChildAt(splitterId, AbsoluteExpense2Id);
		await erc20Table.addChildAt(splitterId, AbsoluteExpense3Id);

		var totalNeed = await erc20Table.getTotalNeeded(6 * tokenAmount);
		assert.equal(totalNeed, 6 * tokenAmount);
		var minNeed = await erc20Table.getMinNeeded(0);/*minNeedFix*/
		assert.equal(minNeed, 6 * tokenAmount);

		var isOpen1At = await erc20Table.isOpenAt(AbsoluteExpense1Id);
		var isOpen2At = await erc20Table.isOpenAt(AbsoluteExpense2Id);
		var isOpen3At = await erc20Table.isOpenAt(AbsoluteExpense3Id);
		assert.equal(isOpen1At, true);
		assert.equal(isOpen2At, true);
		assert.equal(isOpen3At, true);

		await erc20Table.closeAt(AbsoluteExpense3Id);

		var totalNeed = await erc20Table.getTotalNeeded(6 * tokenAmount);
		assert.equal(totalNeed.toNumber(), 3 * tokenAmount);
		var minNeed = await erc20Table.getMinNeeded(0);/*minNeedFix*/
		assert.equal(minNeed, 3 * tokenAmount);

		await erc20Table.closeAt(AbsoluteExpense1Id);

		var totalNeed = await erc20Table.getTotalNeeded(6 * tokenAmount);
		assert.equal(totalNeed, 2 * tokenAmount);
		var minNeed = await erc20Table.getMinNeeded(0);/*minNeedFix*/
		assert.equal(minNeed, 2 * tokenAmount);

		var isOpen1At = await erc20Table.isOpenAt(AbsoluteExpense1Id);
		var isOpen2At = await erc20Table.isOpenAt(AbsoluteExpense2Id);
		var isOpen3At = await erc20Table.isOpenAt(AbsoluteExpense3Id);
		assert.equal(isOpen1At, false);
		assert.equal(isOpen2At, true);
		assert.equal(isOpen3At, false);

		await erc20Table.openAt(AbsoluteExpense3Id);
		var isOpen1At = await erc20Table.isOpenAt(AbsoluteExpense1Id);
		var isOpen2At = await erc20Table.isOpenAt(AbsoluteExpense2Id);
		var isOpen3At = await erc20Table.isOpenAt(AbsoluteExpense3Id);
		assert.equal(isOpen1At, false);
		assert.equal(isOpen2At, true);
		assert.equal(isOpen3At, true);

		// now send some tokenAmount to the revenue endpoint
		await token.approve(erc20Table.address, 5 * tokenAmount, {from:creator});
		await erc20Table.processTokens(5 * tokenAmount, 5 * tokenAmount, {from: creator });

		// tokenAmount should end up in the outputs
		var absoluteExpense1Balance = await erc20Table.balanceAt(AbsoluteExpense1Id);
		assert.equal(absoluteExpense1Balance.toNumber(), 0 * tokenAmount, 'resource point received tokenAmount from splitter');

		var absoluteExpense2Balance = await erc20Table.balanceAt(AbsoluteExpense2Id);
		assert.equal(absoluteExpense2Balance.toNumber(), 2 * tokenAmount, 'resource point received tokenAmount from splitter');

		var absoluteExpense3Balance = await erc20Table.balanceAt(AbsoluteExpense3Id);
		assert.equal(absoluteExpense3Balance.toNumber(), 3 * tokenAmount, 'resource point received tokenAmount from splitter');
	});
});
