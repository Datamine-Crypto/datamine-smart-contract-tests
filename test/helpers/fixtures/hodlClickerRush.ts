
import { ethers, network } from "hardhat";

export async function hodlClickerRushFixture() {
  const [owner, addr1, addr2] = await ethers.getSigners();

  const DamToken = await ethers.getContractFactory("DamToken");
  const damToken = await DamToken.deploy();
  await damToken.waitForDeployment();

  const FluxToken = await ethers.getContractFactory("FluxToken");
  const fluxToken = await FluxToken.deploy(damToken.target, 1, 1, 1);
  await fluxToken.waitForDeployment();
  console.log("Owner FluxToken balance after deployment:", (await fluxToken.balanceOf(owner.address)).toString());

  const HodlClickerRush = await ethers.getContractFactory("HodlClickerRush");
  const hodlClickerRush = await HodlClickerRush.deploy(fluxToken.target);
  await hodlClickerRush.waitForDeployment();

  return { hodlClickerRush, fluxToken, damToken, owner, addr1, addr2 };
}
