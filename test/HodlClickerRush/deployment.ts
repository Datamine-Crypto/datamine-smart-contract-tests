import { expect } from 'chai';
import { setupHodlClickerRushTests } from '../helpers';

describe('HodlClickerRush Deployment', () => {
  let hodlClickerRush: any;

  beforeEach(async () => {
    const setup = await setupHodlClickerRushTests();
    hodlClickerRush = setup.hodlClickerRush;
  });

  it('Should initialize with zero balances', async () => {
    expect(await hodlClickerRush.totalContractLockedAmount()).to.equal(0);
    expect(await hodlClickerRush.totalContractRewardsAmount()).to.equal(0);
  });
});
