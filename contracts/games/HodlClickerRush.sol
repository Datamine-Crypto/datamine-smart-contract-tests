// Forced recompile
/**
 *Submitted for verification at Arbiscan.io on 2025-06-01
*/

// SPDX-License-Identifier: MIT

/*
================================================================================
|                HODL CLICKER RUSH                   |
================================================================================
|                                                                              |
|   This smart contract (v2) manages a rewards system interacting with an       |
|   ERC777-like token (fluxToken). It allows users to deposit (lock)           |
|   tokens, set rewards percentage (with a default), min block number, and     |
|   min burn amount. It triggers minting events and rewards distribution.      |
|   Users can withdraw accumulated rewards. It implements IERC777Recipient     |
|   and registers with ERC1820 for token reception.                            |
|                                                                              |
================================================================================
*/

pragma solidity ^0.8.20; // Updated Solidity version

// Import OpenZeppelin's Context contract to use _msgSender()
// OpenZeppelin Contracts v4.4.1 (utils/Context.sol)

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

// Import the ERC777 Recipient interface
// OpenZeppelin Contracts v4.4.1 (token/ERC777/IERC777Recipient.sol)

/**
 * @dev Interface of the ERC777TokensRecipient standard as defined in the EIP.
 *
 * Accounts can be notified of {IERC777} tokens being sent to them by having a
 * contract implement this interface (contract holders can be their own
 * implementer) and registering it on the
 * https://eips.ethereum.org/EIPS/eip-1820[ERC1820 global registry].
 *
 * See {IERC1820Registry} and {ERC1820Implementer}.
 */
interface IERC777Recipient {
    /**
     * @dev Called by an {IERC777} token contract whenever tokens are being
     * moved or created into a registered account (`to`). The type of operation
     * is conveyed by `from` being the zero address or not.
     *
     * This call occurs _after_ the token contract's state is updated, so
     * {IERC777-balanceOf}, etc., can be used to query the post-operation state.
     *
     * This function may revert to prevent the operation from being executed.
     */
    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) external;
}

// Import the ERC1820 Registry interface
// OpenZeppelin Contracts (last updated v4.9.0) (utils/introspection/IERC1820Registry.sol)

/**
 * @dev Interface of the global ERC1820 Registry, as defined in the
 * https://eips.ethereum.org/EIPS/eip-1820[EIP]. Accounts may register
 * implementers for interfaces in this registry, as well as query support.
 *
 * Implementers may be shared by multiple accounts, and can also implement more
 * than a single interface for each account. Contracts can implement interfaces
 * for themselves, but externally-owned accounts (EOA) must delegate this to a
 * contract.
 *
 * {IERC165} interfaces can also be queried via the registry.
 *
 * For an in-depth explanation and source code analysis, see the EIP text.
 */
interface IERC1820Registry {
    event InterfaceImplementerSet(address indexed account, bytes32 indexed interfaceHash, address indexed implementer);

    event ManagerChanged(address indexed account, address indexed newManager);

    /**
     * @dev Sets `newManager` as the manager for `account`. A manager of an
     * account is able to set interface implementers for it.
     *
     * By default, each account is its own manager. Passing a value of `0x0` in
     * `newManager` will reset the manager to this initial state.
     *
     * Emits a {ManagerChanged} event.
     *
     * Requirements:
     *
     * - the caller must be the current manager for `account`.
     */
    function setManager(address account, address newManager) external;

    /**
     * @dev Returns the manager for `account`.
     *
     * See {setManager}.
     */
    function getManager(address account) external view returns (address);

    /**
     * @dev Sets the `implementer` contract as ``account``'s implementer for
     * `interfaceHash`.
     *
     * `account` being the zero address is an alias for the caller's address.
     * The zero address can also be used in `implementer` to remove an old one.
     *
     * See {interfaceHash} to learn how these are created.
     *
     * Emits an {InterfaceImplementerSet} event.
     *
     * Requirements:
     *
     * - the caller must be the current manager for `account`.
     * - `interfaceHash` must not be an {IERC165} interface id (i.e. it must not
     * end in 28 zeroes).
     * - `implementer` must implement {IERC1820Implementer} and return true when
     * queried for support, unless `implementer` is the caller. See
     * {IERC1820Implementer-canImplementInterfaceForAddress}.
     */
    function setInterfaceImplementer(address account, bytes32 _interfaceHash, address implementer) external;

