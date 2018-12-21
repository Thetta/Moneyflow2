pragma solidity ^0.4.24;

/**
 * @title ExpenseBase
 * @dev library-like contract for WeiExpense, WeiTable, ERC20Expense, ERC20Table
*/
contract ExpenseBase {
	event ExpenseFlush(address _owner, uint _balance);
	event ExpenseSetNeeded(uint _totalNeeded);
	event ExpenseSetPercents(uint _partsPerMillion);
	event ExpenseProcessFunds(address _sender, uint _value, uint _currentFlow);

	struct Expense {
		uint128 totalNeeded;
		uint128 minAmount;
		uint32 partsPerMillion;
		
		uint32 periodHours;

		PeriodType periodType;

		uint32 momentReceived;
		uint128 balance;
		
		uint128 totalReceived;
		uint32 momentCreated;

		bool isOpen;
	}

	enum PeriodType {
		NonPeriodic,
		Periodic,
		PeriodicSliding
	}
	/**
	* @dev constructExpense
	* @param _totalNeeded - absolute value. how much Ether this e should receive (in Wei). Can be zero (use _partsPerMillion in this case)
	* @param _partsPerMillion - if need to get % out of the input flow -> specify this parameter (1% is 10000 units)
	* @param _periodHours - if not isPeriodic and periodHours>0 ->no sense. if isPeriodic and periodHours == 0 -> needs money everytime. if isPeriodic and periodHours>0 -> needs money every period.
	* @param _isSlidingAmount - if you don't pay in the current period -> will accumulate the needed amount (only for _totalNeeded!)
	* @param _isPeriodic - if isPeriodic and periodHours>0 -> needs money every period. if isPeriodic and periodHours == 0 -> needs money everytime.
	*/

	// _totalNeeded divide _minAmount == INTEGER
	// all inputs divide _minAmount == INTEGER
	// if _totalNeeded == 100 and _minAmount == 5
	// you can send 5,10,15, but not 1, 2, 3, 4, 6, ...
	function constructExpense(uint128 _totalNeeded, uint128 _minAmount, uint32 _partsPerMillion, uint32 _periodHours, bool _isSlidingAmount, bool _isPeriodic) internal view returns(Expense e){
		require(!((_isSlidingAmount) && (_periodHours == 0)));
		require(!(!(_isPeriodic) && (_periodHours != 0)));
		require(!((_isSlidingAmount) && (!_isPeriodic)));
		require(!((_totalNeeded == 0) && (_minAmount != 0)));
		require(!((_partsPerMillion != 0) && (_minAmount != 0)));
		require(!((_partsPerMillion != 0) && (_totalNeeded != 0)));
		require(_minAmount <= _totalNeeded);
		if(_minAmount != 0) {
			require((_totalNeeded % _minAmount) == 0);
		}

		e.partsPerMillion = _partsPerMillion;
		e.periodHours = _periodHours;
		e.totalNeeded = _totalNeeded;
		e.minAmount = _minAmount;
		e.momentCreated = uint32(block.timestamp);
		e.isOpen = true;

		if(!_isPeriodic) {
			e.periodType = PeriodType.NonPeriodic;
		} else if(_isPeriodic && !_isSlidingAmount) {
			e.periodType = PeriodType.Periodic;
		} else {
			e.periodType = PeriodType.PeriodicSliding;
		}		
	}

	function processWeiFunds(Expense _e, uint _currentFlow, uint _value) internal view returns(Expense e) {
		e = _e;
		require(_value == getTotalNeeded(e, _currentFlow));
		require(_currentFlow >= _value);
		// all inputs divide _minAmount == INTEGER

		e.totalReceived += uint128(_value);
		e.balance += uint128(_value);

		if((getTotalNeeded(_e, _value) == 0) || (_e.periodType == PeriodType.Periodic)) {
			e.momentReceived = uint32(block.timestamp);
		}
	}

	function getTotalNeeded(Expense _e, uint _currentFlow)internal view returns(uint need) {
		uint receiveTimeDelta = (block.timestamp - _e.momentReceived);
		uint creationTimeDelta = (block.timestamp - _e.momentCreated);
		uint periodLength = (_e.periodHours * 3600 * 1000);
		uint baseNeed;
		
		if(_e.partsPerMillion != 0) { // if Absolute and (_e.minAmount == _e.totalNeeded)
			baseNeed = ((_e.partsPerMillion * _currentFlow) / 1000000);
		} else {
			baseNeed = _e.totalNeeded;
		}

		if(!_e.isOpen) {
			need = 0;

		} else if(_e.minAmount == _e.totalNeeded) {
			if(_e.periodType == PeriodType.NonPeriodic) {
				if(_e.balance == 0) {
					need = baseNeed;
				}
			} else if(_e.periodType == PeriodType.Periodic) {
				if(receiveTimeDelta >= periodLength) {
					need = baseNeed;
				}
			} else if(_e.periodType == PeriodType.PeriodicSliding) {
				if(receiveTimeDelta >= periodLength) {
					need = (baseNeed * numberOfEntitiesPlusOne(receiveTimeDelta, periodLength)) - _e.totalReceived;
					if(_e.momentReceived == 0) {
						need = baseNeed;
					}
				}
				if((need > _currentFlow) && (_currentFlow > _e.totalNeeded)) {
					need = (_e.totalNeeded * (_currentFlow / _e.totalNeeded)) - _e.totalReceived;
				}
			}

		} else if(_e.minAmount == 0) {
			if(_e.periodType == PeriodType.NonPeriodic) {
				if(_currentFlow >= (_e.totalNeeded - _e.totalReceived)) {
					need = (_e.totalNeeded - _e.totalReceived);
				} else {
					need = _currentFlow;
				}
			} else if(_e.periodType == PeriodType.Periodic) {
				need = getDebtIfNoSliding(_e);
				if(need > _currentFlow) {
					need = _currentFlow;
				}
			} else if(_e.periodType == PeriodType.PeriodicSliding) {
				need = ((numberOfEntitiesPlusOne(creationTimeDelta, periodLength) * _e.totalNeeded) - _e.totalReceived);
				if(need > _currentFlow) {
					need = _currentFlow;
				}
			}

		} else if(_e.minAmount < _e.totalNeeded) {
			if(_e.periodType == PeriodType.NonPeriodic) {
	 			if(_currentFlow >= (_e.totalNeeded - _e.totalReceived)) {
					need = (_e.totalNeeded - _e.totalReceived);
				} else if((_currentFlow < _e.totalNeeded) && (_currentFlow >= _e.minAmount)) { // change need for fund (with discrete input) if baseNeed >= _currentFlow
					need = _currentFlow - (_currentFlow % _e.minAmount);
				}
			} else if(_e.periodType == PeriodType.Periodic) {
				need = getDebtIfNoSliding(_e);
				if((_currentFlow < _e.totalNeeded) && (_currentFlow >= _e.minAmount)) { // change need for fund (with discrete input) if baseNeed >= _currentFlow
					need = _currentFlow - (_currentFlow % _e.minAmount);
				}
			} else if(_e.periodType == PeriodType.PeriodicSliding) {
				need = ((numberOfEntitiesPlusOne(creationTimeDelta, periodLength) * _e.totalNeeded) - _e.totalReceived);
				if((_currentFlow < need) && (_currentFlow >= _e.minAmount)) { // change need for fund (with discrete input) if baseNeed >= _currentFlow
					need = _currentFlow - (_currentFlow % _e.minAmount);
				}
			}
		}
	}

	function getMinNeeded(Expense _e, uint _currentFlow) internal view returns(uint minNeed) {
		if( !((_e.minAmount == 0) && (_e.totalNeeded > 0)) 
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

		uint debtForAllPeriods = ((numberOfEntitiesPlusOne(creationTimeDelta, periodLength) * _e.totalNeeded) - _e.totalReceived);
		if(debtForAllPeriods == 0) {
			return 0;
		} else if((debtForAllPeriods % _e.totalNeeded) > 0 ) {
			return (debtForAllPeriods % _e.totalNeeded);
		} else if(numberOfEntitiesPlusOne(receiveTimeDelta, periodLength) > 1){
			return _e.totalNeeded;
		} else {
			return 0;
		}
	}
}