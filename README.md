# Datamine Smart Contract Tests

[![CI Status](https://github.com/Datamine-Crypto/datamine-smart-contract-tests/actions/workflows/ci.yml/badge.svg)](https://github.com/Datamine-Crypto/datamine-smart-contract-tests/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Hardhat v3](https://img.shields.io/badge/Hardhat-v3-blue.svg)](https://hardhat.org/)

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
npx hardhat test test/DamBlockingHolderContractTests.ts
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

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
