var IReceiver = artifacts.require('./IReceiver');

var StandardToken = artifacts.require('./ERC20Token');

var ERC20Splitter = artifacts.require('./ERC20Splitter');
var ERC20AbsoluteExpense = artifacts.require('./ERC20AbsoluteExpense');
var ERC20RelativeExpense = artifacts.require('./ERC20RelativeExpense');
var ERC20AbsoluteExpenseWithPeriod = artifacts.require('./ERC20AbsoluteExpenseWithPeriod');
var ERC20RelativeExpenseWithPeriod = artifacts.require('./ERC20RelativeExpenseWithPeriod');

var ERC20AbsoluteExpenseWithPeriodSliding = artifacts.require('./ERC20AbsoluteExpenseWithPeriodSliding');
var ERC20RelativeExpenseWithPeriodSliding = artifacts.require('./ERC20RelativeExpenseWithPeriodSliding');

require('chai')
	.use(require('chai-as-promised'))
	.use(require('chai-bignumber')(web3.BigNumber))
	.should();

const {checkParamsCycle, createStructure, totalAndMinNeedsAsserts, 
	getSplitterParams, structureAsserts, balancesAsserts, getBalances,
	splitterBalancesAsserts, checkNeededArrs} = require('../helpers/structures');

const {passHours} = require('../helpers/utils');

