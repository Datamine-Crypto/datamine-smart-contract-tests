# Test Results

## DamBlockingHolder Contract Test
### Re-Entry Tests
* Re-Entry Test: DamBlockingHolder should prevent unlock() inside lock() with mutex AND allow send() before lock() finishes (87ms)
* Re-Entry Test: Should revert if lock amount + hook send amount is greater than balance (56ms)
* Re-Entry Test: Should revert if hook send amount is greater than balance after lock

## DamHolder Contract Test
### Deployment
* Should allow sending 100 DAM tokens to a DamHolder contract (65ms)
* Should allow DamHolder to lock DAM tokens after receiving from owner
* Should correctly register ERC1820 interfaces in constructor
### Hooks
* Should emit TokensReceivedCalled event with correct arguments when receiving tokens
* Should emit TokensToSendCalled event with correct arguments when sending tokens
### Functionality
* Should successfully authorize an operator
* Should fail to lock if operator is not authorized
* Should fail to lock more than 100 tokens during failsafe period
* Should fail to lock more tokens than balance
* Should receive Ether via the receive() fallback function
* Should allow any address to trigger lock if operator is authorized
* Should fail to lock zero tokens
* Should fail when authorizing self as operator
* Should fail to authorize operator for a non-ERC777 token

## DamToken
### Deployment
* Should have the correct name and symbol
* Should assign the total supply of tokens to the owner
* Should have the correct initial supply
### Burning
* should ensure supply burns properly via operator
### Token Operations
* Should allow sending tokens to another address
* Should revert when sending more tokens than balance
* Should revert when sending tokens to the zero address
* Should allow burning tokens
* Should revert when burning more tokens than balance
* Should allow authorizing an operator
* Should allow revoking an operator
* Should revert when authorizing self as operator
* Should revert when revoking self as operator
* Should allow an authorized operator to send tokens
* Should revert when an unauthorized operator tries to send tokens
* Should return an empty array for default operators

## DAM Token Migration Tests
* should ensure proper construction parameters with 25m premine
* should emit Minted and Transfer events on deployment
* should ensure supply burns properly via operator

## DamToken Deployment
* Should deploy DamToken and assign total supply to owner
* Should have the correct name and symbol
* Should have the correct initial supply

## FluxToken
### Deployment
* Should lock DAM tokens
### mintToAddress
* Should revert if sourceAddress has no locked tokens
### With locked tokens
* Should mint tokens to the target address
* Should revert if targetBlock is in the future
* Should revert if targetBlock is before lastMintBlockNumber
* Should revert if caller is not the minterAddress
### Attack Scenarios
* should not be possible to mint tokens for a past lock period after re-locking

## FluxToken - Attack Scenarios
### Re-entrancy on burnToAddress
* Should prevent re-entrancy on burnToAddress and not burn twice (61ms)

## FLUX Token Migration Tests
* should ensure proper construction parameters with 0 premined coins (39ms)
* ensure DAM holder can lock DAM in FLUX smart contract
* ensure after locking-in DAM into FLUX you can unlock 100% of DAM back
* ensure failsafe works
* ensure FLUX can be minted after DAM lock-in to another address
* ensure FLUX can be target-burned

## LockToken
### Deployment
* Should deploy LockquidityFactory and its internal contracts (49ms)
* Should allow locking DAM tokens
* Should allow locking, minting, and burning LOCK tokens
### mintToAddress
* Should revert if sourceAddress has no locked tokens
### With locked tokens
* Should revert if targetBlock is in the future
* Should revert if targetBlock is before lastMintBlockNumber
* Should revert if caller is not the minterAddress
### Unlock
* Should allow a user to unlock their tokens
* Should revert if a user tries to unlock without having locked tokens
### burnToAddress
* Should revert if a user tries to burn more tokens than they have
### Multipliers
* Should calculate the time multiplier correctly
* Should calculate the burn multiplier correctly
### Failsafe
* Should prevent locking more than 100 tokens during failsafe period
### Attack Scenarios
* should not be possible to mint tokens for a past lock period after re-locking

---

**Summary:** 67 passing (872ms)