    /**
     * @dev Returns the implementer of `interfaceHash` for `account`. If no such
     * implementer is registered, returns the zero address.
     *
     * If `interfaceHash` is an {IERC165} interface id (i.e. it ends with 28
     * zeroes), `account` will be queried for support of it.
     *
     * `account` being the zero address is an alias for the caller's address.
     */
    function getInterfaceImplementer(address account, bytes32 _interfaceHash) external view returns (address);

    /**
     * @dev Returns the interface hash for an `interfaceName`, as defined in the
     * corresponding
     * https://eips.ethereum.org/EIPS/eip-1820#interface-name[section of the EIP].
     */
    function interfaceHash(string calldata interfaceName) external pure returns (bytes32);

    /**
     * @notice Updates the cache with whether the contract implements an ERC165 interface or not.
     * @param account Address of the contract for which to update the cache.
     * @param interfaceId ERC165 interface for which to update the cache.
     */
    function updateERC165Cache(address account, bytes4 interfaceId) external;

    /**
     * @notice Checks whether a contract implements an ERC165 interface or not.
     * If the result is not cached a direct lookup on the contract address is performed.
     * If the result is not cached or the cached value is out-of-date, the cache MUST be updated manually by calling
     * {updateERC165Cache} with the contract address.
     * @param account Address of the contract to check.
     * @param interfaceId ERC165 interface to check.
     * @return True if `account` implements `interfaceId`, false otherwise.
     */
    function implementsERC165Interface(address account, bytes4 interfaceId) external view returns (bool);

    /**
     * @notice Checks whether a contract implements an ERC165 interface or not without using or updating the cache.
     * @param account Address of the contract to check.
     * @param interfaceId ERC165 interface to check.
     * @return True if `account` implements `interfaceId`, false otherwise.
     */
    function implementsERC165InterfaceNoCache(address account, bytes4 interfaceId) external view returns (bool);
}

/**
 * @title IFluxToken Interface
 * @dev This interface defines the expected function(s) for the fluxToken contract.
 * @dev _targetBlock parameter in mintToAddress and getMintAmount will receive block.number from burnTokens.
 */
interface IFluxToken {
    /**
     * @dev Struct defining lock details from the FluxToken contract.
     */
    struct AddressLock {
        uint256 amount;
        uint256 burnedAmount;
        uint256 blockNumber;
        uint256 lastMintBlockNumber;
        address minterAddress;
    }

    function burnToAddress(address _targetAddress, uint256 _amount) external;
    function mintToAddress(address _sourceAddress, address _targetAddress, uint256 _targetBlock) external;
    function getMintAmount(address _sourceAddress, uint256 _targetBlock) external view returns (uint256);
    function send(address _to, uint256 _amount, bytes memory _data) external;
    function operatorSend(
        address sender,
        address recipient,
        uint256 amount,
        bytes calldata data,
        bytes calldata operatorData
    ) external;
    function balanceOf(address who) external view returns (uint256);
    function addressLocks(address account) external view returns (AddressLock memory); // Added addressLocks mapping getter
}

/**
 * @title HodlClickerRush
 * @dev Contract to interact with fluxToken, burn/mint, manage locks, and allow withdrawals/deposits.
 * @dev Implements IERC777Recipient and registers with ERC1820.
 */
