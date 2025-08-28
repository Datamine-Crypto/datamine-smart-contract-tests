import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import DamTokenModule from './DamToken';

const LockTokenModule = buildModule('LockTokenModule', (m) => {
  const { damToken } = m.useModule(DamTokenModule);

  const lockquidityFactory = m.contract('LockquidityFactory', [damToken]);

  return { lockquidityFactory };
});

export default LockTokenModule;
