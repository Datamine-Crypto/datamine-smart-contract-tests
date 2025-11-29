import { expect } from 'chai';
import { hodlClickerRushFixture } from '../helpers/fixtures/hodlClickerRush';
import { loadFixture } from '../helpers/fixtureRunner';

describe('HodlClickerRush Deployment', () => {
	it('Should initialize with zero balances', async () => {
		const { hodlClickerRush } = await loadFixture(hodlClickerRushFixture);
		expect(await hodlClickerRush.totalContractLockedAmount()).to.equal(0);
		expect(await hodlClickerRush.totalContractRewardsAmount()).to.equal(0);
	});
});
