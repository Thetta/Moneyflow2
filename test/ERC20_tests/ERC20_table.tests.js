var ERC20Table = artifacts.require('./ERC20Table');
var IReceiver = artifacts.require('./IReceiver');

var StandardToken = artifacts.require('./ERC20Token');

var ERC20Splitter = artifacts.require('./ERC20Splitter');
var ERC20AbsoluteExpense = artifacts.require('./ERC20AbsoluteExpense');
var ERC20RelativeExpense = artifacts.require('./ERC20RelativeExpense');
var ERC20AbsoluteExpenseWithPeriod = artifacts.require('./ERC20AbsoluteExpenseWithPeriod');
var ERC20RelativeExpenseWithPeriod = artifacts.require('./ERC20RelativeExpenseWithPeriod');

require('chai')
	.use(require('chai-as-promised'))
	.use(require('chai-bignumber')(web3.BigNumber))
	.should();

const {createStructureTable, totalAndMinNeedsAssertsTable, getBalancesTable, 
	getSplitterParamsTable, structureAssertsTable, balancesAssertsTable} = require('../helpers/structures');

const {passHours, getNodeId} = require('../helpers/utils');

contract('ERC20Table tests', (accounts) => {
	var token;
	var multiplier = 1e12;
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
		for(var i=0; i<10; i++) {
			await token.mint(accounts[i], 1e30);
		}
	});

	// 0->•abs
	it('Should process with ERC20Splitter + 3 ERC20AbsoluteExpense', async () => {
		let table = await ERC20Table.new(token.address);
		var output1 = await ERC20AbsoluteExpense.new(token.address,multiplier, multiplier);
		var output2 = await ERC20AbsoluteExpense.new(token.address,2 * multiplier, 2 * multiplier);
		var output3 = await ERC20AbsoluteExpense.new(token.address,3 * multiplier, 3 * multiplier);
		let splitterId =  getNodeId(await table.addSplitter());
		let AbsoluteExpense1Id = getNodeId(await table.addAbsoluteExpense(1 * multiplier, 1 * multiplier, isPeriodic, isAccumulateDebt, periodHours));
		let AbsoluteExpense2Id = getNodeId(await table.addAbsoluteExpense(2 * multiplier, 2 * multiplier, isPeriodic, isAccumulateDebt, periodHours));
		let AbsoluteExpense3Id = getNodeId(await table.addAbsoluteExpense(3 * multiplier, 3 * multiplier, isPeriodic, isAccumulateDebt, periodHours));

		// add 3 ERC20AbsoluteExpense outputs to the splitter
		await table.addChildAt(splitterId, AbsoluteExpense1Id);
		await table.addChildAt(splitterId, AbsoluteExpense2Id);
		await table.addChildAt(splitterId, AbsoluteExpense3Id);

		var id1 = await table.getChildIdAt(splitterId, 0);
		var id2 = await table.getChildIdAt(splitterId, 1);
		var id3 = await table.getChildIdAt(splitterId, 2);

		assert.equal(id1, AbsoluteExpense1Id);
		assert.equal(id2, AbsoluteExpense2Id);
		assert.equal(id3, AbsoluteExpense3Id);

		var totalNeed = await table.getTotalNeeded(6 * multiplier);
		assert.equal(totalNeed, 6 * multiplier);
		var minNeed = await table.getMinNeeded(6 * multiplier);
		assert.equal(minNeed, 6 * multiplier);
		var need1 = await table.isNeeds();
		assert.equal(need1, true);
		// now send some to the revenue endpoint
		await token.approve(table.address, 6 * multiplier, {from:creator});
		await table.processTokens(6 * multiplier, 6 * multiplier, {from: creator });
		
		// should end up in the outputs
		var absoluteExpense1Balance = await table.balanceAt(AbsoluteExpense1Id);
		assert.equal(absoluteExpense1Balance.toNumber(), 1 * multiplier, 'resource point received from splitter');

		var absoluteExpense2Balance = await table.balanceAt(AbsoluteExpense2Id);
		assert.equal(absoluteExpense2Balance.toNumber(), 2 * multiplier, 'resource point received from splitter');

		var absoluteExpense3Balance = await table.balanceAt(AbsoluteExpense3Id);
		assert.equal(absoluteExpense3Balance.toNumber(), 3 * multiplier, 'resource point received from splitter');

		assert.equal((await table.getTotalNeededAt(AbsoluteExpense1Id, 6 * multiplier)).toNumber(), 0);
		assert.equal((await table.getTotalNeededAt(AbsoluteExpense2Id, 6 * multiplier)).toNumber(), 0);
		assert.equal((await table.getTotalNeededAt(AbsoluteExpense3Id, 6 * multiplier)).toNumber(), 0);	

		var totalNeed = await table.getTotalNeeded(6 * multiplier);
		assert.equal(totalNeed.toNumber(), 0 * multiplier);
		var minNeed = await table.getMinNeeded(6 * multiplier);
		assert.equal(minNeed.toNumber(), 0 * multiplier);

		var need2 = await table.isNeeds();
		assert.equal(need2, false);

		var b1 = await token.balanceOf(accounts[9]);
		await table.flushToAt(AbsoluteExpense1Id, accounts[9], { gasPrice: 0 });
		var b2 = await token.balanceOf(accounts[9]);
		assert.equal(b2.sub(b1).toNumber(), 1 * multiplier);

		var b1 = await token.balanceOf(accounts[9]);
		await table.flushToAt(AbsoluteExpense2Id, accounts[9], { gasPrice: 0 });
		var b2 = await token.balanceOf(accounts[9]);
		assert.equal(b2.sub(b1).toNumber(), 2 * multiplier);

		var b1 = await token.balanceOf(accounts[0]);
		await table.flushAt(AbsoluteExpense3Id, { gasPrice: 0 });
		var b2 = await token.balanceOf(accounts[0]);
		assert.equal(b2.sub(b1).toNumber(), 1 * multiplier);

		var absoluteExpense1Balance = await table.balanceAt(AbsoluteExpense1Id);
		assert.equal(absoluteExpense1Balance.toNumber(), 0 * multiplier, 'resource point received from splitter');

		var absoluteExpense2Balance = await table.balanceAt(AbsoluteExpense2Id);
		assert.equal(absoluteExpense2Balance.toNumber(), 0 * multiplier, 'resource point received from splitter');

		var absoluteExpense3Balance = await table.balanceAt(AbsoluteExpense3Id);
		assert.equal(absoluteExpense3Balance.toNumber(), 0 * multiplier, 'resource point received from splitter');
		var need2 = await table.isNeeds();
	});

	it('Should process with ERC20Splitter + 3 ERC20AbsoluteExpense', async () => {
		let table = await ERC20Table.new(token.address);
		
		let unsortedSplitterId = getNodeId(await table.addSplitter());
		let AbsoluteExpense1Id = getNodeId(await table.addAbsoluteExpense(multiplier, multiplier, isPeriodic, isAccumulateDebt, periodHours));
		let AbsoluteExpense2Id = getNodeId(await table.addAbsoluteExpense(2 * multiplier, 2 * multiplier, isPeriodic, isAccumulateDebt, periodHours));
		let AbsoluteExpense3Id = getNodeId(await table.addAbsoluteExpense(3 * multiplier, 3 * multiplier, isPeriodic, isAccumulateDebt, periodHours));

		await table.addChildAt(unsortedSplitterId, AbsoluteExpense1Id);
		await table.addChildAt(unsortedSplitterId, AbsoluteExpense2Id);
		await table.addChildAt(unsortedSplitterId, AbsoluteExpense3Id);

		// now send some to the revenue endpoint
		let totalNeed = await table.getTotalNeeded(6 * multiplier);
		assert.equal(totalNeed, 6 * multiplier);
		let minNeed = await table.getMinNeeded(6 * multiplier);
		assert.equal(minNeed, 6 * multiplier);

		await token.approve(table.address, 6 * multiplier, {from:creator});
		await table.processTokens(6 * multiplier, 6 * multiplier, {from: creator });
		// should end up in the outputs
		var absoluteExpense1Balance = await table.balanceAt(AbsoluteExpense1Id);
		assert.equal(absoluteExpense1Balance.toNumber(), 1 * multiplier, 'resource point received from splitter');

		var absoluteExpense2Balance = await table.balanceAt(AbsoluteExpense2Id);
		assert.equal(absoluteExpense2Balance.toNumber(), 2 * multiplier, 'resource point received from splitter');

		var absoluteExpense3Balance = await table.balanceAt(AbsoluteExpense3Id);
		assert.equal(absoluteExpense3Balance.toNumber(), 3 * multiplier, 'resource point received from splitter');
	});

	it('Should process with a scheme just like in the paper: 75/25 others, send MORE than minNeed; ', async () => {
		var params = {token:token.address, CURRENT_INPUT:30900, multiplier:multiplier, 
			e1:1000, e2:1500, e3:800, office:500, internet:300, t1:500, t2:300, t3:1000, 
			b1:10000, b2:10000, b3:20000, reserve:750000, dividends:250000}

		let struct = await createStructureTable(params, ERC20Table);
		let splitterParams = await getSplitterParamsTable(struct, params);
		await totalAndMinNeedsAssertsTable(splitterParams, params);
		await structureAssertsTable(splitterParams);

		await token.approve(struct.table.address, params.CURRENT_INPUT * multiplier, {from:creator});
		await struct.table.processTokens(params.CURRENT_INPUT * multiplier, params.CURRENT_INPUT * multiplier, {from: creator, gasPrice: 0 });

		let balances = await getBalancesTable(struct);
		await balancesAssertsTable(balances, params);
	});

	it('Should process with a scheme just like in the paper: 75/25 others, send EQUAL to minNeed', async () => {
		var params = {token:token.address, CURRENT_INPUT:5900, multiplier:multiplier, 
			e1:1000, e2:1500, e3:800, office:500, internet:300, t1:500, t2:300, t3:1000, 
			b1:10000, b2:10000, b3:20000, reserve:750000, dividends:250000}

		let struct = await createStructureTable(params, ERC20Table);
		let splitterParams = await getSplitterParamsTable(struct, params);
		await totalAndMinNeedsAssertsTable(splitterParams, params);
		await structureAssertsTable(splitterParams);

		await token.approve(struct.table.address, params.CURRENT_INPUT * multiplier, {from:creator});
		await struct.table.processTokens(params.CURRENT_INPUT * multiplier, params.CURRENT_INPUT * multiplier, {from: creator, gasPrice: 0 });

		let balances = await getBalancesTable(struct);
		await balancesAssertsTable(balances, params);
	});

	it('Should not process multiplier: send LESS than minNeed', async () => {
		var params = {token:token.address, CURRENT_INPUT:30900, multiplier:multiplier, 
			e1:1000, e2:1500, e3:800, office:500, internet:300, t1:500, t2:300, t3:1000, 
			b1:10000, b2:10000, b3:20000, reserve:750000, dividends:250000}

		let struct = await createStructureTable(params, ERC20Table);
		let splitterParams = await getSplitterParamsTable(struct, params);
		await totalAndMinNeedsAssertsTable(splitterParams, params);
		await structureAssertsTable(splitterParams);

		await token.approve(struct.table.address, params.CURRENT_INPUT * multiplier, {from:creator});
		await struct.table.processTokens(params.CURRENT_INPUT * multiplier / 100, params.CURRENT_INPUT * multiplier, {from: creator, gasPrice: 0 }).should.be.rejectedWith('revert');
		await token.approve(struct.table.address, params.CURRENT_INPUT * multiplier / 100, {from:creator});
		await struct.table.processTokens(params.CURRENT_INPUT * multiplier, params.CURRENT_INPUT * multiplier / 100, {from: creator, gasPrice: 0 }).should.be.rejectedWith('revert');
		await token.approve(struct.table.address, params.CURRENT_INPUT * multiplier, {from:creator});
		await struct.table.processTokens(params.CURRENT_INPUT * multiplier / 100, params.CURRENT_INPUT * multiplier, {from: creator, gasPrice: 0 }).should.be.rejectedWith('revert');
	});

	it('Should process with a scheme just like in the paper: 10/15 others, send MORE than minNeed; ', async () => {
		var params = {token:token.address, CURRENT_INPUT:20900, multiplier:multiplier, 
			e1:1000, e2:1500, e3:800, office:500, internet:300, t1:500, t2:300, t3:1000, 
			b1:10000, b2:10000, b3:20000, reserve:750000, dividends:250000}

		let struct = await createStructureTable(params, ERC20Table);
		let splitterParams = await getSplitterParamsTable(struct, params);
		await totalAndMinNeedsAssertsTable(splitterParams, params);
		await structureAssertsTable(splitterParams);

		await token.approve(struct.table.address, params.CURRENT_INPUT * multiplier, {from:creator});
		await struct.table.processTokens(params.CURRENT_INPUT * multiplier, params.CURRENT_INPUT * multiplier, {from: creator, gasPrice: 0 });

		let balances = await getBalancesTable(struct);
		await balancesAssertsTable(balances, params);
	});

	it('Should process with a scheme just like in the paper: 10/15 others, send EQUAL to minNeed; ', async () => {
		var params = {token:token.address, CURRENT_INPUT:5900, multiplier:multiplier, 
			e1:1000, e2:1500, e3:800, office:500, internet:300, t1:500, t2:300, t3:1000, 
			b1:10000, b2:10000, b3:20000, reserve:750000, dividends:250000}

		let struct = await createStructureTable(params, ERC20Table);
		let splitterParams = await getSplitterParamsTable(struct, params);
		await totalAndMinNeedsAssertsTable(splitterParams, params);
		await structureAssertsTable(splitterParams);

		await token.approve(struct.table.address, params.CURRENT_INPUT * multiplier, {from:creator});
		await struct.table.processTokens(params.CURRENT_INPUT * multiplier, params.CURRENT_INPUT * multiplier, {from: creator, gasPrice: 0 });

		let balances = await getBalancesTable(struct);
		await balancesAssertsTable(balances, params);
	});

	it('Should not process multiplier: send LESS than minNeed; ', async () => {
		var params = {token:token.address, CURRENT_INPUT:30900, multiplier:multiplier, 
			e1:1000, e2:1500, e3:800, office:500, internet:300, t1:500, t2:300, t3:1000, 
			b1:10000, b2:10000, b3:20000, reserve:750000, dividends:250000}

		let struct = await createStructureTable(params, ERC20Table);
		let splitterParams = await getSplitterParamsTable(struct, params);
		await totalAndMinNeedsAssertsTable(splitterParams, params);
		await structureAssertsTable(splitterParams);

		await token.approve(struct.table.address, params.CURRENT_INPUT * multiplier, {from:creator});
		await struct.table.processTokens(params.CURRENT_INPUT * multiplier / 100, params.CURRENT_INPUT * multiplier, {from: creator, gasPrice: 0 }).should.be.rejectedWith('revert');
		await token.approve(struct.table.address, params.CURRENT_INPUT * multiplier / 100, {from:creator});
		await struct.table.processTokens(params.CURRENT_INPUT * multiplier, params.CURRENT_INPUT * multiplier / 100, {from: creator, gasPrice: 0 }).should.be.rejectedWith('revert');
		await token.approve(struct.table.address, params.CURRENT_INPUT * multiplier, {from:creator});
		await struct.table.processTokens(params.CURRENT_INPUT * multiplier / 100, params.CURRENT_INPUT * multiplier, {from: creator, gasPrice: 0 }).should.be.rejectedWith('revert');
	});

	it('Should process when opened and not process when closed with ERC20Splitter + 3 ERC20AbsoluteExpense', async () => {
		let table = await ERC20Table.new(token.address);

		let splitterId = getNodeId(await table.addSplitter());
		let AbsoluteExpense1Id = getNodeId(await table.addAbsoluteExpense(multiplier, multiplier, isPeriodic, isAccumulateDebt, periodHours));
		let AbsoluteExpense2Id = getNodeId(await table.addAbsoluteExpense(2 * multiplier, 2 * multiplier, isPeriodic, isAccumulateDebt, periodHours));
		let AbsoluteExpense3Id = getNodeId(await table.addAbsoluteExpense(3 * multiplier, 3 * multiplier, isPeriodic, isAccumulateDebt, periodHours));

		// add 3 ERC20AbsoluteExpense outputs to the splitter
		await table.addChildAt(splitterId, AbsoluteExpense1Id);
		await table.addChildAt(splitterId, AbsoluteExpense2Id);
		await table.addChildAt(splitterId, AbsoluteExpense3Id);

		var totalNeed = await table.getTotalNeeded(6 * multiplier);
		assert.equal(totalNeed, 6 * multiplier);
		var minNeed = await table.getMinNeeded(6 * multiplier);
		assert.equal(minNeed, 6 * multiplier);

		var isOpen1At = await table.isOpenAt(AbsoluteExpense1Id);
		var isOpen2At = await table.isOpenAt(AbsoluteExpense2Id);
		var isOpen3At = await table.isOpenAt(AbsoluteExpense3Id);
		assert.equal(isOpen1At, true);
		assert.equal(isOpen2At, true);
		assert.equal(isOpen3At, true);

		await table.closeAt(AbsoluteExpense3Id);

		var totalNeed = await table.getTotalNeeded(6 * multiplier);
		assert.equal(totalNeed.toNumber(), 3 * multiplier);
		var minNeed = await table.getMinNeeded(6 * multiplier);
		assert.equal(minNeed, 3 * multiplier);

		await table.closeAt(AbsoluteExpense1Id);

		var totalNeed = await table.getTotalNeeded(6 * multiplier);
		assert.equal(totalNeed, 2 * multiplier);
		var minNeed = await table.getMinNeeded(6 * multiplier);
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
		await token.approve(table.address, 5 * multiplier, {from:creator});
		await table.processTokens(5 * multiplier, 5 * multiplier, {from: creator });

		// should end up in the outputs
		var absoluteExpense1Balance = await table.balanceAt(AbsoluteExpense1Id);
		assert.equal(absoluteExpense1Balance.toNumber(), 0 * multiplier, 'resource point received from splitter');

		var absoluteExpense2Balance = await table.balanceAt(AbsoluteExpense2Id);
		assert.equal(absoluteExpense2Balance.toNumber(), 2 * multiplier, 'resource point received from splitter');

		var absoluteExpense3Balance = await table.balanceAt(AbsoluteExpense3Id);
		assert.equal(absoluteExpense3Balance.toNumber(), 3 * multiplier, 'resource point received from splitter');
	});
});
