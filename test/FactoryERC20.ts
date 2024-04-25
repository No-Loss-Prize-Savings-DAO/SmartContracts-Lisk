import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("FactoryERC20", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployFactoryERC20Fixture() {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const ONE_MILLION_TOKENS = 1_000_000_000_000_000_000_000_000n;

    const mintAmount = ONE_MILLION_TOKENS;
    const TOKEN_NAME = "Blitz";
    const TOKEN_SYMBOL = "BLZ";

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await hre.ethers.getSigners();

    const FactoryERC20 = await hre.ethers.getContractFactory("FactoryERC20");
    const factoryERC20 = await FactoryERC20.deploy(TOKEN_NAME, TOKEN_SYMBOL);

    return { factoryERC20, mintAmount, TOKEN_NAME, TOKEN_SYMBOL, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should send mintAmount to owner", async function () {
      const { owner, mintAmount, factoryERC20 } = await loadFixture(deployFactoryERC20Fixture);

      expect(await factoryERC20.balanceOf(owner)).to.equal(mintAmount);
    });
  });

  describe("Mint", function () {
    it("Should mint mintAmount to otherAccount", async function () {
      const { factoryERC20, otherAccount, mintAmount } = await loadFixture(deployFactoryERC20Fixture);

      await factoryERC20.mint(otherAccount, mintAmount);
      expect(await factoryERC20.balanceOf(otherAccount)).to.equal(mintAmount);
    });

    it("Should fail if another account tries to mint", async function () {
      // We don't use the fixture here because we want a different deployment
      const { factoryERC20, otherAccount, mintAmount } = await loadFixture(deployFactoryERC20Fixture);

      await expect(factoryERC20.connect(otherAccount).mint(otherAccount, mintAmount)).to.be.revertedWithCustomError(
        factoryERC20, "OwnableUnauthorizedAccount"
      ).withArgs(otherAccount.address);
    });

    it("Should fail if it tries to mint to zero address", async function () {
      // We don't use the fixture here because we want a different deployment
      const { factoryERC20, otherAccount, mintAmount } = await loadFixture(deployFactoryERC20Fixture);
      const zero = ethers.ZeroAddress;

      await expect(factoryERC20.mint(zero, mintAmount)).to.be.revertedWithCustomError(
        factoryERC20, "ERC20InvalidReceiver"
      ).withArgs(zero);
    });
  });
});
