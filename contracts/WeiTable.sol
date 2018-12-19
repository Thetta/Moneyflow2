pragma solidity ^0.4.24;

import "./interfaces/IWeiReceiver.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


contract WeiTable is IWeiReceiver, Ownable {
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

	struct Expense {
		uint totalWeiNeeded;
		uint minWeiAmount;
		uint neededPpm;
		
		uint periodHours;

		bool isPeriodic;
		bool isSlidingAmount;

		uint momentReceived;
		bool isMoneyReceived;
		bool isOpen;
		uint balance;
		uint totalWeiReceived;
		uint momentCreated;
		uint balanceOnMomentReceived;
	}

	struct Splitter {
		bool isOpen;
		uint[] outputs;
		Type splitterChildrenType;
	
	}

	modifier nothingIfClosed(uint _eId) {
		if(isOpenAt(_eId)) {
			_;
		}
	}

	modifier nothingIfClosedOrNoNeed(uint _eId) {
		if(isNeedsMoneyAt(_eId) && isOpenAt(_eId)) {
			_;
		}
	}

	modifier isCorrectId(uint _eId) {
		if(_eId > (nodesCount - 1)) {
			revert();
		}
		_;
	}

	function getReceiverType() public view returns(Type) {
		return Type.Table;
	}

	function getLastNodeId() public returns(uint) {
		if(nodesCount==0) {
			return 0;
		} else {
			return nodesCount - 1;
		}
	}	

	// -------------------- INTERNAL IWEIRECEIVER FUNCTIONS -------------------- for nodes
	function getPartsPerMillionAt(uint _eId) public view isCorrectId(_eId) returns(uint ppm) {
		ppm = expenses[_eId].neededPpm;
	}

	function isNeedsMoneyAt(uint _eId) public view nothingIfClosed(_eId) isCorrectId(_eId) returns(bool isNeed) {
		if(isExpenseAt(_eId)) {
			isNeed = isNeedsMoneyExpenseAt(_eId);			
		}else {
			isNeed = isNeedsMoneySplitterAt(_eId);
		}
	}

	function isNeedsMoneySplitterAt(uint _eId) internal view nothingIfClosed(_eId) isCorrectId(_eId) returns(bool isNeed) {
		for(uint i=0; i<splitters[_eId].outputs.length; i++) { // if at least 1 child needs money -> return true
			if(isNeedsMoneyAt(splitters[_eId].outputs[i])) {
				isNeed = true;
			}
		}	
	}

	function isNeedsMoneyExpenseAt(uint _eId) internal view nothingIfClosed(_eId) isCorrectId(_eId) returns(bool isNeed) {
		Expense e = expenses[_eId];
		if(e.isPeriodic) {
			if ((uint64(block.timestamp) - e.momentReceived) >= e.periodHours * 3600 * 1000) { 
				isNeed = true;
			}
		} else if((e.minWeiAmount==0)&&(e.totalWeiNeeded>0)) {
			isNeed = ((getDebtMultiplierAt(_eId) * e.totalWeiNeeded) - e.totalWeiReceived) > 0;
		} else if((e.minWeiAmount>0) && (e.minWeiAmount < e.totalWeiNeeded)) {
			isNeed = (e.totalWeiNeeded - e.totalWeiReceived) > 0;
		} else {
			isNeed = !e.isMoneyReceived;
		}		
	}

	function processFundsAt(uint _eId, uint _currentFlow, uint _amount) internal nothingIfClosed(_eId) isCorrectId(_eId) {
		if(isExpenseAt(_eId)) {
			processFundsExpenseAt(_eId, _currentFlow, _amount);
		} else {
			processFundsSplitterAt(_eId, _currentFlow, _amount);	
		}
	}

	function processFundsSplitterAt(uint _eId, uint _currentFlow, uint _amount) internal nothingIfClosedOrNoNeed(_eId) isCorrectId(_eId) {
		FlowBuffer memory b = FlowBuffer(_currentFlow, false, 0, 0, 0);
		for(uint i=0; i<splitters[_eId].outputs.length; i++) {
			b.i = i;
			b.need = getTotalWeiNeededAt(splitters[_eId].outputs[i], b.flow);
			b = _relativesStreak(_eId, b);
			if(b.need!=0) {
				processFundsAt(splitters[_eId].outputs[i], b.flow, b.need);
			}
			b = _modifyFlow(b);
		}
		// require(b.flow==0); TODO
	}

	function processFundsExpenseAt(uint _eId, uint _currentFlow, uint _amount) internal nothingIfClosedOrNoNeed(_eId) isCorrectId(_eId) {
		// TODO: check requires
		require(isNeedsMoneyAt(_eId));
		require(_amount >= getMinWeiNeededAt(_eId, _currentFlow));
		require(_amount == getTotalWeiNeededAt(_eId, _currentFlow));
		require(_currentFlow >= getMinWeiNeededAt(_eId, _currentFlow));
		require(_currentFlow >= _amount);
		// all inputs divide _minWeiAmount == INTEGER
		expenses[_eId].totalWeiReceived += _amount;
		expenses[_eId].balance += _amount;
		expenses[_eId].isMoneyReceived = true;

		if((getTotalWeiNeededAt(_eId, _amount)==0) || (expenses[_eId].isPeriodic)) {
			expenses[_eId].momentReceived = block.timestamp;
			expenses[_eId].balanceOnMomentReceived = expenses[_eId].totalWeiReceived;
		}
	}

	function getMinWeiNeededAt(uint _eId, uint _currentFlow) public view nothingIfClosedOrNoNeed(_eId) isCorrectId(_eId) returns(uint minNeed) {
		if(isExpenseAt(_eId)) {
			minNeed = getMinWeiNeededExpenseAt(_eId, _currentFlow);	
		}else {
			minNeed = getMinWeiNeededSplitterAt(_eId, _currentFlow);
		}
	}

	function getMinWeiNeededSplitterAt(uint _eId, uint _currentFlow) internal view nothingIfClosedOrNoNeed(_eId) isCorrectId(_eId) returns(uint minNeed) {
		FlowBuffer memory b = FlowBuffer(_currentFlow, false, 0, 0, 0);
		for(uint i=0; i<splitters[_eId].outputs.length; i++) {
			b.i = i;
			b.need = getMinWeiNeededAt(splitters[_eId].outputs[i], b.flow); 
			b = _relativesStreak(_eId, b);
			minNeed += b.need;
			b = _modifyFlow(b);
		}		
	}

	function getMinWeiNeededExpenseAt(uint _eId, uint _currentFlow) internal view nothingIfClosedOrNoNeed(_eId) isCorrectId(_eId) returns(uint totalNeed) {
		if( !((expenses[_eId].minWeiAmount == 0) && (expenses[_eId].totalWeiNeeded > 0)) 
		 && !(expenses[_eId].neededPpm > 0) ) {
			totalNeed = getTotalWeiNeededAt(_eId, _currentFlow);
		}	
	}

	function getDebtMultiplierAt(uint _eId) internal isCorrectId(_eId) view returns(uint) {
		Expense e = expenses[_eId];
		if((e.isPeriodic)&&(!e.isSlidingAmount)&&((block.timestamp - e.momentReceived) / (e.periodHours * 3600 * 1000) >=1)) {
			if(0!=e.neededPpm) {
				return 1;
			} else {
				return (e.balanceOnMomentReceived/e.totalWeiNeeded) + 1;
			}		
		} else if((e.isPeriodic)&&(e.isSlidingAmount)) {
			return 1 + ((block.timestamp - e.momentCreated) / (e.periodHours * 3600 * 1000));
		} else {
			return 1;
		}			
	}

	function getTotalWeiNeededAt(uint _eId, uint _currentFlow) public view nothingIfClosedOrNoNeed(_eId) isCorrectId(_eId) returns(uint totalNeed) {
		if(isExpenseAt(_eId)) {
			totalNeed = getTotalWeiNeededExpenseAt(_eId, _currentFlow);
		} else {
			totalNeed = getTotalWeiNeededSplitterAt(_eId, _currentFlow);	
		}
	}

	function getTotalWeiNeededSplitterAt(uint _eId, uint _currentFlow)internal view nothingIfClosedOrNoNeed(_eId) isCorrectId(_eId) returns(uint totalNeed) {
		FlowBuffer memory b = FlowBuffer(_currentFlow, false, 0, 0, 0);
		for(uint i=0; i<splitters[_eId].outputs.length; i++) {
			b.i = i;
			b.need = getTotalWeiNeededAt(splitters[_eId].outputs[i], b.flow); 
			b = _relativesStreak(_eId, b);
			totalNeed += b.need;
			b = _modifyFlow(b);
		}		
	}

	function getTotalWeiNeededExpenseAt(uint _eId, uint _currentFlow)internal view nothingIfClosedOrNoNeed(_eId) isCorrectId(_eId) returns(uint totalNeed) {
		Expense e = expenses[_eId];
		if(0!=e.neededPpm) {
			totalNeed = ((getDebtMultiplierAt(_eId)*(e.neededPpm * _currentFlow)) / 1000000);
		
		} else if(getDebtMultiplierAt(_eId)*e.totalWeiNeeded > e.totalWeiReceived) {
			totalNeed = getDebtMultiplierAt(_eId)*e.totalWeiNeeded - e.totalWeiReceived;
			if((e.minWeiAmount==0)&&(e.totalWeiNeeded>0)) {
				if(totalNeed > _currentFlow) {
					totalNeed = _currentFlow;
				}
			} else if((e.minWeiAmount > 0) && (e.minWeiAmount < e.totalWeiNeeded)) { // fund with discrete input
				if(totalNeed >= _currentFlow) {
					if(_currentFlow >= e.minWeiAmount) {
						totalNeed = _currentFlow - (_currentFlow % e.minWeiAmount);
					} else {
						totalNeed = 0;
					}
				}
			}
		} else {
			totalNeed = 0;
		}		
	}

	function balanceAt(uint _eId)public view isCorrectId(_eId) returns(uint) {
		return expenses[_eId].balance;
	}

	// -------------------- public IWEIRECEIVER FUNCTIONS -------------------- for all table
	function isNeedsMoney()view public returns(bool) {
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

	function getMinWeiNeeded(uint _currentFlow)public view returns(uint) {
		return getMinWeiNeededAt(0, _currentFlow);
	}

	function getTotalWeiNeeded(uint _currentFlow)public view returns(uint) {
		return getTotalWeiNeededAt(0, _currentFlow);
	}

	// -------------------- public SCHEME FUNCTIONS -------------------- 
	function addAbsoluteExpense(uint _totalWeiNeeded, uint _minWeiAmount, bool _isPeriodic, bool _isSlidingAmount, uint _periodHours) public onlyOwner {
		expenses[nodesCount] = Expense(
			_totalWeiNeeded, _minWeiAmount, 0,
			_periodHours, _isPeriodic, _isSlidingAmount,
			0, false, true, 0, 0, now, 0
		);
		nodesType[nodesCount] = Type.Absolute;
		emit NodeAdded(nodesCount, Type.Absolute);
		nodesCount += 1;
		// TODO: add requires
		require(!((_isSlidingAmount)&&(_periodHours==0)));
		require(!(!(_isPeriodic)&&(_periodHours!=0)));
		require(!((_isSlidingAmount)&&(!_isPeriodic)));
		require(!((_totalWeiNeeded==0)&&(_minWeiAmount!=0)));

		require(_minWeiAmount<=_totalWeiNeeded);
		if(_minWeiAmount!=0) {
			require(_totalWeiNeeded%_minWeiAmount==0);
		}		
	}

	function addRelativeExpense(uint _neededPpm, bool _isPeriodic, bool _isSlidingAmount, uint _periodHours)public onlyOwner {
		// TODO: add requires
		require(!((_isSlidingAmount)&&(_periodHours==0)));
		require(!(!(_isPeriodic)&&(_periodHours!=0)));
		require(!((_isSlidingAmount)&&(!_isPeriodic)));		
		expenses[nodesCount] = Expense(
			0, 0, _neededPpm,
			_periodHours, _isPeriodic, _isSlidingAmount,
			0, false, true, 0, 0, now, 0
		);	
		nodesType[nodesCount] = Type.Relative;
		emit NodeAdded(nodesCount, Type.Relative);	
		nodesCount += 1;
	}

	function addSplitter()public onlyOwner {
		uint[] memory emptyOutputs;
		splitters[nodesCount] = Splitter(true, emptyOutputs, Type.Splitter);
		nodesType[nodesCount] = Type.Splitter;	
		emit NodeAdded(nodesCount, Type.Splitter);
		nodesCount += 1;
	}

	function addChildAt(uint _splitterId, uint _childId)public onlyOwner {
		if((splitters[_splitterId].splitterChildrenType!=Type.Splitter)
		 &&(getReceiverTypeAt(_childId)!=Type.Splitter)) {		
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
			if(expenses[_eId].neededPpm > 0) {
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

	function closeAt(uint _eId)public onlyOwner isCorrectId(_eId) {
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

	function getChildrenCountAt(uint _eId)public view isCorrectId(_eId) returns(uint) {
		require(isSplitterAt(_eId));
		return splitters[_eId].outputs.length;
	}

	function getChildIdAt(uint _eId, uint _index)public view isCorrectId(_eId) returns(uint) {
		require(isSplitterAt(_eId));
		require(splitters[_eId].outputs.length > _index);
		return splitters[_eId].outputs[_index];
	}

	function flushAt(uint _eId)public onlyOwner isCorrectId(_eId) {
		owner.transfer(expenses[_eId].balance);
		emit NodeFlushTo(_eId, owner, expenses[_eId].balance);
		expenses[_eId].balance = 0;
	}

	function flushToAt(uint _eId, address _to)public onlyOwner isCorrectId(_eId) {
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

	function _relativesStreak(uint _splitterId, FlowBuffer _b) internal view returns(FlowBuffer) {
		FlowBuffer memory b = _b;
		if(b.relSeqQ) {
			b.needAcc += b.need; 
			b.relSeqQ = false;
		} else {
			b.needAcc = b.need; 
		}

		if((b.i+1) < splitters[_splitterId].outputs.length) {
			if((getReceiverTypeAt(splitters[_splitterId].outputs[b.i]) == Type.Relative)
			 &&(getReceiverTypeAt(splitters[_splitterId].outputs[b.i+1]) == Type.Relative)) {
				b.relSeqQ = true; 
			}
		}

		return b;
	}	
}