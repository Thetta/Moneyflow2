const {getNodeId} = require('../helpers/utils');

async function checkParamsCycle (targets, flowArr, minNeedArr, totalNeedArr, isNeedArr) {
	for(var i=0; i<targets.length; i++) {
		assert.equal((await targets[i].getMinNeeded(flowArr[i]*1e14)).toNumber() / 1e14, minNeedArr[i]);	
		assert.equal((await targets[i].getTotalNeeded(flowArr[i]*1e14)).toNumber() / 1e14, totalNeedArr[i]);
		assert.equal((await targets[i].isNeeds()), isNeedArr[i]);
	}
}

async function checkNeededArrs(salaries, multiplier, flow, need) {
	for(var i=0; i<flow.length; i++) {
		assert.equal((await salaries.getMinNeeded(flow[i]*multiplier)).toNumber() / multiplier, need[i]);
	}
}

async function createStructure(p, absolute, relative, splitter) {
	var callParams = { gasPrice: 0 };
	var o = {};
	if(p.token) { 
		o.AllOutputs = await splitter.new(p.token, callParams);
		o.Spends = await splitter.new(p.token, callParams);
		o.Salaries = await splitter.new(p.token, callParams);
		o.Employee1 = await absolute.new(p.token, p.e1*p.multiplier, p.e1*p.multiplier, callParams);
		o.Employee2 = await absolute.new(p.token, p.e2*p.multiplier, p.e2*p.multiplier, callParams);
		o.Employee3 = await absolute.new(p.token, p.e3*p.multiplier, p.e3*p.multiplier, callParams);
		o.Other = await splitter.new(p.token, callParams);
		o.Office = await absolute.new(p.token, p.office*p.multiplier, p.office*p.multiplier, callParams);
		o.Internet = await absolute.new(p.token, p.internet*p.multiplier, p.internet*p.multiplier, callParams);
		o.Tasks = await splitter.new(p.token, callParams);
		o.Task1 = await absolute.new(p.token, p.t1*p.multiplier, p.t1*p.multiplier, callParams);
		o.Task2 = await absolute.new(p.token, p.t2*p.multiplier, p.t2*p.multiplier, callParams);
		o.Task3 = await absolute.new(p.token, p.t3*p.multiplier, p.t3*p.multiplier, callParams);
		o.Bonuses = await splitter.new(p.token, callParams);
		o.Bonus1 = await relative.new(p.token, p.b1, callParams);
		o.Bonus2 = await relative.new(p.token, p.b2, callParams);
		o.Bonus3 = await relative.new(p.token, p.b3, callParams);
		o.Rest = await splitter.new(p.token, callParams);
		o.ReserveFund = await relative.new(p.token, p.reserve, callParams);
		o.DividendsFund = await relative.new(p.token, p.dividends, callParams);
	} else {
		o.AllOutputs = await splitter.new(callParams);
		o.Spends = await splitter.new(callParams);
		o.Salaries = await splitter.new(callParams);
		o.Employee1 = await absolute.new(p.e1*p.multiplier, p.e1*p.multiplier, callParams);
		o.Employee2 = await absolute.new(p.e2*p.multiplier, p.e2*p.multiplier, callParams);
		o.Employee3 = await absolute.new(p.e3*p.multiplier, p.e3*p.multiplier, callParams);
		o.Other = await splitter.new(callParams);
		o.Office = await absolute.new(p.office*p.multiplier, p.office*p.multiplier, callParams);
		o.Internet = await absolute.new(p.internet*p.multiplier, p.internet*p.multiplier, callParams);
		o.Tasks = await splitter.new(callParams);
		o.Task1 = await absolute.new(p.t1*p.multiplier, p.t1*p.multiplier, callParams);
		o.Task2 = await absolute.new(p.t2*p.multiplier, p.t2*p.multiplier, callParams);
		o.Task3 = await absolute.new(p.t3*p.multiplier, p.t3*p.multiplier, callParams);
		o.Bonuses = await splitter.new(callParams);
		o.Bonus1 = await relative.new(p.b1, callParams);
		o.Bonus2 = await relative.new(p.b2, callParams);
		o.Bonus3 = await relative.new(p.b3, callParams);
		o.Rest = await splitter.new(callParams);
		o.ReserveFund = await relative.new(p.reserve, callParams);
		o.DividendsFund = await relative.new(p.dividends, callParams);		
	}
	// CONNECTIONS
	await o.AllOutputs.addChild(o.Spends.address, callParams);
	await o.Spends.addChild(o.Salaries.address, callParams);
	await o.Salaries.addChild(o.Employee1.address, callParams);
	await o.Salaries.addChild(o.Employee2.address, callParams);
	await o.Salaries.addChild(o.Employee3.address, callParams);
	await o.Spends.addChild(o.Other.address, callParams);
	await o.Other.addChild(o.Office.address, callParams);
	await o.Other.addChild(o.Internet.address, callParams);
	await o.Spends.addChild(o.Tasks.address, callParams);
	await o.Tasks.addChild(o.Task1.address, callParams);
	await o.Tasks.addChild(o.Task2.address, callParams);
	await o.Tasks.addChild(o.Task3.address, callParams);
	await o.AllOutputs.addChild(o.Bonuses.address, callParams);
	await o.Bonuses.addChild(o.Bonus1.address, callParams);
	await o.Bonuses.addChild(o.Bonus2.address, callParams);
	await o.Bonuses.addChild(o.Bonus3.address, callParams);
	await o.AllOutputs.addChild(o.Rest.address, callParams);
	await o.Rest.addChild(o.ReserveFund.address, callParams);
	await o.Rest.addChild(o.DividendsFund.address, callParams);

	return o;
}

