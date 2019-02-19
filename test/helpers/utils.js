async function passHours (web3, hours) {
	web3.currentProvider.send({
		jsonrpc: '2.0',
		method: 'evm_increaseTime',
		params: [3600 * hours * 1000],
		id: new Date().getTime(),
	}, function (err) { if (err) console.log('err:', err); });
}

const getNodeId = o => o.logs.filter(l => l.event == 'NodeAdded')[0].args._eId;

const toBN = n => new web3.utils.BN(n);

module.exports = {
	passHours,
	getNodeId,
	toBN
}