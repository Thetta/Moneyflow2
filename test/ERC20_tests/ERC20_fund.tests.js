var IReceiver = artifacts.require('./IReceiver');

var StandardToken = artifacts.require('./ERC20Token');

var ERC20Splitter = artifacts.require('./ERC20Splitter');
var ERC20AbsoluteExpense = artifacts.require('./ERC20AbsoluteExpense');
var ERC20RelativeExpense = artifacts.require('./ERC20RelativeExpense');
var ERC20AbsoluteExpenseWithPeriod = artifacts.require('./ERC20AbsoluteExpenseWithPeriod');
var ERC20RelativeExpenseWithPeriod = artifacts.require('./ERC20RelativeExpenseWithPeriod');
var ERC20AbsoluteExpenseWithPeriodSliding = artifacts.require('./ERC20AbsoluteExpenseWithPeriodSliding');
const getEId = o => o.logs.filter(l => l.event == 'elementAdded')[0].args._eId.toNumber();
const KECCAK256 = x => web3.sha3(x);

async function passHours (hours) {
	await web3.currentProvider.sendAsync({
		jsonrpc: '2.0',
		method: 'evm_increaseTime',
		params: [3600 * hours * 1000],
		id: new Date().getTime(),
	}, function (err) { if (err) console.log('err:', err); });
}

const BigNumber = web3.BigNumber;

require('chai')
	.use(require('chai-as-promised'))
	.use(require('chai-bignumber')(BigNumber))
	.should();

