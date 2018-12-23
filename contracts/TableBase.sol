pragma solidity ^0.4.23;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./interfaces/IWeiReceiver.sol";
import "./interfaces/ITable.sol";

import "./ExpenseBase.sol";
import "./SplitterBase.sol";


/**
 * @title TableBase 
 * @dev contract for WeiTable and ERC20Table
*/
contract TableBase is ExpenseBase, SplitterBase, Ownable {
	uint public nodesCount = 0;

	event NodeAdded(uint _eId, IReceiver.Type _eType);
	event FundNeed(uint _eId, uint _inputWei, uint need);
	event FundStart(uint _eId, uint _totalWeiNeeded);

	event NodeConnected(uint _splitterId, uint _childId);
	event NodeFlushTo(uint _eId, address _to, uint _balance);
	event SplitterNeeded(uint _eId, uint _needed, uint _total, uint _currentFlow);
 
	mapping(uint=>IReceiver.Type) nodesType;
	mapping(uint=>ExpenseBase.Expense) expenses;
	mapping(uint=>SplitterBase.Splitter) splitters;

	modifier isCorrectId(uint _eId) {
		require(_eId <= (nodesCount - 1));	
		_;
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
			return isExpenseNeeds(expenses[_eId]);
		}else {
			return isSplitterNeeds(splitters[_eId]);
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

	// -------------------- public SCHEME FUNCTIONS -------------------- 
	function addAbsoluteExpense(uint128 _totalWeiNeeded, uint128 _minWeiAmount, bool _isPeriodic, bool _isSlidingAmount, uint32 _periodHours) public onlyOwner {
		emit NodeAdded(nodesCount, IReceiver.Type.Absolute);	
		expenses[nodesCount] = constructExpense(_totalWeiNeeded, _minWeiAmount, 0, _periodHours, _isSlidingAmount, _isPeriodic);
		nodesType[nodesCount] = IReceiver.Type.Absolute;
		nodesCount += 1;	
	}

	function addRelativeExpense(uint32 _partsPerMillion, bool _isPeriodic, bool _isSlidingAmount, uint32 _periodHours) public onlyOwner {
		emit NodeAdded(nodesCount, IReceiver.Type.Relative);	
		expenses[nodesCount] = constructExpense(0, 0, _partsPerMillion, _periodHours, _isSlidingAmount, _isPeriodic);
		nodesType[nodesCount] = IReceiver.Type.Relative;
		nodesCount += 1;		
	}

	function addSplitter() public onlyOwner {
		splitters[nodesCount] = constructSplitter(true);
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

}