contract('ERC20Expense', (accounts) => {
	var token;
	var multiplier = 1e10;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[3];

	beforeEach(async () => {
		token = await StandardToken.new();
		for(var i=0; i<10; i++) {
			await token.mint(accounts[i], 1e15);
		}		
	});

	it('Should revert when trying to add rel to abs splitter', async () => {
		var abs = await ERC20AbsoluteExpense.new(token.address,1e15, 1e15);
		var splitter = await ERC20Splitter.new(token.address);
		var rel = await ERC20RelativeExpense.new(token.address,500000);
		await splitter.addChild(abs.address);
		await splitter.addChild(rel.address).should.be.rejectedWith('revert');
	});

	it('Should process amount with ERC20AbsoluteExpenseWithPeriod, then 25 hours, then amount needs again', async () => {
		var timePeriod = 25;
		var callParams = { from: creator, gasPrice: 0 };
		var struct = {};
		var balance0 = await token.balanceOf(creator);

		Employee1 = await ERC20AbsoluteExpenseWithPeriod.new(token.address,1000*multiplier, 1000*multiplier, timePeriod, callParams);

		await token.approve(Employee1.address, 1000*multiplier, {from:outsider});
		await Employee1.processTokens(1000*multiplier, 1000*multiplier, {from: outsider, gasPrice: 0 });
		await Employee1.flush({ from: outsider }).should.be.rejectedWith('revert');
		await Employee1.flush({ from: creator, gasPrice: 0 });

		var balance = await token.balanceOf(creator);
		assert.equal((new web3.BigNumber(balance).sub(balance0)).toNumber(), 1000*multiplier, 'Should get amount');

		var needsEmployee1 = await Employee1.isNeeds({ from: creator });
		assert.equal(needsEmployee1, false, 'Dont need amount, because he got it');

		await passHours(timePeriod);
		var needsEmployee2 = await Employee1.isNeeds({ from: creator });
		assert.equal(needsEmployee2, true, 'Need amount, because 24 hours passed');

		var need = await Employee1.getTotalNeeded(10000*multiplier);
		assert.equal(need.toNumber(), 1000*multiplier);

		var min = await Employee1.getMinNeeded(10000*multiplier);
		assert.equal(min.toNumber(), 1000*multiplier);

		await token.approve(Employee1.address, 1000*multiplier, {from:outsider});
		await Employee1.processTokens(1000*multiplier, 1000*multiplier, {from: outsider, gasPrice: 0 });
		await Employee1.flush({ from: creator, gasPrice: 0 });

		var balance2 = await token.balanceOf(creator);
		assert.equal((new web3.BigNumber(balance2).sub(balance0)).toNumber(), 2000*multiplier, 'Should get amount');

		var needsEmployee3 = await Employee1.isNeeds({ from: creator });
		assert.equal(needsEmployee3, false, 'Dont need amount, because he got it');
	});

	it('Should process amount with ERC20AbsoluteExpenseWithPeriod, then 75 hours, then amount needs again x3', async () => {
		var timePeriod = 25;
		var callParams = { from: creator, gasPrice: 0 };
		var struct = {};
		var balance0 = await token.balanceOf(creator);
		Employee1 = await ERC20AbsoluteExpenseWithPeriodSliding.new(token.address,1000*multiplier, 1000*multiplier, timePeriod, callParams);

		await token.approve(Employee1.address, 1000*multiplier, {from:outsider});

		await Employee1.processTokens(1000*multiplier, 1000*multiplier, {from: outsider, gasPrice: 0 });

		await Employee1.flush({ from: outsider }).should.be.rejectedWith('revert');
		await Employee1.flush({ from: creator, gasPrice: 0 });

		var balance = await token.balanceOf(creator);

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

		await token.approve(Employee1.address, 4000*multiplier, {from:outsider});
		await Employee1.processTokens(4000*multiplier, 4000*multiplier, {from: outsider, gasPrice: 0 }).should.be.rejectedWith('revert');
		await token.approve(Employee1.address, 2000*multiplier, {from:outsider});
		await Employee1.processTokens(2000*multiplier, 2000*multiplier, {from: outsider, gasPrice: 0 }).should.be.rejectedWith('revert');

		await token.approve(Employee1.address, 3000*multiplier, {from:outsider});
		await Employee1.processTokens(3000*multiplier, 3000*multiplier, {from: outsider, gasPrice: 0 });
		await Employee1.flush({ from: creator, gasPrice: 0 });

		var balance2 = await token.balanceOf(creator);
		assert.equal(balance2.toNumber() - balance0.toNumber(), 4000*multiplier, 'Should get amount');

		var needsEmployee3 = await Employee1.isNeeds({ from: creator });
		assert.equal(needsEmployee3, false, 'Dont need amount, because he got it');
	});

	it('Splitter should access amount then close then not accept', async () => {
		var callParams = { from: creator, gasPrice: 0 };
		var balance0 = await token.balanceOf(creator);

		var tax = await ERC20RelativeExpense.new(token.address,1000000, callParams);

		Splitter = await ERC20Splitter.new(token.address,callParams);
		await Splitter.addChild(tax.address, callParams);

		var need1 = await Splitter.isNeeds({ from: creator });
		var totalNeed1 = await Splitter.getTotalNeeded(1000*multiplier);
		assert.equal(need1, true, 'Should need amount');
		assert.equal(totalNeed1.toNumber(), 1000*multiplier, 'Should be 10% of 1000 amount');

		await Splitter.close(callParams);

		var need3 = await Splitter.isNeeds({ from: creator });
		var totalNeed3 = await Splitter.getTotalNeeded(1000*multiplier);
		assert.equal(need3, false, 'Should not need amount');
		assert.equal(totalNeed3.toNumber(), 0, 'Should be 0 amount');

		await token.approve(Splitter.address, 1000*multiplier, {from:outsider});
		await Splitter.processTokens(1000*multiplier, 1000*multiplier, {from: outsider, gasPrice: 0 }).should.be.rejectedWith('revert');
		await Splitter.open(callParams);

		var need3 = await Splitter.isNeeds({ from: creator });
		var totalNeed3 = await Splitter.getTotalNeeded(1000*multiplier);
		assert.equal(need3, true, 'Should not need amount');
		assert.equal(totalNeed3.toNumber(), 1000*multiplier, 'Should be 0 amount');

		await token.approve(Splitter.address, 1000*multiplier, {from:outsider});
		await Splitter.processTokens(1000*multiplier, 1000*multiplier, {from: outsider, gasPrice: 0 })
	
		var taxBalance = await token.balanceOf(tax.address);
		assert.equal(taxBalance.toNumber(), 1000*multiplier, 'Tax receiver should get 100 amount');

	});

	it('Should process amount with ERC20Splitter + 3 ERC20AbsoluteExpense', async () => {
		// create ERC20Splitter
		var erc20TopDownSplitter = await ERC20Splitter.new(token.address);

		var erc20AbsoluteExpense1 = await ERC20AbsoluteExpense.new(token.address,1*multiplier, 1*multiplier, { from: creator, gasPrice: 0 });
		var erc20AbsoluteExpense2 = await ERC20AbsoluteExpense.new(token.address,2*multiplier, 2*multiplier, { from: creator, gasPrice: 0 });
		var erc20AbsoluteExpense3 = await ERC20AbsoluteExpense.new(token.address,3*multiplier, 3*multiplier, { from: creator, gasPrice: 0 });

		// // add 3 ERC20AbsoluteExpense outputs to the splitter
		await erc20TopDownSplitter.addChild(erc20AbsoluteExpense1.address);
		await erc20TopDownSplitter.addChild(erc20AbsoluteExpense2.address);
		await erc20TopDownSplitter.addChild(erc20AbsoluteExpense3.address);

		// now send some amount to the revenue endpoint
		await token.approve(erc20TopDownSplitter.address, 6*multiplier, {from:creator});
		await erc20TopDownSplitter.processTokens(6*multiplier, 6*multiplier, {from: creator });

		// multiplier should end up in the outputs
		var erc20AbsoluteExpense1Balance = await token.balanceOf(erc20AbsoluteExpense1.address);
		assert.equal(erc20AbsoluteExpense1Balance.toNumber(), 1*multiplier, 'resource point received amount from splitter');

		var erc20AbsoluteExpense2Balance = await token.balanceOf(erc20AbsoluteExpense2.address);
		assert.equal(erc20AbsoluteExpense2Balance.toNumber(), 2*multiplier, 'resource point received amount from splitter');

		var erc20AbsoluteExpense3Balance = await token.balanceOf(erc20AbsoluteExpense3.address);
		assert.equal(erc20AbsoluteExpense3Balance.toNumber(), 3*multiplier, 'resource point received amount from splitter');
	});

	it('Should process amount with ERC20Splitter + 3 ERC20AbsoluteExpense', async () => {
		// create ERC20Splitter
		var erc20UnsortedSplitter = await ERC20Splitter.new(token.address);

		var erc20AbsoluteExpense1 = await ERC20AbsoluteExpense.new(token.address,1*multiplier, 1*multiplier, { from: creator, gasPrice: 0 });
		var erc20AbsoluteExpense2 = await ERC20AbsoluteExpense.new(token.address,2*multiplier, 2*multiplier, { from: creator, gasPrice: 0 });
		var erc20AbsoluteExpense3 = await ERC20AbsoluteExpense.new(token.address,3*multiplier, 3*multiplier, { from: creator, gasPrice: 0 });

		// // add 3 ERC20AbsoluteExpense outputs to the splitter
		await erc20UnsortedSplitter.addChild(erc20AbsoluteExpense1.address);
		await erc20UnsortedSplitter.addChild(erc20AbsoluteExpense2.address);
		await erc20UnsortedSplitter.addChild(erc20AbsoluteExpense3.address);

		// now send some amount to the revenue endpoint
		await token.approve(erc20UnsortedSplitter.address, 6*multiplier, {from:creator});
		await erc20UnsortedSplitter.processTokens(6*multiplier, 6*multiplier, {from: creator });

		// multiplier should end up in the outputs
		var erc20AbsoluteExpense1Balance = await token.balanceOf(erc20AbsoluteExpense1.address);
		assert.equal(erc20AbsoluteExpense1Balance.toNumber(), 1*multiplier, 'resource point received amount from splitter');

		var erc20AbsoluteExpense2Balance = await token.balanceOf(erc20AbsoluteExpense2.address);
		assert.equal(erc20AbsoluteExpense2Balance.toNumber(), 2*multiplier, 'resource point received amount from splitter');

		var erc20AbsoluteExpense3Balance = await token.balanceOf(erc20AbsoluteExpense3.address);
		assert.equal(erc20AbsoluteExpense3Balance.toNumber(), 3*multiplier, 'resource point received amount from splitter');
	});

	it('Should process amount in structure o-> o-> o-o-o', async () => {
		var AllOutputs = await ERC20Splitter.new(token.address,{ from: creator, gasPrice: 0 });
		var Salaries = await ERC20Splitter.new(token.address,{ from: creator, gasPrice: 0 });

		var Employee1 = await ERC20AbsoluteExpense.new(token.address,1000*multiplier, 1000*multiplier, { from: creator, gasPrice: 0 });
		var Employee2 = await ERC20AbsoluteExpense.new(token.address,1500*multiplier, 1500*multiplier, { from: creator, gasPrice: 0 });
		var Employee3 = await ERC20AbsoluteExpense.new(token.address,800*multiplier, 800*multiplier, { from: creator, gasPrice: 0 });

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

		var th = await token.approve(Salaries.address, 3300*multiplier, {from:creator});
		await Salaries.processTokens(3300*multiplier, 3300*multiplier, {from: creator, gasPrice: 0 });
	});

	it('Should process amount in structure o-> o-o-o, while minAmount != totalAmount', async () => {
		var Salaries = await ERC20Splitter.new(token.address,{ from: creator, gasPrice: 0 });

		var Employee1 = await ERC20AbsoluteExpense.new(token.address,1000*multiplier, 500*multiplier, { from: creator, gasPrice: 0 });
		var Employee2 = await ERC20AbsoluteExpense.new(token.address,800*multiplier, 200*multiplier, { from: creator, gasPrice: 0 });
		var Employee3 = await ERC20AbsoluteExpense.new(token.address,1500*multiplier, 500*multiplier, { from: creator, gasPrice: 0 });

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

		var th = await token.approve(Salaries.address, 700*multiplier, {from:creator});
		await Salaries.processTokens(700*multiplier, 700*multiplier, {from: creator, gasPrice: 0 });
		await checkNeededArrs(Salaries, multiplier, 
			[100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000, 3100, 3200, 3300, 3400, 3500],
			[0,   200, 200, 400, 500, 500, 700, 700, 900, 900,  1100, 1100, 1100, 1100, 1100, 1600, 1600, 1600, 1600, 1600, 2100, 2100, 2100, 2100, 2100, 2600, 2600, 2600, 2600, 2600, 2600, 2600, 2600, 2600, 2600]
		);

		var th = await token.approve(Salaries.address, 900*multiplier, {from:creator});
		await Salaries.processTokens(900*multiplier, 900*multiplier, {from: creator, gasPrice: 0 });
		await checkNeededArrs(Salaries, multiplier, 
			[100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000, 3100, 3200, 3300, 3400, 3500],
			[0,   200, 200, 200, 200, 200, 700, 700, 700, 700,  700,  1200, 1200, 1200, 1200, 1200, 1700, 1700, 1700, 1700, 1700, 1700, 1700, 1700, 1700, 1700, 1700, 1700, 1700, 1700, 1700, 1700, 1700, 1700, 1700]
		)

		var th = await token.approve(Salaries.address, 200*multiplier, {from:creator});
		await Salaries.processTokens(200*multiplier, 200*multiplier, {from: creator, gasPrice: 0 });
		var th = await token.approve(Salaries.address, 1500*multiplier, {from:creator});
		await Salaries.processTokens(1500*multiplier, 1500*multiplier, {from: creator, gasPrice: 0 });
		var th = await token.approve(Salaries.address, 200*multiplier, {from:creator});
		await Salaries.processTokens(200*multiplier, 200*multiplier, {from: creator, gasPrice: 0 }).should.be.rejectedWith('revert');
	});

	it('Should process amount with a scheme just like in the paper: 75/25 others, send MORE than minNeed; ', async () => {
		var params = {token:token.address, CURRENT_INPUT:30900, multiplier:multiplier, 
			e1:1000, e2:1500, e3:800, office:500, internet:300, t1:500, t2:300, t3:1000, 
			b1:10000, b2:10000, b3:20000, reserve:750000, dividends:250000}

		var struct = await createStructure(params, ERC20AbsoluteExpense, ERC20RelativeExpense, ERC20Splitter);

		var splitterParams = await getSplitterParams(struct, params);

		await totalAndMinNeedsAsserts(splitterParams, params);
		await structureAsserts(splitterParams);

		await token.approve(struct.AllOutputs.address, params.CURRENT_INPUT*multiplier, {from:creator});
		await struct.AllOutputs.processTokens(params.CURRENT_INPUT*multiplier, params.CURRENT_INPUT*multiplier, {from: creator, gasPrice: 0 });

		var balances = await getBalances(struct, token.balanceOf);
		await balancesAsserts(balances, params);
		await splitterBalancesAsserts(balances);
	});

	it('Should process amount with a scheme just like in the paper: 75/25 others, send EQUAL to minNeed', async () => {
		var params = {token:token.address, CURRENT_INPUT:5900, multiplier:multiplier, 
			e1:1000, e2:1500, e3:800, office:500, internet:300, t1:500, t2:300, t3:1000, 
			b1:10000, b2:10000, b3:20000, reserve:750000, dividends:250000}

		var struct = await createStructure(params, ERC20AbsoluteExpense, ERC20RelativeExpense, ERC20Splitter);
		var splitterParams = await getSplitterParams(struct, params);

		await totalAndMinNeedsAsserts(splitterParams, params);
		await structureAsserts(splitterParams);
		await token.approve(struct.AllOutputs.address, params.CURRENT_INPUT*multiplier, {from:creator});
		await struct.AllOutputs.processTokens(params.CURRENT_INPUT*multiplier, params.CURRENT_INPUT*multiplier, {from: creator, gasPrice: 0 });

		var balances = await getBalances(struct, token.balanceOf);
		await balancesAsserts(balances, params);
		await splitterBalancesAsserts(balances);
	});

	it('Should not process multiplier: send LESS than minNeed', async () => {
		var params = {token:token.address, CURRENT_INPUT:5900, multiplier:multiplier, 
			e1:1000, e2:1500, e3:800, office:500, internet:300, t1:500, t2:300, t3:1000, 
			b1:10000, b2:10000, b3:20000, reserve:750000, dividends:250000}

		var struct = await createStructure(params, ERC20AbsoluteExpense, ERC20RelativeExpense, ERC20Splitter);
		var splitterParams = await getSplitterParams(struct, params);
		await totalAndMinNeedsAsserts(splitterParams, params);
		await structureAsserts(splitterParams);

		await token.approve(struct.AllOutputs.address, 1000*multiplier, {from:creator});
		await struct.AllOutputs.processTokens(1000*multiplier, 1000*multiplier, {from: creator }).should.be.rejectedWith('revert');
		await token.approve(struct.AllOutputs.address, 1000*multiplier, {from:creator});
		await struct.AllOutputs.processTokens(1000000*multiplier, 1000*multiplier, {from: creator }).should.be.rejectedWith('revert');
		await token.approve(struct.AllOutputs.address, 1000000*multiplier, {from:creator});
		await struct.AllOutputs.processTokens(1000*multiplier, 1000000*multiplier, {from: creator }).should.be.rejectedWith('revert');
	});

	it('Should process amount with a scheme just like in the paper: 10/15 others, send MORE than minNeed; ', async () => {
		var params = {token:token.address, CURRENT_INPUT:20900, multiplier:multiplier, 
			e1:1000, e2:1500, e3:800, office:500, internet:300, t1:500, t2:300, t3:1000, 
			b1:10000, b2:10000, b3:20000, reserve:850000, dividends:150000}

		var struct = await createStructure(params, ERC20AbsoluteExpense, ERC20RelativeExpense, ERC20Splitter);
		var splitterParams = await getSplitterParams(struct, params);
		await totalAndMinNeedsAsserts(splitterParams, params);
		await structureAsserts(splitterParams);

		await token.approve(struct.AllOutputs.address, params.CURRENT_INPUT*multiplier, {from:creator});
		await struct.AllOutputs.processTokens(params.CURRENT_INPUT*multiplier, params.CURRENT_INPUT*multiplier, {from: creator, gasPrice: 0 });

		var balances = await getBalances(struct, token.balanceOf);
		await balancesAsserts(balances, params);
		await splitterBalancesAsserts(balances);
	});

	it('Should NOT process amount (splitter can not accumulate amount) with a scheme just like in the paper: 10/15 others, send MORE than minNeed; ', async () => {
		var params = {token:token.address, CURRENT_INPUT:30900, multiplier:multiplier, 
			e1:1000, e2:1500, e3:800, office:500, internet:300, t1:500, t2:300, t3:1000, 
			b1:10000, b2:10000, b3:20000, reserve:100000, dividends:250000}

		var struct = await createStructure(params, ERC20AbsoluteExpense, ERC20RelativeExpense, ERC20Splitter);
		var splitterParams = await getSplitterParams(struct, params);
		await totalAndMinNeedsAsserts(splitterParams, params);
		await structureAsserts(splitterParams);

		await token.approve(struct.AllOutputs.address, params.CURRENT_INPUT*multiplier, {from:creator});
		await struct.AllOutputs.processTokens(params.CURRENT_INPUT*multiplier, params.CURRENT_INPUT*multiplier, {from: creator, gasPrice: 0 }).should.be.rejectedWith('revert');
	});

	it('Should process amount with a scheme just like in the paper: 10/15 others, send EQUAL to minNeed; ', async () => {
		var params = {token:token.address, CURRENT_INPUT:5900, multiplier:multiplier, 
			e1:1000, e2:1500, e3:800, office:500, internet:300, t1:500, t2:300, t3:1000, 
			b1:10000, b2:10000, b3:20000, reserve:850000, dividends:150000}

		var struct = await createStructure(params, ERC20AbsoluteExpense, ERC20RelativeExpense, ERC20Splitter);
		var splitterParams = await getSplitterParams(struct, params);
		await totalAndMinNeedsAsserts(splitterParams, params);
		await structureAsserts(splitterParams);

		await token.approve(struct.AllOutputs.address, params.CURRENT_INPUT*multiplier, {from:creator});
		await struct.AllOutputs.processTokens(params.CURRENT_INPUT*multiplier, params.CURRENT_INPUT*multiplier, {from: creator, gasPrice: 0 });

		var balances = await getBalances(struct, token.balanceOf);
		await balancesAsserts(balances, params);
		await splitterBalancesAsserts(balances);
	});

	it('Should not process multiplier: send LESS than minNeed; ', async () => {
		var params = {token:token.address, CURRENT_INPUT:30900, multiplier:multiplier, 
			e1:1000, e2:1500, e3:800, office:500, internet:300, t1:500, t2:300, t3:1000, 
			b1:10000, b2:10000, b3:20000, reserve:750000, dividends:250000}

		var struct = await createStructure(params, ERC20AbsoluteExpense, ERC20RelativeExpense, ERC20Splitter);
		var splitterParams = await getSplitterParams(struct, params);
		await totalAndMinNeedsAsserts(splitterParams, params);
		await structureAsserts(splitterParams);

		await token.approve(struct.AllOutputs.address, 1000*multiplier, {from:creator});
		await struct.AllOutputs.processTokens(1000*multiplier, 1000*multiplier, {from: creator }).should.be.rejectedWith('revert');
		await token.approve(struct.AllOutputs.address, 1000*multiplier, {from:creator});
		await struct.AllOutputs.processTokens(1000000*multiplier, 1000*multiplier, {from: creator }).should.be.rejectedWith('revert');
		await token.approve(struct.AllOutputs.address, 1000000*multiplier, {from:creator});
		await struct.AllOutputs.processTokens(1000*multiplier, 1000000*multiplier, {from: creator }).should.be.rejectedWith('revert');
	});

	it('Should process amount with ERC20Splitter + 3 ERC20RelativeExpenseWithPeriod', async () => {
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

		await checkParamsCycle(targets, flowArr, [0, 0, 0, 0], [720, 100, 250, 370], [true, true, true, true]);

		// now send some amount to the revenue endpoint
		await token.approve(splitter.address, 720*multiplier, {from:creator});
		await splitter.processTokens(1000*multiplier, 720*multiplier, {from: creator});

		assert.equal((await token.balanceOf(rel1.address)).toNumber(), 100*multiplier);
		assert.equal((await token.balanceOf(rel2.address)).toNumber(), 250*multiplier);
		assert.equal((await token.balanceOf(rel3.address)).toNumber(), 370*multiplier);

		await checkParamsCycle(targets, flowArr, [0, 0, 0, 0], [0, 0, 0, 0], [false, false, false, false]);
		await passHours(24);
		await checkParamsCycle(targets, flowArr, [0, 0, 0, 0], [350, 100, 250, 0], [true, true, true, false]);
		await passHours(24);
		await checkParamsCycle(targets, flowArr, [0, 0, 0, 0], [720, 100, 250, 370], [true, true, true, true]);

		await token.approve(splitter.address, 720*multiplier, {from:creator});
		await splitter.processTokens(1000*multiplier, 720*multiplier, {from: creator });

		await checkParamsCycle(targets, flowArr, [0, 0, 0, 0], [0, 0, 0, 0], [false, false, false, false]);
		// multiplier should end up in the outputs
		assert.equal((await token.balanceOf(rel1.address)).toNumber(), 200*multiplier);
		assert.equal((await token.balanceOf(rel2.address)).toNumber(), 500*multiplier);
		assert.equal((await token.balanceOf(rel3.address)).toNumber(), 740*multiplier);

		await passHours(24);	
		await checkParamsCycle(targets, flowArr, [0, 0, 0, 0], [350, 100, 250, 0], [true, true, true, false]);
		
		await token.approve(splitter.address, 350*multiplier, {from:creator});
		await splitter.processTokens(1000*multiplier, 350*multiplier, {from: creator });	
		
		await checkParamsCycle(targets, flowArr, [0, 0, 0, 0], [0, 0, 0, 0], [false, false, false, false]);
	});
});