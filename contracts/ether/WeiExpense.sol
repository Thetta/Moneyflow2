pragma solidity ^0.4.24;

import "../interfaces/IDestination.sol";
import "../interfaces/IWeiReceiver.sol";

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title WeiExpense
 * @dev Something that needs money (task, salary, bonus, etc)
 * Should be used in the Moneyflow so will automatically receive Wei.
*/
contract WeiExpense is IWeiReceiver, IDestination, Ownable {
	bool isMoneyReceived = false;

	uint totalWeiReceived;
	uint balanceAtMomentReceived;
	uint momentCreated;

	bool isSlidingAmount = false;
	bool isPeriodic = false;
	uint partsPerMillion = 0;
	uint periodHours = 0;
	uint momentReceived = 0;
	uint totalWeiNeed = 0;
	uint minWeiAmount = 0;

	event WeiExpenseFlush(address _owner, uint _balance);
	event WeiExpenseSetNeededWei(uint _totalWeiNeed);
	event WeiExpenseSetPercents(uint _partsPerMillion);
	event WeiExpenseProcessFunds(address _sender, uint _value, uint _currentFlow);

	/**
	* @dev Constructor
	* @param _totalWeiNeed - absolute value. how much Ether this expense should receive (in Wei). Can be zero (use _partsPerMillion in this case)
	* @param _partsPerMillion - if need to get % out of the input flow -> specify this parameter (1% is 10000 units)
	* @param _periodHours - if not isPeriodic and periodHours>0 ->no sense. if isPeriodic and periodHours == 0 -> needs money everytime. if isPeriodic and periodHours>0 -> needs money every period.
	* @param _isSlidingAmount - if you don't pay in the current period -> will accumulate the needed amount (only for _totalWeiNeed!)
	* @param _isPeriodic - if isPeriodic and periodHours>0 -> needs money every period. if isPeriodic and periodHours == 0 -> needs money everytime.
	*/

	// _totalWeiNeed divide _minWeiAmount == INTEGER
	// all inputs divide _minWeiAmount == INTEGER
	// if _totalWeiNeed == 100 and _minWeiAmount == 5
	// you can send 5,10,15, but not 1, 2, 3, 4, 6, ...
	constructor(uint _totalWeiNeed, uint _minWeiAmount, uint _partsPerMillion, uint _periodHours, bool _isSlidingAmount, bool _isPeriodic) public {
		partsPerMillion = _partsPerMillion;
		periodHours = _periodHours;
		totalWeiNeed = _totalWeiNeed;
		isSlidingAmount = _isSlidingAmount;
		isPeriodic = _isPeriodic;
		minWeiAmount = _minWeiAmount;

		require(!((_isSlidingAmount) && (_periodHours == 0)));
		require(!(!(_isPeriodic) && (_periodHours != 0)));
		require(!((_isSlidingAmount) && (!_isPeriodic)));
		require(!((_totalWeiNeed == 0) && (_minWeiAmount != 0)));
		require(!((_partsPerMillion != 0) && (_minWeiAmount != 0)));
		require(!((_partsPerMillion != 0) && (_totalWeiNeed != 0)));
		require(_minWeiAmount <= _totalWeiNeed);
		if(_minWeiAmount != 0) {
			require((_totalWeiNeed % _minWeiAmount) == 0);
		}

		// TODO: _totalWeiNeed divide _minWeiAmount == INTEGER
		momentCreated = block.timestamp;
	}

	function getReceiverType() public view returns(Type) {
		if(0 != partsPerMillion) {
			return Type.Relative;
		} else {
			return Type.Absolute;
		}
	}	

	function processFunds(uint _currentFlow) public payable {
		emit WeiExpenseProcessFunds(msg.sender, msg.value, _currentFlow);
		// require(msg.value >= getMinWeiNeeded(_currentFlow));
		require(msg.value == getTotalWeiNeeded(_currentFlow));
		require(_currentFlow >= msg.value);
		// all inputs divide _minWeiAmount == INTEGER

		totalWeiReceived += msg.value;
		isMoneyReceived = true;


		if((getTotalWeiNeeded(msg.value) == 0) || (isPeriodic)) {
			momentReceived = block.timestamp;
			balanceAtMomentReceived = totalWeiReceived;
		}
	}

	function getIsMoneyReceived() public view returns(bool) {
		return isMoneyReceived;
	}

	function getNeededWei() public view returns(uint) {
		return totalWeiNeed;
	}

	function getTotalWeiNeeded(uint _currentFlow)public view returns(uint out) {
		uint receiveTimeDelta = (block.timestamp - momentReceived);
		uint creationTimeDelta = (block.timestamp - momentCreated);
		uint periodLength = (periodHours * 3600 * 1000);
		uint need;
		
		if(partsPerMillion != 0) { // if Absolute and (minWeiAmount == totalWeiNeed)
			need = ((partsPerMillion * _currentFlow) / 1000000);
		} else {
			need = totalWeiNeed;
		}

		if(minWeiAmount == totalWeiNeed) {
			if(!isPeriodic) {
				out = need;	
			} else if(isPeriodic && !isSlidingAmount) {
				if(receiveTimeDelta >= periodLength) {
					out = need;
				}
			} else if(isPeriodic && isSlidingAmount) {
				if(receiveTimeDelta >= periodLength) {
					out = (need * numberOfEntitiesPlusOne(receiveTimeDelta, periodLength)) - totalWeiReceived;
					if(momentReceived == 0) {
						out = need;
					}
				}
				if((out > _currentFlow) && (_currentFlow > totalWeiNeed)) {
					out = (totalWeiNeed * (_currentFlow / totalWeiNeed)) - totalWeiReceived;
				}				
			}

		} else if(minWeiAmount == 0) {
			if(!isPeriodic) {
				if(_currentFlow >= (totalWeiNeed - totalWeiReceived)) {
					return (totalWeiNeed - totalWeiReceived);
				} else {
					return _currentFlow;
				}
			} else if(isPeriodic && !isSlidingAmount) {
				out = getDebtIfNoSliding();
				if(out > _currentFlow) {
					out = _currentFlow;
				}
			} else if(isPeriodic && isSlidingAmount) {
				out = ((numberOfEntitiesPlusOne(creationTimeDelta, periodLength) * totalWeiNeed) - totalWeiReceived);
				if(out > _currentFlow) {
					out = _currentFlow;
				}			
			}

		} else if(minWeiAmount < totalWeiNeed) {
			if(!isPeriodic) {
	 			if(_currentFlow >= (totalWeiNeed - totalWeiReceived)) {
					out = (totalWeiNeed - totalWeiReceived);
				} else if((_currentFlow < totalWeiNeed) && (_currentFlow >= minWeiAmount)) { // change need for fund (with discrete input) if need >= _currentFlow
					out = _currentFlow - (_currentFlow % minWeiAmount);
				}
			} else if(isPeriodic && !isSlidingAmount) {
				out = getDebtIfNoSliding();
				if((_currentFlow < totalWeiNeed) && (_currentFlow >= minWeiAmount)) { // change need for fund (with discrete input) if need >= _currentFlow
					out = _currentFlow - (_currentFlow % minWeiAmount);
				}				
			} else if(isPeriodic && isSlidingAmount) {
				out = ((numberOfEntitiesPlusOne(creationTimeDelta, periodLength) * totalWeiNeed) - totalWeiReceived);
				if((_currentFlow < out) && (_currentFlow >= minWeiAmount)) { // change need for fund (with discrete input) if need >= _currentFlow
					out = _currentFlow - (_currentFlow % minWeiAmount);
				}
			}
		}
	}

	function numberOfEntitiesPlusOne(uint _inclusive, uint _inluded) public pure returns(uint count) {
		if(_inclusive < _inluded) {
			count = 1;
		} else {
			count = 1 + (_inclusive / _inluded);
		}
	}

	function getDebtIfNoSliding() internal view returns(uint) {
		uint receiveTimeDelta = (block.timestamp - momentReceived);
		uint creationTimeDelta = (block.timestamp - momentCreated);
		uint periodLength = (periodHours * 3600 * 1000);

		uint debtForAllPeriods = ((numberOfEntitiesPlusOne(creationTimeDelta, periodLength) * totalWeiNeed) - totalWeiReceived);
		if(debtForAllPeriods == 0) {
			return 0;
		} else if((debtForAllPeriods % totalWeiNeed) > 0 ) {
			return (debtForAllPeriods % totalWeiNeed);
		} else if(numberOfEntitiesPlusOne(receiveTimeDelta, periodLength) > 1){
			return totalWeiNeed;
		} else {
			return 0;
		}
	}

	function getMinWeiNeeded(uint _currentFlow) public view returns(uint minNeed) {
		if( !((minWeiAmount == 0) && (totalWeiNeed > 0)) 
		 && !(partsPerMillion > 0) ) {
			minNeed = getTotalWeiNeeded(_currentFlow);
		}
	}

	function getMomentReceived()public view returns(uint) {
		return momentReceived;
	}

	function isNeedsMoney()public view returns(bool isNeed) {
		isNeed = (getTotalWeiNeeded(1e30) > 0);
	}

	function getPartsPerMillion()public view returns(uint) {
		return partsPerMillion;
	}

	function flush()public onlyOwner {
		emit WeiExpenseFlush(owner, address(this).balance);
		owner.transfer(address(this).balance);
	}

	function flushTo(address _to) public onlyOwner {
		emit WeiExpenseFlush(_to, address(this).balance);
		_to.transfer(address(this).balance);
	}

	function setNeededWei(uint _totalWeiNeed) public onlyOwner {
		emit WeiExpenseSetNeededWei(_totalWeiNeed);
		totalWeiNeed = _totalWeiNeed;
	}

	function setPercents(uint _partsPerMillion) public onlyOwner {
		emit WeiExpenseSetPercents(_partsPerMillion);
		partsPerMillion = _partsPerMillion;
	}

	function() public {}
}
