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
    const ONE_MILLION_TOKENS = 1_000_000_000_000_000_000_000_000n;
    const STABLE_TOKEN_MINT_AMOUNT = 1_000_000_000_000;

    const mintAmount = ONE_MILLION_TOKENS;
    const TOKEN_NAME = "Blitz";
    const TOKEN_SYMBOL = "BLZ";
    const contractTokenDecimals = 18;

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await hre.ethers.getSigners();

    const FactoryERC20 = await hre.ethers.getContractFactory("FactoryERC20");
    const factoryERC20 = await FactoryERC20.deploy(TOKEN_NAME, TOKEN_SYMBOL, contractTokenDecimals);

    return { factoryERC20, mintAmount, TOKEN_NAME, TOKEN_SYMBOL, STABLE_TOKEN_MINT_AMOUNT, owner, otherAccount };
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

    it("Should mint a token with 6 decimals", async function () {
      // We don't use the fixture here because we want a different deployment
      const StableERC20 = await hre.ethers.getContractFactory("FactoryERC20");
      const stableERC20 = await StableERC20.deploy("USD Tethers", "USDT", 6);

      const STABLE_TOKEN_MINT_AMOUNT = 1_000_000_000_000;
      const [owner] = await hre.ethers.getSigners();

      expect(await stableERC20.balanceOf(owner)).to.equal(STABLE_TOKEN_MINT_AMOUNT);
    });

    it("Should fail if another account tries to mint", async function () {
      const { factoryERC20, otherAccount, mintAmount } = await loadFixture(deployFactoryERC20Fixture);

      await expect(factoryERC20.connect(otherAccount).mint(otherAccount, mintAmount)).to.be.revertedWithCustomError(
        factoryERC20, "OwnableUnauthorizedAccount"
      ).withArgs(otherAccount.address);
    });

    it("Should fail if it tries to mint to zero address", async function () {
      // We don't use the fixture here because we want a different deployment
      const { factoryERC20, mintAmount } = await loadFixture(deployFactoryERC20Fixture);
      const zero = ethers.ZeroAddress;

      await expect(factoryERC20.mint(zero, mintAmount)).to.be.revertedWithCustomError(
        factoryERC20, "ERC20InvalidReceiver"
      ).withArgs(zero);
    });
  });
});
