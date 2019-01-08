var IReceiver = artifacts.require('./IReceiver');

var StandardToken = artifacts.require('./ERC20Token');

var ERC20Splitter = artifacts.require('./ERC20Splitter');
var ERC20AbsoluteExpense = artifacts.require('./ERC20AbsoluteExpense');
var ERC20RelativeExpense = artifacts.require('./ERC20RelativeExpense');
var ERC20AbsoluteExpenseWithPeriod = artifacts.require('./ERC20AbsoluteExpenseWithPeriod');
var ERC20RelativeExpenseWithPeriod = artifacts.require('./ERC20RelativeExpenseWithPeriod');
var ERC20AbsoluteExpenseWithPeriodSliding = artifacts.require('./ERC20AbsoluteExpenseWithPeriodSliding');

require('chai')
	.use(require('chai-as-promised'))
	.use(require('chai-bignumber')(web3.utils.BN))
	.should();

const {passHours} = require('../helpers/utils');

contract('ERC20Fund', (accounts) => {
	var token;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[3];

	beforeEach(async () => {
		token = await StandardToken.new();
		for(var i=0; i<10; i++) {
			await token.mint(accounts[i], 1e10);
		}
	});

	it('Should collect, then revert if more, then flush', async () => {
		let fund = await ERC20AbsoluteExpense.new(token.address,1e3, 0);

		var totalNeed = await fund.getTotalNeeded(1e7);
		var minNeed = await fund.getMinNeeded(1e7);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 1e3);
		assert.equal(minNeed, 0);
		assert.equal(isNeed, true);

		await token.approve(fund.address, 3e2, {from:creator});
		await fund.processTokens(3e2, 3e2, {from: creator });
		await token.approve(fund.address , 3e2, {from:employee1});
		await fund.processTokens(3e2, 3e2, {from: employee1 });

		var totalNeed = await fund.getTotalNeeded(1e7);
		var minNeed = await fund.getMinNeeded(1e7);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 4e2);
		assert.equal(minNeed, 0);
		assert.equal(isNeed, true);

		await token.approve(fund.address , 5e2, {from:employee2});
		await fund.processTokens(5e2, 5e2, {from: employee2 }).should.be.rejectedWith('revert'); // overflow
		await token.approve(fund.address , 4e2, {from:employee2});
		await fund.processTokens(4e2, 4e2, {from: employee2 });
		await token.approve(fund.address , 1e2, {from:employee2});
		await fund.processTokens(1e2, 1e2, {from: employee2 }).should.be.rejectedWith('revert'); // overflow

		var totalNeed = await fund.getTotalNeeded(1e7);
		var minNeed = await fund.getMinNeeded(1e7);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 0);
		assert.equal(minNeed, 0);
		assert.equal(isNeed, false);

		var b1 = await token.balanceOf(employee1);
		await fund.flushTo(employee1);
		var b2 = await token.balanceOf(employee1);
		assert.equal((new web3.utils.BN(b2).sub(b1)), 1e3);

		var totalNeed = await fund.getTotalNeeded(1e7);
		var minNeed = await fund.getMinNeeded(1e7);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 0);
		assert.equal(minNeed, 0);
		assert.equal(isNeed, false);
	});

	it('Should collect (periodic, not accumulate debt), then time passed, then need again', async () => {
		let fund = await ERC20AbsoluteExpenseWithPeriod.new(token.address,1e3, 0, 24);

		var totalNeed = await fund.getTotalNeeded(1e7);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 1e3);
		assert.equal(isNeed, true);

		await token.approve(fund.address, 1e3, {from:creator});
		await fund.processTokens(1e3, 1e3, {from: creator });

		var totalNeed = await fund.getTotalNeeded(1e7);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 0);
		assert.equal(isNeed, false);

		await passHours(web3, 23);

		var totalNeed = await fund.getTotalNeeded(1e7);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 0);
		assert.equal(isNeed, false);

		await passHours(web3, 1);

		var totalNeed = await fund.getTotalNeeded(1e7);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 1e3);
		assert.equal(isNeed, true);
	
		await passHours(web3, 24);

		var totalNeed = await fund.getTotalNeeded(1e7);
		var totalNeed2 = await fund.getTotalNeeded(5e2);
		var minNeed = await fund.getMinNeeded(1e7);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 1e3);
		assert.equal(totalNeed2, 5e2);
		assert.equal(minNeed, 0);
		assert.equal(isNeed, true);

		await token.approve(fund.address, 5e2, {from:creator});
		await fund.processTokens(5e2, 5e2, {from: creator });

		var totalNeed = await fund.getTotalNeeded(1e7);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 5e2);
		assert.equal(isNeed, true);

		await passHours(web3, 24);

		var totalNeed = await fund.getTotalNeeded(1e7);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 5e2);
		assert.equal(isNeed, true);

		await token.approve(fund.address, 5e2, {from:creator});
		await fund.processTokens(5e2, 5e2, {from: creator });

		var totalNeed = await fund.getTotalNeeded(1e7);
		var isNeed = await fund.isNeeds();
		assert.equal(isNeed, false);
	});

	it('Should collect (periodic, accumulate debt), then time passed, then need again', async () => {
		let fund = await ERC20AbsoluteExpenseWithPeriodSliding.new(token.address,1e3, 0, 24);

		var totalNeed = await fund.getTotalNeeded(1e7);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 1e3);
		assert.equal(isNeed, true);

		await token.approve(fund.address, 1e3, {from:creator});
		await fund.processTokens(1e3, 1e3, {from: creator });

		var totalNeed = await fund.getTotalNeeded(1e7);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 0);
		assert.equal(isNeed, false);

		await passHours(web3, 23);

		var totalNeed = await fund.getTotalNeeded(1e7);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 0);
		assert.equal(isNeed, false);

		await passHours(web3, 1);

		var totalNeed = await fund.getTotalNeeded(1e7);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 1e3);
		assert.equal(isNeed, true);
	
		await passHours(web3, 24);

		var totalNeed = await fund.getTotalNeeded(1e7);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 2e3);
		assert.equal(isNeed, true);

		await token.approve(fund.address, 5e2, {from:creator});
		await fund.processTokens(5e2, 5e2, {from: creator });

		var totalNeed = await fund.getTotalNeeded(1e7);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 1.5e3);
		assert.equal(isNeed, true);

		await passHours(web3, 24);

		var totalNeed = await fund.getTotalNeeded(1e7);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 2.5e3);
		assert.equal(isNeed, true);

		await token.approve(fund.address, 2.5e3, {from:creator});
		await fund.processTokens(2.5e3, 2.5e3, {from: creator });

		var totalNeed = await fund.getTotalNeeded(1e7);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 0);
		assert.equal(isNeed, false);
	});

	it('Should collect (periodic, accumulate debt), then time passed, then need again', async () => {
		let fund = await ERC20AbsoluteExpenseWithPeriodSliding.new(token.address,1e3, 0, 24);
		var totalNeed = await fund.getTotalNeeded(1e7);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 1e3);
		assert.equal(isNeed, true);

		await passHours(web3, 48);
		var totalNeed = await fund.getTotalNeeded(1e7);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed, 3e3);
		assert.equal(isNeed, true);
	});

	it('Should implement roadmap pattern with funds (-> abs-abs-abs)', async () => {
		let splitter = await ERC20Splitter.new(token.address);

		let milestone1 = await ERC20AbsoluteExpense.new(token.address,0.1e3, 0);
		let milestone2 = await ERC20AbsoluteExpense.new(token.address,0.2e3, 0);
		let milestone3 = await ERC20AbsoluteExpense.new(token.address,0.7e3, 0);
		await splitter.addChild(milestone1.address);
		await splitter.addChild(milestone2.address);
		await splitter.addChild(milestone3.address);

		var totalNeed = await splitter.getTotalNeeded(1e7);
		var minNeed = await splitter.getMinNeeded(1e7);
		var isNeed = await splitter.isNeeds();
		assert.equal(totalNeed, 1e3);
		assert.equal(minNeed, 0);
		assert.equal(isNeed, true);

		await token.approve(splitter.address, 0.01e3, {from:creator});
		await splitter.processTokens(0.01e3, 0.01e3, {from: creator });

		assert.equal(0.01, (await token.balanceOf(milestone1.address)) / 1e3);
		assert.equal(0, (await token.balanceOf(milestone2.address)) / 1e3);
		assert.equal(0, (await token.balanceOf(milestone3.address)) / 1e3);
		await token.approve(splitter.address, 0.03e3, {from:creator});
		await splitter.processTokens(0.03e3, 0.03e3, {from: creator });

		assert.equal(0.04, (await token.balanceOf(milestone1.address)) / 1e3);
		assert.equal(0, (await token.balanceOf(milestone2.address)) / 1e3);
		assert.equal(0, (await token.balanceOf(milestone3.address)) / 1e3);
		await token.approve(splitter.address, 0.08e3, {from:creator});
		await splitter.processTokens(0.08e3, 0.08e3, {from: creator });

		assert.equal(0.1, (await token.balanceOf(milestone1.address)) / 1e3);
		assert.equal(0.02, (await token.balanceOf(milestone2.address)) / 1e3);
		assert.equal(0, (await token.balanceOf(milestone3.address)) / 1e3);

		var totalNeed = await splitter.getTotalNeeded(1e7);
		var minNeed = await splitter.getMinNeeded(1e7);
		var isNeed = await splitter.isNeeds();
		assert.equal(totalNeed, 0.88e3);
		assert.equal(minNeed, 0);
		assert.equal(isNeed, true);

		await token.approve(splitter.address, 0.4e3, {from:creator});
		await splitter.processTokens(0.4e3, 0.4e3, {from: creator });

		assert.equal(0.1, (await token.balanceOf(milestone1.address)) / 1e3);
		assert.equal(0.2, (await token.balanceOf(milestone2.address)) / 1e3);
		assert.equal(0.22, (await token.balanceOf(milestone3.address)) / 1e3);

		await token.approve(splitter.address, 0.48e3, {from:creator});
		await splitter.processTokens(0.48e3, 0.48e3, {from: creator });

		assert.equal(0.1, (await token.balanceOf(milestone1.address)) / 1e3);
		assert.equal(0.2, (await token.balanceOf(milestone2.address)) / 1e3);
		assert.equal(0.7, (await token.balanceOf(milestone3.address)) / 1e3);

		var totalNeed = await splitter.getTotalNeeded(1e7);
		var minNeed = await splitter.getMinNeeded(1e7);
		var isNeed = await splitter.isNeeds();
		assert.equal(totalNeed, 0);
		assert.equal(minNeed, 0);

		await token.approve(splitter.address, 0.5e3, {from:creator});
		await splitter.processTokens(0.5e3, 0.5e3, {from: creator }).should.be.rejectedWith('revert');
	});

	it('Should implement roadmap pattern with funds (-> abs-abs-abs-bigCap)', async () => {
		let splitter = await ERC20Splitter.new(token.address);

		let milestone1 = await ERC20AbsoluteExpense.new(token.address,0.1e3, 0);
		let milestone2 = await ERC20AbsoluteExpense.new(token.address,0.2e3, 0);
		let milestone3 = await ERC20AbsoluteExpense.new(token.address,0.7e3, 0);
		let stabFund = await ERC20AbsoluteExpense.new(token.address,1e15, 0);
		await splitter.addChild(milestone1.address);
		await splitter.addChild(milestone2.address);
		await splitter.addChild(milestone3.address);
		await splitter.addChild(stabFund.address);

		var totalNeed = await splitter.getTotalNeeded(1e3);
		var minNeed = await splitter.getMinNeeded(1e3);
		var isNeed = await splitter.isNeeds();
		assert.equal(totalNeed, 1e3);
		assert.equal(minNeed, 0);
		assert.equal(isNeed, true);

		await token.approve(splitter.address, 0.01e3, {from:creator});
		await splitter.processTokens(0.01e3, 0.01e3, {from: creator });

		assert.equal(0.01, (await token.balanceOf(milestone1.address)) / 1e3);
		assert.equal(0, (await token.balanceOf(milestone2.address)) / 1e3);
		assert.equal(0, (await token.balanceOf(milestone3.address)) / 1e3);
		await token.approve(splitter.address, 0.03e3, {from:creator});
		await splitter.processTokens(0.03e3, 0.03e3, {from: creator });

		assert.equal(0.04, (await token.balanceOf(milestone1.address)) / 1e3);
		assert.equal(0, (await token.balanceOf(milestone2.address)) / 1e3);
		assert.equal(0, (await token.balanceOf(milestone3.address)) / 1e3);
		await token.approve(splitter.address, 0.08e3, {from:creator});
		await splitter.processTokens(0.08e3, 0.08e3, {from: creator });

		assert.equal(0.1, (await token.balanceOf(milestone1.address)) / 1e3);
		assert.equal(0.02, (await token.balanceOf(milestone2.address)) / 1e3);
		assert.equal(0, (await token.balanceOf(milestone3.address)) / 1e3);

		var totalNeed = await splitter.getTotalNeeded(0.88e3);
		var minNeed = await splitter.getMinNeeded(0.88e3);
		var isNeed = await splitter.isNeeds();
		assert.equal(totalNeed, 0.88e3);
		assert.equal(minNeed, 0);
		assert.equal(isNeed, true);

		await token.approve(splitter.address, 0.4e3, {from:creator});
		await splitter.processTokens(0.4e3, 0.4e3, {from: creator });

		assert.equal(0.1, (await token.balanceOf(milestone1.address)) / 1e3);
		assert.equal(0.2, (await token.balanceOf(milestone2.address)) / 1e3);
		assert.equal(0.22, (await token.balanceOf(milestone3.address)) / 1e3);

		await token.approve(splitter.address, 0.48e3, {from:creator});
		await splitter.processTokens(0.48e3, 0.48e3, {from: creator });

		assert.equal(0.1, (await token.balanceOf(milestone1.address)) / 1e3);
		assert.equal(0.2, (await token.balanceOf(milestone2.address)) / 1e3);
		assert.equal(0.7, (await token.balanceOf(milestone3.address)) / 1e3);

		var totalNeed = await splitter.getTotalNeeded(1e3);
		var minNeed = await splitter.getMinNeeded(1e3);
		var isNeed = await splitter.isNeeds();
		assert.equal(totalNeed, 1e3);
		assert.equal(minNeed, 0);

		await token.approve(splitter.address, 0.3e3, {from:creator});
		await splitter.processTokens(0.3e3, 0.3e3, {from: creator });
		await token.approve(splitter.address, 0.5e3, {from:creator});
		await splitter.processTokens(0.5e3, 0.5e3, {from: creator });
		await token.approve(splitter.address, 0.7e3, {from:creator});
		await splitter.processTokens(0.7e3, 0.7e3, {from: creator });

		assert.equal(0.1, (await token.balanceOf(milestone1.address)) / 1e3);
		assert.equal(0.2, (await token.balanceOf(milestone2.address)) / 1e3);
		assert.equal(0.7, (await token.balanceOf(milestone3.address)) / 1e3);
		assert.equal(1.5, (await token.balanceOf(stabFund.address)) / 1e3);
	});
});
