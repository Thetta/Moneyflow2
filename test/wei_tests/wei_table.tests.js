var WeiTable = artifacts.require('./WeiTable');
var IReceiver = artifacts.require('./IReceiver');

var WeiSplitter = artifacts.require('./WeiSplitter');
var WeiAbsoluteExpense = artifacts.require('./WeiAbsoluteExpense');
var WeiRelativeExpense = artifacts.require('./WeiRelativeExpense');
var WeiAbsoluteExpenseWithPeriod = artifacts.require('./WeiAbsoluteExpenseWithPeriod');
var WeiRelativeExpenseWithPeriod = artifacts.require('./WeiRelativeExpenseWithPeriod');

require('chai')
	.use(require('chai-as-promised'))
	.use(require('chai-bignumber')(web3.utils.BN))
	.should();

const {createStructureTable, totalAndMinNeedsAssertsTable, getBalancesTable, 
	getSplitterParamsTable, structureAssertsTable, balancesAssertsTable} = require('../helpers/structures');

const {passHours, getNodeId, toBN} = require('../helpers/utils');

contract('WeiTable tests', (accounts) => {
	var token;
	var multiplier = 1e5;
	var isPeriodic = false;
	var isAccumulateDebt = false;
	var periodHours = 0;
	var output = '0x0';

	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[3];

	// // 0->•abs
	it('Should process with WeiSplitter + 3 WeiAbsoluteExpense', async () => {
		let table = await WeiTable.new();
		var output1 = await WeiAbsoluteExpense.new(multiplier, multiplier);
		var output2 = await WeiAbsoluteExpense.new(2 * multiplier, 2 * multiplier);
		var output3 = await WeiAbsoluteExpense.new(3 * multiplier, 3 * multiplier);
		let splitterId =  getNodeId(await table.addSplitter());
		let AbsoluteExpense1Id = getNodeId(await table.addAbsoluteExpense(1 * multiplier, 1 * multiplier, isPeriodic, isAccumulateDebt, periodHours));
		let AbsoluteExpense2Id = getNodeId(await table.addAbsoluteExpense(2 * multiplier, 2 * multiplier, isPeriodic, isAccumulateDebt, periodHours));
		let AbsoluteExpense3Id = getNodeId(await table.addAbsoluteExpense(3 * multiplier, 3 * multiplier, isPeriodic, isAccumulateDebt, periodHours));

		// add 3 WeiAbsoluteExpense outputs to the splitter
		await table.addChildAt(splitterId, AbsoluteExpense1Id);
		await table.addChildAt(splitterId, AbsoluteExpense2Id);
		await table.addChildAt(splitterId, AbsoluteExpense3Id);

		var id1 = await table.getChildIdAt(splitterId, 0);
		var id2 = await table.getChildIdAt(splitterId, 1);
		var id3 = await table.getChildIdAt(splitterId, 2);

		assert.equal(toBN(id1).toNumber(), toBN(AbsoluteExpense1Id).toNumber());
		assert.equal(toBN(id2).toNumber(), toBN(AbsoluteExpense2Id).toNumber());
		assert.equal(toBN(id3).toNumber(), toBN(AbsoluteExpense3Id).toNumber());

		var totalNeed = await table.getTotalNeeded(6 * multiplier);
		assert.equal(totalNeed, 6 * multiplier);
		var minNeed = await table.getMinNeeded(0);/*minNeedFix*/
		assert.equal(minNeed, 6 * multiplier);
		var need1 = await table.isNeeds();
		assert.equal(need1, true);
		// now send some to the revenue endpoint
		await table.processFunds(6 * multiplier, { value: 6 * multiplier, from: creator });
		
		// should end up in the outputs
		var absoluteExpense1Balance = await table.balanceAt(AbsoluteExpense1Id);
		assert.equal(web3.utils.BN(absoluteExpense1Balance).toNumber(), 1 * multiplier, 'resource point received from splitter');

		var absoluteExpense2Balance = await table.balanceAt(AbsoluteExpense2Id);
		assert.equal(web3.utils.BN(absoluteExpense2Balance).toNumber(), 2 * multiplier, 'resource point received from splitter');

		var absoluteExpense3Balance = await table.balanceAt(AbsoluteExpense3Id);
		assert.equal(web3.utils.BN(absoluteExpense3Balance).toNumber(), 3 * multiplier, 'resource point received from splitter');

		assert.equal((await table.getTotalNeededAt(AbsoluteExpense1Id, multiplier)), 0);
		assert.equal((await table.getTotalNeededAt(AbsoluteExpense2Id, multiplier)), 0);
		assert.equal((await table.getTotalNeededAt(AbsoluteExpense3Id, multiplier)), 0);	

		var totalNeed = await table.getTotalNeeded(6 * multiplier);
		assert.equal(web3.utils.BN(totalNeed).toNumber(), 0 * multiplier);
		var minNeed = await table.getMinNeeded(0);/*minNeedFix*/
		assert.equal(web3.utils.BN(minNeed).toNumber(), 0 * multiplier);

		var need2 = await table.isNeeds();
		assert.equal(need2, false);

		var b1 = new web3.utils.BN(await web3.eth.getBalance(accounts[9]));
		await table.flushToAt(AbsoluteExpense1Id, accounts[9], { gasPrice: 0 });
		var b2 = new web3.utils.BN(await web3.eth.getBalance(accounts[9]));
		assert.equal(b2.sub(b1).toNumber(), 1 * multiplier);

		var b1 = new web3.utils.BN(await web3.eth.getBalance(accounts[9]));
		await table.flushToAt(AbsoluteExpense2Id, accounts[9], { gasPrice: 0 });
		var b2 = new web3.utils.BN(await web3.eth.getBalance(accounts[9]));
		assert.equal(b2.sub(b1).toNumber(), 2 * multiplier);

		var b1 = new web3.utils.BN(await web3.eth.getBalance(accounts[9]));
		await table.flushToAt(AbsoluteExpense3Id, accounts[9], { gasPrice: 0 });
		var b2 = new web3.utils.BN(await web3.eth.getBalance(accounts[9]));
		assert.equal(b2.sub(b1).toNumber(), 3 * multiplier);

		var absoluteExpense1Balance = await table.balanceAt(AbsoluteExpense1Id);
		assert.equal(web3.utils.BN(absoluteExpense1Balance).toNumber(), 0 * multiplier, 'resource point received from splitter');

		var absoluteExpense2Balance = await table.balanceAt(AbsoluteExpense2Id);
		assert.equal(web3.utils.BN(absoluteExpense2Balance).toNumber(), 0 * multiplier, 'resource point received from splitter');

		var absoluteExpense3Balance = await table.balanceAt(AbsoluteExpense3Id);
		assert.equal(web3.utils.BN(absoluteExpense3Balance).toNumber(), 0 * multiplier, 'resource point received from splitter');
		var need2 = await table.isNeeds();
	});

	it('Should process with a scheme just like in the paper: 75/25 others, send MORE than minNeed; ', async () => {
		var params = {CURRENT_INPUT:30900, multiplier:multiplier, 
			e1:1000, e2:1500, e3:800, office:500, internet:300, t1:500, t2:300, t3:1000, 
			b1:10000, b2:10000, b3:20000, reserve:750000, dividends:250000}

		let struct = await createStructureTable(params, WeiTable);
		let splitterParams = await getSplitterParamsTable(struct, params);
		await totalAndMinNeedsAssertsTable(splitterParams, params);
		await structureAssertsTable(splitterParams);

		await struct.table.processFunds(params.CURRENT_INPUT * multiplier, { value: params.CURRENT_INPUT * multiplier, gasPrice: 0 });

		let balances = await getBalancesTable(struct);
		await balancesAssertsTable(balances, params);
	});

	it('Should process with a scheme just like in the paper: 75/25 others, send EQUAL to minNeed', async () => {
		var params = {CURRENT_INPUT:5900, multiplier:multiplier, 
			e1:1000, e2:1500, e3:800, office:500, internet:300, t1:500, t2:300, t3:1000, 
			b1:10000, b2:10000, b3:20000, reserve:750000, dividends:250000}

		let struct = await createStructureTable(params, WeiTable);
		let splitterParams = await getSplitterParamsTable(struct, params);
		await totalAndMinNeedsAssertsTable(splitterParams, params);
		await structureAssertsTable(splitterParams);

		await struct.table.processFunds(params.CURRENT_INPUT * multiplier, { value: params.CURRENT_INPUT * multiplier, gasPrice: 0 });

		let balances = await getBalancesTable(struct);
		await balancesAssertsTable(balances, params);
	});

	it('Should not process multiplier: send LESS than minNeed', async () => {
		var params = {CURRENT_INPUT:5900, multiplier:multiplier, 
			e1:1000, e2:1500, e3:800, office:500, internet:300, t1:500, t2:300, t3:1000, 
			b1:10000, b2:10000, b3:20000, reserve:750000, dividends:250000}

		let struct = await createStructureTable(params, WeiTable);
		let splitterParams = await getSplitterParamsTable(struct, params);
		await totalAndMinNeedsAssertsTable(splitterParams, params);
		await structureAssertsTable(splitterParams);

		await struct.table.processFunds(params.CURRENT_INPUT * multiplier / 100, { value: params.CURRENT_INPUT * multiplier, gasPrice: 0 }).should.be.rejectedWith('revert');
		await struct.table.processFunds(params.CURRENT_INPUT * multiplier, { value: params.CURRENT_INPUT * multiplier / 100, gasPrice: 0 }).should.be.rejectedWith('revert');
		await struct.table.processFunds(params.CURRENT_INPUT * multiplier / 100, { value: params.CURRENT_INPUT * multiplier, gasPrice: 0 }).should.be.rejectedWith('revert');
	});

	it('Should process with a scheme just like in the paper: 10/15 others, send MORE than minNeed; ', async () => {
		var params = {CURRENT_INPUT:20900, multiplier:multiplier, 
			e1:1000, e2:1500, e3:800, office:500, internet:300, t1:500, t2:300, t3:1000, 
			b1:10000, b2:10000, b3:20000, reserve:750000, dividends:250000}

		let struct = await createStructureTable(params, WeiTable);
		let splitterParams = await getSplitterParamsTable(struct, params);
		await totalAndMinNeedsAssertsTable(splitterParams, params);
		await structureAssertsTable(splitterParams);

		await struct.table.processFunds(params.CURRENT_INPUT * multiplier, { value: params.CURRENT_INPUT * multiplier, gasPrice: 0 });

		let balances = await getBalancesTable(struct);
		await balancesAssertsTable(balances, params);
	});

	it('Should process with a scheme just like in the paper: 10/15 others, send EQUAL to minNeed; ', async () => {
		var params = {CURRENT_INPUT:5900, multiplier:multiplier, 
			e1:1000, e2:1500, e3:800, office:500, internet:300, t1:500, t2:300, t3:1000, 
			b1:10000, b2:10000, b3:20000, reserve:750000, dividends:250000}

		let struct = await createStructureTable(params, WeiTable);
		let splitterParams = await getSplitterParamsTable(struct, params);
		await totalAndMinNeedsAssertsTable(splitterParams, params);
		await structureAssertsTable(splitterParams);

		await struct.table.processFunds(params.CURRENT_INPUT * multiplier, { value: params.CURRENT_INPUT * multiplier, gasPrice: 0 });

		let balances = await getBalancesTable(struct);
		await balancesAssertsTable(balances, params);
	});

	it('Should not process multiplier: send LESS than minNeed; ', async () => {
		var params = {CURRENT_INPUT:5900, multiplier:multiplier, 
			e1:1000, e2:1500, e3:800, office:500, internet:300, t1:500, t2:300, t3:1000, 
			b1:10000, b2:10000, b3:20000, reserve:750000, dividends:250000}

		let struct = await createStructureTable(params, WeiTable);
		let splitterParams = await getSplitterParamsTable(struct, params);
		await totalAndMinNeedsAssertsTable(splitterParams, params);
		await structureAssertsTable(splitterParams);

		await struct.table.processFunds(params.CURRENT_INPUT * multiplier / 100, { value: params.CURRENT_INPUT * multiplier, gasPrice: 0 }).should.be.rejectedWith('revert');
		await struct.table.processFunds(params.CURRENT_INPUT * multiplier, { value: params.CURRENT_INPUT * multiplier / 100, gasPrice: 0 }).should.be.rejectedWith('revert');
		await struct.table.processFunds(params.CURRENT_INPUT * multiplier / 100, { value: params.CURRENT_INPUT * multiplier, gasPrice: 0 }).should.be.rejectedWith('revert');
	});

	it('Should process when opened and not process when closed with WeiSplitter + 3 WeiAbsoluteExpense', async () => {
		let table = await WeiTable.new();

		let splitterId = getNodeId(await table.addSplitter());
		let AbsoluteExpense1Id = getNodeId(await table.addAbsoluteExpense(multiplier, multiplier, isPeriodic, isAccumulateDebt, periodHours));
		let AbsoluteExpense2Id = getNodeId(await table.addAbsoluteExpense(2 * multiplier, 2 * multiplier, isPeriodic, isAccumulateDebt, periodHours));
		let AbsoluteExpense3Id = getNodeId(await table.addAbsoluteExpense(3 * multiplier, 3 * multiplier, isPeriodic, isAccumulateDebt, periodHours));

		// add 3 WeiAbsoluteExpense outputs to the splitter
		await table.addChildAt(splitterId, AbsoluteExpense1Id);
		await table.addChildAt(splitterId, AbsoluteExpense2Id);
		await table.addChildAt(splitterId, AbsoluteExpense3Id);

		var totalNeed = await table.getTotalNeeded(6 * multiplier);
		assert.equal(totalNeed, 6 * multiplier);
		var minNeed = await table.getMinNeeded(0);/*minNeedFix*/
		assert.equal(minNeed, 6 * multiplier);

		var isOpen1At = await table.isOpenAt(AbsoluteExpense1Id);
		var isOpen2At = await table.isOpenAt(AbsoluteExpense2Id);
		var isOpen3At = await table.isOpenAt(AbsoluteExpense3Id);
		assert.equal(isOpen1At, true);
		assert.equal(isOpen2At, true);
		assert.equal(isOpen3At, true);

		await table.closeAt(AbsoluteExpense3Id);

		var totalNeed = await table.getTotalNeeded(6 * multiplier);
		assert.equal(web3.utils.BN(totalNeed).toNumber(), 3 * multiplier);
		var minNeed = await table.getMinNeeded(0);/*minNeedFix*/
		assert.equal(minNeed, 3 * multiplier);

		await table.closeAt(AbsoluteExpense1Id);

		var totalNeed = await table.getTotalNeeded(6 * multiplier);
		assert.equal(totalNeed, 2 * multiplier);
		var minNeed = await table.getMinNeeded(0);/*minNeedFix*/
		assert.equal(minNeed, 2 * multiplier);

		var isOpen1At = await table.isOpenAt(AbsoluteExpense1Id);
		var isOpen2At = await table.isOpenAt(AbsoluteExpense2Id);
		var isOpen3At = await table.isOpenAt(AbsoluteExpense3Id);
		assert.equal(isOpen1At, false);
		assert.equal(isOpen2At, true);
		assert.equal(isOpen3At, false);

		await table.openAt(AbsoluteExpense3Id);
		var isOpen1At = await table.isOpenAt(AbsoluteExpense1Id);
		var isOpen2At = await table.isOpenAt(AbsoluteExpense2Id);
		var isOpen3At = await table.isOpenAt(AbsoluteExpense3Id);
		assert.equal(isOpen1At, false);
		assert.equal(isOpen2At, true);
		assert.equal(isOpen3At, true);

		// now send some to the revenue endpoint
		await table.processFunds(5 * multiplier, { value: 5 * multiplier, from: creator });

		// should end up in the outputs
		var absoluteExpense1Balance = await table.balanceAt(AbsoluteExpense1Id);
		assert.equal(web3.utils.BN(absoluteExpense1Balance).toNumber(), 0 * multiplier, 'resource point received from splitter');

		var absoluteExpense2Balance = await table.balanceAt(AbsoluteExpense2Id);
		assert.equal(web3.utils.BN(absoluteExpense2Balance).toNumber(), 2 * multiplier, 'resource point received from splitter');

		var absoluteExpense3Balance = await table.balanceAt(AbsoluteExpense3Id);
		assert.equal(web3.utils.BN(absoluteExpense3Balance).toNumber(), 3 * multiplier, 'resource point received from splitter');
	});
});