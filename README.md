# Datamine Smart Contract Tests

[![CI Status](https://github.com/Datamine-Crypto/datamine-smart-contract-tests/actions/workflows/ci.yml/badge.svg)](https://github.com/Datamine-Crypto/datamine-smart-contract-tests/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Hardhat v3](https://img.shields.io/badge/Hardhat-v3-blue.svg)](https://hardhat.org/)

To run tests, use the command: `yarn hardhat test` or `yarn test`

Example of testing a single test file: `yarn hardhat test test/DamBlockingHolder/DamBlockingHolderContractTests.ts`

## 🚀 Getting Started

To set up and run this project locally, follow these steps:

### Prerequisites

Ensure you have `yarn` installed. If not, you can install it via npm:

```bash
npm install --global yarn
```

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Datamine-Crypto/datamine-smart-contract-tests.git
   cd datamine-smart-contract-tests
   ```
2. Install the project dependencies:
   ```bash
   yarn install
   ```

### Compiling Contracts

To compile the smart contracts and generate TypeChain types:

```bash
yarn hardhat compile
```

### Running Tests

To execute all unit tests:

```bash
yarn test
```

Or, to run tests with detailed stack traces:

```bash
npx hardhat test --show-stack-traces
```

To run a specific test file:

```bash
npx hardhat test test/DamBlockingHolder/DamBlockingHolderContractTests.ts
```

### Linting and Formatting

To check for linting issues:

```bash
yarn lint
```

To automatically format the code:

```bash
yarn format
```

## 🛠️ Technologies Used

This project leverages the following key technologies and frameworks:

- **Hardhat**: An Ethereum development environment for compiling, deploying, testing, and debugging your smart contracts.
- **Ethers.js**: A complete and compact library for interacting with the Ethereum Blockchain and its ecosystem.
- **Chai**: A BDD / TDD assertion library for Node.js and the browser, used for writing robust tests.
- **TypeScript**: A superset of JavaScript that adds static types, enhancing code quality and maintainability.
- **ESLint**: A pluggable linting utility for JavaScript and TypeScript.
- **Prettier**: An opinionated code formatter.
- **OpenZeppelin Contracts**: A library for secure smart contract development (used for ERC777 interfaces, as noted in `GEMINI.md`).
- **hardhat-erc1820**: A Hardhat plugin for working with the ERC1820 registry, essential for ERC777 hooks.
- **hardhat-typechain**: Generates TypeScript bindings for smart contracts.
- **hardhat-verify**: Verifies contracts on Etherscan and other explorers.
- **hardhat-keystore**: Manages account keystores.

## 🧪 Test Coverage and Philosophy

This project features a comprehensive suite of unit tests designed to ensure the security, functionality, and intended behavior of the Datamine Network ecosystem smart contracts. Our testing philosophy, which we call "Vibe Unit Testing," emphasizes intuitive, natural language test generation with the help of Gemini.

### Vibe Unit Testing with Gemini

Instead of writing test code manually, you can describe the scenario you want to test, and Gemini will generate the necessary contracts and test files. This approach allows for rapid exploration of edge cases and attack vectors, ensuring robust contract security.

**How to Vibe Test:**

1.  Open the project in your editor.
2.  Start a chat with the Gemini assistant.
3.  Provide a clear, descriptive prompt outlining the test you want to add. Be specific about the contracts involved, the actions to be taken, and the expected outcome (e.g., a revert with a specific message, or a change in state).

**Example Prompt:**

Here is an example of a prompt that was used to generate a new "attack" test for this project. You can use it as a template for your own requests:

> Can you add some "attack" tests to show that the contract is behaving as expected. Specfically I want you to add tests that are not covered around the core Locking/burning/minting logic. For example a test that tries to cheat the system somehow to get an unfair advantage by gaming the system. Expect a revert as you should not be able to get an unfair advantage.
>
> Before you start changing code let me know what I found and we can discuss further.

Gemini will then analyze the existing codebase, propose a plan, and, upon your approval, generate and add the new test files to the `test/` directory.

### Key Areas of Test Coverage:

Our tests rigorously cover the following aspects of the Datamine Network smart contracts:

- **Core Token Functionalities:** Comprehensive testing of DAM, FLUX, and LOCK token operations, including transfers, approvals, and balance management.
- **Deployment and Migration:** Verification of correct contract deployment, initial state, and migration parameters.
- **Operator Patterns and Delegated Actions:** Thorough checks of ERC777 operator mechanisms, ensuring secure delegated control over tokens.
- **ERC777 Hooks and Security:** Extensive testing of `tokensToSend` and `tokensReceived` hooks, with a strong focus on preventing re-entrancy and other vulnerabilities. This includes dedicated attack tests like `DamBlockingHolderContractTests.ts` and `FluxTokenAttackTests.ts`.
- **Failsafe Mechanisms:** Validation of protective measures that limit token operations during critical periods, enhancing system stability.
- **Minting and Burning Logic:** Detailed testing of FLUX and LOCK token minting based on locked DAM, as well as various burning scenarios and their impact on token supply and multipliers.
- **Multipliers and Incentives:** Verification of time and burn multipliers that incentivize participation and contribute to the token's economic model.
- **Edge Cases and Revert Conditions:** Robust testing of invalid operations, ensuring contracts revert with appropriate error messages to maintain integrity.

## 📂 Structure of Tests

The test suite is organized logically within the `test/` directory, mirroring the contract structure to provide clear navigation and understanding of test coverage.

- **`test/<ContractName>/`**: Each primary contract (e.g., `DamToken`, `FluxToken`, `LockToken`, `DamHolder`, `DamBlockingHolder`) has its own subdirectory. These directories contain test files (`.ts`) dedicated to that contract's functionalities, deployment, migration, and specific attack scenarios.
- **`test/helpers/`**: This directory centralizes reusable code, utility functions, and common test setups. It includes:
  - `common.ts`: Defines constants, enums for contract names, event names, and revert messages, along with general utility functions like `mineBlocks` and `parseUnits`.
  - `deployHelpers.ts`: Contains functions to deploy various contracts consistently across tests.
  - `setupHelpers.ts`: Provides helpers for setting up complex test scenarios, such as authorizing operators, locking tokens, and preparing contracts for re-entrancy tests.
  - `commonTests.ts`: Encapsulates common test logic, like `testTokenBurn`, to reduce redundancy.
  - `index.ts`: Re-exports all helper modules for simplified imports in test files.

This modular structure enhances maintainability, readability, and allows for focused testing of individual contract components while leveraging shared utilities.

## 🤖 Vibe Testing with Gemini

This project is configured to work with Gemini, allowing you to add new tests using natural language prompts—a process we call "vibe testing." Instead of writing test code manually, you can describe the scenario you want to test, and Gemini will generate the necessary contracts and test files.

### How to Vibe Test

1.  Open the project in your editor.
2.  Start a chat with the Gemini assistant.
3.  Provide a clear, descriptive prompt outlining the test you want to add. Be specific about the contracts involved, the actions to be taken, and the expected outcome (e.g., a revert with a specific message, or a change in state).

### Example Prompt

Here is an example of a prompt that was used to generate a new "attack" test for this project. You can use it as a template for your own requests:

> Can you add some "attack" tests to show that the contract is behaving as expected. Specfically I want you to add tests that are not covered around the core Locking/burning/minting logic. For example a test that tries to cheat the system somehow to get an unfair advantage by gaming the system. Expect a revert as you should not be able to get an unfair advantage.
>
> Before you start changing code let me know what you found and we can discuss further.

Gemini will then analyze the existing codebase, propose a plan, and, upon your approval, generate and add the new test files to the `test/` directory.

## 📋 Master List of all 112 Unit Tests

The test suite is organized into logical components, verifying core features, migration parameters, re-entrancy prevention, and game-theory attack scenarios:

### 1. DAM Token (`test/DamToken`)

Tests covering the core ERC777/ERC20 functionality of the base `DamToken` contract:

- **`DamToken Burning`**
  - `should ensure supply burns properly via operator`: Verifies that an operator can successfully burn DAM tokens.
- **`DamToken Deployment`**
  - `Should have the correct name and symbol`: Verifies the token's name is "Datamine" and symbol is "DAM".
  - `Should assign the total supply of tokens to the owner`: Verifies owner starts with 100% of supply.
  - `Should have the correct initial supply`: Verifies initial supply is 25,000,000.
- **`DAM Token Migration Tests`**
  - `should ensure proper construction parameters with 25m premine`: Verifies construction properties are correct for migration.
  - `should emit Minted and Transfer events on deployment`: Verifies initial minting events are emitted correctly on deployment.
  - `should ensure supply burns properly via operator`: Verifies burning supply via operator works correctly for migration.
- **`DamToken Operator Operations`**
  - `Should allow authorizing an operator`: Verifies operator authorization works.
  - `Should allow revoking an operator`: Verifies operator revocation works.
  - `Should revert when authorizing self as operator`: Verifies self cannot be authorized as operator.
  - `Should revert when revoking self as operator`: Verifies self cannot be revoked as operator.
  - `Should allow an authorized operator to send tokens`: Verifies authorized operator can transfer tokens on behalf of holder.
  - `Should revert when an unauthorized operator tries to send tokens`: Verifies unauthorized operator cannot transfer tokens.
  - `Should return an empty array for default operators`: Verifies defaultOperators has 0 operators.
- **`DamToken Send Operations`**
  - `Should allow sending tokens to another address`: Verifies normal `send()` function transfers tokens and emits `Sent` event.
  - `Should revert when sending more tokens than balance`: Verifies balance constraint revert.
  - `Should revert when sending tokens to the zero address`: Verifies sending to zero address is disallowed.

### 2. DamHolder (`test/DamHolder`)

Tests for the `DamHolder` contract, representing an on-chain entity holding DAM and interacting with Lockquidity:

- **`DamHolder Deployment`**
  - `Should allow sending 100 DAM tokens to a DamHolder contract`: Verifies sending DAM to the holder contract works and updates balance.
  - `Should allow DamHolder to lock DAM tokens after receiving from owner`: Verifies locking DAM from holder to Lockquidity works.
  - `Should correctly register ERC1820 interfaces in constructor`: Verifies registry registers `TokensSender` and `TokensRecipient` interfaces.
- **`DamHolder Functionality`**
  - `Should successfully authorize an operator`: Verifies authorizing an operator on behalf of the holder.
  - `Should fail to lock if operator is not authorized`: Verifies revert when trying to lock DAM if Lockquidity is not authorized.
  - `Should fail to lock more than 100 tokens during failsafe period`: Verifies failsafe locking amount limit.
  - `Should fail to lock more tokens than balance`: Verifies balance constraint revert.
  - `Should receive Ether via the receive() fallback function`: Verifies contract can receive ETH.
  - `Should allow any address to trigger lock if operator is authorized`: Verifies that if operator is authorized, any caller can trigger the lock of holder's tokens.
  - `Should fail to lock zero tokens`: Verifies lock must be positive.
  - `Should fail when authorizing self as operator`: Verifies self-operator authorization fails.
  - `Should fail to authorize operator for a non-ERC777 token`: Verifies that authorizing operator fails if the token is not an ERC777 token (reverts).
- **`DamHolder Hooks`**
  - `Should emit TokensReceivedCalled event with correct arguments when receiving tokens`: Verifies `TokensReceived` hook.
  - `Should emit TokensToSendCalled event with correct arguments when sending tokens`: Verifies `TokensToSend` hook.

### 3. DamBlockingHolder (`test/DamBlockingHolder`)

Advanced tests demonstrating the contract's resilience against re-entrancy attacks using ERC777 hooks:

- **`Re-Entry Tests`**
  - `Re-Entry Test: DamBlockingHolder should prevent unlock() inside lock() with mutex AND allow send() before lock() finishes`: Verifies that re-entrant calls to `unlock()` during a `lock()` operation are blocked by the mutex, while normal token transfers during hooks still work.
  - `Re-Entry Test: Should revert if lock amount + hook send amount is greater than balance`: Prevents combined transactions from overdrawing contract balance.
  - `Re-Entry Test: Should revert if hook send amount is greater than balance after lock`: Prevents overdrawing balance after lock amount has been deducted.
  - `Re-Entry Test: DamBlockingHolder should prevent unlock() inside unlock() via tokensReceived hook`: Verifies that re-entrant calls to `unlock()` during another `unlock()` operation are blocked by the recursion mutex.

### 4. LockToken / Lockquidity (`test/LockToken`)

Tests covering the Lockquidity factory, vault, and ERC20/ERC777 token (`LockquidityToken`) minted by locking DAM:

- **`LockToken Attack Scenarios`**
  - `should not be possible to mint tokens for a past lock period after re-locking`: Verifies that historical block numbers from a previous lock period cannot be re-used to mint rewards after an unlock and re-lock.
- **`LockToken - Attack Scenarios`**
  - `Should prevent re-entrancy on burnToAddress and not burn twice`: Re-entrancy attack simulation on `burnToAddress` via ERC777 hooks; mutex successfully prevents double-burning.
  - `Should revert if lock amount is 0`: Lock amount must be > 0.
  - `Should revert if burn amount is 0`: Burn amount must be > 0.
  - `Should revert if burning to an unlocked address`: Target of `burnToAddress` must have active lock.
- **`LockToken Burn`**
  - `Should revert if a user tries to burn more tokens than they have`: Prevents burning more LOCK than the user possesses.
- **`LockToken Deployment`**
  - `Should deploy LockquidityFactory and its internal contracts`: Verifies deployment of factory, token, and vault contracts.
  - `Should allow locking DAM tokens`: Verifies locking DAM into Lockquidity.
  - `Should allow locking, minting, and burning LOCK tokens`: Verifies end-to-end locking DAM, minting LOCK rewards, and burning LOCK.
- **`LockToken Failsafe`**
  - `Should prevent locking more than 100 tokens during failsafe period`: Enforces the failsafe limit of 100 tokens.
- **`LockToken Mint`**
  - `Should revert if targetBlock is in the future`: Target block must be <= current block.
  - `Should revert if targetBlock is before lastMintBlockNumber`: Target block must be ahead of last mint.
  - `Should revert if caller is not the minterAddress`: Caller must be the delegated minter.
  - `Should revert if sourceAddress has no locked tokens`: Source address must have locked DAM to mint LOCK.
- **`LockToken Multipliers`**
  - `Should calculate the time multiplier correctly`: Verifies time multiplier increases with blocks.
  - `Should calculate the burn multiplier correctly`: Verifies burn multiplier increases when LOCK is burned.
- **`LockToken Unlock`**
  - `Should allow a user to unlock their tokens`: Verifies unlocking DAM restores user balance.
  - `Should revert if a user tries to unlock without having locked tokens`: Reverts if unlocking without an active lock.
  - `Should revert when attempting to lock tokens when already locked`: Reverts if locking again without unlocking first.
  - `Should revert when attempting to lock and unlock/lock in the same block`: Reverts if attempting lock and unlock/lock operations in the same block.

### 5. FluxToken (`test/FluxToken`)

Tests covering `FluxToken`, the primary utility token minted by locking DAM:

- **`FluxToken Attack Scenarios`**
  - `should not be possible to mint tokens for a past lock period after re-locking`: Verifies that historical block numbers cannot be re-used to mint rewards after an unlock/re-lock cycle.
- **`FluxToken - Attack Scenarios`**
  - `Should prevent re-entrancy on burnToAddress and not burn twice`: Malicious contract attempts re-entry on `burnToAddress` via ERC777 hooks; mutex prevents double-burning.
  - `Should revert if lock amount is 0`: Lock amount must be > 0.
  - `Should revert if burn amount is 0`: Burn amount must be > 0.
  - `Should revert if trying to unlock without locked tokens`: Unlock requires active lock.
  - `Should revert if burning to an unlocked address`: Target of `burnToAddress` must have active lock.
  - `Should not allow double-minting in the same block by stepping block target`: Prevents calling `mintToAddress` twice in the same block by shifting targets (via `evm_setAutomine(false)`).
  - `Should dilute other validators multipliers if an attacker locks 1 wei and burns a massive amount`: Multiplier Dilution Attack test verifies that an attacker locking 1 wei of DAM and burning a large quantity of FLUX dilutes everyone else's yield multipliers.
  - `Should allow multiplier retroactivity / supercharging in the same block`: Verifies that a user can wait many blocks to accrue rewards, burn FLUX to increase their multiplier, and retrospectively apply the boosted multiplier to the entire accrual period when minting in the same block.
- **`FluxToken Deployment`**
  - `Should lock DAM tokens`: Verifies deploying/locking DAM works and moves tokens to FluxToken contract.
- **`FLUX Token Migration Tests`**
  - `should ensure proper construction parameters with 0 premined coins`: Verifies name, symbol, and 0 initial supply.
  - `ensure DAM holder can lock DAM in FLUX smart contract`: Verifies locking DAM records locked amount and block number.
  - `ensure after locking-in DAM into FLUX you can unlock 100% of DAM back`: Verifies unlocking recovers 100% of DAM.
  - `ensure failsafe works`: Verifies that lock amount is capped during failsafe period, and the cap is lifted after failsafe period passes.
  - `ensure FLUX can be minted after DAM lock-in to another address`: Verifies delegated minting to another address works.
  - `ensure FLUX can be target-burned`: Verifies burning FLUX to increase a specific locked address's `burnedAmount` works and accumulates.
  - `should not be possible to lock and unlock/lock in the same block`: Verifies that sending lock and unlock in same block reverts the second transaction.
  - `should revert when attempting to lock tokens when already locked`: Verifies locking again without unlocking first reverts.
- **`FluxToken Mint`**
  - `Should mint tokens to the target address`: Verifies basic minting of accrued rewards works.
  - `Should revert if targetBlock is in the future`: Verifies target block must be <= current block.
  - `Should revert if targetBlock is before lastMintBlockNumber`: Verifies target block must be ahead of last mint.
  - `Should revert if caller is not the minterAddress`: Verifies caller must be the delegated minter.
  - `Should revert if owner tries to mint after delegating minter to another address`: Verifies owner cannot mint if they delegated to another address.
  - `Should revert if sourceAddress has no locked tokens`: Verifies source address must have locked DAM to mint.

### 6. BatchMinter (`test/BatchMinter`)

Tests for the helper utility allowing compounding yield and managing minting delegations in batch operations:

- **`BatchMinter Functionality`**
  - `should allow a user to batch burn when no delegated minter is set`: Verifies that the lock owner can call `batchBurn` directly on the `BatchMinter` contract when no delegated minter has been set, successfully minting and burning FLUX to increase their multiplier.
  - `should allow a delegated minter to batch burn`: Verifies that a delegated minter set by the owner can successfully execute `batchBurn` on behalf of the owner.
  - `should send tokens to targetAddress with normalMintTo`: Verifies that `normalMintTo` successfully mints the reward FLUX and transfers them to the specified target address.
  - `should revert if an unauthorized caller attempts to batchBurn`: Verifies that an arbitrary address cannot call `batchBurn` on a user's lock.
  - `should revert if the lock owner attempts to batchBurn after delegating the minter`: Verifies that once a delegated minter is set, the original lock owner can no longer execute `batchBurn` directly; only the delegated minter can.
  - `should revert if an unauthorized caller attempts to normalMintTo`: Verifies that an arbitrary address cannot call `normalMintTo` on a user's lock.
- **`BatchMinter Yield Comparison`**
  - `should calculate total burned amount for normal minting`: Simulates waiting and doing a single large mint/burn (normal minting).
  - `should calculate total burned amount for batch burning`: Simulates waiting and doing a series of smaller batch-burns over the same block range, helping compare the yield difference (compounding).

### 7. HodlClickerRush (`test/HodlClickerRush`)

Comprehensive tests for the gamified rewards system where players burn FLUX to claim jackpots:

- **`HodlClickerRush Burn Edge Cases`**
  - `should return NothingToMint if no FLUX is available to mint`: Returns `NothingToMint` if block has not progressed since locking.
  - `should return ValidatorMinBlockNotMet if current block is less than minBlockNumber`: Returns `ValidatorMinBlockNotMet` if the validator's minimum block height setting has not been met yet.
  - `should return ValidatorMinBurnAmountNotMet if actual burn amount is less than minBurnAmount`: Returns `ValidatorMinBurnAmountNotMet` if the reward amount to be burned is less than validator's minimum burn amount setting.
- **`HodlClickerRush Deployment`**
  - `Should initialize with zero balances`: Verifies initial variables (locked amount, rewards amount) are 0.
- **`HodlClickerRush Deposit`**
  - `should allow depositing and calculate actualAmountToDeposit correctly when contract is empty`: Verifies first deposit is credited at 1:1 ratio.
  - `should calculate actualAmountToDeposit correctly when rewards have been added to the pool`: Verifies deposits are scaled correctly when pool contains rewards, preserving withdrawal ratio.
  - `should revert when depositing with rewardsPercent above maximum`: Verifies deposit reverts if rewards percentage > 100%.
  - `should store minBlockNumber and minBurnAmount correctly`: Verifies setting and storing validator parameters.
  - `should result in 0 actualAmountToDeposit when depositing a very small amount (dust) under high rewards-to-locked ratio`: Verifies rounding down behavior on tiny deposit amounts when rewards ratio is high.
- **`HodlClickerRush Front-running`**
  - `should allow a player to front-run validator normalMintToAddress and claim the jackpot, causing validator to revert`: Verifies same-block transaction priority ordering where player front-runs a validator's direct mint transaction to claim the jackpot, causing the validator's transaction to revert.
  - `should handle multi-player jackpot gas war where only the highest gas price player succeeds and other players return NothingToMint silently`: Verifies same-block jackpot claiming gas wars where only the highest gas price transaction succeeds in claiming the jackpot, while lower gas price claims execute successfully (no revert) but return `NothingToMint` and get 0 rewards.
- **`HodlClickerRush Pause`**
  - `should allow an address to pause itself`: Verifies pausing.
  - `should allow an address to unpause itself`: Verifies unpausing.
  - `should prevent a paused address from burning tokens`: Verifies burning to a paused validator returns `ValidatorPaused`.
  - `should allow an unpaused address to burn tokens`: Verifies burning to an unpaused validator succeeds.
  - `should emit PausedChanged event`: Verifies pause/unpause events are emitted.
- **`HodlClickerRush Rewards`**
  - `should give a jackpot and update rewards correctly`: Verifies player receives jackpot (50% of tip) and contract updates pools.
  - `should correctly calculate total tip and jackpot amount using getTipAndJackpotAmount function`: Verifies helper calculations.
- **`HodlClickerRush Scenarios`**
  - `should correctly handle the user-specified reward scenario`: A full end-to-end walkthrough of deposits, block mining, burning (jackpot generation), and user withdrawal, verifying all balances.
  - `should correctly handle batch burning via burnTokensFromAddresses`: Verifies processing multiple burn requests in a single transaction, skipping paused validators gracefully.
- **`HodlClickerRush Simple Burn`**
  - `should return InsufficientContractBalance if not enough FLUX is deposited`: Returns `InsufficientContractBalance` if the reward pool is empty or too small.
  - `should successfully burn tokens if enough FLUX is deposited`: Returns `Success` if pool is sufficient.
- **`HodlClickerRush Withdraw`**
  - `should allow a user to withdraw their proportional share of rewards`: Verifies a user can withdraw their rewards pool share.
  - `should not allow withdrawing more than earned rewards`: Verifies withdraw reverts if rewards balance is 0.
  - `should not allow withdrawing zero amount`: Verifies withdraw reverts if no rewards are earned.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
