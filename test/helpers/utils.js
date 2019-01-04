async function passHours (hours) {
	await web3.currentProvider.sendAsync({
		jsonrpc: '2.0',
		method: 'evm_increaseTime',
		params: [3600 * hours * 1000],
		id: new Date().getTime(),
	}, function (err) { if (err) console.log('err:', err); });
}

const getNodeId = o => o.logs.filter(l => l.event == 'NodeAdded')[0].args._eId.toNumber();

const BigNumber = web3.BigNumber;

module.exports = {
	passHours,
	getNodeId
}