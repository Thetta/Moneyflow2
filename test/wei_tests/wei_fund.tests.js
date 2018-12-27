var IReceiver = artifacts.require('./IReceiver');

var WeiSplitter = artifacts.require('./WeiSplitter');
var WeiAbsoluteExpense = artifacts.require('./WeiAbsoluteExpense');
var WeiRelativeExpense = artifacts.require('./WeiRelativeExpense');
var WeiAbsoluteExpenseWithPeriod = artifacts.require('./WeiAbsoluteExpenseWithPeriod');
var WeiRelativeExpenseWithPeriod = artifacts.require('./WeiRelativeExpenseWithPeriod');
var WeiAbsoluteExpenseWithPeriodSliding = artifacts.require('./WeiAbsoluteExpenseWithPeriodSliding');
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

contract('WeiFund', (accounts) => {
	let money = web3.toWei(0.001, 'ether');

	const creator = accounts[0];
	const employee1 = accounts[1];
	const employee2 = accounts[2];
	const outsider = accounts[3];

	beforeEach(async () => {
	});

	it('Should collect money, then revert if more, then flush', async () => {
		let fund = await WeiAbsoluteExpense.new(1e18, 0);

		var totalNeed = await fund.getTotalNeeded(1e22);
		var minNeed = await fund.getMinNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 1e18);
		assert.equal(minNeed.toNumber(), 0);
		assert.equal(isNeed, true);

		await fund.processFunds(3e17, { value: 3e17, from: creator });
		await fund.processFunds(3e17, { value: 3e17, from: employee1 });

		var totalNeed = await fund.getTotalNeeded(1e22);
		var minNeed = await fund.getMinNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 4e17);
		assert.equal(minNeed.toNumber(), 0);
		assert.equal(isNeed, true);

		await fund.processFunds(5e17, { value: 5e17 }).should.be.rejectedWith('revert'); // overflow
		await fund.processFunds(4e17, { value: 4e17, from: employee2 });
		await fund.processFunds(1e17, { value: 1e17 }).should.be.rejectedWith('revert'); // overflow

		var totalNeed = await fund.getTotalNeeded(1e22);
		var minNeed = await fund.getMinNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 0);
		assert.equal(minNeed.toNumber(), 0);
		assert.equal(isNeed, false);

		var b1 = await web3.eth.getBalance(employee1);
		await fund.flushTo(employee1);
		var b2 = await web3.eth.getBalance(employee1);
		assert.equal(b2.toNumber() - b1.toNumber(), 1e18);

		var totalNeed = await fund.getTotalNeeded(1e22);
		var minNeed = await fund.getMinNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 0);
		assert.equal(minNeed.toNumber(), 0);
		assert.equal(isNeed, false);
	});

	it('Should collect money (periodic, not accumulate debt), then time passed, then need money again', async () => {
		let fund = await WeiAbsoluteExpenseWithPeriod.new(1e18, 0, 24);

		var totalNeed = await fund.getTotalNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 1e18);
		assert.equal(isNeed, true);

		await fund.processFunds(1e18, { value: 1e18 });

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

		await fund.processFunds(5e17, { value: 5e17 });

		var totalNeed = await fund.getTotalNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 5e17);
		assert.equal(isNeed, true);

		await passHours(24);

		var totalNeed = await fund.getTotalNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 5e17);
		assert.equal(isNeed, true);

		await fund.processFunds(5e17, { value: 5e17 });

		var totalNeed = await fund.getTotalNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(isNeed, false);
	});

	it('Should collect money (periodic, accumulate debt), then time passed, then need money again', async () => {
		let fund = await WeiAbsoluteExpenseWithPeriodSliding.new(1e18, 0, 24);

		var totalNeed = await fund.getTotalNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 1e18);
		assert.equal(isNeed, true);

		await fund.processFunds(1e18, { value: 1e18 });

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

		await fund.processFunds(5e17, { value: 5e17 });

		var totalNeed = await fund.getTotalNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 1.5e18);
		assert.equal(isNeed, true);

		await passHours(24);

		var totalNeed = await fund.getTotalNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 2.5e18);
		assert.equal(isNeed, true);

		await fund.processFunds(2.5e18, { value: 2.5e18 });

		var totalNeed = await fund.getTotalNeeded(1e22);
		var isNeed = await fund.isNeeds();
		assert.equal(totalNeed.toNumber(), 0);
		assert.equal(isNeed, false);
	});

	it('Should collect money (periodic, accumulate debt), then time passed, then need money again', async () => {
		let fund = await WeiAbsoluteExpenseWithPeriodSliding.new(1e18, 0, 24);
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
		let splitter = await WeiSplitter.new();

		let milestone1 = await WeiAbsoluteExpense.new(0.1e18, 0);
		let milestone2 = await WeiAbsoluteExpense.new(0.2e18, 0);
		let milestone3 = await WeiAbsoluteExpense.new(0.7e18, 0);
		await splitter.addChild(milestone1.address);
		await splitter.addChild(milestone2.address);
		await splitter.addChild(milestone3.address);

		var totalNeed = await splitter.getTotalNeeded(1e22);
		var minNeed = await splitter.getMinNeeded(1e22);
		var isNeed = await splitter.isNeeds();
		assert.equal(totalNeed.toNumber(), 1e18);
		assert.equal(minNeed.toNumber(), 0);
		assert.equal(isNeed, true);

		await splitter.processFunds(0.01e18, { value: 0.01e18 });

		assert.equal(0.01, (await web3.eth.getBalance(milestone1.address)).toNumber() / 1e18);
		assert.equal(0, (await web3.eth.getBalance(milestone2.address)).toNumber() / 1e18);
		assert.equal(0, (await web3.eth.getBalance(milestone3.address)).toNumber() / 1e18);
		await splitter.processFunds(0.03e18, { value: 0.03e18 });

		assert.equal(0.04, (await web3.eth.getBalance(milestone1.address)).toNumber() / 1e18);
		assert.equal(0, (await web3.eth.getBalance(milestone2.address)).toNumber() / 1e18);
		assert.equal(0, (await web3.eth.getBalance(milestone3.address)).toNumber() / 1e18);
		await splitter.processFunds(0.08e18, { value: 0.08e18 });

		assert.equal(0.1, (await web3.eth.getBalance(milestone1.address)).toNumber() / 1e18);
		assert.equal(0.02, (await web3.eth.getBalance(milestone2.address)).toNumber() / 1e18);
		assert.equal(0, (await web3.eth.getBalance(milestone3.address)).toNumber() / 1e18);

		var totalNeed = await splitter.getTotalNeeded(1e22);
		var minNeed = await splitter.getMinNeeded(1e22);
		var isNeed = await splitter.isNeeds();
		assert.equal(totalNeed.toNumber(), 0.88e18);
		assert.equal(minNeed.toNumber(), 0);
		assert.equal(isNeed, true);

		await splitter.processFunds(0.4e18, { value: 0.4e18 });

		assert.equal(0.1, (await web3.eth.getBalance(milestone1.address)).toNumber() / 1e18);
		assert.equal(0.2, (await web3.eth.getBalance(milestone2.address)).toNumber() / 1e18);
		assert.equal(0.22, (await web3.eth.getBalance(milestone3.address)).toNumber() / 1e18);

		await splitter.processFunds(0.48e18, { value: 0.48e18 });

		assert.equal(0.1, (await web3.eth.getBalance(milestone1.address)).toNumber() / 1e18);
		assert.equal(0.2, (await web3.eth.getBalance(milestone2.address)).toNumber() / 1e18);
		assert.equal(0.7, (await web3.eth.getBalance(milestone3.address)).toNumber() / 1e18);

		var totalNeed = await splitter.getTotalNeeded(1e22);
		var minNeed = await splitter.getMinNeeded(1e22);
		var isNeed = await splitter.isNeeds();
		assert.equal(totalNeed.toNumber(), 0);
		assert.equal(minNeed.toNumber(), 0);

		await splitter.processFunds(0.5e18, { value: 0.5e18 }).should.be.rejectedWith('revert');
	});

	it('Should implement roadmap pattern with funds (-> abs-abs-abs-bigCap)', async () => {
		let splitter = await WeiSplitter.new();

		let milestone1 = await WeiAbsoluteExpense.new(0.1e18, 0);
		let milestone2 = await WeiAbsoluteExpense.new(0.2e18, 0);
		let milestone3 = await WeiAbsoluteExpense.new(0.7e18, 0);
		let stabFund = await WeiAbsoluteExpense.new(1e30, 0);
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

		await splitter.processFunds(0.01e18, { value: 0.01e18 });

		assert.equal(0.01, (await web3.eth.getBalance(milestone1.address)).toNumber() / 1e18);
		assert.equal(0, (await web3.eth.getBalance(milestone2.address)).toNumber() / 1e18);
		assert.equal(0, (await web3.eth.getBalance(milestone3.address)).toNumber() / 1e18);
		await splitter.processFunds(0.03e18, { value: 0.03e18 });

		assert.equal(0.04, (await web3.eth.getBalance(milestone1.address)).toNumber() / 1e18);
		assert.equal(0, (await web3.eth.getBalance(milestone2.address)).toNumber() / 1e18);
		assert.equal(0, (await web3.eth.getBalance(milestone3.address)).toNumber() / 1e18);
		await splitter.processFunds(0.08e18, { value: 0.08e18 });

		assert.equal(0.1, (await web3.eth.getBalance(milestone1.address)).toNumber() / 1e18);
		assert.equal(0.02, (await web3.eth.getBalance(milestone2.address)).toNumber() / 1e18);
		assert.equal(0, (await web3.eth.getBalance(milestone3.address)).toNumber() / 1e18);

		var totalNeed = await splitter.getTotalNeeded(0.88e18);
		var minNeed = await splitter.getMinNeeded(0.88e18);
		var isNeed = await splitter.isNeeds();
		assert.equal(totalNeed.toNumber(), 0.88e18);
		assert.equal(minNeed.toNumber(), 0);
		assert.equal(isNeed, true);

		await splitter.processFunds(0.4e18, { value: 0.4e18 });

		assert.equal(0.1, (await web3.eth.getBalance(milestone1.address)).toNumber() / 1e18);
		assert.equal(0.2, (await web3.eth.getBalance(milestone2.address)).toNumber() / 1e18);
		assert.equal(0.22, (await web3.eth.getBalance(milestone3.address)).toNumber() / 1e18);

		await splitter.processFunds(0.48e18, { value: 0.48e18 });

		assert.equal(0.1, (await web3.eth.getBalance(milestone1.address)).toNumber() / 1e18);
		assert.equal(0.2, (await web3.eth.getBalance(milestone2.address)).toNumber() / 1e18);
		assert.equal(0.7, (await web3.eth.getBalance(milestone3.address)).toNumber() / 1e18);

		var totalNeed = await splitter.getTotalNeeded(1e18);
		var minNeed = await splitter.getMinNeeded(1e18);
		var isNeed = await splitter.isNeeds();
		assert.equal(totalNeed.toNumber(), 1e18);
		assert.equal(minNeed.toNumber(), 0);

		await splitter.processFunds(0.3e18, { value: 0.3e18 });
		await splitter.processFunds(0.5e18, { value: 0.5e18 });
		await splitter.processFunds(0.7e18, { value: 0.7e18 });

		assert.equal(0.1, (await web3.eth.getBalance(milestone1.address)).toNumber() / 1e18);
		assert.equal(0.2, (await web3.eth.getBalance(milestone2.address)).toNumber() / 1e18);
		assert.equal(0.7, (await web3.eth.getBalance(milestone3.address)).toNumber() / 1e18);
		assert.equal(1.5, (await web3.eth.getBalance(stabFund.address)).toNumber() / 1e18);
	});
});
