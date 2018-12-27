var WeiSplitter = artifacts.require('./WeiSplitter');
var WeiAbsoluteExpense = artifacts.require('./WeiAbsoluteExpense');
var WeiRelativeExpense = artifacts.require('./WeiRelativeExpense');
var WeiAbsoluteExpenseWithPeriod = artifacts.require('./WeiAbsoluteExpenseWithPeriod');
var WeiRelativeExpenseWithPeriod = artifacts.require('./WeiRelativeExpenseWithPeriod');

var DefaultMoneyflowSchemeWithUnpackers = artifacts.require('./DefaultMoneyflowSchemeWithUnpackers');

function KECCAK256 (x) {
	return web3.sha3(x);
}

contract('Scheme', (accounts) => {
	let token;
	let store;
	let daoBase;
	let moneyflowScheme;

	let money = web3.toWei(0.001, 'ether');

	const creator = accounts[0];
	const employee1 = accounts[1];
	const output = accounts[2];

	beforeEach(async () => {
		moneyflowScheme = await DefaultMoneyflowSchemeWithUnpackers.new(output, 5000, 5000, { from: creator, gasPrice: 1 });
		await moneyflowScheme.deployRoot({ from: creator, gasPrice: 1 });
	});

	it('should set everything correctly', async () => {
		// TODO: test DefaultMoneyflowScheme
	});
});