async function totalAndMinNeedsAsserts(i, p) {
	var totalSpend = p.e1 + p.e2 + p.e3 + p.t1 + p.t2 + p.t3 + p.office + p.internet;
	var bonusesSpendPercent = (p.CURRENT_INPUT - totalSpend) / 1000000;
	var fundsPercent = (p.CURRENT_INPUT - totalSpend - bonusesSpendPercent*(p.b1 + p.b2 + p.b3)) / 1000000;

	var allNeeds = totalSpend + bonusesSpendPercent*(p.b1 + p.b2 + p.b3) + fundsPercent*(p.reserve + p.dividends);

	assert.equal(i.AllOutputsTotalNeed.toNumber() / p.multiplier, allNeeds);
	assert.equal(i.AllOutputsMinNeed.toNumber() / p.multiplier, totalSpend);
	assert.equal(i.SpendsTotalNeed.toNumber() / p.multiplier, totalSpend);
	assert.equal(i.SpendsMinNeed.toNumber() / p.multiplier, totalSpend);
	assert.equal(i.SalariesTotalNeed.toNumber() / p.multiplier, p.e1 + p.e2 + p.e3);
	assert.equal(i.SalariesMinNeed.toNumber() / p.multiplier, p.e1 + p.e2 + p.e3);
	assert.equal(i.OtherTotalNeed.toNumber() / p.multiplier, p.office + p.internet);
	assert.equal(i.OtherMinNeed.toNumber() / p.multiplier, p.office + p.internet);
	assert.equal(i.TasksTotalNeed.toNumber() / p.multiplier, p.t1 + p.t2 + p.t3);
	assert.equal(i.TasksMinNeed.toNumber() / p.multiplier, p.t1 + p.t2 + p.t3);
	assert.equal(i.BonusesTotalNeed.toNumber() / p.multiplier, (p.b1 + p.b2 + p.b3)*p.CURRENT_INPUT / 1000000);
	assert.equal(i.BonusesMinNeed.toNumber() / p.multiplier, 0);
	assert.equal(i.RestTotalNeed.toNumber() / p.multiplier, (p.reserve + p.dividends)*p.CURRENT_INPUT / 1000000);
	assert.equal(i.RestMinNeed.toNumber() / p.multiplier, 0);
}

