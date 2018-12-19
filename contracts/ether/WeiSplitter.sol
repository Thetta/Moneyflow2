pragma solidity ^0.4.24;

import "./SplitterBase.sol";
import "../interfaces/IWeiReceiver.sol";


/**
 * @title WeiSplitter 
 * @dev Will split money from top to down (order matters!). It is possible for some children to not receive money 
 * if they have ended. 
*/
contract WeiSplitter is SplitterBase, IWeiReceiver {
	Type splitterChildrenType = Type.Splitter;
	
	struct FlowBuffer {
		uint flow;
		bool relSeqQ;
		uint needAcc;
		uint need;
		uint i;
	}

	function getReceiverType() public view returns(Type) {
		return Type.Splitter;
	}

	function getMinWeiNeeded(uint _currentFlow) public view zeroIfClosed returns(uint minNeed) {
		FlowBuffer memory b = FlowBuffer(_currentFlow, false, 0, 0, 0);
		for(uint i=0; i<childrenCount; i++) {
			b.i = i;
			b.need = IWeiReceiver(children[b.i]).getMinWeiNeeded(b.flow); 
			b = _relativesStreak(b);
			minNeed += b.need;
			b = _modifyFlow(b);
		}
	}

	function getTotalWeiNeeded(uint _currentFlow)public view zeroIfClosed returns(uint totalNeed) {
		FlowBuffer memory b = FlowBuffer(_currentFlow, false, 0, 0, 0);
		for(uint i=0; i<childrenCount; i++) {
			b.i = i;
			b.need = IWeiReceiver(children[b.i]).getTotalWeiNeeded(b.flow); 
			b = _relativesStreak(b);
			totalNeed += b.need;
			b = _modifyFlow(b);
		}
	}

	function isNeedsMoney() public view falseIfClosed returns(bool isNeed) {
		for(uint i=0; i<childrenCount; i++) {
			if(IWeiReceiver(children[i]).isNeedsMoney()) {
				isNeed = true;
			}
		}
	}

	function processFunds(uint _currentFlow) public payable onlyIfOpen {
		emit SplitterBaseProcessFunds(msg.sender, msg.value, _currentFlow);
		FlowBuffer memory b = FlowBuffer(_currentFlow, false, 0, 0, 0);
		for(uint i=0; i<childrenCount; i++) {
			b.i = i;
			b.need = IWeiReceiver(children[b.i]).getTotalWeiNeeded(b.flow); 
			b = _relativesStreak(b);
			if(b.need!=0) {
				IWeiReceiver(children[i]).processFunds.value(b.need)(b.flow); 
			}
			b = _modifyFlow(b);
		}
		require(this.balance == 0);
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

	function _relativesStreak(FlowBuffer _b) internal view returns(FlowBuffer) {
		FlowBuffer memory b = _b;
		if(b.relSeqQ) {
			b.needAcc += b.need; 
			b.relSeqQ = false;
		} else {
			b.needAcc = b.need; 
		}

		if((b.i+1)<childrenCount) {
			if((IWeiReceiver(children[b.i]).getReceiverType()==Type.Relative)
			 &&(IWeiReceiver(children[b.i+1]).getReceiverType()==Type.Relative)) {
				b.relSeqQ = true; 
			}
		}

		return b;
	}

	function addChild(address _newChild) public onlyOwner {
		if((splitterChildrenType!=Type.Splitter)
		 &&(IWeiReceiver(_newChild).getReceiverType()!=Type.Splitter)) {		
			require(IWeiReceiver(_newChild).getReceiverType()==splitterChildrenType);
		} else {
			splitterChildrenType = IWeiReceiver(_newChild).getReceiverType();
		}

		super.addChild(_newChild);
	}	
}