var IReceiver = artifacts.require('./IReceiver');

var WeiSplitter = artifacts.require('./WeiSplitter');
var WeiAbsoluteExpense = artifacts.require('./WeiAbsoluteExpense');
var WeiRelativeExpense = artifacts.require('./WeiRelativeExpense');
var WeiAbsoluteExpenseWithPeriod = artifacts.require('./WeiAbsoluteExpenseWithPeriod');
var WeiRelativeExpenseWithPeriod = artifacts.require('./WeiRelativeExpenseWithPeriod');

var WeiAbsoluteExpenseWithPeriodSliding = artifacts.require('./WeiAbsoluteExpenseWithPeriodSliding');
var WeiRelativeExpenseWithPeriodSliding = artifacts.require('./WeiRelativeExpenseWithPeriodSliding');

const {checkParamsCycle, createStructure, totalAndMinNeedsAsserts, 
	getSplitterParams, structureAsserts, balancesAsserts, getBalances,
	splitterBalancesAsserts, checkNeededArrs} = require('../helpers/structures');

const {passHours} = require('../helpers/utils');

require('chai')
	.use(require('chai-as-promised'))
	.use(require('chai-bignumber')(web3.BigNumber))
	.should();

contract('WeiExpense', (accounts) => {
	var token;
	var multiplier = 1e14;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[3];

	it('Should revert when trying to add rel to abs splitter', async () => {
		var abs = await WeiAbsoluteExpense.new(1e15, 1e15);
		var splitter = await WeiSplitter.new();
		var rel = await WeiRelativeExpense.new(500000);
		await splitter.addChild(abs.address);
		await splitter.addChild(rel.address).should.be.rejectedWith('revert');
	});

	it('Should revert when trying to add rel to abs splitter', async () => {
		var abs = await WeiAbsoluteExpense.new(1e15, 1e15);
		var splitter = await WeiSplitter.new();
		var rel = await WeiRelativeExpense.new(500000);
		await splitter.addChild(abs.address);
		await splitter.addChild(rel.address).should.be.rejectedWith('revert');
	});

	it('Should process with WeiAbsoluteExpenseWithPeriod, then 25 hours, then needs again', async () => {
		var timePeriod = 25;
		var callParams = { from: creator, gasPrice: 0 };
		var struct = {};
		var balance0 = await web3.eth.getBalance(creator);

		Employee1 = await WeiAbsoluteExpenseWithPeriod.new(1000*multiplier, 1000*multiplier, timePeriod, callParams);

		await Employee1.processFunds(1000*multiplier, { value: 1000*multiplier, from: outsider, gasPrice: 0 });
		await Employee1.flush({ from: outsider }).should.be.rejectedWith('revert');
		await Employee1.flush({ from: creator, gasPrice: 0 });

		var balance = await web3.eth.getBalance(creator);
		assert.equal(balance.toNumber() - balance0.toNumber(), 1000*multiplier, 'Should get amount');

		var needsEmployee1 = await Employee1.isNeeds({ from: creator });
		assert.equal(needsEmployee1, false, 'Dont need amount, because he got it');

		await passHours(timePeriod);
		var needsEmployee2 = await Employee1.isNeeds({ from: creator });
		assert.equal(needsEmployee2, true, 'Need amount, because 24 hours passed');

		var need = await Employee1.getTotalNeeded(10000*multiplier);
		assert.equal(need.toNumber(), 1000*multiplier);

		var min = await Employee1.getMinNeeded(10000*multiplier);
		assert.equal(min.toNumber(), 1000*multiplier);

		await Employee1.processFunds(1000*multiplier, { value: 1000*multiplier, from: outsider, gasPrice: 0 });
		await Employee1.flush({ from: creator, gasPrice: 0 });

		var balance2 = await web3.eth.getBalance(creator);
		assert.equal(balance2.toNumber() - balance0.toNumber(), 2000*multiplier, 'Should get amount');

		var needsEmployee3 = await Employee1.isNeeds({ from: creator });
		assert.equal(needsEmployee3, false, 'Dont need amount, because he got it');
	});

	it('Should process with WeiAbsoluteExpenseWithPeriod, then 75 hours, then needs again x3', async () => {
		var timePeriod = 25;
		var callParams = { from: creator, gasPrice: 0 };
		var struct = {};
		var balance0 = await web3.eth.getBalance(creator);
		Employee1 = await WeiAbsoluteExpenseWithPeriodSliding.new(1000*multiplier, 1000*multiplier, timePeriod, callParams);

		await Employee1.processFunds(1000*multiplier, { value: 1000*multiplier, from: outsider, gasPrice: 0 });
		await Employee1.flush({ from: outsider }).should.be.rejectedWith('revert');
		await Employee1.flush({ from: creator, gasPrice: 0 });

		var balance = await web3.eth.getBalance(creator);

		assert.equal(balance.toNumber() - balance0.toNumber(), 1000*multiplier, 'Should get amount');

		var needsEmployee1 = await Employee1.isNeeds({ from: creator });
		assert.equal(needsEmployee1, false, 'Dont need amount, because he got it');
		var need = await Employee1.getTotalNeeded(10000*multiplier);
		assert.equal(need.toNumber(), 0);

		await passHours(1*timePeriod);
		var need = await Employee1.getTotalNeeded(10000*multiplier);
		assert.equal(need.toNumber(), 1000*multiplier);

		await passHours(1*timePeriod);
		var need = await Employee1.getTotalNeeded(10000*multiplier);
		assert.equal(need.toNumber(), 2000*multiplier);

		await passHours(1*timePeriod);
		var need = await Employee1.getTotalNeeded(10000*multiplier);
		assert.equal(need.toNumber(), 3000*multiplier);

		var needsEmployee2 = await Employee1.isNeeds({ from: creator });
		assert.equal(needsEmployee2, true, 'Need amount, because 24 hours passed');

		await Employee1.processFunds(4000*multiplier, { value: 4000*multiplier, from: outsider, gasPrice: 0 }).should.be.rejectedWith('revert');
		await Employee1.processFunds(2000*multiplier, { value: 2000*multiplier, from: outsider, gasPrice: 0 }).should.be.rejectedWith('revert');

		await Employee1.processFunds(3000*multiplier, { value: 3000*multiplier, from: outsider, gasPrice: 0 });
		await Employee1.flush({ from: creator, gasPrice: 0 });

		var balance2 = await web3.eth.getBalance(creator);
		assert.equal(balance2.toNumber() - balance0.toNumber(), 4000*multiplier, 'Should get amount');

		var needsEmployee3 = await Employee1.isNeeds({ from: creator });
		assert.equal(needsEmployee3, false, 'Dont need amount, because he got it');
	});

	it('Splitter should access then close then not accept', async () => {
		var callParams = { from: creator, gasPrice: 0 };
		var balance0 = await web3.eth.getBalance(creator);

		var tax = await WeiRelativeExpense.new(1000000, callParams);

		Splitter = await WeiSplitter.new(callParams);
		await Splitter.addChild(tax.address, callParams);

		var need1 = await Splitter.isNeeds({ from: creator });
		var totalNeed1 = await Splitter.getTotalNeeded(1000*multiplier);
		assert.equal(need1, true, 'should need amount');
		assert.equal(totalNeed1.toNumber(), 1000*multiplier, 'should be 10% of 1000 amount');

		await Splitter.close(callParams);

		var need3 = await Splitter.isNeeds({ from: creator });
		var totalNeed3 = await Splitter.getTotalNeeded(1000*multiplier);
		assert.equal(need3, false, 'should not need amount');
		assert.equal(totalNeed3.toNumber(), 0, 'should be 0 amount');

		await Splitter.processFunds(1000*multiplier, { value: 1000*multiplier, from: outsider, gasPrice: 0 }).should.be.rejectedWith('revert');
		await Splitter.open(callParams);

		var need3 = await Splitter.isNeeds({ from: creator });
		var totalNeed3 = await Splitter.getTotalNeeded(1000*multiplier);
		assert.equal(need3, true, 'should not need amount');
		assert.equal(totalNeed3.toNumber(), 1000*multiplier, 'should be 0 amount');

		await Splitter.processFunds(1000*multiplier, { value: 1000*multiplier, from: outsider, gasPrice: 0 })
	
		var taxBalance = await web3.eth.getBalance(tax.address);
		assert.equal(taxBalance.toNumber(), 1000*multiplier, 'Tax receiver should get 100 amount');
	});

	it('Should process with WeiSplitter + 3 WeiAbsoluteExpense', async () => {
		// create WeiSplitter
		var weiTopDownSplitter = await WeiSplitter.new();

		var weiAbsoluteExpense1 = await WeiAbsoluteExpense.new(1*multiplier, 1*multiplier, { from: creator, gasPrice: 0 });
		var weiAbsoluteExpense2 = await WeiAbsoluteExpense.new(2*multiplier, 2*multiplier, { from: creator, gasPrice: 0 });
		var weiAbsoluteExpense3 = await WeiAbsoluteExpense.new(3*multiplier, 3*multiplier, { from: creator, gasPrice: 0 });

		// // add 3 WeiAbsoluteExpense outputs to the splitter
		await weiTopDownSplitter.addChild(weiAbsoluteExpense1.address);
		await weiTopDownSplitter.addChild(weiAbsoluteExpense2.address);
		await weiTopDownSplitter.addChild(weiAbsoluteExpense3.address);

		// now send some to the revenue endpoint
		await weiTopDownSplitter.processFunds(6*multiplier, { value: 6*multiplier, from: creator });

		// should end up in the outputs
		var weiAbsoluteExpense1Balance = await web3.eth.getBalance(weiAbsoluteExpense1.address);
		assert.equal(weiAbsoluteExpense1Balance.toNumber(), 1*multiplier, 'resource point received from splitter');

		var weiAbsoluteExpense2Balance = await web3.eth.getBalance(weiAbsoluteExpense2.address);
		assert.equal(weiAbsoluteExpense2Balance.toNumber(), 2*multiplier, 'resource point received from splitter');

		var weiAbsoluteExpense3Balance = await web3.eth.getBalance(weiAbsoluteExpense3.address);
		assert.equal(weiAbsoluteExpense3Balance.toNumber(), 3*multiplier, 'resource point received from splitter');
	});

	it('Should process with WeiSplitter + 3 WeiAbsoluteExpense', async () => {
		// create WeiSplitter
		var weiUnsortedSplitter = await WeiSplitter.new();

		var weiAbsoluteExpense1 = await WeiAbsoluteExpense.new(1*multiplier, 1*multiplier, { from: creator, gasPrice: 0 });
		var weiAbsoluteExpense2 = await WeiAbsoluteExpense.new(2*multiplier, 2*multiplier, { from: creator, gasPrice: 0 });
		var weiAbsoluteExpense3 = await WeiAbsoluteExpense.new(3*multiplier, 3*multiplier, { from: creator, gasPrice: 0 });

		// // add 3 WeiAbsoluteExpense outputs to the splitter
		await weiUnsortedSplitter.addChild(weiAbsoluteExpense1.address);
		await weiUnsortedSplitter.addChild(weiAbsoluteExpense2.address);
		await weiUnsortedSplitter.addChild(weiAbsoluteExpense3.address);

		// now send some to the revenue endpoint
		await weiUnsortedSplitter.processFunds(6*multiplier, { value: 6*multiplier, from: creator });

		// should end up in the outputs
		var weiAbsoluteExpense1Balance = await web3.eth.getBalance(weiAbsoluteExpense1.address);
		assert.equal(weiAbsoluteExpense1Balance.toNumber(), 1*multiplier, 'resource point received from splitter');

		var weiAbsoluteExpense2Balance = await web3.eth.getBalance(weiAbsoluteExpense2.address);
		assert.equal(weiAbsoluteExpense2Balance.toNumber(), 2*multiplier, 'resource point received from splitter');

		var weiAbsoluteExpense3Balance = await web3.eth.getBalance(weiAbsoluteExpense3.address);
		assert.equal(weiAbsoluteExpense3Balance.toNumber(), 3*multiplier, 'resource point received from splitter');
	});

	it('Should process in structure o-> o-> o-o-o', async () => {
		var AllOutputs = await WeiSplitter.new({ from: creator, gasPrice: 0 });
		var Salaries = await WeiSplitter.new({ from: creator, gasPrice: 0 });

		var Employee1 = await WeiAbsoluteExpense.new(1000*multiplier, 1000*multiplier, { from: creator, gasPrice: 0 });
		var Employee2 = await WeiAbsoluteExpense.new(1500*multiplier, 1500*multiplier, { from: creator, gasPrice: 0 });
		var Employee3 = await WeiAbsoluteExpense.new(800*multiplier, 800*multiplier, { from: creator, gasPrice: 0 });

		await AllOutputs.addChild(Salaries.address, { from: creator, gasPrice: 0 });

		await Salaries.addChild(Employee1.address, { from: creator, gasPrice: 0 });
		await Salaries.addChild(Employee2.address, { from: creator, gasPrice: 0 });
		await Salaries.addChild(Employee3.address, { from: creator, gasPrice: 0 });

		var Employee1Needs = await Employee1.getTotalNeeded(3300*multiplier);
		assert.equal(Employee1Needs.toNumber() / multiplier, 1000, 'Employee1 Needs 1000 amount');
		var Employee2Needs = await Employee2.getTotalNeeded(3300*multiplier);
		assert.equal(Employee2Needs.toNumber() / multiplier, 1500, 'Employee1 Needs 1500 amount');
		var Employee3Needs = await Employee3.getTotalNeeded(3300*multiplier);
		assert.equal(Employee3Needs.toNumber() / multiplier, 800, 'Employee1 Needs 800 amount');

		var SalariesNeeds = await Salaries.getTotalNeeded(3300*multiplier);
		assert.equal(SalariesNeeds.toNumber() / multiplier, 3300, 'Salaries Needs 3300 amount');

		var SalariesMinNeeds = await Salaries.getMinNeeded(3300*multiplier);
		assert.equal(SalariesNeeds.toNumber() / multiplier, 3300, 'Salaries min Needs 3300 amount');

		var AllOutputsNeeds = await AllOutputs.getTotalNeeded(3300*multiplier);
		assert.equal(AllOutputsNeeds.toNumber() / multiplier, 3300, 'AllOutputs Needs 3300 amount');
		var MinOutpultsNeeds = await AllOutputs.getMinNeeded(3300*multiplier);
		assert.equal(AllOutputsNeeds.toNumber() / multiplier, 3300, 'AllOutputs Needs min 3300 amount');
		var OutputChildrenCount = await AllOutputs.getChildrenCount();
		assert.equal(OutputChildrenCount.toNumber(), 1, 'OutputChildrenCount should be 1');
		var SalariesChildrenCount = await Salaries.getChildrenCount();
		assert.equal(SalariesChildrenCount.toNumber(), 3, 'SalariesChildrenCount should be 3');

		var th = await Salaries.processFunds(3300*multiplier, { value: 3300*multiplier, from: creator, gasPrice: 0 });
	});

	it('Should process in structure o-> o-o-o, while minAmount != totalAmount', async () => {
		var Salaries = await WeiSplitter.new({ from: creator, gasPrice: 0 });

		var Employee1 = await WeiAbsoluteExpense.new(1000*multiplier, 500*multiplier, { from: creator, gasPrice: 0 });
		var Employee2 = await WeiAbsoluteExpense.new(800*multiplier, 200*multiplier, { from: creator, gasPrice: 0 });
		var Employee3 = await WeiAbsoluteExpense.new(1500*multiplier, 500*multiplier, { from: creator, gasPrice: 0 });

		await Salaries.addChild(Employee1.address, { from: creator, gasPrice: 0 });
		await Salaries.addChild(Employee2.address, { from: creator, gasPrice: 0 });
		await Salaries.addChild(Employee3.address, { from: creator, gasPrice: 0 });

		var Employee1Needs = await Employee1.getTotalNeeded(3300*multiplier);
		assert.equal(Employee1Needs.toNumber() / multiplier, 1000);
		var Employee2Needs = await Employee2.getTotalNeeded(3300*multiplier);
		assert.equal(Employee2Needs.toNumber() / multiplier, 800);
		var Employee3Needs = await Employee3.getTotalNeeded(3300*multiplier);
		assert.equal(Employee3Needs.toNumber() / multiplier, 1500);

		var SalariesNeeds = await Salaries.getTotalNeeded(3300*multiplier);
		assert.equal(SalariesNeeds.toNumber() / multiplier, 3300, 'Salaries Needs 3300 amount');
		await checkNeededArrs(Salaries, multiplier, 
			[100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000, 3100, 3200, 3300, 3400, 3500],
			[0,   200, 200, 400, 500, 500, 700, 700, 900, 1000, 1000, 1200, 1200, 1400, 1400, 1600, 1600, 1800, 1800, 1800, 1800, 1800, 2300, 2300, 2300, 2300, 2300, 2800, 2800, 2800, 2800, 2800, 3300, 3300, 3300]
		);

		var th = await Salaries.processFunds(700*multiplier, { value:700*multiplier, from: creator, gasPrice: 0 }); 
		await checkNeededArrs(Salaries, multiplier, 
			[100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000, 3100, 3200, 3300, 3400, 3500],
			[0,   200, 200, 400, 500, 500, 700, 700, 900, 900,  1100, 1100, 1100, 1100, 1100, 1600, 1600, 1600, 1600, 1600, 2100, 2100, 2100, 2100, 2100, 2600, 2600, 2600, 2600, 2600, 2600, 2600, 2600, 2600, 2600]
		);

		var th = await Salaries.processFunds(900*multiplier, { value:900*multiplier, from: creator, gasPrice: 0 });
		await checkNeededArrs(Salaries, multiplier, 
			[100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000, 3100, 3200, 3300, 3400, 3500],
			[0,   200, 200, 200, 200, 200, 700, 700, 700, 700,  700,  1200, 1200, 1200, 1200, 1200, 1700, 1700, 1700, 1700, 1700, 1700, 1700, 1700, 1700, 1700, 1700, 1700, 1700, 1700, 1700, 1700, 1700, 1700, 1700]
		)

		var th = await Salaries.processFunds(200*multiplier, { value:200*multiplier, from: creator, gasPrice: 0 });
		var th = await Salaries.processFunds(1500*multiplier, { value:1500*multiplier, from: creator, gasPrice: 0 });
		var th = await Salaries.processFunds(200*multiplier, { value:200*multiplier, from: creator, gasPrice: 0 }).should.be.rejectedWith('revert');
	});

	it('Should process with a scheme just like in the paper: 75/25 others, send MORE than minNeed; ', async () => {
		var params = {CURRENT_INPUT:30900, multiplier:multiplier, 
			e1:1000, e2:1500, e3:800, office:500, internet:300, t1:500, t2:300, t3:1000, 
			b1:10000, b2:10000, b3:20000, reserve:750000, dividends:250000}

		var struct = await createStructure(params, WeiAbsoluteExpense, WeiRelativeExpense, WeiSplitter);

		var splitterParams = await getSplitterParams(struct, params);

		await totalAndMinNeedsAsserts(splitterParams, params);
		await structureAsserts(splitterParams);

		await struct.AllOutputs.processFunds(params.CURRENT_INPUT*multiplier, { value: params.CURRENT_INPUT*multiplier, from: creator, gasPrice: 0 });

		var balances = await getBalances(struct, web3.eth.getBalance);
		await balancesAsserts(balances, params);
		await splitterBalancesAsserts(balances);
	});

	it('Should process with a scheme just like in the paper: 75/25 others, send EQUAL to minNeed', async () => {
		var params = {CURRENT_INPUT:5900, multiplier:multiplier, 
			e1:1000, e2:1500, e3:800, office:500, internet:300, t1:500, t2:300, t3:1000, 
			b1:10000, b2:10000, b3:20000, reserve:750000, dividends:250000}

		var struct = await createStructure(params, WeiAbsoluteExpense, WeiRelativeExpense, WeiSplitter);
		var splitterParams = await getSplitterParams(struct, params);

		await totalAndMinNeedsAsserts(splitterParams, params);
		await structureAsserts(splitterParams);

		await struct.AllOutputs.processFunds(params.CURRENT_INPUT*multiplier, { value: params.CURRENT_INPUT*multiplier, from: creator, gasPrice: 0 });

		var balances = await getBalances(struct, web3.eth.getBalance);
		await balancesAsserts(balances, params);
		await splitterBalancesAsserts(balances);
	});

	it('Should not process multiplier: send LESS than minNeed', async () => {
		var params = {CURRENT_INPUT:5900, multiplier:multiplier, 
			e1:1000, e2:1500, e3:800, office:500, internet:300, t1:500, t2:300, t3:1000, 
			b1:10000, b2:10000, b3:20000, reserve:750000, dividends:250000}

		var struct = await createStructure(params, WeiAbsoluteExpense, WeiRelativeExpense, WeiSplitter);
		var splitterParams = await getSplitterParams(struct, params);
		await totalAndMinNeedsAsserts(splitterParams, params);
		await structureAsserts(splitterParams);

		await struct.AllOutputs.processFunds(1000*multiplier, { value: 1000*multiplier, from: creator }).should.be.rejectedWith('revert');
		await struct.AllOutputs.processFunds(1000000*multiplier, { value: 1000*multiplier, from: creator }).should.be.rejectedWith('revert');
		await struct.AllOutputs.processFunds(1000*multiplier, { value: 1000000*multiplier, from: creator }).should.be.rejectedWith('revert');
	});

	it('Should process with a scheme just like in the paper: 10/15 others, send MORE than minNeed; ', async () => {
		var params = {CURRENT_INPUT:20900, multiplier:multiplier, 
			e1:1000, e2:1500, e3:800, office:500, internet:300, t1:500, t2:300, t3:1000, 
			b1:10000, b2:10000, b3:20000, reserve:850000, dividends:150000}

		var struct = await createStructure(params, WeiAbsoluteExpense, WeiRelativeExpense, WeiSplitter);
		var splitterParams = await getSplitterParams(struct, params);
		await totalAndMinNeedsAsserts(splitterParams, params);
		await structureAsserts(splitterParams);

		await struct.AllOutputs.processFunds(params.CURRENT_INPUT*multiplier, { value: params.CURRENT_INPUT*multiplier, from: creator, gasPrice: 0 });

		var balances = await getBalances(struct, web3.eth.getBalance);
		await balancesAsserts(balances, params);
		await splitterBalancesAsserts(balances);
	});

	it('Should NOT process (splitter can not accumulate amount) with a scheme just like in the paper: 10/15 others, send MORE than minNeed; ', async () => {
		var params = {CURRENT_INPUT:20900, multiplier:multiplier, 
			e1:1000, e2:1500, e3:800, office:500, internet:300, t1:500, t2:300, t3:1000, 
			b1:10000, b2:10000, b3:20000, reserve:100000, dividends:150000}

		var struct = await createStructure(params, WeiAbsoluteExpense, WeiRelativeExpense, WeiSplitter);
		var splitterParams = await getSplitterParams(struct, params);
		await totalAndMinNeedsAsserts(splitterParams, params);
		await structureAsserts(splitterParams);

		await struct.AllOutputs.processFunds(params.CURRENT_INPUT*multiplier, { value: params.CURRENT_INPUT*multiplier, from: creator, gasPrice: 0 }).should.be.rejectedWith('revert');
	});

	it('Should process with a scheme just like in the paper: 10/15 others, send EQUAL to minNeed; ', async () => {
		var params = {CURRENT_INPUT:5900, multiplier:multiplier, 
			e1:1000, e2:1500, e3:800, office:500, internet:300, t1:500, t2:300, t3:1000, 
			b1:10000, b2:10000, b3:20000, reserve:100000, dividends:150000}

		var struct = await createStructure(params, WeiAbsoluteExpense, WeiRelativeExpense, WeiSplitter);
		var splitterParams = await getSplitterParams(struct, params);
		await totalAndMinNeedsAsserts(splitterParams, params);
		await structureAsserts(splitterParams);

		await struct.AllOutputs.processFunds(params.CURRENT_INPUT*multiplier, { value: params.CURRENT_INPUT*multiplier, from: creator, gasPrice: 0 });

		var balances = await getBalances(struct, web3.eth.getBalance);
		await balancesAsserts(balances, params);
		await splitterBalancesAsserts(balances);
	});

	it('Should not process multiplier: send LESS than minNeed; ', async () => {
		var params = {CURRENT_INPUT:20900, multiplier:multiplier, 
			e1:1000, e2:1500, e3:800, office:500, internet:300, t1:500, t2:300, t3:1000, 
			b1:10000, b2:10000, b3:20000, reserve:850000, dividends:150000}

		var struct = await createStructure(params, WeiAbsoluteExpense, WeiRelativeExpense, WeiSplitter);
		var splitterParams = await getSplitterParams(struct, params);
		await totalAndMinNeedsAsserts(splitterParams, params);
		await structureAsserts(splitterParams);

		await struct.AllOutputs.processFunds(1000*multiplier, { value: 1000*multiplier, from: creator }).should.be.rejectedWith('revert');
		await struct.AllOutputs.processFunds(1000000*multiplier, { value: 1000*multiplier, from: creator }).should.be.rejectedWith('revert');
		await struct.AllOutputs.processFunds(1000*multiplier, { value: 1000000*multiplier, from: creator }).should.be.rejectedWith('revert');
	});

	it('Should process with WeiSplitter + 3 WeiRelativeExpenseWithPeriod', async () => {
		// create WeiSplitter
		var splitter = await WeiSplitter.new();

		var rel1 = await WeiRelativeExpenseWithPeriod.new(100000, 24, { from: creator, gasPrice: 0 });
		var rel2 = await WeiRelativeExpenseWithPeriod.new(250000, 24, { from: creator, gasPrice: 0 });
		var rel3 = await WeiRelativeExpenseWithPeriod.new(370000, 48, { from: creator, gasPrice: 0 });

		// // add 3 rel expense outputs to the splitter
		await splitter.addChild(rel1.address);
		await splitter.addChild(rel2.address);
		await splitter.addChild(rel3.address);
		
		var targets = [splitter, rel1, rel2, rel3];
		var flowArr = [1000, 1000, 1000, 1000];
		await checkParamsCycle(targets, flowArr, [0, 0, 0, 0], [720, 100, 250, 370], [true, true, true, true]);

		// now send some to the revenue endpoint
		await splitter.processFunds(1000*multiplier, {value:720*multiplier, from: creator});

		assert.equal((await web3.eth.getBalance(rel1.address)).toNumber(), 100*multiplier);
		assert.equal((await web3.eth.getBalance(rel2.address)).toNumber(), 250*multiplier);
		assert.equal((await web3.eth.getBalance(rel3.address)).toNumber(), 370*multiplier);
		await checkParamsCycle(targets, flowArr, [0, 0, 0, 0], [0, 0, 0, 0],  [false, false, false, false]);

		await passHours(24);
		await checkParamsCycle(targets, flowArr, [0, 0, 0, 0], [350, 100, 250, 0], [true, true, true, false]);

		await passHours(24);
		await checkParamsCycle(targets, flowArr, [0, 0, 0, 0], [720, 100, 250, 370], [true, true, true, true]);

		await splitter.processFunds(1000*multiplier, { value: 720*multiplier, from: creator });
		await checkParamsCycle(targets, flowArr, [0, 0, 0, 0], [0, 0, 0, 0],  [false, false, false, false]);

		// should end up in the outputs
		assert.equal((await web3.eth.getBalance(rel1.address)).toNumber(), 200*multiplier);
		assert.equal((await web3.eth.getBalance(rel2.address)).toNumber(), 500*multiplier);
		assert.equal((await web3.eth.getBalance(rel3.address)).toNumber(), 740*multiplier);

		await passHours(24);	
		await checkParamsCycle(targets, flowArr, [0, 0, 0, 0], [350, 100, 250, 0], [true, true, true, false]);

		await splitter.processFunds(1000*multiplier, { value: 350*multiplier, from: creator });	
		await checkParamsCycle(targets, flowArr, [0, 0, 0, 0], [0, 0, 0, 0],  [false, false, false, false]);		
	});	
});