async function getBalances(i, getter) {
	var o = {};
	o.Employee1Balance = await getter(i.Employee1.address);
	o.Employee2Balance = await getter(i.Employee2.address);
	o.Employee3Balance = await getter(i.Employee3.address);
	o.OfficeBalance = await getter(i.Office.address);
	o.InternetBalance = await getter(i.Internet.address);
	o.Task1Balance = await getter(i.Task1.address);
	o.Task2Balance = await getter(i.Task2.address);
	o.Task3Balance = await getter(i.Task3.address);
	o.Reserve3Balance = await getter(i.ReserveFund.address);
	o.Dividends3Balance = await getter(i.DividendsFund.address);
	o.Bonus1Balance = await getter(i.Bonus1.address);
	o.Bonus2Balance = await getter(i.Bonus2.address);
	o.Bonus3Balance = await getter(i.Bonus3.address);
	o.AllOutputsBalance = await getter(i.AllOutputs.address);
	o.SpendsBalance = await getter(i.Spends.address);
	o.SalariesBalance = await getter(i.Salaries.address);
	o.OtherBalance = await getter(i.Other.address);
	o.TasksBalance = await getter(i.Tasks.address);
	o.BonusesBalance = await getter(i.Bonuses.address);
	o.RestBalance = await getter(i.Rest.address);

	return o;
}

async function getSplitterParams(i, p) {
	var o = {};
	o.AllOutputsTotalNeed = await i.AllOutputs.getTotalNeeded(p.CURRENT_INPUT*p.multiplier);
	o.AllOutputsMinNeed = await i.AllOutputs.getMinNeeded(p.CURRENT_INPUT*p.multiplier);
	o.AllOutputsChildrenCount = await i.AllOutputs.getChildrenCount();
	o.SpendsTotalNeed = await i.Spends.getTotalNeeded(p.CURRENT_INPUT*p.multiplier);
	o.SpendsMinNeed = await i.Spends.getMinNeeded(p.CURRENT_INPUT*p.multiplier);
	o.SpendsChildrenCount = await i.Spends.getChildrenCount();
	o.SalariesTotalNeed = await i.Salaries.getTotalNeeded(p.CURRENT_INPUT*p.multiplier);
	o.SalariesMinNeed = await i.Salaries.getMinNeeded(p.CURRENT_INPUT*p.multiplier);
	o.SalariesChildrenCount = await i.Salaries.getChildrenCount();
	o.OtherTotalNeed = await i.Other.getTotalNeeded(p.CURRENT_INPUT*p.multiplier);
	o.OtherMinNeed = await i.Other.getMinNeeded(p.CURRENT_INPUT*p.multiplier);
	o.OtherChildrenCount = await i.Other.getChildrenCount();
	o.TasksTotalNeed = await i.Tasks.getTotalNeeded(p.CURRENT_INPUT*p.multiplier);
	o.TasksMinNeed = await i.Tasks.getMinNeeded(p.CURRENT_INPUT*p.multiplier);
	o.TasksChildrenCount = await i.Tasks.getChildrenCount();
	o.BonusesTotalNeed = await i.Bonuses.getTotalNeeded(p.CURRENT_INPUT*p.multiplier);
	o.BonusesMinNeed = await i.Bonuses.getMinNeeded(p.CURRENT_INPUT*p.multiplier);
	o.BonusesChildrenCount = await i.Bonuses.getChildrenCount();
	o.RestTotalNeed = await i.Rest.getTotalNeeded(p.CURRENT_INPUT*p.multiplier);
	o.RestMinNeed = await i.Rest.getMinNeeded(p.CURRENT_INPUT*p.multiplier);
	o.RestChildrenCount = await i.Rest.getChildrenCount();

	return o;
}

async function structureAsserts(i) {
	assert.equal(i.AllOutputsChildrenCount.toNumber(), 3);
	assert.equal(i.SpendsChildrenCount.toNumber(), 3);
	assert.equal(i.SalariesChildrenCount.toNumber(), 3);
	assert.equal(i.OtherChildrenCount.toNumber(), 2);
	assert.equal(i.TasksChildrenCount.toNumber(), 3);
	assert.equal(i.BonusesChildrenCount.toNumber(), 3);
	assert.equal(i.RestChildrenCount.toNumber(), 2);
}

