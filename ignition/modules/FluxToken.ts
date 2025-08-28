import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import DamTokenModule from './DamToken';

const FluxTokenModule = buildModule('FluxTokenModule', (m) => {
  const { damToken } = m.useModule(DamTokenModule);

  const fluxToken = m.contract('FluxToken', [damToken, 5760, 161280, 161280]);

  return { fluxToken };
});

export default FluxTokenModule;