contract HodlClickerRush is Context, IERC777Recipient {

    struct AddressLock {
        uint256 rewardsAmount;
        uint256 rewardsPercent; // Can be 0 to use defaultRewardsPercent
        uint256 minBlockNumber;
        bool isPaused;
        uint256 minBurnAmount;
        uint256 lastTipBonusBlock;
    }

    /**
     * @dev Structure to define a burn request for batch processing.
     */
    struct BurnRequest {
        address burnToAddress;
    }

    enum BurnResultCode {
        Success,
        NothingToMint, // Validator doesn't have any tokens to mint
        NothingToTip, // Validator isn't tipping enough (0 tip)
        InsufficientContractBalance, // This smart contract doesn't have enough tokens to cover this burn
        ValidatorPaused, // Validator is currently paused for any burning to
        ValidatorMinBlockNotMet, // Validator has a min block number that is not yet hit before it can be burned
        ValidatorMinBurnAmountNotMet // Validator requires a higher burn amount
    }

    /**
     * @dev Structure to hold the result of a single burn operation within a batch.
     */
    struct BurnOperationResult {
        uint256 tipBonus;        // The tip amount calculated for this operation
        BurnResultCode resultCode; // Empty/0 would mean success. This helps track reason for failure
        uint256 actualAmountBurned; // The actual amount that was burned
        address burnToAddress;   // Who received the burn

        uint256 totalTipAmount; // how much the total tip is (includes jackpot and bonus tip)
        uint256 jackpotAmount; // How much the jackpot was for the burning address
        uint256 totalTipToAddAmount; // How much is being added to final totalTips
        uint256 amountToMintAfterBurn; // How much is minted after the burn happens
    }

    /**
     * @dev Structure to hold detailed information about an address's lock and mint status.
     */
    struct AddressLockDetailsViewModel {
        address targetAddress;
        uint256 amountToMint;
        uint256 rewardsAmount;
        uint256 rewardsPercent;
        uint256 minBlockNumber;
        uint256 minBurnAmount;
        bool isPaused;
        address minterAddressFromFluxToken;
    }



    // --- Events ---
    event TokensBurned(
        address indexed burnToAddress,
        address indexed caller,
        uint256 currentBlock,
        uint256 amountActuallyBurned, 
        uint256 totalTipAmount,
        uint256 jackpotAmount,
        uint256 totalTipToAddAmount,
        uint256 amountToMintAfterBurn
    );

    event TipBonusAwarded(
        address indexed burnToAddress,
        address indexed caller,
        uint256 currentBlock,
        uint256 tipBonus
    );

    event Withdrawn(address indexed user, uint256 amount);
    event Deposited(
        address indexed user,
        uint256 amountDeposited,
        uint256 rewardsPercent,
        uint256 totalRewardsAmount,
        uint256 minBlockNumber,
        uint256 minBurnAmount
    );
    event PausedChanged(address indexed user, bool isPaused);
    event NormalMint(
        address indexed caller,
        address indexed targetAddress,
        uint256 currentBlock
    );

    // --- State Variables ---
    IFluxToken public fluxToken;
    mapping (address => AddressLock) public addressLocks; // This contract's AddressLock mapping

    uint256 public defaultRewardsPercent = 500; // Default 5.00% (500 / 10000)
    uint256 public totalTips;
    uint256 public totalContractRewardsAmount;

    IERC1820Registry private constant _erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);
    bytes32 private constant TOKENS_RECIPIENT_INTERFACE_HASH = keccak256("ERC777TokensRecipient");

    // --- Constructor ---
    constructor(address _fluxTokenAddress) {
        require(_fluxTokenAddress != address(0), "FluxToken address cannot be zero");
        fluxToken = IFluxToken(_fluxTokenAddress);
        _erc1820.setInterfaceImplementer(address(this), TOKENS_RECIPIENT_INTERFACE_HASH, address(this));
    }

    // --- Main Functions ---
    /**
     * @notice Burns tokens for a target address.
     * @param burnToAddress The address whose tokens are targeted for burning and rewards calculation.
     */
    function burnTokens(address burnToAddress) public returns (BurnOperationResult memory) {
        uint256 currentBlock = block.number;
        require(currentBlock > 0, "Current block must be > 0");

        AddressLock storage burnFromAddressLock = addressLocks[_msgSender()];

        // We'll store the results of the burn in a struct. Then we fill out all the props in the struct as there is a lot of logic here
        BurnOperationResult memory burnOperationResult;
        burnOperationResult.burnToAddress = burnToAddress;

        // All burners get a bonus from the total tips pool. Percent is based on their current reward balance
        if (currentBlock > burnFromAddressLock.lastTipBonusBlock) {

            // Tip bonus is based off percantage of your share in the pool
            // For example if you win 3 LOCK jackpot and there are 10 LOCK of rewards you now get 30% of the tip pool every block
            uint256 tipBonus = 0;
            if (totalContractRewardsAmount > 0) {
                tipBonus = (totalTips * burnFromAddressLock.rewardsAmount) / totalContractRewardsAmount;
            }

            if (tipBonus > 0) {

                burnFromAddressLock.rewardsAmount += tipBonus;
                totalContractRewardsAmount += tipBonus; // Increases global rewards inside the contract

                totalTips -= tipBonus;
                burnFromAddressLock.lastTipBonusBlock = currentBlock;

                // Store for returning results
                burnOperationResult.tipBonus = tipBonus;

                // Issue a new event for tip collected
                emit TipBonusAwarded(
                    burnToAddress,
                    _msgSender(),
                    currentBlock,
                    tipBonus
                );
            }
        }
        
        AddressLock storage burnToAddressLock = addressLocks[burnToAddress];

        // See if there is anything that we can mint for this address
        uint256 amountToMintBeforeBurn = fluxToken.getMintAmount(burnToAddress, currentBlock);
        burnOperationResult.actualAmountBurned = amountToMintBeforeBurn; // Store for returning results

        // Ensure the validator has something to burn
        if (amountToMintBeforeBurn == 0) {
            burnOperationResult.resultCode = BurnResultCode.NothingToMint;
            return burnOperationResult;
        }
        
        // Figure out what the validators set the percent tip to
        uint256 effectiveRewardsPercent = burnToAddressLock.rewardsPercent;
        if (effectiveRewardsPercent == 0) {
            effectiveRewardsPercent = defaultRewardsPercent;
        }            
        
        // This will be the full tip amount (jackpot + remainder)
        uint256 totalTipAmount = (amountToMintBeforeBurn * effectiveRewardsPercent) / 10000;

        // If the tip after division is zero then we won't do any burns (no jackpot = no burn)
        // This means the validator needs to either wait longer or burn more tokens
        if (totalTipAmount == 0) {
            burnOperationResult.resultCode = BurnResultCode.NothingToTip;
            return burnOperationResult;
        }

        uint256 actualAmountToBurn = amountToMintBeforeBurn - totalTipAmount;
        
        // Ensure the current smart contract has enough tokens to cover this burn
        if (totalContractRewardsAmount < actualAmountToBurn) {
            burnOperationResult.resultCode = BurnResultCode.InsufficientContractBalance;
            return burnOperationResult;
        }

        // Ensure the validator isn't paused
        if (burnToAddressLock.isPaused) {
            burnOperationResult.resultCode = BurnResultCode.ValidatorPaused;
            return burnOperationResult;
        }
        
        // Ensure validator meets min block height from their settings
        if (currentBlock < burnToAddressLock.minBlockNumber) {
            burnOperationResult.resultCode = BurnResultCode.ValidatorMinBlockNotMet;
            return burnOperationResult;
        }

        // Ensure validator meets min block height from their settings
        if (actualAmountToBurn < burnToAddressLock.minBurnAmount) {
            burnOperationResult.resultCode = BurnResultCode.ValidatorMinBurnAmountNotMet;
            return burnOperationResult;
        }
        
        // Perform the actual burn (jackpot logic)

        // Subtract amount we're burning from the total rewards in the contract
        // This is done in case of any re-entrancy
        totalContractRewardsAmount -= actualAmountToBurn;

        // Capture burned amount of this contract before the burn
        uint256 beforeBurnAddressThisFluxBalance = fluxToken.balanceOf(address(this));

        // Burning tokens from address(this)
        fluxToken.burnToAddress(burnToAddress, actualAmountToBurn);
        
        // Capture contract's balance *after* burn but *before* mint
        uint256 afterBurnThisFluxBalance = fluxToken.balanceOf(address(this));

        require(afterBurnThisFluxBalance == beforeBurnAddressThisFluxBalance - actualAmountToBurn, "Unexpected address balance after burn");

        // Ensure after burning we're still getting something minted
        uint256 amountToMintAfterBurn = fluxToken.getMintAmount(burnToAddress, currentBlock); 
        require(amountToMintAfterBurn > 0, "Mint amount (post-burn) must be > 0");
        require(amountToMintAfterBurn >= actualAmountToBurn, "Mint amount (post-burn) must be > actualAmountToBurn");

        fluxToken.mintToAddress(burnToAddress, address(this), currentBlock);

        uint256 afterMintThisFluxBalance = fluxToken.balanceOf(address(this));

        require(afterMintThisFluxBalance == afterBurnThisFluxBalance + amountToMintAfterBurn, "Unexpected balance after minting");

        // Now we can re-distribute the rewards after minting is done

        // Re-add the burned amount back to the contract
        totalContractRewardsAmount += actualAmountToBurn;

        uint256 jackpotAmount = totalTipAmount / 2; // 50% is jackpot amount (this is the amount from the original tip)

        // The address that performs the burn gets the jackpot (50% of the tip)
        burnFromAddressLock.rewardsAmount += jackpotAmount;
        totalContractRewardsAmount += jackpotAmount; // Increases global rewards inside the contract

        // The raminder of funds is added back as totalTips (for bonuses)
        uint256 totalTipToAddAmount = amountToMintAfterBurn - actualAmountToBurn - jackpotAmount; 

        totalTips += totalTipToAddAmount;

        burnOperationResult.totalTipAmount = totalTipAmount;
        burnOperationResult.jackpotAmount = jackpotAmount;
        burnOperationResult.totalTipToAddAmount = totalTipToAddAmount;
        burnOperationResult.amountToMintAfterBurn = amountToMintAfterBurn;
        
        emit TokensBurned(
            burnToAddress,
            _msgSender(),
            currentBlock,
            actualAmountToBurn,
            totalTipAmount,
            jackpotAmount,
            totalTipToAddAmount,
            amountToMintAfterBurn
        );

        return burnOperationResult;
    }

    function burnTokensFromAddresses(BurnRequest[] calldata requests) public returns (BurnOperationResult[] memory) {
        uint256 numRequests = requests.length;
        require(numRequests > 0, "No burn requests provided");

        BurnOperationResult[] memory results = new BurnOperationResult[](numRequests);

        for (uint256 i = 0; i < numRequests; i++) {
            BurnRequest calldata currentRequest = requests[i];
            (BurnOperationResult memory burnOperationResult) = burnTokens(currentRequest.burnToAddress);

            results[i] = burnOperationResult;
        }
        return results;
    }

    function withdrawAll() public {
        AddressLock storage senderAddressLock = addressLocks[_msgSender()];
        uint256 amountToSend = senderAddressLock.rewardsAmount;
        require(amountToSend > 0, "No rewards to withdraw");

        senderAddressLock.rewardsAmount = 0;
        totalContractRewardsAmount -= amountToSend; // Update total contract rewards

        fluxToken.send(_msgSender(), amountToSend, "");

        emit Withdrawn(_msgSender(), amountToSend);
    }

    function deposit(uint256 amountToDeposit, uint256 rewardsPercent, uint256 minBlockNumber, uint256 minBurnAmount) public {
        require(amountToDeposit >= 0, "Deposit amount must be >= 0");
        require(rewardsPercent <= 10000, "Rewards % must be <= 10000"); // User can set to 0

        AddressLock storage senderAddressLock = addressLocks[_msgSender()];
        senderAddressLock.rewardsAmount += amountToDeposit;
        senderAddressLock.rewardsPercent = rewardsPercent;
        senderAddressLock.minBlockNumber = minBlockNumber;
        senderAddressLock.minBurnAmount = minBurnAmount;

        totalContractRewardsAmount += amountToDeposit; // Update total contract rewards

        if (amountToDeposit > 0) {
            fluxToken.operatorSend(_msgSender(), address(this), amountToDeposit, "", "");
        }

        emit Deposited(
            _msgSender(),
            amountToDeposit,
            rewardsPercent,
            senderAddressLock.rewardsAmount,
            minBlockNumber,
            minBurnAmount
        );
    }

    function setPaused(bool isPaused) public {
        AddressLock storage pauseAddressLock = addressLocks[_msgSender()];
        pauseAddressLock.isPaused = isPaused;
        emit PausedChanged(_msgSender(), isPaused);
    }

    function normalMintToAddress(address targetAddress) public {
        uint256 currentBlock = block.number;
        fluxToken.mintToAddress(_msgSender(), targetAddress, currentBlock);
        emit NormalMint(_msgSender(), targetAddress, currentBlock);
    }

    /**
     * @notice Retrieves lock details and current mintable amount for a list of addresses.
     * @param addressesToQuery An array of addresses to query.
     * @return details An array of AddressLockDetailsViewModel structs.
     * @return currentBlockNumber The current block number when the query was made.
     */
    function getAddressLockDetailsBatch(address[] calldata addressesToQuery) public view returns (AddressLockDetailsViewModel[] memory details, uint256 currentBlockNumber) {
        uint256 numAddresses = addressesToQuery.length;
        require(numAddresses > 0, "No addresses provided to query");

        details = new AddressLockDetailsViewModel[](numAddresses);
        currentBlockNumber = block.number; // Cache block.number for efficiency and return

        for (uint256 i = 0; i < numAddresses; i++) {
            address currentAddress = addressesToQuery[i];
            AddressLock storage timAddressLock = addressLocks[currentAddress]; // This contract's lock
            IFluxToken.AddressLock memory fluxLockData = fluxToken.addressLocks(currentAddress); // FluxToken's lock

            uint256 amountToMint = fluxToken.getMintAmount(currentAddress, currentBlockNumber);

            details[i] = AddressLockDetailsViewModel({
                targetAddress: currentAddress,
                amountToMint: amountToMint,
                rewardsAmount: timAddressLock.rewardsAmount,
                rewardsPercent: timAddressLock.rewardsPercent,
                minBlockNumber: timAddressLock.minBlockNumber,
                minBurnAmount: timAddressLock.minBurnAmount,
                isPaused: timAddressLock.isPaused,
                minterAddressFromFluxToken: fluxLockData.minterAddress
            });
        }
        // Implicit return of details and currentBlockNumber
    }

    // --- ERC777 Hook ---
    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) external override {
        require(amount > 0, "Must receive a positive number of tokens");
    }
}