async function balancesAsserts(i, p) {
	var totalSpend = p.e1 + p.e2 + p.e3 + p.t1 + p.t2 + p.t3 + p.office + p.internet;
	var bonusesSpendPercent = (p.CURRENT_INPUT - totalSpend) / 1000000;
	var fundsPercent = (p.CURRENT_INPUT - totalSpend - bonusesSpendPercent*(p.b1 + p.b2 + p.b3)) / 1000000;

	assert.equal(i.Employee1Balance.toNumber() / p.multiplier, p.e1);
	assert.equal(i.Employee2Balance.toNumber() / p.multiplier, p.e2);
	assert.equal(i.Employee3Balance.toNumber() / p.multiplier, p.e3);
	assert.equal(i.OfficeBalance.toNumber() / p.multiplier, p.office);
	assert.equal(i.InternetBalance.toNumber() / p.multiplier, p.internet);
	assert.equal(i.Task1Balance.toNumber() / p.multiplier, p.t1);
	assert.equal(i.Task2Balance.toNumber() / p.multiplier, p.t2);
	assert.equal(i.Task3Balance.toNumber() / p.multiplier, p.t3);

	assert.equal(i.Bonus1Balance.toNumber() / p.multiplier, bonusesSpendPercent*p.b1);
	assert.equal(i.Bonus2Balance.toNumber() / p.multiplier, bonusesSpendPercent*p.b2);
	assert.equal(i.Bonus3Balance.toNumber() / p.multiplier, bonusesSpendPercent*p.b3);

	assert.equal(i.Reserve3Balance.toNumber() / p.multiplier, fundsPercent*p.reserve);
	assert.equal(i.Dividends3Balance.toNumber() / p.multiplier, fundsPercent*p.dividends);
}

async function splitterBalancesAsserts(i) {
	assert.equal(i.AllOutputsBalance.toNumber(), 0);
	assert.equal(i.SpendsBalance.toNumber(), 0);
	assert.equal(i.SalariesBalance.toNumber(), 0);
	assert.equal(i.OtherBalance.toNumber(), 0);
	assert.equal(i.TasksBalance.toNumber(), 0);
	assert.equal(i.BonusesBalance.toNumber(), 0);
	assert.equal(i.RestBalance.toNumber(), 0);
}

async function createStructureTable(p, table) {
	var o = {};
	if(p.token) {
		o.table = await table.new(p.token);	
	} else {
		o.table = await table.new();
	}
	
	o.AllOutputsId = getNodeId(await o.table.addSplitter());
	o.SpendsId = getNodeId(await o.table.addSplitter());
	o.SalariesId = getNodeId(await o.table.addSplitter());
	o.Employee1Id = getNodeId(await o.table.addAbsoluteExpense(p.e1 * p.multiplier, p.e1 * p.multiplier, false, false, 0));
	o.Employee2Id = getNodeId(await o.table.addAbsoluteExpense(p.e2 * p.multiplier, p.e2 * p.multiplier, false, false, 0));
	o.Employee3Id = getNodeId(await o.table.addAbsoluteExpense(p.e3 * p.multiplier, p.e3 * p.multiplier, false, false, 0));
	o.OtherId = getNodeId(await o.table.addSplitter());
	o.OfficeId = getNodeId(await o.table.addAbsoluteExpense(p.office * p.multiplier, p.office * p.multiplier, false, false, 0));
	o.InternetId = getNodeId(await o.table.addAbsoluteExpense(p.internet * p.multiplier, p.internet * p.multiplier, false, false, 0));
	o.TasksId = getNodeId(await o.table.addSplitter());
	o.Task1Id = getNodeId(await o.table.addAbsoluteExpense(p.t1 * p.multiplier, p.t1 * p.multiplier, false, false, 0));
	o.Task2Id = getNodeId(await o.table.addAbsoluteExpense(p.t2 * p.multiplier, p.t2 * p.multiplier, false, false, 0));
	o.Task3Id = getNodeId(await o.table.addAbsoluteExpense(p.t3 * p.multiplier, p.t3 * p.multiplier, false, false, 0));
	o.BonusesId = getNodeId(await o.table.addSplitter());
	o.Bonus1Id = getNodeId(await o.table.addRelativeExpense(p.b1, false, false, 0));
	o.Bonus2Id = getNodeId(await o.table.addRelativeExpense(p.b2, false, false, 0));
	o.Bonus3Id = getNodeId(await o.table.addRelativeExpense(p.b3, false, false, 0));
	o.RestId = getNodeId(await o.table.addSplitter());
	o.DividendsFundId = getNodeId(await o.table.addRelativeExpense(p.dividends, false, false, 0));
	o.ReserveFundId = getNodeId(await o.table.addRelativeExpense(p.reserve, false, false, 0));
	
	await o.table.addChildAt(o.AllOutputsId, o.SpendsId);
	await o.table.addChildAt(o.SpendsId, o.SalariesId);
	await o.table.addChildAt(o.SalariesId, o.Employee1Id);
	await o.table.addChildAt(o.SalariesId, o.Employee2Id);
	await o.table.addChildAt(o.SalariesId, o.Employee3Id);
	await o.table.addChildAt(o.SpendsId, o.OtherId);
	await o.table.addChildAt(o.OtherId, o.OfficeId);
	await o.table.addChildAt(o.OtherId, o.InternetId);
	await o.table.addChildAt(o.SpendsId, o.TasksId);
	await o.table.addChildAt(o.TasksId, o.Task1Id);
	await o.table.addChildAt(o.TasksId, o.Task2Id);
	await o.table.addChildAt(o.TasksId, o.Task3Id);
	await o.table.addChildAt(o.AllOutputsId, o.BonusesId);
	await o.table.addChildAt(o.BonusesId, o.Bonus1Id);
	await o.table.addChildAt(o.BonusesId, o.Bonus2Id);
	await o.table.addChildAt(o.BonusesId, o.Bonus3Id);
	await o.table.addChildAt(o.AllOutputsId, o.RestId);
	await o.table.addChildAt(o.RestId, o.DividendsFundId);
	await o.table.addChildAt(o.RestId, o.ReserveFundId);
	return o;
}

