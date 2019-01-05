pragma solidity ^0.4.24;

import "../bases/TableBase.sol";
import "../bases/ExpenseBase.sol";
import "../bases/SplitterBase.sol";

import "../interfaces/IReceiver.sol";
import "../interfaces/ITokenReceiver.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/token/ERC20/ERC20.sol";


contract ERC20Table is ITable, IReceiver, ITokenReceiver, TableBase {
	ERC20 public token;

	constructor(address _tokenAddress) public {
		token = ERC20(_tokenAddress);
	}

	function processTokens(uint _currentFlow, uint _value) public {
		require(_value <= token.allowance(msg.sender, address(this)));
		_processAmountAt(0, _currentFlow, _value);
		token.transferFrom(msg.sender, address(this), _value);
	}

	function flushAt(uint _eId) public onlyOwner isCorrectId(_eId) {
		token.transfer(owner, expenses[_eId].balance);
		emit NodeFlushTo(_eId, owner, expenses[_eId].balance);
		_processFlushToAt(_eId);
	}

	function flushToAt(uint _eId, address _to) public onlyOwner isCorrectId(_eId) {
		token.transfer(_to, expenses[_eId].balance);
		emit NodeFlushTo(_eId, _to, expenses[_eId].balance);
		_processFlushToAt(_eId);
	}
}