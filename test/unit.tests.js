const IReceiver = artifacts.require('./IReceiver');
const SplitterBase = artifacts.require('./SplitterBase');
const ExpenseBase = artifacts.require('./ExpenseBase');
const TableBase = artifacts.require('./TableBase');

const {passHours, getNodeId} = require('./helpers/utils');

require('chai')
	.use(require('chai-as-promised'))
	.use(require('chai-bignumber')(web3.BigNumber))
	.should();

contract('Unit tests', (accounts) => {
	var amount = 1e14;
	var ppt = 100000;
	var exp;
	var spl;

	describe('Bases', function() {
		describe('Absolute expense', function() {
			beforeEach(async() => {
				exp = await ExpenseBase.new(amount, amount, 0, 0, false, false);
			});

			it('Should not create expense with 0 ppt and 0 TotalNeeded', async()=> {
				await ExpenseBase.new(0, 0, 0, 0, false, false).should.be.rejectedWith('revert');
			});

			it('Should return correct value for getReceiverType', async()=> {
				assert.equal((await exp.getReceiverType()), 0);
			});

			it('Should not accept money', async()=> {
				var err = false;
				try {
					await web3.eth.sendTransaction({to:exp.address, from:accounts[0], value:amount});
				} catch(error) {
					err = true;
				} finally {
					assert.isTrue(err);
				}
			});

			it('Should return correct value for getExpenseParams', async()=> {
				var data = await exp.getExpenseParams();
				assert.equal(data[0], amount);
				assert.equal(data[1], amount);
				assert.equal(data[2], 0);
				assert.equal(data[3], 0);
				assert.equal(data[4], 0);
				assert.equal(data[5], 0);
				assert.equal(data[6], 0);
				assert.equal(data[7], await web3.eth.getBlock(web3.eth.blockNumber).timestamp);
			});

			it('Should return correct value for getTotalNeeded', async()=> {
				assert.equal((await exp.getTotalNeeded(amount)), amount);
			});

			it('Should return correct value for getMinNeeded', async()=> {
				assert.equal((await exp.getMinNeeded(amount)), amount);
			});

			it('Should return correct value for isNeeds', async()=> {
				assert.equal((await exp.isNeeds()), true);
			});

			it('Should not setPercents for absolute expense', async()=> {
				await exp.setPercents(1e6).should.be.rejectedWith('revert');
			});

			describe('SetMinAmount', function() {
				it('Should not set Min Amount > TotalNeeded', async()=> {
					await exp.setMinAmount(amount - amount/10).should.be.rejectedWith('revert');
				});

				it('Should not set Min Amount that not a TotalNeeded multiplier', async()=> {
					await exp.setMinAmount(10*amount).should.be.rejectedWith('revert');
				});

				it('Should set Min Amount', async()=> {
					await exp.setMinAmount(amount/10).should.be.fulfilled;
				});

				it('Should return correct value after setMinAmount', async()=> {
					await exp.setMinAmount(amount/10).should.be.fulfilled;
					var data = await exp.getExpenseParams();
					assert.equal(data[1], amount/10);					
					assert.equal((await exp.getMinNeeded(amount/10)), amount/10);
				});
			});

			describe('SetTotalNeeded', function() {
				it('Should not set Min Amount > TotalNeeded', async()=> {
					await exp.setTotalNeeded(amount/2).should.be.rejectedWith('revert');
				});

				it('Should not set Min Amount that not a TotalNeeded multiplier', async()=> {
					await exp.setTotalNeeded(1.5*amount).should.be.rejectedWith('revert');
				});

				it('Should set Total Needed', async()=> {
					await exp.setTotalNeeded(10*amount).should.be.fulfilled;
				});

				it('Should not set Total Needed == 0', async()=> {
					await exp.setMinAmount(0).should.be.fulfilled;
					await exp.setTotalNeeded(0).should.be.rejectedWith('revert');
				});		

				it('Should return correct value after setTotalNeeded', async()=> {
					await exp.setTotalNeeded(10*amount).should.be.fulfilled;
					var data = await exp.getExpenseParams();
					assert.equal(data[0], 10*amount);
					assert.equal((await exp.getTotalNeeded(10*amount)), 10*amount);
				});
			});			
		});

		describe('Relative expense', function() {
			beforeEach(async() => {
				exp = await ExpenseBase.new(0, 0, ppt, 0, false, false);
			});

			it('Should return correct value for getReceiverType', async()=> {
				assert.equal((await exp.getReceiverType()), 1);
			});

			it('Should not accept money', async()=> {
				var err = false;
				try {
					await web3.eth.sendTransaction({to:exp.address, from:accounts[0], value:amount});
				} catch(error) {
					err = true;
				} finally {
					assert.isTrue(err);
				}
			});

			it('Should return correct value for getExpenseParams', async()=> {
				var data = await exp.getExpenseParams();
				assert.equal(data[0], 0);
				assert.equal(data[1], 0);
				assert.equal(data[2], ppt);
				assert.equal(data[3], 0);
				assert.equal(data[4], 0);
				assert.equal(data[5], 0);
				assert.equal(data[6], 0);
				assert.equal(data[7], await web3.eth.getBlock(web3.eth.blockNumber).timestamp);
			});	

			it('Should return correct value for getTotalNeeded', async()=> {
				assert.equal((await exp.getTotalNeeded(amount)).toNumber(), amount/10);
			});

			it('Should return correct value for getMinNeeded', async()=> {
				assert.equal((await exp.getMinNeeded(amount)), 0);
			});

			it('Should return correct value for isNeeds', async()=> {
				assert.equal((await exp.isNeeds()), true);
			});

			it('Should not setMinAmount for relative expense', async()=> {
				await exp.setMinAmount(amount/10).should.be.rejectedWith('revert');
			});

			it('Should not SetTotalNeeded for relative expense', async()=> {
				await exp.setTotalNeeded(2*amount).should.be.rejectedWith('revert');
			});

			describe('SetPercents', function() {
				it('Should not set Percents > 1e7', async()=> {
					await exp.setPercents(1e8).should.be.rejectedWith('revert');
				});

				it('Should set Percents', async()=> {
					await exp.setPercents(2*ppt).should.be.fulfilled;
				});

				it('Should return correct value after setPercents', async()=> {
					await exp.setPercents(2*ppt).should.be.fulfilled;
					var data = await exp.getExpenseParams();
					assert.equal(data[2], 2*ppt);
					assert.equal((await exp.getTotalNeeded(amount)).toNumber(), amount*2/10);
				});
			});
		});

		describe('Splitter', function() {
			beforeEach(async() => {
				spl = await SplitterBase.new();
			});

			it('Should return correct value for getReceiverType', async()=> {
				assert.equal((await spl.getReceiverType()), 2);
			});

			it('Should connect child', async()=> {
				var exp = await ExpenseBase.new(amount, amount, 0, 0, false, false);
				await spl.addChild(exp.address).should.be.fulfilled;
			});

			it('Should return correct child address', async()=> {
				var exp = await ExpenseBase.new(amount, amount, 0, 0, false, false);
				await spl.addChild(exp.address);
				assert.equal((await spl.getChild(0)), exp.address);
			});

			it('Should not accept money', async()=> {
				var exp = await ExpenseBase.new(amount, amount, 0, 0, false, false);
				await spl.addChild(exp.address);
				var err = false;
				try {
					await web3.eth.sendTransaction({to:spl.address, from:accounts[0], value:amount});
				} catch(error) {
					err = true;
				} finally {
					assert.isTrue(err);
				}
			});

			it('Should return isOpen value', async()=> {
				assert.equal((await spl.isOpen()), true);
			});

			it('Should return isOpen value after close', async()=> {
				await spl.close();
				assert.equal((await spl.isOpen()), false);
			});

			it('Should return isOpen value after open', async()=> {
				await spl.close();
				await spl.open();
				assert.equal((await spl.isOpen()), true);
			});			

		});

		describe('Table', function() {
			beforeEach(async() => {
				tbl = await TableBase.new();
			});

			it('Should return correct value for getReceiverType', async()=> {
				assert.equal((await tbl.getReceiverType()), 3);
			});

			it('Should not accept money', async()=> {
				await tbl.addAbsoluteExpense(amount, amount, false, false, 0);
				var err = false;
				try {
					await web3.eth.sendTransaction({to:tbl.address, from:accounts[0], value:amount});
				} catch(error) {
					err = true;
				} finally {
					assert.isTrue(err);
				}
			});			

			it('Should return correct lastNodeId', async()=> {
				await tbl.addAbsoluteExpense(amount, amount, false, false, 0);
				assert.equal((await tbl.getLastNodeId()).toNumber(), 0);
			});

			it('Should return isOpenAt for splitter', async()=> {
				await tbl.addSplitter();
				assert.equal((await tbl.isOpenAt(0)), true);
			});

			it('Should close splitter', async()=> {
				await tbl.addSplitter();
				await tbl.closeAt(0);
				assert.equal((await tbl.isOpenAt(0)), false);
			});

			it('Should open splitter', async()=> {
				await tbl.addSplitter();
				await tbl.closeAt(0);
				await tbl.openAt(0);
				assert.equal((await tbl.isOpenAt(0)), true);
			});	

			it('Should return ppm', async()=> {
				await tbl.addRelativeExpense(ppt, false, false, 0);
				assert.equal((await tbl.getPartsPerMillionAt(0)), ppt);
			});						
		});
	});
});

