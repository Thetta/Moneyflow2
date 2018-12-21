pragma solidity ^0.4.24;

import "./ExpenseBase.sol";

import "./interfaces/IWeiReceiver.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


contract WeiTable is ExpenseBase, IWeiReceiver, Ownable {
	uint public nodesCount = 0;

	struct FlowBuffer {
		uint flow;
		bool relSeqQ;
		uint needAcc;
		uint need;
		uint i;
	}	

	event NodeAdded(uint _eId, Type _eType);
	event FundNeed(uint _eId, uint _inputWei, uint need);
	event FundStart(uint _eId, uint _totalWeiNeeded);

	event NodeConnected(uint _splitterId, uint _childId);
	event NodeFlushTo(uint _eId, address _to, uint _balance);
	event SplitterNeeded(uint _eId, uint _needed, uint _total, uint _currentFlow);

	mapping(uint=>Type) nodesType;
	mapping(uint=>Expense) expenses;
	mapping(uint=>Splitter) splitters;

	struct Splitter {
		bool isOpen;
		uint[] outputs;
		Type splitterChildrenType;
	}

	modifier isCorrectId(uint _eId) {
		require(_eId <= (nodesCount - 1));	
		_;
	}

	function getReceiverType() public view returns(Type) {
		return Type.Table;
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

	function isNeedsMoneyAt(uint _eId) public view isCorrectId(_eId) returns(bool) {
		if(!isOpenAt(_eId)) {
			return false;
		}

		if(isExpenseAt(_eId)) {
			return isNeedsMoneyExpenseAt(_eId);			
		}else {
			return isNeedsMoneySplitterAt(_eId);
		}
	}

	function isNeedsMoneySplitterAt(uint _eId) internal view returns(bool isNeed) {
		for(uint i=0; i<splitters[_eId].outputs.length; i++) { // if at least 1 child needs money -> return true
			if(isNeedsMoneyAt(splitters[_eId].outputs[i])) {
				isNeed = true;
			}
		}	
	}

	function isNeedsMoneyExpenseAt(uint _eId) internal view returns(bool isNeed) {
		return super.isNeedsMoney(expenses[_eId]);		
	}

	function processFundsAt(uint _eId, uint _currentFlow, uint _amount) internal isCorrectId(_eId) {
		require(isNeedsMoneyAt(_eId));
		require(_amount >= getMinWeiNeededAt(_eId, _currentFlow));
		require(_amount == getTotalWeiNeededAt(_eId, _currentFlow));
		require(_currentFlow >= getMinWeiNeededAt(_eId, _currentFlow));
		require(_currentFlow >= _amount);			
		if(isExpenseAt(_eId)) {		
			processFundsExpenseAt(_eId, _currentFlow, _amount);
		} else {
			processFundsSplitterAt(_eId, _currentFlow, _amount);	
		}
	}

	function processFundsSplitterAt(uint _eId, uint _currentFlow, uint _amount) internal {
		FlowBuffer memory b = FlowBuffer(_currentFlow, false, 0, 0, 0);
		for(uint i=0; i<splitters[_eId].outputs.length; i++) {
			b.i = i;
			b.need = getTotalWeiNeededAt(splitters[_eId].outputs[i], b.flow);
			b = _processRelativeSeries(_eId, b);
			if(b.need != 0) {
				processFundsAt(splitters[_eId].outputs[i], b.flow, b.need);
			}
			b = _modifyFlow(b);
		}
		// require(b.flow == 0); TODO
	}

	function processFundsExpenseAt(uint _eId, uint _currentFlow, uint _amount) internal {
		expenses[_eId] = processWeiFunds(expenses[_eId], _currentFlow, _amount);
	}

	function getMinWeiNeededAt(uint _eId, uint _currentFlow) public view isCorrectId(_eId) returns(uint) {
		if(isExpenseAt(_eId)) {
			return getMinWeiNeededExpenseAt(_eId, _currentFlow);	
		}else {
			return getMinWeiNeededSplitterAt(_eId, _currentFlow);
		}
	}

	function getMinWeiNeededSplitterAt(uint _eId, uint _currentFlow) internal view returns(uint minNeed) {
		FlowBuffer memory b = FlowBuffer(_currentFlow, false, 0, 0, 0);
		for(uint i=0; i<splitters[_eId].outputs.length; i++) {
			b.i = i;
			b.need = getMinWeiNeededAt(splitters[_eId].outputs[i], b.flow); 
			b = _processRelativeSeries(_eId, b);
			minNeed += b.need;
			b = _modifyFlow(b);
		}		
	}

	function getMinWeiNeededExpenseAt(uint _eId, uint _currentFlow) internal view returns(uint totalNeed) {
		return getMinNeeded(expenses[_eId], _currentFlow);	
	}

	function getTotalWeiNeededAt(uint _eId, uint _currentFlow) public view  isCorrectId(_eId) returns(uint) {
		if(isExpenseAt(_eId)) {
			return getTotalNeeded(expenses[_eId], _currentFlow);
		} else {
			return getTotalWeiNeededSplitterAt(_eId, _currentFlow);	
		}
	}

	function getTotalWeiNeededSplitterAt(uint _eId, uint _currentFlow)internal view returns(uint totalNeed) {
		FlowBuffer memory b = FlowBuffer(_currentFlow, false, 0, 0, 0);
		for(uint i = 0; i < splitters[_eId].outputs.length; i++) {
			b.i = i;
			b.need = getTotalWeiNeededAt(splitters[_eId].outputs[i], b.flow); 
			b = _processRelativeSeries(_eId, b);
			totalNeed += b.need;
			b = _modifyFlow(b);
		}		
	}

	// function getTotalWeiNeededExpenseAt(uint _eId, uint _currentFlow)internal view returns(uint) {
	// 	return getTotalNeeded(expenses[_eId], _currentFlow);
	// }

	function balanceAt(uint _eId) public view isCorrectId(_eId) returns(uint) {
		return expenses[_eId].balance;
	}

	// -------------------- public IWEIRECEIVER FUNCTIONS -------------------- for all table
	function isNeedsMoney() public view returns(bool) {
		return isNeedsMoneyAt(0);
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
		return getMinWeiNeededAt(0, _currentFlow);
	}

	function getTotalWeiNeeded(uint _currentFlow) public view returns(uint) {
		return getTotalWeiNeededAt(0, _currentFlow);
	}

	// -------------------- public SCHEME FUNCTIONS -------------------- 
	function addAbsoluteExpense(uint128 _totalWeiNeeded, uint128 _minWeiAmount, bool _isPeriodic, bool _isSlidingAmount, uint32 _periodHours) public onlyOwner {
		emit NodeAdded(nodesCount, Type.Absolute);	
		expenses[nodesCount] = constructExpense(_totalWeiNeeded, _minWeiAmount, 0, _periodHours, _isSlidingAmount, _isPeriodic);
		nodesCount += 1;	
	}

	function addRelativeExpense(uint32 _partsPerMillion, bool _isPeriodic, bool _isSlidingAmount, uint32 _periodHours) public onlyOwner {
		emit NodeAdded(nodesCount, Type.Relative);	
		expenses[nodesCount] = constructExpense(0, 0, _partsPerMillion, _periodHours, _isSlidingAmount, _isPeriodic);
		nodesCount += 1;		
	}

	function addSplitter() public onlyOwner {
		uint[] memory emptyOutputs;
		splitters[nodesCount] = Splitter(true, emptyOutputs, Type.Splitter);
		nodesType[nodesCount] = Type.Splitter;	
		emit NodeAdded(nodesCount, Type.Splitter);
		nodesCount += 1;
	}

	function addChildAt(uint _splitterId, uint _childId) public onlyOwner {
		if((splitters[_splitterId].splitterChildrenType != Type.Splitter)
		 && (getReceiverTypeAt(_childId) != Type.Splitter)) {		
			require(getReceiverTypeAt(_childId) == splitters[_splitterId].splitterChildrenType);
		} else {
			splitters[_splitterId].splitterChildrenType = getReceiverTypeAt(_childId);
		}
		emit NodeConnected(_splitterId, _childId);
		splitters[_splitterId].outputs.push(_childId);
	}

	// -------------------- public CONTROL FUNCTIONS -------------------- 
	function getReceiverTypeAt(uint _eId) internal isCorrectId(_eId) returns(Type nodeType) {
		if(isExpenseAt(_eId)) {
			if(expenses[_eId].partsPerMillion > 0) {
				nodeType = Type.Relative;
			} else {
				nodeType = Type.Absolute;
			}
		} else {
			nodeType = Type.Splitter;
		}
	}

	function isExpenseAt(uint _eId) internal isCorrectId(_eId) returns(bool isExpense) {
		isExpense = (Type.Splitter != nodesType[_eId]);
	}

	function isSplitterAt(uint _eId) internal isCorrectId(_eId) returns(bool isSplitter) {
		isSplitter = (Type.Splitter == nodesType[_eId]);
	}

	function openAt(uint _eId) public onlyOwner isCorrectId(_eId) {
		if(isExpenseAt(_eId)) {
			expenses[_eId].isOpen = true;
		}else if(isSplitterAt(_eId)) {
			splitters[_eId].isOpen = true;
		}else {
			revert();
		}
	}

	function closeAt(uint _eId) public onlyOwner isCorrectId(_eId) {
		if(isExpenseAt(_eId)) {
			expenses[_eId].isOpen = false;
		}else if(isSplitterAt(_eId)) {
			splitters[_eId].isOpen = false;
		}else {
			revert();
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

	function _modifyFlow(FlowBuffer _b) internal view returns(FlowBuffer) {
		FlowBuffer memory b = _b;
		if(!b.relSeqQ) { 
			if(b.flow >= b.needAcc) { 
				b.flow -= b.needAcc; 
			} else {
				b.flow = 0;
			}
		}
		return b;
	}

	function _processRelativeSeries(uint _splitterId, FlowBuffer _b) internal view returns(FlowBuffer) {
		FlowBuffer memory b = _b;
		if(b.relSeqQ) {
			b.needAcc += b.need; 
			b.relSeqQ = false;
		} else {
			b.needAcc = b.need; 
		}

		if((b.i+1) < splitters[_splitterId].outputs.length) {
			if((getReceiverTypeAt(splitters[_splitterId].outputs[b.i]) == Type.Relative)
			 && (getReceiverTypeAt(splitters[_splitterId].outputs[b.i+1]) == Type.Relative)) {
				b.relSeqQ = true; 
			}
		}

		return b;
	}	
}