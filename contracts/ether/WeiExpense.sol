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
	uint momentReceived;
	uint balanceOnMomentReceived;
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

	function getReceiverType() public view returns(Type) {
		if(0!=partsPerMillion) {
			return Type.Relative;
		} else {
			return Type.Absolute;
		}
	}

	modifier zeroIfNoNeed() {
		if(!isNeedsMoney()) {
			return 0;
		}
		_;
	}	

	/**
	* @dev Constructor
	* @param _totalWeiNeed - absolute value. how much Ether this expense should receive (in Wei). Can be zero (use _partsPerMillion in this case)
	* @param _partsPerMillion - if need to get % out of the input flow -> specify this parameter (1% is 10000 units)
	* @param _periodHours - if not isPeriodic and periodHours>0 ->no sense. if isPeriodic and periodHours==0 -> needs money everytime. if isPeriodic and periodHours>0 -> needs money every period.
	* @param _isSlidingAmount - if you don't pay in the current period -> will accumulate the needed amount (only for _totalWeiNeed!)
	* @param _isPeriodic - if isPeriodic and periodHours>0 -> needs money every period. if isPeriodic and periodHours==0 -> needs money everytime.
	*/

	// _totalWeiNeed divide _minWeiAmount == INTEGER
	// all inputs divide _minWeiAmount == INTEGER
	// if _totalWeiNeed == 100 and _minWeiAmount == 5
	// you can send 5,10,15, but not 1, 2, 3, 4, 6, ...
	constructor(uint _minWeiAmount, uint _totalWeiNeed, uint _partsPerMillion, uint _periodHours, bool _isSlidingAmount, bool _isPeriodic) public {
		partsPerMillion = _partsPerMillion;
		periodHours = _periodHours;
		totalWeiNeed = _totalWeiNeed;
		isSlidingAmount = _isSlidingAmount;
		isPeriodic = _isPeriodic;

		require(!((_isSlidingAmount)&&(_periodHours==0)));
		require(!(!(_isPeriodic)&&(_periodHours!=0)));
		require(!((_isSlidingAmount)&&(!_isPeriodic)));
		require(_totalWeiNeed!=0);
		// TODO: _totalWeiNeed divide _minWeiAmount == INTEGER
		// TODO: ppt and total => revert
		// TODO: ppt and minWeiAmount => revert
		// TODO: minWeiAmount <= totalWeiNeed
		momentCreated = block.timestamp;
	}

	function processFunds(uint _currentFlow) public payable {
		emit WeiExpenseProcessFunds(msg.sender, msg.value, _currentFlow);
		require(isNeedsMoney());
		require(totalWeiReceived+msg.value<=getTotalWeiNeeded(_currentFlow)); // protect from extra money
		require(msg.value >= getMinWeiNeeded(_currentFlow));
		// all inputs divide _minWeiAmount == INTEGER

		// TODO: why not working without if????
		if(isPeriodic) { 
			momentReceived = uint(block.timestamp);
		}

		totalWeiReceived += msg.value;
		isMoneyReceived = true;

		if(getTotalWeiNeeded(msg.value)==0) {
			momentReceived = block.timestamp;
			balanceOnMomentReceived = totalWeiReceived;
		}
	}

	function getIsMoneyReceived() public view returns(bool) {
		return isMoneyReceived;
	}

	function getNeededWei() public view returns(uint) {
		return totalWeiNeed;
	}

	function getTotalWeiNeeded(uint _currentFlow)public view zeroIfNoNeed returns(uint need) {
		if(0!=partsPerMillion) {
			need = (getDebtMultiplier()*(partsPerMillion * _currentFlow)) / 1000000;
		}else {
			need = totalWeiNeed - totalWeiReceived;
		}
	}

	function getMinWeiNeeded(uint _currentFlow) public view zeroIfNoNeed returns(uint need) {
		if((minWeiAmount==0)&&(totalWeiNeed>0)) { // Fund-like abs expense criterio
			need = 0;
		} else if(0!=partsPerMillion) { // relative expense criterio
			need = getTotalWeiNeeded(_currentFlow);
		} else {
			need = minWeiAmount;
		}
	}

	function getMomentReceived()public view returns(uint) {
		return momentReceived;
	}

	function getDebtMultiplier()public view returns(uint) {
		// TODO: rework it
		if((minWeiAmount==0)&&(totalWeiNeed>0)) { // FUND

			if((isPeriodic)&&(!isSlidingAmount)&&( (block.timestamp - momentReceived) / (periodHours * 3600 * 1000) >=1)) {
				return (balanceOnMomentReceived/totalWeiNeed) + 1;
			} else if((isPeriodic)&&(isSlidingAmount)) {
				return 1 + ((block.timestamp - momentCreated) / (periodHours * 3600 * 1000));
			}else {
				return 1;
			}		

		} else { // NOT FUND
			if((isSlidingAmount)&&(0!=momentReceived)) {
				return ((block.timestamp - momentReceived) / (periodHours * 3600 * 1000));
			} else {
				return 1;
			}
		}	
	}

	function isNeedsMoney()public view returns(bool isNeed) {
		if(isPeriodic) { // For period Weiexpense
			if ((uint64(block.timestamp) - momentReceived) >= periodHours * 3600 * 1000) { 
				isNeed = true;
			}
		} else if((minWeiAmount==0)&&(totalWeiNeed>0)) {
			isNeed = (totalWeiNeed - totalWeiReceived) > 0;
		} else {
			isNeed = !isMoneyReceived;
		}
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

	function()public {
	}
}