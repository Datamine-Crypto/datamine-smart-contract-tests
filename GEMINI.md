Before starting read contents of docs/deck.md thoroughly to understand how the Datamine ecosystem works. This project is unit testing the smart contracts from Datamine Network ecosystem.

This is a project to test Datamine Network ecosystem smart contracts.

We're using `yarn hardhat` here so use `yarn hardhat test` to run tests

Be sure to read `package.json` to know what our testing stack is

Be sure to read all smart contracts in `contracts/` folder

Be sure to read all tests in `test/` folder

We have eslint + prettier

---

There is a very complex unit test (inside DamBlockingHolderContractTests.ts) that involves ERC777 hooks to showcase how re-entry attacks would work.

The goal of this test is to showcase that while re-entry is possible, it does not lead to any unwanted side-effects.

In this test I showcase that you can spend DAM balance before lock() finishes.

Specifically it shows that you can't call unlock() before lock() finishes with a mutex BUT you can spend DAM balance.

This is an important new test as it showcases that our mutex protection works on the core burning functionality.

ERC777 is tricky due to these re-entry attacks but I am happy we spent enough time in beginning to safely protect us.

Now with these unit tests we can be sure the ecosystem is secure and working as intended.

These unit tests also make it easier for other security researchers to test their theories.

Further explanation of this test:

if you do anything bad it reverts and you get 200 DAM back
ex: 100 lock() + 100 send() is ok, no issues
101 lock( ) + 100 send() would revert
100 lock() + 101 send() would revert

## but ideally 100 lock() + 100 send() reverts because it's not really atomic. you didn't finish lock()

Note that we inject ERC1820 registry with `import "hardhat-erc1820";` in hardhat.config.ts

This is required for us to use hooks (in unit tests and Lockquidity token)

---

At time of writing these tests hardhat was updated from v2->v3. We should come back to this project and perform an upgrade to v3 in the future when it's a bit more mature.

Please note the specific usage of @openzeppelin/contracts as we're using these for ERC777 interfaces. ERC777 was removed from OpenZeppelin so we have to use this older package.

---

Good Gemini prompts to run:

```
Can you add some "attack" tests to show that the contract is behaving as expected. Specfically I want you to add tests that are not covered around the core Locking/burning/minting logic. For example a test that tries to cheat the system somehow to get an unfair advantage by gaming the system. Expect a revert as you should not be able to get an unfair advantage.

Before you start changing code let me know what you found and we can discuss further.
```

```
Refactor all tests to use best hardhat practices. Do not remove any unit tests. Refactor common code into helpers (inside test/helpers folder).
```
