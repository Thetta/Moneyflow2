var IReceiver = artifacts.require('./IReceiver');

var WeiSplitter = artifacts.require('./WeiSplitter');
var WeiAbsoluteExpense = artifacts.require('./WeiAbsoluteExpense');
var WeiRelativeExpense = artifacts.require('./WeiRelativeExpense');
var WeiAbsoluteExpenseWithPeriod = artifacts.require('./WeiAbsoluteExpenseWithPeriod');
var WeiRelativeExpenseWithPeriod = artifacts.require('./WeiRelativeExpenseWithPeriod');
var WeiAbsoluteExpenseWithPeriodSliding = artifacts.require('./WeiAbsoluteExpenseWithPeriodSliding');

require('chai')
	.use(require('chai-as-promised'))
	.use(require('chai-bignumber')(web3.utils.BN))
	.should();

const {passHours} = require('../helpers/utils');

contract('WeiFund', (accounts) => {
	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[3];

	it('Should collect money, then revert if more, then flush', async () => {
		let fund = await WeiAbsoluteExpense.new(1e8, 0);

		var totalNeed = await fund.getTotalNeeded(1e12);
		var minNeed = await fund.getMinNeeded(1e12);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 1e8);
		assert.equal(minNeed, 0);
		assert.equal(isNeed, true);

		await fund.processFunds(3e7, { value: 3e7, from: creator });
		await fund.processFunds(3e7, { value: 3e7, from: employee1 });

		var totalNeed = await fund.getTotalNeeded(1e12);
		var minNeed = await fund.getMinNeeded(1e12);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 4e7);
		assert.equal(minNeed, 0);
		assert.equal(isNeed, true);

		await fund.processFunds(5e7, { value: 5e7 }).should.be.rejectedWith('revert'); // overflow
		await fund.processFunds(4e7, { value: 4e7, from: employee2 });
		await fund.processFunds(1e7, { value: 1e7 }).should.be.rejectedWith('revert'); // overflow

		var totalNeed = await fund.getTotalNeeded(1e12);
		var minNeed = await fund.getMinNeeded(1e12);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 0);
		assert.equal(minNeed, 0);
		assert.equal(isNeed, false);

		var b1 = new web3.utils.BN(await web3.eth.getBalance(employee1));
		await fund.flushTo(employee1);
		var b2 = new web3.utils.BN(await web3.eth.getBalance(employee1));
		assert.equal(b2.sub(b1).toNumber(), 1e8);

		var totalNeed = await fund.getTotalNeeded(1e12);
		var minNeed = await fund.getMinNeeded(1e12);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 0);
		assert.equal(minNeed, 0);
		assert.equal(isNeed, false);
	});

	it('Should collect (periodic, not accumulate debt), then time passed, then need again', async () => {
		let fund = await WeiAbsoluteExpenseWithPeriod.new(1e8, 0, 24);

		var totalNeed = await fund.getTotalNeeded(1e12);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 1e8);
		assert.equal(isNeed, true);

		await fund.processFunds(1e8, { value: 1e8 });

		var totalNeed = await fund.getTotalNeeded(1e12);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 0);
		assert.equal(isNeed, false);

		await passHours(web3, 23);

		var totalNeed = await fund.getTotalNeeded(1e12);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 0);
		assert.equal(isNeed, false);

		await passHours(web3, 1);

		var totalNeed = await fund.getTotalNeeded(1e12);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 1e8);
		assert.equal(isNeed, true);
	
		await passHours(web3, 24);

		var totalNeed = await fund.getTotalNeeded(1e12);
		var totalNeed2 = await fund.getTotalNeeded(5e7);
		var minNeed = await fund.getMinNeeded(1e12);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 1e8);
		assert.equal(totalNeed2, 5e7);
		assert.equal(minNeed, 0);
		assert.equal(isNeed, true);

		await fund.processFunds(5e7, { value: 5e7 });

		var totalNeed = await fund.getTotalNeeded(1e12);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 5e7);
		assert.equal(isNeed, true);

		await passHours(web3, 24);

		var totalNeed = await fund.getTotalNeeded(1e12);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 5e7);
		assert.equal(isNeed, true);

		await fund.processFunds(5e7, { value: 5e7 });

		var totalNeed = await fund.getTotalNeeded(1e12);
		var isNeed = await fund.isNeeds();
		assert.equal(isNeed, false);
	});

	it('Should collect (periodic, accumulate debt), then time passed, then need again', async () => {
		let fund = await WeiAbsoluteExpenseWithPeriodSliding.new(1e8, 0, 24);

		var totalNeed = await fund.getTotalNeeded(1e12);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 1e8);
		assert.equal(isNeed, true);

		await fund.processFunds(1e8, { value: 1e8 });

		var totalNeed = await fund.getTotalNeeded(1e12);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 0);
		assert.equal(isNeed, false);

		await passHours(web3, 23);

		var totalNeed = await fund.getTotalNeeded(1e12);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 0);
		assert.equal(isNeed, false);

		await passHours(web3, 1);

		var totalNeed = await fund.getTotalNeeded(1e12);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 1e8);
		assert.equal(isNeed, true);
	
		await passHours(web3, 24);

		var totalNeed = await fund.getTotalNeeded(1e12);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 2e8);
		assert.equal(isNeed, true);

		await fund.processFunds(5e7, { value: 5e7 });

		var totalNeed = await fund.getTotalNeeded(1e12);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 1.5e8);
		assert.equal(isNeed, true);

		await passHours(web3, 24);

		var totalNeed = await fund.getTotalNeeded(1e12);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 2.5e8);
		assert.equal(isNeed, true);

		await fund.processFunds(2.5e8, { value: 2.5e8 });

		var totalNeed = await fund.getTotalNeeded(1e12);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 0);
		assert.equal(isNeed, false);
	});

	it('Should collect (periodic, accumulate debt), then time passed, then need again', async () => {
		let fund = await WeiAbsoluteExpenseWithPeriodSliding.new(1e8, 0, 24);
		var totalNeed = await fund.getTotalNeeded(1e12);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 1e8);
		assert.equal(isNeed, true);

		await passHours(web3, 48);
		var totalNeed = await fund.getTotalNeeded(1e12);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 3e8);
		assert.equal(isNeed, true);
	});

	it('Should implement roadmap pattern with funds (-> abs-abs-abs)', async () => {
		let splitter = await WeiSplitter.new();

		let milestone1 = await WeiAbsoluteExpense.new(0.1e8, 0);
		let milestone2 = await WeiAbsoluteExpense.new(0.2e8, 0);
		let milestone3 = await WeiAbsoluteExpense.new(0.7e8, 0);
		await splitter.addChild(milestone1.address);
		await splitter.addChild(milestone2.address);
		await splitter.addChild(milestone3.address);

		var totalNeed = await splitter.getTotalNeeded(1e12);
		var minNeed = await splitter.getMinNeeded(1e12);
		var isNeed = await splitter.isNeeds();
		assert.equal(totalNeed, 1e8);
		assert.equal(minNeed, 0);
		assert.equal(isNeed, true);

		await splitter.processFunds(0.01e8, { value: 0.01e8 });

		assert.equal(0.01, (await web3.eth.getBalance(milestone1.address)) / 1e8);
		assert.equal(0, (await web3.eth.getBalance(milestone2.address)) / 1e8);
		assert.equal(0, (await web3.eth.getBalance(milestone3.address)) / 1e8);
		await splitter.processFunds(0.03e8, { value: 0.03e8 });

		assert.equal(0.04, (await web3.eth.getBalance(milestone1.address)) / 1e8);
		assert.equal(0, (await web3.eth.getBalance(milestone2.address)) / 1e8);
		assert.equal(0, (await web3.eth.getBalance(milestone3.address)) / 1e8);
		await splitter.processFunds(0.08e8, { value: 0.08e8 });

		assert.equal(0.1, (await web3.eth.getBalance(milestone1.address)) / 1e8);
		assert.equal(0.02, (await web3.eth.getBalance(milestone2.address)) / 1e8);
		assert.equal(0, (await web3.eth.getBalance(milestone3.address)) / 1e8);

		var totalNeed = await splitter.getTotalNeeded(1e12);
		var minNeed = await splitter.getMinNeeded(1e12);
		var isNeed = await splitter.isNeeds();
		assert.equal(totalNeed, 0.88e8);
		assert.equal(minNeed, 0);
		assert.equal(isNeed, true);

		await splitter.processFunds(0.4e8, { value: 0.4e8 });

		assert.equal(0.1, (await web3.eth.getBalance(milestone1.address)) / 1e8);
		assert.equal(0.2, (await web3.eth.getBalance(milestone2.address)) / 1e8);
		assert.equal(0.22, (await web3.eth.getBalance(milestone3.address)) / 1e8);

		await splitter.processFunds(0.48e8, { value: 0.48e8 });

		assert.equal(0.1, (await web3.eth.getBalance(milestone1.address)) / 1e8);
		assert.equal(0.2, (await web3.eth.getBalance(milestone2.address)) / 1e8);
		assert.equal(0.7, (await web3.eth.getBalance(milestone3.address)) / 1e8);

		var totalNeed = await splitter.getTotalNeeded(1e12);
		var minNeed = await splitter.getMinNeeded(1e12);
		var isNeed = await splitter.isNeeds();
		assert.equal(totalNeed, 0);
		assert.equal(minNeed, 0);

		await splitter.processFunds(0.5e8, { value: 0.5e8 }).should.be.rejectedWith('revert');
	});

	it('Should implement roadmap pattern with funds (-> abs-abs-abs-bigCap)', async () => {
		let splitter = await WeiSplitter.new();

		let milestone1 = await WeiAbsoluteExpense.new(0.1e8, 0);
		let milestone2 = await WeiAbsoluteExpense.new(0.2e8, 0);
		let milestone3 = await WeiAbsoluteExpense.new(0.7e8, 0);
		let stabFund = await WeiAbsoluteExpense.new(1e10, 0);
		await splitter.addChild(milestone1.address);
		await splitter.addChild(milestone2.address);
		await splitter.addChild(milestone3.address);
		await splitter.addChild(stabFund.address);

		var totalNeed = await splitter.getTotalNeeded(1e8);
		var minNeed = await splitter.getMinNeeded(1e8);
		var isNeed = await splitter.isNeeds();
		assert.equal(totalNeed, 1e8);
		assert.equal(minNeed, 0);
		assert.equal(isNeed, true);

		await splitter.processFunds(0.01e8, { value: 0.01e8 });

		assert.equal(0.01, (await web3.eth.getBalance(milestone1.address)) / 1e8);
		assert.equal(0, (await web3.eth.getBalance(milestone2.address)) / 1e8);
		assert.equal(0, (await web3.eth.getBalance(milestone3.address)) / 1e8);
		await splitter.processFunds(0.03e8, { value: 0.03e8 });

		assert.equal(0.04, (await web3.eth.getBalance(milestone1.address)) / 1e8);
		assert.equal(0, (await web3.eth.getBalance(milestone2.address)) / 1e8);
		assert.equal(0, (await web3.eth.getBalance(milestone3.address)) / 1e8);
		await splitter.processFunds(0.08e8, { value: 0.08e8 });

		assert.equal(0.1, (await web3.eth.getBalance(milestone1.address)) / 1e8);
		assert.equal(0.02, (await web3.eth.getBalance(milestone2.address)) / 1e8);
		assert.equal(0, (await web3.eth.getBalance(milestone3.address)) / 1e8);

		var totalNeed = await splitter.getTotalNeeded(0.88e8);
		var minNeed = await splitter.getMinNeeded(0.88e8);
		var isNeed = await splitter.isNeeds();
		assert.equal(totalNeed, 0.88e8);
		assert.equal(minNeed, 0);
		assert.equal(isNeed, true);

		await splitter.processFunds(0.4e8, { value: 0.4e8 });

		assert.equal(0.1, (await web3.eth.getBalance(milestone1.address)) / 1e8);
		assert.equal(0.2, (await web3.eth.getBalance(milestone2.address)) / 1e8);
		assert.equal(0.22, (await web3.eth.getBalance(milestone3.address)) / 1e8);

		await splitter.processFunds(0.48e8, { value: 0.48e8 });

		assert.equal(0.1, (await web3.eth.getBalance(milestone1.address)) / 1e8);
		assert.equal(0.2, (await web3.eth.getBalance(milestone2.address)) / 1e8);
		assert.equal(0.7, (await web3.eth.getBalance(milestone3.address)) / 1e8);

		var totalNeed = await splitter.getTotalNeeded(1e8);
		var minNeed = await splitter.getMinNeeded(1e8);
		var isNeed = await splitter.isNeeds();
		assert.equal(totalNeed, 1e8);
		assert.equal(minNeed, 0);

		await splitter.processFunds(0.3e8, { value: 0.3e8 });
		await splitter.processFunds(0.5e8, { value: 0.5e8 });
		await splitter.processFunds(0.7e8, { value: 0.7e8 });

		assert.equal(0.1, (await web3.eth.getBalance(milestone1.address)) / 1e8);
		assert.equal(0.2, (await web3.eth.getBalance(milestone2.address)) / 1e8);
		assert.equal(0.7, (await web3.eth.getBalance(milestone3.address)) / 1e8);
		assert.equal(1.5, (await web3.eth.getBalance(stabFund.address)) / 1e8);
	});
});