async function totalAndMinNeedsAssertsTable(i, p) {
	var totalSpend = p.e1 + p.e2 + p.e3 + p.t1 + p.t2 + p.t3 + p.office + p.internet;
	var bonusesSpendPercent = (p.CURRENT_INPUT - totalSpend) / 1000000;
	var rest = p.CURRENT_INPUT - totalSpend - (bonusesSpendPercent * (p.b1 + p.b2 + p.b3));

	var dividendsAmount = 0;
	var reserveAmount = 0;
	if(rest<=0){

	}else if(rest<=p.dividends){
		dividendsAmount = rest;
		reserveAmount = 0;
	}else{
		dividendsAmount = p.dividends;
		reserveAmount = rest - dividendsAmount;
	}
	var allNeeds = totalSpend + (bonusesSpendPercent * (p.b1 + p.b2 + p.b3)) + (dividendsAmount + reserveAmount);

	assert.equal((new web3.BigNumber(i.AllOutputsTotalNeed).div(p.multiplier)).toNumber(), allNeeds);
	assert.equal((new web3.BigNumber(i.AllOutputsMinNeed).div(p.multiplier)).toNumber(), totalSpend);
	assert.equal((new web3.BigNumber(i.SpendsTotalNeed).div(p.multiplier)).toNumber(), totalSpend);
	assert.equal((new web3.BigNumber(i.SpendsMinNeed).div(p.multiplier)).toNumber(), totalSpend);
	assert.equal((new web3.BigNumber(i.SalariesTotalNeed).div(p.multiplier)).toNumber(), p.e1 + p.e2 + p.e3);
	assert.equal((new web3.BigNumber(i.SalariesMinNeed).div(p.multiplier)).toNumber(), p.e1 + p.e2 + p.e3);
	assert.equal((new web3.BigNumber(i.OtherTotalNeed).div(p.multiplier)).toNumber(), p.office + p.internet);
	assert.equal((new web3.BigNumber(i.OtherMinNeed).div(p.multiplier)).toNumber(), p.office + p.internet);
	assert.equal((new web3.BigNumber(i.TasksTotalNeed).div(p.multiplier)).toNumber(), p.t1 + p.t2 + p.t3);
	assert.equal((new web3.BigNumber(i.TasksMinNeed).div(p.multiplier)).toNumber(), p.t1 + p.t2 + p.t3);
	assert.equal((new web3.BigNumber(i.BonusesTotalNeed).div(p.multiplier)).toNumber(), (p.b1 + p.b2 + p.b3) * p.CURRENT_INPUT / 1000000);
	assert.equal((new web3.BigNumber(i.BonusesMinNeed).div(p.multiplier)).toNumber(), 0);
	assert.equal((new web3.BigNumber(i.RestTotalNeed).div(p.multiplier)).toNumber(), p.CURRENT_INPUT);
	assert.equal((new web3.BigNumber(i.RestMinNeed).div(p.multiplier)).toNumber(), 0);
}

