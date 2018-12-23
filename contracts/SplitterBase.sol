pragma solidity ^0.4.23;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./interfaces/IReceiver.sol";
import "./interfaces/ITable.sol";

/**
 * @title SplitterBase 
 * @dev Splitter has multiple outputs (allows to send money only to THESE addresses)
*/
contract SplitterBase {
	struct Splitter {
		bool isOpen;
		bool isTableSplitter;
		uint[] outputs;
		address[] addresses;
		IReceiver.Type childrenType;
	}

	struct FlowBuffer {
		uint flow;
		bool relSeqQ;
		uint needAcc;
		uint need;
		uint i;
		uint sent;
	}

	event SplitterBaseProcessFunds(address _sender, uint _value, uint _currentFlow);
	event SplitterBaseOpen(address _sender);
	event SplitterBaseClose(address _sender);
	event SplitterBaseAddChild(uint _id, address _addr);

	// ISplitter:
	function openSplitter(Splitter storage _s) internal {
		emit SplitterBaseOpen(msg.sender);
		_s.isOpen = true;
	}

	function closeSplitter(Splitter storage _s) internal {
		emit SplitterBaseClose(msg.sender);
		_s.isOpen = false;
	}

	function addChildToSplitter(Splitter storage _s, uint _id, address _addr) internal {
		emit SplitterBaseAddChild(_id, _addr);
		IReceiver.Type childType;
		
		if(_s.isTableSplitter) {
			childType = ITable(address(this)).getReceiverTypeAt(_id);
		} else {
			childType = IWeiReceiver(_addr).getReceiverType();
		}		

		if((_s.childrenType != IReceiver.Type.Splitter)
		 &&(childType != IReceiver.Type.Splitter)) {
		 	// splitter type should be equal children types
			require(_s.childrenType == childType); 
		} else {
			_s.childrenType = childType;
		}

		if(_s.isTableSplitter) {
			_s.outputs.push(_id);
		} else {
			_s.addresses.push(_addr);
		}	
	}

	function getSplitterMinNeeded(Splitter _s, uint _currentFlow) internal view returns(uint) {
		if(!_s.isOpen) {
			return 0;
		}
		uint minNeed;		
		FlowBuffer memory b = FlowBuffer(_currentFlow, false, 0, 0, 0, 0);
		for(uint i=0; i<getChildrenCount(_s); i++) {
			b.i = i;
			if(_s.isTableSplitter) {
				b.need = ITable(address(this)).getMinNeededAt(_s.outputs[i], b.flow);
			} else {
				b.need = IWeiReceiver(_s.addresses[i]).getMinWeiNeeded(b.flow);
			}
			b = _processRelativeSeries(_s, b);
			minNeed += b.need;
			b = _modifyFlow(b);
		}
		return minNeed;
	}

	function getSplitterTotalNeeded(Splitter _s, uint _currentFlow) internal view returns(uint) {
		if(!_s.isOpen) {
			return 0;
		}
		uint totalNeed;
		FlowBuffer memory b = FlowBuffer(_currentFlow, false, 0, 0, 0, 0);
		for(uint i=0; i<getChildrenCount(_s); i++) {
			b.i = i;
			if(_s.isTableSplitter) {
				b.need = ITable(address(this)).getTotalNeededAt(_s.outputs[i], b.flow);
			} else {
				b.need = IWeiReceiver(_s.addresses[i]).getTotalWeiNeeded(b.flow);
			}
			b = _processRelativeSeries(_s, b);
			totalNeed += b.need;
			b = _modifyFlow(b);
		}

		return totalNeed;
	}

	function isSplitterNeeds(Splitter _s) internal view returns(bool) {
		if(!_s.isOpen) {
			return false;
		}

		for(uint i=0; i<getChildrenCount(_s); i++) {
			if(_s.isTableSplitter) {		
				if(ITable(address(this)).isNeedsAt(_s.outputs[i])) {
					return true;
				}
			} else {
				if(IWeiReceiver(_s.addresses[i]).isNeedsMoney()) {
					return true;
				}
			}
		}
	}

	function processWeiSplitterFunds(Splitter _s, uint _currentFlow, uint _value) internal {
		require(_s.isOpen);
		require(isSplitterNeeds(_s));
		FlowBuffer memory b = FlowBuffer(_currentFlow, false, 0, 0, 0, 0);
		for(uint i=0; i<getChildrenCount(_s); i++) {
			b.i = i;

			if(_s.isTableSplitter) {
				b.need = ITable(address(this)).getTotalNeededAt(_s.outputs[i], b.flow);
			} else {
				b.need = IWeiReceiver(_s.addresses[i]).getTotalWeiNeeded(b.flow);
			}			
		
			b = _processRelativeSeries(_s, b);
			
			if(_s.isTableSplitter && b.need > 0) {
				ITable(address(this)).processFundsAt(_s.outputs[i], b.flow, b.need);
			} else if(!_s.isTableSplitter && b.need > 0) {
				IWeiReceiver(_s.addresses[i]).processFunds.value(b.need)(b.flow); 
			}

			b = _modifyFlow(b);
		}
		// all value was sent
		require(b.sent == _value); 
	}

	function constructSplitter(bool _isTableSplitter) internal view returns(Splitter s) {
		uint[] memory emptyOutputs;
		address[] memory emptyAddresses;
		return Splitter(true, _isTableSplitter, emptyOutputs, emptyAddresses, IReceiver.Type.Splitter);
	}

	function _modifyFlow(FlowBuffer _b) internal pure returns(FlowBuffer) {
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

	function _processRelativeSeries(Splitter _s, FlowBuffer _b) internal view returns(FlowBuffer) {
		FlowBuffer memory b = _b;
		if(b.relSeqQ) {
			b.needAcc += b.need; 
			b.relSeqQ = false;
		} else {
			b.needAcc = b.need; 
		}

		if((b.i+1) < getChildrenCount(_s)) {
			if((getReceiverTypeBase(_s, b.i) == IReceiver.Type.Relative)
			 && (getReceiverTypeBase(_s, (b.i + 1)) == IReceiver.Type.Relative)) {
				b.relSeqQ = true; 
			}
		}

		b.sent += b.need;
		return b;
	}

	function getReceiverTypeBase(Splitter _s, uint _childNum) internal view returns(IReceiver.Type t) {
		if(_s.isTableSplitter) {
			t = ITable(address(this)).getReceiverTypeAt(_s.outputs[_childNum]);
		} else {
			t = IWeiReceiver(_s.addresses[_childNum]).getReceiverType();
		}
	}
	function getChildrenCount(Splitter _s) internal pure returns(uint) {
		if(_s.isTableSplitter) {
			return _s.outputs.length;
		} else {
			return _s.addresses.length;
		}
	}
}