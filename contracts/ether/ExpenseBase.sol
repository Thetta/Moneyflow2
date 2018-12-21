pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

import "../interfaces/IDestination.sol";
import "../interfaces/IWeiReceiver.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title ExpenseBase
 * @dev library-like contract for WeiExpense, WeiTable, ERC20Expense, ERC20Table
*/
contract ExpenseBase {
	event ExpenseFlush(address _owner, uint _balance);
	event ExpenseSetNeededWei(uint _totalWeiNeeded);
	event ExpenseSetPercents(uint _partsPerMillion);
	event ExpenseProcessFunds(address _sender, uint _value, uint _currentFlow);

	struct Expense {
		uint128 totalWeiNeeded;
		uint128 minWeiAmount;
		uint32 partsPerMillion;
		
		uint32 periodHours;

		// PeriodType periodType;
		bool isPeriodic;
		bool isSlidingAmount;

		uint32 momentReceived;
		// bool isMoneyReceived;
		// bool isOpen;
		// uint balance;
		
		uint128 totalWeiReceived;
		uint32 momentCreated;
		// uint balanceOnMomentReceived;
	}

	enum PeriodType {
		NonPeriodic,
		Periodic,
		PeriodicWithSlidingAmount
	}
	/**
	* @dev constructExpense
	* @param _totalWeiNeeded - absolute value. how much Ether this e should receive (in Wei). Can be zero (use _partsPerMillion in this case)
	* @param _partsPerMillion - if need to get % out of the input flow -> specify this parameter (1% is 10000 units)
	* @param _periodHours - if not isPeriodic and periodHours>0 ->no sense. if isPeriodic and periodHours == 0 -> needs money everytime. if isPeriodic and periodHours>0 -> needs money every period.
	* @param _isSlidingAmount - if you don't pay in the current period -> will accumulate the needed amount (only for _totalWeiNeeded!)
	* @param _isPeriodic - if isPeriodic and periodHours>0 -> needs money every period. if isPeriodic and periodHours == 0 -> needs money everytime.
	*/

	// _totalWeiNeeded divide _minWeiAmount == INTEGER
	// all inputs divide _minWeiAmount == INTEGER
	// if _totalWeiNeeded == 100 and _minWeiAmount == 5
	// you can send 5,10,15, but not 1, 2, 3, 4, 6, ...
	function constructExpense(uint128 _totalWeiNeeded, uint128 _minWeiAmount, uint32 _partsPerMillion, uint32 _periodHours, bool _isSlidingAmount, bool _isPeriodic) internal view returns(Expense e){
		require(!((_isSlidingAmount) && (_periodHours == 0)));
		require(!(!(_isPeriodic) && (_periodHours != 0)));
		require(!((_isSlidingAmount) && (!_isPeriodic)));
		require(!((_totalWeiNeeded == 0) && (_minWeiAmount != 0)));
		require(!((_partsPerMillion != 0) && (_minWeiAmount != 0)));
		require(!((_partsPerMillion != 0) && (_totalWeiNeeded != 0)));
		require(_minWeiAmount <= _totalWeiNeeded);
		if(_minWeiAmount != 0) {
			require((_totalWeiNeeded % _minWeiAmount) == 0);
		}

		e.partsPerMillion = _partsPerMillion;
		e.periodHours = _periodHours;
		e.totalWeiNeeded = _totalWeiNeeded;
		e.isSlidingAmount = _isSlidingAmount;
		e.isPeriodic = _isPeriodic;
		e.minWeiAmount = _minWeiAmount;
		e.momentCreated = uint32(block.timestamp);
	}

	function processWeiFunds(Expense _e, uint _currentFlow, uint _value) internal view returns(Expense e) {
		e = _e;
		require(_value == getTotalNeeded(e, _currentFlow));
		require(_currentFlow >= _value);
		// all inputs divide _minWeiAmount == INTEGER

		e.totalWeiReceived += uint128(_value);
		// e.isMoneyReceived = true;


		if((getTotalNeeded(_e, _value) == 0) || (_e.isPeriodic)) {
			e.momentReceived = uint32(block.timestamp);
			// e.balanceOnMomentReceived = e.totalWeiReceived;
		}
	}

	function getTotalNeeded(Expense _e, uint _currentFlow)internal view returns(uint need) {
		uint receiveTimeDelta = (block.timestamp - _e.momentReceived);
		uint creationTimeDelta = (block.timestamp - _e.momentCreated);
		uint periodLength = (_e.periodHours * 3600 * 1000);
		uint baseNeed;
		
		if(_e.partsPerMillion != 0) { // if Absolute and (_e.minWeiAmount == _e.totalWeiNeeded)
			baseNeed = ((_e.partsPerMillion * _currentFlow) / 1000000);
		} else {
			baseNeed = _e.totalWeiNeeded;
		}

		if(_e.minWeiAmount == _e.totalWeiNeeded) {
			if(!_e.isPeriodic) {
				need = baseNeed;
			} else if(_e.isPeriodic && !_e.isSlidingAmount) {
				if(receiveTimeDelta >= periodLength) {
					need = baseNeed;
				}
			} else if(_e.isPeriodic && _e.isSlidingAmount) {
				if(receiveTimeDelta >= periodLength) {
					need = (baseNeed * numberOfEntitiesPlusOne(receiveTimeDelta, periodLength)) - _e.totalWeiReceived;
					if(_e.momentReceived == 0) {
						need = baseNeed;
					}
				}
				if((need > _currentFlow) && (_currentFlow > _e.totalWeiNeeded)) {
					need = (_e.totalWeiNeeded * (_currentFlow / _e.totalWeiNeeded)) - _e.totalWeiReceived;
				}
			}

		} else if(_e.minWeiAmount == 0) {
			if(!_e.isPeriodic) {
				if(_currentFlow >= (_e.totalWeiNeeded - _e.totalWeiReceived)) {
					return (_e.totalWeiNeeded - _e.totalWeiReceived);
				} else {
					return _currentFlow;
				}
			} else if(_e.isPeriodic && !_e.isSlidingAmount) {
				need = getDebtIfNoSliding(_e);
				if(need > _currentFlow) {
					need = _currentFlow;
				}
			} else if(_e.isPeriodic && _e.isSlidingAmount) {
				need = ((numberOfEntitiesPlusOne(creationTimeDelta, periodLength) * _e.totalWeiNeeded) - _e.totalWeiReceived);
				if(need > _currentFlow) {
					need = _currentFlow;
				}
			}

		} else if(_e.minWeiAmount < _e.totalWeiNeeded) {
			if(!_e.isPeriodic) {
	 			if(_currentFlow >= (_e.totalWeiNeeded - _e.totalWeiReceived)) {
					need = (_e.totalWeiNeeded - _e.totalWeiReceived);
				} else if((_currentFlow < _e.totalWeiNeeded) && (_currentFlow >= _e.minWeiAmount)) { // change need for fund (with discrete input) if baseNeed >= _currentFlow
					need = _currentFlow - (_currentFlow % _e.minWeiAmount);
				}
			} else if(_e.isPeriodic && !_e.isSlidingAmount) {
				need = getDebtIfNoSliding(_e);
				if((_currentFlow < _e.totalWeiNeeded) && (_currentFlow >= _e.minWeiAmount)) { // change need for fund (with discrete input) if baseNeed >= _currentFlow
					need = _currentFlow - (_currentFlow % _e.minWeiAmount);
				}
			} else if(_e.isPeriodic && _e.isSlidingAmount) {
				need = ((numberOfEntitiesPlusOne(creationTimeDelta, periodLength) * _e.totalWeiNeeded) - _e.totalWeiReceived);
				if((_currentFlow < need) && (_currentFlow >= _e.minWeiAmount)) { // change need for fund (with discrete input) if baseNeed >= _currentFlow
					need = _currentFlow - (_currentFlow % _e.minWeiAmount);
				}
			}
		}
	}

	function getMinNeeded(Expense _e, uint _currentFlow) internal view returns(uint minNeed) {
		if( !((_e.minWeiAmount == 0) && (_e.totalWeiNeeded > 0)) 
		 && !(_e.partsPerMillion > 0) ) {
			minNeed = getTotalNeeded(_e, _currentFlow);
		}
	}

	function isNeedsMoney(Expense _e)internal view returns(bool isNeed) {
		isNeed = (getTotalNeeded(_e, 1e30) > 0);
	}	


	// -------------------- INTERNAL FUNCTIONS
	function numberOfEntitiesPlusOne(uint _inclusive, uint _inluded) internal view returns(uint count) {
		if(_inclusive < _inluded) {
			count = 1;
		} else {
			count = 1 + (_inclusive / _inluded);
		}
	}

	function getDebtIfNoSliding(Expense _e) internal view returns(uint) {
		uint receiveTimeDelta = (block.timestamp - _e.momentReceived);
		uint creationTimeDelta = (block.timestamp - _e.momentCreated);
		uint periodLength = (_e.periodHours * 3600 * 1000);

		uint debtForAllPeriods = ((numberOfEntitiesPlusOne(creationTimeDelta, periodLength) * _e.totalWeiNeeded) - _e.totalWeiReceived);
		if(debtForAllPeriods == 0) {
			return 0;
		} else if((debtForAllPeriods % _e.totalWeiNeeded) > 0 ) {
			return (debtForAllPeriods % _e.totalWeiNeeded);
		} else if(numberOfEntitiesPlusOne(receiveTimeDelta, periodLength) > 1){
			return _e.totalWeiNeeded;
		} else {
			return 0;
		}
	}	

}