contract('ERC20Fund', (accounts) => {
	var token;
	let tokenAmount = 1e7;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[3];

	beforeEach(async () => {
		token = await StandardToken.new();
		await token.mint(accounts[0], 1e25);
		await token.mint(accounts[1], 1e25);
		await token.mint(accounts[2], 1e25);
		await token.mint(accounts[3], 1e25);
		await token.mint(accounts[4], 1e25);
		await token.mint(accounts[5], 1e25);
		await token.mint(accounts[6], 1e25);
		await token.mint(accounts[7], 1e25);
		await token.mint(accounts[8], 1e25);
		await token.mint(accounts[9], 1e25);		
	});

	it('Should collect tokenAmount, then revert if more, then flush', async () => {
		let fund = await ERC20AbsoluteExpense.new(token.address,1e18, 0);

		var totalNeed = await fund.getTotalNeeded(1e22);
		var minNeed = await fund.getMinNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 1e18);
		assert.equal(minNeed.toNumber(), 0);
		assert.equal(isNeed, true);

		await token.approve(fund.address, 3e17, {from:creator});
		await fund.processTokens(3e17, 3e17, {from: creator });
		await token.approve(fund.address , 3e17, {from:employee1});
		await fund.processTokens(3e17, 3e17, {from: employee1 });

		var totalNeed = await fund.getTotalNeeded(1e22);
		var minNeed = await fund.getMinNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 4e17);
		assert.equal(minNeed.toNumber(), 0);
		assert.equal(isNeed, true);

		await token.approve(fund.address , 5e17, {from:employee2});
		await fund.processTokens(5e17, 5e17, {from: employee2 }).should.be.rejectedWith('revert'); // overflow
		await token.approve(fund.address , 4e17, {from:employee2});
		await fund.processTokens(4e17, 4e17, {from: employee2 });
		await token.approve(fund.address , 1e17, {from:employee2});
		await fund.processTokens(1e17, 1e17, {from: employee2 }).should.be.rejectedWith('revert'); // overflow

		var totalNeed = await fund.getTotalNeeded(1e22);
		var minNeed = await fund.getMinNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 0);
		assert.equal(minNeed.toNumber(), 0);
		assert.equal(isNeed, false);

		var b1 = await token.balanceOf(employee1);
		await fund.flushTo(employee1);
		var b2 = await token.balanceOf(employee1);
		assert.equal((new web3.BigNumber(b2).sub(b1)).toNumber(), 1e18);

		var totalNeed = await fund.getTotalNeeded(1e22);
		var minNeed = await fund.getMinNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 0);
		assert.equal(minNeed.toNumber(), 0);
		assert.equal(isNeed, false);
	});

	it('Should collect tokenAmount (periodic, not accumulate debt), then time passed, then need tokenAmount again', async () => {
		let fund = await ERC20AbsoluteExpenseWithPeriod.new(token.address,1e18, 0, 24);

		var totalNeed = await fund.getTotalNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 1e18);
		assert.equal(isNeed, true);

		await token.approve(fund.address, 1e18, {from:creator});
		await fund.processTokens(1e18, 1e18, {from: creator });

		var totalNeed = await fund.getTotalNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 0);
		assert.equal(isNeed, false);

		await passHours(23);

		var totalNeed = await fund.getTotalNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 0);
		assert.equal(isNeed, false);

		await passHours(1);

		var totalNeed = await fund.getTotalNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 1e18);
		assert.equal(isNeed, true);
	
		await passHours(24);

		var totalNeed = await fund.getTotalNeeded(1e22);
		var totalNeed2 = await fund.getTotalNeeded(5e17);
		var minNeed = await fund.getMinNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 1e18);
		assert.equal(totalNeed2.toNumber(), 5e17);
		assert.equal(minNeed.toNumber(), 0);
		assert.equal(isNeed, true);

		await token.approve(fund.address, 5e17, {from:creator});
		await fund.processTokens(5e17, 5e17, {from: creator });

		var totalNeed = await fund.getTotalNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 5e17);
		assert.equal(isNeed, true);

		await passHours(24);

		var totalNeed = await fund.getTotalNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 5e17);
		assert.equal(isNeed, true);

		await token.approve(fund.address, 5e17, {from:creator});
		await fund.processTokens(5e17, 5e17, {from: creator });

		var totalNeed = await fund.getTotalNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(isNeed, false);
	});

	it('Should collect tokenAmount (periodic, accumulate debt), then time passed, then need tokenAmount again', async () => {
		let fund = await ERC20AbsoluteExpenseWithPeriodSliding.new(token.address,1e18, 0, 24);

		var totalNeed = await fund.getTotalNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 1e18);
		assert.equal(isNeed, true);

		await token.approve(fund.address, 1e18, {from:creator});
		await fund.processTokens(1e18, 1e18, {from: creator });

		var totalNeed = await fund.getTotalNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 0);
		assert.equal(isNeed, false);

		await passHours(23);

		var totalNeed = await fund.getTotalNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 0);
		assert.equal(isNeed, false);

		await passHours(1);

		var totalNeed = await fund.getTotalNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 1e18);
		assert.equal(isNeed, true);
	
		await passHours(24);

		var totalNeed = await fund.getTotalNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 2e18);
		assert.equal(isNeed, true);

		await token.approve(fund.address, 5e17, {from:creator});
		await fund.processTokens(5e17, 5e17, {from: creator });

		var totalNeed = await fund.getTotalNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 1.5e18);
		assert.equal(isNeed, true);

		await passHours(24);

		var totalNeed = await fund.getTotalNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 2.5e18);
		assert.equal(isNeed, true);

		await token.approve(fund.address, 2.5e18, {from:creator});
		await fund.processTokens(2.5e18, 2.5e18, {from: creator });

		var totalNeed = await fund.getTotalNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 0);
		assert.equal(isNeed, false);
	});

	it('Should collect tokenAmount (periodic, accumulate debt), then time passed, then need tokenAmount again', async () => {
		let fund = await ERC20AbsoluteExpenseWithPeriodSliding.new(token.address,1e18, 0, 24);
		var totalNeed = await fund.getTotalNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 1e18);
		assert.equal(isNeed, true);

		await passHours(48);
		var totalNeed = await fund.getTotalNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 3e18);
		assert.equal(isNeed, true);
	});

	it('Should implement roadmap pattern with funds (-> abs-abs-abs)', async () => {
		let splitter = await ERC20Splitter.new(token.address);

		let milestone1 = await ERC20AbsoluteExpense.new(token.address,0.1e18, 0);
		let milestone2 = await ERC20AbsoluteExpense.new(token.address,0.2e18, 0);
		let milestone3 = await ERC20AbsoluteExpense.new(token.address,0.7e18, 0);
		await splitter.addChild(milestone1.address);
		await splitter.addChild(milestone2.address);
		await splitter.addChild(milestone3.address);

		var totalNeed = await splitter.getTotalNeeded(1e22);
		var minNeed = await splitter.getMinNeeded(1e22);
		var isNeed = await splitter.isNeeds();
		assert.equal(totalNeed.toNumber(), 1e18);
		assert.equal(minNeed.toNumber(), 0);
		assert.equal(isNeed, true);

		await token.approve(splitter.address, 0.01e18, {from:creator});
		await splitter.processTokens(0.01e18, 0.01e18, {from: creator });

		assert.equal(0.01, (await token.balanceOf(milestone1.address)).toNumber() / 1e18);
		assert.equal(0, (await token.balanceOf(milestone2.address)).toNumber() / 1e18);
		assert.equal(0, (await token.balanceOf(milestone3.address)).toNumber() / 1e18);
		await token.approve(splitter.address, 0.03e18, {from:creator});
		await splitter.processTokens(0.03e18, 0.03e18, {from: creator });

		assert.equal(0.04, (await token.balanceOf(milestone1.address)).toNumber() / 1e18);
		assert.equal(0, (await token.balanceOf(milestone2.address)).toNumber() / 1e18);
		assert.equal(0, (await token.balanceOf(milestone3.address)).toNumber() / 1e18);
		await token.approve(splitter.address, 0.08e18, {from:creator});
		await splitter.processTokens(0.08e18, 0.08e18, {from: creator });

		assert.equal(0.1, (await token.balanceOf(milestone1.address)).toNumber() / 1e18);
		assert.equal(0.02, (await token.balanceOf(milestone2.address)).toNumber() / 1e18);
		assert.equal(0, (await token.balanceOf(milestone3.address)).toNumber() / 1e18);

		var totalNeed = await splitter.getTotalNeeded(1e22);
		var minNeed = await splitter.getMinNeeded(1e22);
		var isNeed = await splitter.isNeeds();
		assert.equal(totalNeed.toNumber(), 0.88e18);
		assert.equal(minNeed.toNumber(), 0);
		assert.equal(isNeed, true);

		await token.approve(splitter.address, 0.4e18, {from:creator});
		await splitter.processTokens(0.4e18, 0.4e18, {from: creator });

		assert.equal(0.1, (await token.balanceOf(milestone1.address)).toNumber() / 1e18);
		assert.equal(0.2, (await token.balanceOf(milestone2.address)).toNumber() / 1e18);
		assert.equal(0.22, (await token.balanceOf(milestone3.address)).toNumber() / 1e18);

		await token.approve(splitter.address, 0.48e18, {from:creator});
		await splitter.processTokens(0.48e18, 0.48e18, {from: creator });

		assert.equal(0.1, (await token.balanceOf(milestone1.address)).toNumber() / 1e18);
		assert.equal(0.2, (await token.balanceOf(milestone2.address)).toNumber() / 1e18);
		assert.equal(0.7, (await token.balanceOf(milestone3.address)).toNumber() / 1e18);

		var totalNeed = await splitter.getTotalNeeded(1e22);
		var minNeed = await splitter.getMinNeeded(1e22);
		var isNeed = await splitter.isNeeds();
		assert.equal(totalNeed.toNumber(), 0);
		assert.equal(minNeed.toNumber(), 0);

		await token.approve(splitter.address, 0.5e18, {from:creator});
		await splitter.processTokens(0.5e18, 0.5e18, {from: creator }).should.be.rejectedWith('revert');
	});

	it('Should implement roadmap pattern with funds (-> abs-abs-abs-bigCap)', async () => {
		let splitter = await ERC20Splitter.new(token.address);

		let milestone1 = await ERC20AbsoluteExpense.new(token.address,0.1e18, 0);
		let milestone2 = await ERC20AbsoluteExpense.new(token.address,0.2e18, 0);
		let milestone3 = await ERC20AbsoluteExpense.new(token.address,0.7e18, 0);
		let stabFund = await ERC20AbsoluteExpense.new(token.address,1e30, 0);
		await splitter.addChild(milestone1.address);
		await splitter.addChild(milestone2.address);
		await splitter.addChild(milestone3.address);
		await splitter.addChild(stabFund.address);

		var totalNeed = await splitter.getTotalNeeded(1e18);
		var minNeed = await splitter.getMinNeeded(1e18);
		var isNeed = await splitter.isNeeds();
		assert.equal(totalNeed.toNumber(), 1e18);
		assert.equal(minNeed.toNumber(), 0);
		assert.equal(isNeed, true);

		await token.approve(splitter.address, 0.01e18, {from:creator});
		await splitter.processTokens(0.01e18, 0.01e18, {from: creator });

		assert.equal(0.01, (await token.balanceOf(milestone1.address)).toNumber() / 1e18);
		assert.equal(0, (await token.balanceOf(milestone2.address)).toNumber() / 1e18);
		assert.equal(0, (await token.balanceOf(milestone3.address)).toNumber() / 1e18);
		await token.approve(splitter.address, 0.03e18, {from:creator});
		await splitter.processTokens(0.03e18, 0.03e18, {from: creator });

		assert.equal(0.04, (await token.balanceOf(milestone1.address)).toNumber() / 1e18);
		assert.equal(0, (await token.balanceOf(milestone2.address)).toNumber() / 1e18);
		assert.equal(0, (await token.balanceOf(milestone3.address)).toNumber() / 1e18);
		await token.approve(splitter.address, 0.08e18, {from:creator});
		await splitter.processTokens(0.08e18, 0.08e18, {from: creator });

		assert.equal(0.1, (await token.balanceOf(milestone1.address)).toNumber() / 1e18);
		assert.equal(0.02, (await token.balanceOf(milestone2.address)).toNumber() / 1e18);
		assert.equal(0, (await token.balanceOf(milestone3.address)).toNumber() / 1e18);

		var totalNeed = await splitter.getTotalNeeded(0.88e18);
		var minNeed = await splitter.getMinNeeded(0.88e18);
		var isNeed = await splitter.isNeeds();
		assert.equal(totalNeed.toNumber(), 0.88e18);
		assert.equal(minNeed.toNumber(), 0);
		assert.equal(isNeed, true);

		await token.approve(splitter.address, 0.4e18, {from:creator});
		await splitter.processTokens(0.4e18, 0.4e18, {from: creator });

		assert.equal(0.1, (await token.balanceOf(milestone1.address)).toNumber() / 1e18);
		assert.equal(0.2, (await token.balanceOf(milestone2.address)).toNumber() / 1e18);
		assert.equal(0.22, (await token.balanceOf(milestone3.address)).toNumber() / 1e18);

		await token.approve(splitter.address, 0.48e18, {from:creator});
		await splitter.processTokens(0.48e18, 0.48e18, {from: creator });

		assert.equal(0.1, (await token.balanceOf(milestone1.address)).toNumber() / 1e18);
		assert.equal(0.2, (await token.balanceOf(milestone2.address)).toNumber() / 1e18);
		assert.equal(0.7, (await token.balanceOf(milestone3.address)).toNumber() / 1e18);

		var totalNeed = await splitter.getTotalNeeded(1e18);
		var minNeed = await splitter.getMinNeeded(1e18);
		var isNeed = await splitter.isNeeds();
		assert.equal(totalNeed.toNumber(), 1e18);
		assert.equal(minNeed.toNumber(), 0);

		await token.approve(splitter.address, 0.3e18, {from:creator});
		await splitter.processTokens(0.3e18, 0.3e18, {from: creator });
		await token.approve(splitter.address, 0.5e18, {from:creator});
		await splitter.processTokens(0.5e18, 0.5e18, {from: creator });
		await token.approve(splitter.address, 0.7e18, {from:creator});
		await splitter.processTokens(0.7e18, 0.7e18, {from: creator });

		assert.equal(0.1, (await token.balanceOf(milestone1.address)).toNumber() / 1e18);
		assert.equal(0.2, (await token.balanceOf(milestone2.address)).toNumber() / 1e18);
		assert.equal(0.7, (await token.balanceOf(milestone3.address)).toNumber() / 1e18);
		assert.equal(1.5, (await token.balanceOf(stabFund.address)).toNumber() / 1e18);
	});
});
