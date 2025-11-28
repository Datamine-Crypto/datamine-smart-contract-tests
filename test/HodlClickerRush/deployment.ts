import { expect } from 'chai';
import { hodlClickerRushFixture, loadFixture } from '../helpers/index.js';

describe('HodlClickerRush Deployment', () => {
	it('Should initialize with zero balances', async () => {
		const { hodlClickerRush } = await loadFixture(hodlClickerRushFixture);
		expect(await hodlClickerRush.totalContractLockedAmount()).to.equal(0);
		expect(await hodlClickerRush.totalContractRewardsAmount()).to.equal(0);
	});
});