async function getBalancesTable(i) {
	var o = {};
	o.Employee1Balance = await i.table.balanceAt(i.Employee1Id);
	o.Employee2Balance = await i.table.balanceAt(i.Employee2Id);
	o.Employee3Balance = await i.table.balanceAt(i.Employee3Id);
	o.OfficeBalance = await i.table.balanceAt(i.OfficeId);
	o.InternetBalance = await i.table.balanceAt(i.InternetId);
	o.Task1Balance = await i.table.balanceAt(i.Task1Id);
	o.Task2Balance = await i.table.balanceAt(i.Task2Id);
	o.Task3Balance = await i.table.balanceAt(i.Task3Id);
	o.ReserveBalance = await i.table.balanceAt(i.ReserveFundId);
	o.DividendsBalance = await i.table.balanceAt(i.DividendsFundId);
	o.Bonus1Balance = await i.table.balanceAt(i.Bonus1Id);
	o.Bonus2Balance = await i.table.balanceAt(i.Bonus2Id);
	o.Bonus3Balance = await i.table.balanceAt(i.Bonus3Id);
	o.AllOutputsBalance = await i.table.balanceAt(i.AllOutputsId);
	o.SpendsBalance = await i.table.balanceAt(i.SpendsId);
	o.SalariesBalance = await i.table.balanceAt(i.SalariesId);
	o.OtherBalance = await i.table.balanceAt(i.OtherId);
	o.TasksBalance = await i.table.balanceAt(i.TasksId);
	o.BonusesBalance = await i.table.balanceAt(i.BonusesId);
	o.RestBalance = await i.table.balanceAt(i.RestId);

	return o;
}

async function getSplitterParamsTable(i, p) {
	var o = {};
	o.AllOutputsTotalNeed = await i.table.getTotalNeededAt(i.AllOutputsId, p.CURRENT_INPUT * p.multiplier);
	o.AllOutputsMinNeed = await i.table.getMinNeededAt(i.AllOutputsId, p.CURRENT_INPUT * p.multiplier);
	o.AllOutputsChildrenCount = await i.table.getChildrenCountAt(i.AllOutputsId);
	o.SpendsTotalNeed = await i.table.getTotalNeededAt(i.SpendsId, p.CURRENT_INPUT * p.multiplier);
	o.SpendsMinNeed = await i.table.getMinNeededAt(i.SpendsId, p.CURRENT_INPUT * p.multiplier);
	o.SpendsChildrenCount = await i.table.getChildrenCountAt(i.SpendsId);
	o.SalariesTotalNeed = await i.table.getTotalNeededAt(i.SalariesId, p.CURRENT_INPUT * p.multiplier);
	o.SalariesMinNeed = await i.table.getMinNeededAt(i.SalariesId, p.CURRENT_INPUT * p.multiplier);
	o.SalariesChildrenCount = await i.table.getChildrenCountAt(i.SalariesId);
	o.OtherTotalNeed = await i.table.getTotalNeededAt(i.OtherId, p.CURRENT_INPUT * p.multiplier);
	o.OtherMinNeed = await i.table.getMinNeededAt(i.OtherId, p.CURRENT_INPUT * p.multiplier);
	o.OtherChildrenCount = await i.table.getChildrenCountAt(i.OtherId);
	o.TasksTotalNeed = await i.table.getTotalNeededAt(i.TasksId, p.CURRENT_INPUT * p.multiplier);
	o.TasksMinNeed = await i.table.getMinNeededAt(i.TasksId, p.CURRENT_INPUT * p.multiplier);
	o.TasksChildrenCount = await i.table.getChildrenCountAt(i.TasksId);
	o.BonusesTotalNeed = await i.table.getTotalNeededAt(i.BonusesId, p.CURRENT_INPUT * p.multiplier);
	o.BonusesMinNeed = await i.table.getMinNeededAt(i.BonusesId, p.CURRENT_INPUT * p.multiplier);
	o.BonusesChildrenCount = await i.table.getChildrenCountAt(i.BonusesId);
	o.RestTotalNeed = await i.table.getTotalNeededAt(i.RestId, p.CURRENT_INPUT * p.multiplier);
	o.RestMinNeed = await i.table.getMinNeededAt(i.RestId, p.CURRENT_INPUT * p.multiplier);
	o.RestChildrenCount = await i.table.getChildrenCountAt(i.RestId);

	return o;
}

