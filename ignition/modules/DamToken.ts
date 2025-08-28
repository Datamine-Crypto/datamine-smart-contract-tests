import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const DamTokenModule = buildModule('DamTokenModule', (m) => {
  const damToken = m.contract('DamToken');

  return { damToken };
});

export default DamTokenModule;
