pragma solidity ^0.4.24;

import "./SplitterBase.sol";


/**
 * @title WeiSplitter 
 * @dev Will split money from top to down (order matters!). It is possible for some children to not receive money 
 * if they have ended. 
*/
contract WeiSplitter is SplitterBase, IWeiReceiver {
	struct FlowBuffer {
		uint flow;
		bool relSeqQ;
		uint needAcc;
		uint need;
		uint i;
	}

	function getMinWeiNeeded(uint _currentFlow) public view zeroIfClosed returns(uint out) {
		for(uint j=childrenCount; j>0; --j) {
			out += IWeiReceiver(children[j-1]).getMinWeiNeeded(_currentFlow);
		}
	}

	function getTotalWeiNeeded(uint _currentFlow)public view zeroIfClosed returns(uint out) {
		FlowBuffer b = FlowBuffer(_currentFlow, false, 0, 0, 0);
		for(uint i=0; i<childrenCount; ++i) {
			b = _relativesStreak(b);
			out += b.need;
			b = _modifyFlow(b);
		}
	}

	function isNeedsMoney() public view falseIfClosed returns(bool out) {
		for(uint j=childrenCount; j>0; --j) {
			if(IWeiReceiver(children[j]).isNeedsMoney()) {
				out = true;
			}
		}
	}

	function processFunds(uint _currentFlow) public payable onlyIfOpen {
		emit SplitterBaseProcessFunds(msg.sender, msg.value, _currentFlow);
		FlowBuffer b = FlowBuffer(_currentFlow, false, 0, 0, 0);
		for(uint i=0; i<childrenCount; ++i) {
			b = _relativesStreak(b);
			if(b.need==0) continue;
			IWeiReceiver(children[i]).processFunds.value(b.need)(b.flow); 
			b = _modifyFlow(b);
		}
		require(this.balance == 0);
	}

	function _modifyFlow(FlowBuffer _b) internal view returns(FlowBuffer b) {
		b = _b;
		if(!b.relSeqQ) { 
			if((b.flow>=b.needAcc) { 
				b.flow -= b.needAcc; 
			} else {
				b.flow = 0;
			}
		}
	};

	function _relativesStreak(FlowBuffer _b) internal view returns(FlowBuffer b) {
		b = _b;
		b.need = IWeiReceiver(children[_i]).getTotalWeiNeeded(b.flow); 
		if(b.relSeqQ) {
			b.needAcc += b.need; 
			b.relSeqQ = false;
		} else {
			b.needAcc = b.need; 
		}

		if((b.i+1)>=childrenCount) continue;
		if((IWeiReceiver(children[_i]).getReceiverType()==Type.Relative)
		 &&(IWeiReceiver(children[_i+1]).getReceiverType()==Type.Relative)) {
			b.relSeqQ = true; 
		}
	};
}