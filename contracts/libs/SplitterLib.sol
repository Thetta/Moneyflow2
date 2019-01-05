pragma solidity ^0.4.24;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "../interfaces/IReceiver.sol";
import "../interfaces/ITable.sol";


/**
 * @title SplitterLib 
 * @dev Splitter has multiple outputs (allows to send money only to THESE addresses)
*/
contract SplitterLib {
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

	event SplitterLibProcessFunds(address _sender, uint _value, uint _currentFlow);
	event SplitterLibOpen(address _sender);
	event SplitterLibClose(address _sender);
	event SplitterLibAddChild(uint _id, address _addr);

	// ISplitter:
	function _open(Splitter storage _s) internal {
		emit SplitterLibOpen(msg.sender);
		_s.isOpen = true;
	}

	function _close(Splitter storage _s) internal {
		emit SplitterLibClose(msg.sender);
		_s.isOpen = false;
	}

	function _addChild(Splitter storage _s, uint _id, address _addr) internal {
		emit SplitterLibAddChild(_id, _addr);
		IReceiver.Type childType;
		
		if(_s.isTableSplitter) {
			childType = ITable(address(this)).getReceiverTypeAt(_id);
		} else {
			childType = IReceiver(_addr).getReceiverType();
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

	function _getMinNeeded(Splitter _s, uint _currentFlow) internal view returns(uint) {
		if(!_s.isOpen) {
			return 0;
		}
		uint minNeed;		
		FlowBuffer memory b = FlowBuffer(_currentFlow, false, 0, 0, 0, 0);
		for(uint i=0; i < _getChildrenCount(_s); i++) {
			b.i = i;
			if(_s.isTableSplitter) {
				b.need = ITable(address(this)).getMinNeededAt(_s.outputs[i], b.flow);
			} else {
				b.need = IReceiver(_s.addresses[i]).getMinNeeded(b.flow);
			}
			b = _processRelativeSeries(_s, b);
			minNeed += b.need;
			b = _modifyFlow(b);
		}
		return minNeed;
	}

	function _getTotalNeeded(Splitter _s, uint _currentFlow) internal view returns(uint) {
		if(!_s.isOpen) {
			return 0;
		}
		uint totalNeed;
		FlowBuffer memory b = FlowBuffer(_currentFlow, false, 0, 0, 0, 0);
		for(uint i=0; i < _getChildrenCount(_s); i++) {
			b.i = i;
			if(_s.isTableSplitter) {
				b.need = ITable(address(this)).getTotalNeededAt(_s.outputs[i], b.flow);
			} else {
				b.need = IReceiver(_s.addresses[i]).getTotalNeeded(b.flow);
			}
			b = _processRelativeSeries(_s, b);
			totalNeed += b.need;
			b = _modifyFlow(b);
		}

		return totalNeed;
	}

	function _isNeeds(Splitter _s) internal view returns(bool) {
		if(!_s.isOpen) {
			return false;
		}

		for(uint i=0; i < _getChildrenCount(_s); i++) {
			if(_s.isTableSplitter) {		
				if(ITable(address(this)).isNeedsAt(_s.outputs[i])) {
					return true;
				}
			} else {
				if(IReceiver(_s.addresses[i]).isNeeds()) {
					return true;
				}
			}
		}
	}

	function _processAmount(Splitter _s, uint _currentFlow, uint _value) internal {
		require(_s.isOpen);
		require(_isNeeds(_s));
		FlowBuffer memory b = FlowBuffer(_currentFlow, false, 0, 0, 0, 0);
		for(uint i=0; i < _getChildrenCount(_s); i++) {
			b.i = i;

			if(_s.isTableSplitter) {
				b.need = ITable(address(this)).getTotalNeededAt(_s.outputs[i], b.flow);
			} else {
				b.need = IReceiver(_s.addresses[i]).getTotalNeeded(b.flow);
			}			
		
			b = _processRelativeSeries(_s, b);

			if(_s.isTableSplitter && b.need > 0) {
				_tableProcessing(address(this), _s.outputs[i], b.flow, b.need);
			} else if(!_s.isTableSplitter && b.need > 0) {
				_elementProcessing(_s.addresses[i], b.flow, b.need);
			}

			b = _modifyFlow(b);
		}
		// all value was sent
		require(b.sent == _value); 
	}

	function _constructSplitter(bool _isTableSplitter) internal view returns(Splitter s) {
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

		if((b.i+1) < _getChildrenCount(_s)) {
			if((_getReceiverTypeBase(_s, b.i) == IReceiver.Type.Relative)
			 && (_getReceiverTypeBase(_s, (b.i + 1)) == IReceiver.Type.Relative)) {
				b.relSeqQ = true; 
			}
		}

		b.sent += b.need;
		return b;
	}

	function _getReceiverTypeBase(Splitter _s, uint _childNum) internal view returns(IReceiver.Type t) {
		if(_s.isTableSplitter) {
			t = ITable(address(this)).getReceiverTypeAt(_s.outputs[_childNum]);
		} else {
			t = IReceiver(_s.addresses[_childNum]).getReceiverType();
		}
	}
	
	function _getChildrenCount(Splitter _s) internal pure returns(uint) {
		if(_s.isTableSplitter) {
			return _s.outputs.length;
		} else {
			return _s.addresses.length;
		}
	}

	function _tableProcessing(address _target, uint _eId, uint _flow, uint _need) internal {}

	function _elementProcessing(address _target, uint _flow, uint _need) internal {}
}