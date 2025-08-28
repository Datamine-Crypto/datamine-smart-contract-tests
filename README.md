# Datamine Smart Contract Tests

[![CI Status](https://github.com/Datamine-Crypto/datamine-smart-contract-tests/actions/workflows/ci.yml/badge.svg)](https://github.com/Datamine-Crypto/datamine-smart-contract-tests/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

To run tests, use the command: `yarn hardhat test` or `yarn test`

Example of testing a single test file: `yarn hardhat test test/DamBlockingHolderContractTests.ts`

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

### Running Tests

To execute all unit tests:

```bash
yarn test
```

Or, to run tests with detailed stack traces:

```bash
yarn hardhat test --show-stack-traces
```

To run a specific test file:

```bash
yarn hardhat test test/DamBlockingHolderContractTests.ts
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

## 🧪 Test Overview

This project includes a comprehensive suite of unit tests to ensure the security, functionality, and intended behavior of the Datamine Network ecosystem smart contracts. The tests cover various aspects, from core token operations to complex re-entrancy attack scenarios.

### 🔒 `DamBlockingHolderContractTests.ts`

This is a crucial test file that focuses on re-entrancy attacks on the `DamBlockingHolder` contract, especially concerning ERC777 hooks. It demonstrates that while re-entry is possible, the contract's mutex protection prevents unwanted side-effects, particularly for the core burning functionality. It also tests scenarios where `lock()` and `send()` amounts exceed balances, ensuring reverts. This test highlights the security measures in place for ERC777 interactions.

### 🛡️ `DamHolderContractTests.ts`

This file tests the `DamHolder` contract, which manages DAM tokens. It covers token transfers to the holder, its ability to lock tokens into `LockquidityToken`, and the proper functioning of ERC777 hooks (`tokensToSend` and `tokensReceived`). It also thoroughly verifies ERC1820 interface registration for `tokensSender` and `tokensRecipient`. The tests include various security scenarios such as preventing unauthorized operators, enforcing failsafe limits during locking, handling insufficient balances, and ensuring correct behavior when attempting to lock zero tokens or authorize self as an operator. It also confirms the contract's ability to receive Ether.

### 💰 `DamToken.ts`

This test suite validates the core functionalities of the `DamToken` (ERC777 token). It checks deployment parameters (name, symbol, total supply), burning mechanisms (both direct and via operator), token sending (including `operatorSend`), operator authorization/revocation, and ensures proper event emissions and revert conditions for invalid operations (e.g., sending to zero address, exceeding balance). It also verifies that `defaultOperators()` returns an empty array.

### 🔄 `DamTokenMigration.ts`

This file specifically tests the initial deployment and migration aspects of the `DamToken`. It verifies proper construction parameters (name, symbol, and initial supply of 25 million tokens) and confirms the emission of `Minted` and `Transfer` events upon deployment. It also includes a test for burning tokens via an authorized operator, ensuring correct supply reduction and event emissions.

### 🚀 `DeployDamToken.ts`

A simple test file focused solely on the deployment of the `DamToken`. It verifies that the token deploys correctly, assigns the total supply to the owner, and has the expected name, symbol, and initial supply.

### 🌊 `FluxToken.ts`

This file tests the `FluxToken` contract, focusing on its core locking and minting functionalities. It verifies that DAM tokens can be locked into the `FluxToken` contract, and that FLUX tokens can be minted to a target address based on the locked DAM. The tests cover various revert conditions for minting, such as invalid target blocks, unauthorized minters, or insufficient locked tokens. It also includes attack scenarios to ensure that tokens cannot be minted for past lock periods after re-locking, reinforcing the contract's security.

### ⚔️ `FluxTokenAttackTests.ts`

This test file focuses on attack scenarios, specifically re-entrancy on the `FluxToken`'s `burnToAddress` function. It deploys an `UnlockAttacker` contract to attempt to exploit re-entrancy vulnerabilities during the burning process. The test asserts that the `burnToAddress` function correctly prevents re-entrancy, ensuring that tokens are burned exactly once and preventing double-burning or other unintended side effects.

### 📈 `FluxTokenMigration.ts`

This suite covers the core functionalities and migration aspects of the `FLUX` token. It verifies construction parameters (ensuring zero premined coins), tests the process of locking DAM into FLUX, and ensures 100% of DAM can be unlocked. It also validates the failsafe mechanism, and covers minting and target-burning of FLUX tokens to/from specific addresses. This ensures the token behaves as expected in a multi-contract environment.

### 🔐 `LockToken.ts`

This file tests the `LockquidityToken` (referred to as `LockToken` in the file name). It covers the deployment of the `LockquidityFactory` and its associated `LockquidityToken` and `LockquidityVault` contracts. It thoroughly tests the locking of DAM tokens, minting of LOCK tokens (including various revert conditions for invalid target blocks or unauthorized minters), and burning of LOCK tokens (including reverts for insufficient balance). It also includes tests for time and burn multipliers, the failsafe mechanism for locking, and attack scenarios to prevent minting for past lock periods after re-locking.

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

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
