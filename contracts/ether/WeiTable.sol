pragma solidity ^0.4.24;

import "../ExpenseBase.sol";
import "../SplitterBase.sol";

import "../interfaces/IWeiReceiver.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


contract WeiTable is ExpenseBase, SplitterBase, IWeiReceiver, ITable, Ownable {
	uint public nodesCount = 0;

	event NodeAdded(uint _eId, IWeiReceiver.Type _eType);
	event FundNeed(uint _eId, uint _inputWei, uint need);
	event FundStart(uint _eId, uint _totalWeiNeeded);

	event NodeConnected(uint _splitterId, uint _childId);
	event NodeFlushTo(uint _eId, address _to, uint _balance);
	event SplitterNeeded(uint _eId, uint _needed, uint _total, uint _currentFlow);
 
	mapping(uint=>IWeiReceiver.Type) nodesType;
	mapping(uint=>Expense) expenses;
	mapping(uint=>Splitter) splitters;

	modifier isCorrectId(uint _eId) {
		require(_eId <= (nodesCount - 1));	
		_;
	}

	function getReceiverType() public view returns(IWeiReceiver.Type) {
		return IWeiReceiver.Type.Table;
	}

	function getLastNodeId() public returns(uint) {
		if(nodesCount == 0) {
			return 0;
		} else {
			return nodesCount - 1;
		}
	}	

	// -------------------- INTERNAL IWEIRECEIVER FUNCTIONS -------------------- for nodes
	function getPartsPerMillionAt(uint _eId) public view isCorrectId(_eId) returns(uint ppm) {
		ppm = expenses[_eId].partsPerMillion;
	}

	function isNeedsAt(uint _eId) public view isCorrectId(_eId) returns(bool) {
		if(isExpenseAt(_eId)) {
			return isExpenseNeeds(expenses[_eId]);
		}else {
			return isSplitterNeeds(splitters[_eId]);
		}
	}

	function processFundsAt(uint _eId, uint _currentFlow, uint _amount) public isCorrectId(_eId) {		
		if(isExpenseAt(_eId)) {		
			expenses[_eId] = processWeiExpenseFunds(expenses[_eId], _currentFlow, _amount);
		} else {
			processWeiSplitterFunds(splitters[_eId], _currentFlow, _amount);
		}
	}

	function getMinNeededAt(uint _eId, uint _currentFlow) public view isCorrectId(_eId) returns(uint) {
		if(isExpenseAt(_eId)) {
			return getExpenseMinNeeded(expenses[_eId], _currentFlow);
		}else {
			return getSplitterMinNeeded(splitters[_eId], _currentFlow);
		}
	}

	function getTotalNeededAt(uint _eId, uint _currentFlow) public view isCorrectId(_eId) returns(uint) {
		if(isExpenseAt(_eId)) {
			return getExpenseTotalNeeded(expenses[_eId], _currentFlow);
		} else {
			return getSplitterTotalNeeded(splitters[_eId], _currentFlow);
		}
	}

	function balanceAt(uint _eId) public view isCorrectId(_eId) returns(uint) {
		return expenses[_eId].balance;
	}

	// -------------------- public IWEIRECEIVER FUNCTIONS -------------------- for all table
	function isNeedsMoney() public view returns(bool) {
		return isNeedsAt(0);
	}

	function getPartsPerMillion() public view returns(uint) {
		return getPartsPerMillionAt(0);
	}

	function processFunds(uint _currentFlow) public payable {
		require(_currentFlow>=getMinWeiNeeded(_currentFlow));
		require(msg.value>=getMinWeiNeeded(_currentFlow));
		return processFundsAt(0, _currentFlow, msg.value);
	}

	function getMinWeiNeeded(uint _currentFlow) public view returns(uint) {
		return getMinNeededAt(0, _currentFlow);
	}

	function getTotalWeiNeeded(uint _currentFlow) public view returns(uint) {
		return getTotalNeededAt(0, _currentFlow);
	}

	// -------------------- public SCHEME FUNCTIONS -------------------- 
	function addAbsoluteExpense(uint128 _totalWeiNeeded, uint128 _minWeiAmount, bool _isPeriodic, bool _isSlidingAmount, uint32 _periodHours) public onlyOwner {
		emit NodeAdded(nodesCount, IWeiReceiver.Type.Absolute);	
		expenses[nodesCount] = constructExpense(_totalWeiNeeded, _minWeiAmount, 0, _periodHours, _isSlidingAmount, _isPeriodic);
		nodesType[nodesCount] = IWeiReceiver.Type.Absolute;
		nodesCount += 1;	
	}

	function addRelativeExpense(uint32 _partsPerMillion, bool _isPeriodic, bool _isSlidingAmount, uint32 _periodHours) public onlyOwner {
		emit NodeAdded(nodesCount, IWeiReceiver.Type.Relative);	
		expenses[nodesCount] = constructExpense(0, 0, _partsPerMillion, _periodHours, _isSlidingAmount, _isPeriodic);
		nodesType[nodesCount] = IWeiReceiver.Type.Relative;
		nodesCount += 1;		
	}

	function addSplitter() public onlyOwner {
		splitters[nodesCount] = constructSplitter(true);
		emit NodeAdded(nodesCount, IWeiReceiver.Type.Splitter);
		nodesType[nodesCount] = IWeiReceiver.Type.Splitter;	
		nodesCount += 1;
	}

	function addChildAt(uint _splitterId, uint _childId) public onlyOwner {
		// Splitter s = splitters[_splitterId];
		// addChildToSplitter(s, _childId, address(0));
		// splitters[_splitterId] = s;
		if((splitters[_splitterId].childrenType != Type.Splitter)
		 && (getReceiverTypeAt(_childId) != Type.Splitter)) {		
			require(getReceiverTypeAt(_childId) == splitters[_splitterId].childrenType);
		} else {
			splitters[_splitterId].childrenType = getReceiverTypeAt(_childId);
		}
		emit NodeConnected(_splitterId, _childId);
		splitters[_splitterId].outputs.push(_childId);		
	}

	// -------------------- public CONTROL FUNCTIONS -------------------- 
	function getReceiverTypeAt(uint _eId) public isCorrectId(_eId) returns(IWeiReceiver.Type nodeType) {
		if(isExpenseAt(_eId)) {
			if(expenses[_eId].partsPerMillion > 0) {
				nodeType = IWeiReceiver.Type.Relative;
			} else {
				nodeType = IWeiReceiver.Type.Absolute;
			}
		} else {
			nodeType = IWeiReceiver.Type.Splitter;
		}
	}

	function isExpenseAt(uint _eId) public isCorrectId(_eId) returns(bool isExpense) {
		isExpense = (IWeiReceiver.Type.Splitter != nodesType[_eId]);
	}

	function isSplitterAt(uint _eId) public isCorrectId(_eId) returns(bool isSplitter) {
		isSplitter = (IWeiReceiver.Type.Splitter == nodesType[_eId]);
	}

	function openAt(uint _eId) public onlyOwner isCorrectId(_eId) {
		if(isExpenseAt(_eId)) {
			openExpense(expenses[_eId]);
		}else {
			openSplitter(splitters[_eId]);
		}
	}

	function closeAt(uint _eId) public onlyOwner isCorrectId(_eId) {		
		if(isExpenseAt(_eId)) {
			closeExpense(expenses[_eId]);
		}else {
			closeSplitter(splitters[_eId]);
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

	function flushAt(uint _eId) public onlyOwner isCorrectId(_eId) {
		owner.transfer(expenses[_eId].balance);
		emit NodeFlushTo(_eId, owner, expenses[_eId].balance);
		expenses[_eId].balance = 0;
	}

	function flushToAt(uint _eId, address _to) public onlyOwner isCorrectId(_eId) {
		_to.transfer(expenses[_eId].balance);
		emit NodeFlushTo(_eId, _to, expenses[_eId].balance);
		expenses[_eId].balance = 0;
	}	

	function() public {
	}
}