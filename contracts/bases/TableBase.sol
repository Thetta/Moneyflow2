pragma solidity ^0.4.23;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "../interfaces/IReceiver.sol";
import "../interfaces/ITable.sol";

import "../libs/ExpenseLib.sol";
import "../libs/SplitterLib.sol";


/**
 * @title TableBase 
 * @dev contract for WeiTable and ERC20Table
*/
contract TableBase is ExpenseLib, SplitterLib, Ownable {
	uint public nodesCount = 0;

	event NodeAdded(uint _eId, IReceiver.Type _eType);
	event FundNeed(uint _eId, uint _inputWei, uint need);
	event FundStart(uint _eId, uint _totalNeeded);

	event NodeConnected(uint _splitterId, uint _childId);
	event NodeFlushTo(uint _eId, address _to, uint _balance);
	event SplitterNeeded(uint _eId, uint _needed, uint _total, uint _currentFlow);
 
	mapping(uint=>IReceiver.Type) nodesType;
	mapping(uint=>ExpenseLib.Expense) expenses;
	mapping(uint=>SplitterLib.Splitter) splitters;

	modifier isCorrectId(uint _eId) {
		require(_eId <= (nodesCount - 1));	
		_;
	}

	function getReceiverType() public view returns(IReceiver.Type) {
		return IReceiver.Type.Table;
	}

	// -------------------- IRECEIVER FUNCTIONS --------------------
	function isNeeds() public view returns(bool) {
		return isNeedsAt(0);
	}

	function getPartsPerMillion() public view returns(uint) {
		return getPartsPerMillionAt(0);
	}

	function processFunds(uint _currentFlow) public payable {
		return _processFundsAt(0, _currentFlow, msg.value);
	}

	function _processFundsAt(uint _eId, uint _currentFlow, uint _value) internal {
		if(isExpenseAt(_eId)) {
			expenses[_eId] = _processFunds(expenses[_eId], _currentFlow, _value);
		}else {
			_processFunds(splitters[_eId], _currentFlow, _value);
		}
	}

	function getMinNeeded(uint _currentFlow) public view returns(uint) {
		return getMinNeededAt(0, _currentFlow);
	}

	function getTotalNeeded(uint _currentFlow) public view returns(uint) {
		return getTotalNeededAt(0, _currentFlow);
	}

	function _processFlushToAt(uint _eId, address _to) internal view returns(Expense e) {
		emit NodeFlushTo(_eId, _to, expenses[_eId].balance);
		expenses[_eId].balance = 0;
	}

	function getLastNodeId() public returns(uint) {
		if(nodesCount == 0) {
			return 0;
		} else {
			return nodesCount - 1;
		}
	}	

	function getPartsPerMillionAt(uint _eId) public view isCorrectId(_eId) returns(uint ppm) {
		ppm = expenses[_eId].partsPerMillion;
	}

	function isNeedsAt(uint _eId) public view isCorrectId(_eId) returns(bool) {
		if(isExpenseAt(_eId)) {
			return _isNeeds(expenses[_eId]);
		}else {
			return _isNeeds(splitters[_eId]);
		}
	}

	function getMinNeededAt(uint _eId, uint _currentFlow) public view isCorrectId(_eId) returns(uint) {
		if(isExpenseAt(_eId)) {
			return _getMinNeeded(expenses[_eId], _currentFlow);
		}else {
			return _getMinNeeded(splitters[_eId], _currentFlow);
		}
	}

	function getTotalNeededAt(uint _eId, uint _currentFlow) public view isCorrectId(_eId) returns(uint) {
		if(isExpenseAt(_eId)) {
			return _getTotalNeeded(expenses[_eId], _currentFlow);
		} else {
			return _getTotalNeeded(splitters[_eId], _currentFlow);
		}
	}

	function balanceAt(uint _eId) public view isCorrectId(_eId) returns(uint) {
		return expenses[_eId].balance;
	}

	// -------------------- public SCHEME FUNCTIONS -------------------- 
	function addAbsoluteExpense(uint128 _totalNeeded, uint128 _minWeiAmount, bool _isPeriodic, bool _isSlidingAmount, uint32 _periodHours) public onlyOwner {
		emit NodeAdded(nodesCount, IReceiver.Type.Absolute);	
		expenses[nodesCount] = _constructExpense(_totalNeeded, _minWeiAmount, 0, _periodHours, _isSlidingAmount, _isPeriodic);
		nodesType[nodesCount] = IReceiver.Type.Absolute;
		nodesCount += 1;	
	}

	function addRelativeExpense(uint32 _partsPerMillion, bool _isPeriodic, bool _isSlidingAmount, uint32 _periodHours) public onlyOwner {
		emit NodeAdded(nodesCount, IReceiver.Type.Relative);	
		expenses[nodesCount] = _constructExpense(0, 0, _partsPerMillion, _periodHours, _isSlidingAmount, _isPeriodic);
		nodesType[nodesCount] = IReceiver.Type.Relative;
		nodesCount += 1;		
	}

	function addSplitter() public onlyOwner {
		splitters[nodesCount] = _constructSplitter(true);
		emit NodeAdded(nodesCount, IReceiver.Type.Splitter);
		nodesType[nodesCount] = IReceiver.Type.Splitter;	
		nodesCount += 1;
	}

	function addChildAt(uint _splitterId, uint _childId) public onlyOwner {
		// Splitter s = splitters[_splitterId];
		// addChildToSplitter(s, _childId, address(0));
		// splitters[_splitterId] = s;
		if((splitters[_splitterId].childrenType != IReceiver.Type.Splitter)
		 && (getReceiverTypeAt(_childId) != IReceiver.Type.Splitter)) {		
			require(getReceiverTypeAt(_childId) == splitters[_splitterId].childrenType);
		} else {
			splitters[_splitterId].childrenType = getReceiverTypeAt(_childId);
		}
		emit NodeConnected(_splitterId, _childId);
		splitters[_splitterId].outputs.push(_childId);		
	}

	// -------------------- public CONTROL FUNCTIONS -------------------- 
	function getReceiverTypeAt(uint _eId) public isCorrectId(_eId) returns(IReceiver.Type nodeType) {
		if(isExpenseAt(_eId)) {
			if(expenses[_eId].partsPerMillion > 0) {
				nodeType = IReceiver.Type.Relative;
			} else {
				nodeType = IReceiver.Type.Absolute;
			}
		} else {
			nodeType = IReceiver.Type.Splitter;
		}
	}

	function isExpenseAt(uint _eId) public isCorrectId(_eId) returns(bool isExpense) {
		isExpense = (IReceiver.Type.Splitter != nodesType[_eId]);
	}

	function isSplitterAt(uint _eId) public isCorrectId(_eId) returns(bool isSplitter) {
		isSplitter = (IReceiver.Type.Splitter == nodesType[_eId]);
	}

	function openAt(uint _eId) public onlyOwner isCorrectId(_eId) {
		if(isExpenseAt(_eId)) {
			_open(expenses[_eId]);
		}else {
			_open(splitters[_eId]);
		}
	}

	function closeAt(uint _eId) public onlyOwner isCorrectId(_eId) {		
		if(isExpenseAt(_eId)) {
			_close(expenses[_eId]);
		}else {
			_close(splitters[_eId]);
		}
	}

	function isOpenAt(uint _eId) public view isCorrectId(_eId) returns(bool) {
		if(isExpenseAt(_eId)) {
			return expenses[_eId].isOpen;
		}else {
			return splitters[_eId].isOpen;
		}
	}

	function getChildrenCountAt(uint _eId) public view isCorrectId(_eId) returns(uint) {
		require(isSplitterAt(_eId));
		return splitters[_eId].outputs.length;
	}

	function getChildIdAt(uint _eId, uint _index) public view isCorrectId(_eId) returns(uint) {
		require(isSplitterAt(_eId));
		require(splitters[_eId].outputs.length > _index);
		return splitters[_eId].outputs[_index];
	}
}