async function structureAssertsTable(i) {
	assert.equal(i.AllOutputsChildrenCount.toNumber(), 3);
	assert.equal(i.SpendsChildrenCount.toNumber(), 3);
	assert.equal(i.SalariesChildrenCount.toNumber(), 3);
	assert.equal(i.OtherChildrenCount.toNumber(), 2);
	assert.equal(i.TasksChildrenCount.toNumber(), 3);
	assert.equal(i.BonusesChildrenCount.toNumber(), 3);
	assert.equal(i.RestChildrenCount.toNumber(), 2);
}

async function balancesAssertsTable(i, p) {
	var totalSpend = p.e1 + p.e2 + p.e3 + p.t1 + p.t2 + p.t3 + p.office + p.internet;
	var bonusesSpendPercent = (p.CURRENT_INPUT - totalSpend) / 1000000;
	var fundsPercent = (p.CURRENT_INPUT - totalSpend - bonusesSpendPercent*(p.b1 + p.b2 + p.b3)) / 1000000;
	
	assert.equal((new web3.BigNumber(i.Employee1Balance).div(p.multiplier)).toNumber(), p.e1);
	assert.equal((new web3.BigNumber(i.Employee2Balance).div(p.multiplier)).toNumber(), p.e2);
	assert.equal((new web3.BigNumber(i.Employee3Balance).div(p.multiplier)).toNumber(), p.e3);
	assert.equal((new web3.BigNumber(i.OfficeBalance).div(p.multiplier)).toNumber(), p.office);
	assert.equal((new web3.BigNumber(i.InternetBalance).div(p.multiplier)).toNumber(), p.internet);
	assert.equal((new web3.BigNumber(i.Task1Balance).div(p.multiplier)).toNumber(), p.t1);
	assert.equal((new web3.BigNumber(i.Task2Balance).div(p.multiplier)).toNumber(), p.t2);
	assert.equal((new web3.BigNumber(i.Task3Balance).div(p.multiplier)).toNumber(), p.t3);
	assert.equal((new web3.BigNumber(i.Bonus1Balance).div(p.multiplier)).toNumber(), bonusesSpendPercent * p.b1);
	assert.equal((new web3.BigNumber(i.Bonus2Balance).div(p.multiplier)).toNumber(), bonusesSpendPercent * p.b2);
	assert.equal((new web3.BigNumber(i.Bonus3Balance).div(p.multiplier)).toNumber(), bonusesSpendPercent * p.b3);
	assert.equal((new web3.BigNumber(i.DividendsBalance).div(p.multiplier)).toNumber(), fundsPercent*p.dividends);
	assert.equal((new web3.BigNumber(i.ReserveBalance).div(p.multiplier)).toNumber(), fundsPercent*p.reserve);
}

module.exports = {
	checkNeededArrs,
	checkMinNeedCycle,
	checkTotalNeedCycle,
	checkIsNeedCycle,
	createStructure,
	totalAndMinNeedsAsserts,
	getBalances,
	getSplitterParams,
	structureAsserts,
	balancesAsserts,
	splitterBalancesAsserts,
	createStructureTable,
	totalAndMinNeedsAssertsTable,
	getBalancesTable,
	getSplitterParamsTable,
	structureAssertsTable,
	balancesAssertsTable
}