var WeiSplitter = artifacts.require('./WeiSplitter');
var WeiAbsoluteExpense = artifacts.require('./WeiAbsoluteExpense');
var WeiRelativeExpense = artifacts.require('./WeiRelativeExpense');
var WeiAbsoluteExpenseWithPeriod = artifacts.require('./WeiAbsoluteExpenseWithPeriod');
var WeiRelativeExpenseWithPeriod = artifacts.require('./WeiRelativeExpenseWithPeriod');

var DefaultMoneyflowSchemeWithUnpackers = artifacts.require('./DefaultMoneyflowSchemeWithUnpackers');

contract('Scheme', (accounts) => {
	let token;
	let moneyflowScheme;

	let money = 1e14;

	const creator = accounts[0];
	const employee1 = accounts[1];
	const output = accounts[2];

	/*beforeEach(async () => {
		moneyflowScheme = await DefaultMoneyflowSchemeWithUnpackers.new(output, 5000, 5000, { from: creator, gasPrice: 1 });
		await moneyflowScheme.deployRoot({ from: creator, gasPrice: 1 });
	});*/

	it('Should set everything correctly', async () => {
		// TODO: test DefaultMoneyflowScheme
	});
});