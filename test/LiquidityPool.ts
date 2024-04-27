import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("LiquidityPool", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployLiquidityPoolFixture() {
    const stableCoinMintAmount = 1_000_000_000_000;
    const stableCoinDecimals = 6;
    const contractTokenMintAmount = 1_000_000_000_000_000_000_000_000n;
    const contractTokenDecimals = 18;

    const STABLE_TOKEN_NAME = "USD Tether";
    const STABLE_TOKEN_SYMBOL = "USDT";
    const CONTRACT_TOKEN_NAME = "Blitz";
    const CONTRACT_TOKEN_SYMBOL = "BLZ";

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await hre.ethers.getSigners();

    const StableToken = await hre.ethers.getContractFactory("FactoryERC20");
    const stableToken = await StableToken.connect(otherAccount).deploy(STABLE_TOKEN_NAME, STABLE_TOKEN_SYMBOL, stableCoinDecimals);

    const ContractToken = await hre.ethers.getContractFactory("FactoryERC20");
    const contractToken = await ContractToken.deploy(CONTRACT_TOKEN_NAME, CONTRACT_TOKEN_SYMBOL, contractTokenDecimals);

    const LiquidityPool = await hre.ethers.getContractFactory("LiquidityPool");
    const liquidityPool = await LiquidityPool.deploy();

    await stableToken.connect(otherAccount).approve(liquidityPool, stableCoinMintAmount);
    await contractToken.approve(liquidityPool, contractTokenMintAmount);

    return { liquidityPool, stableToken, contractToken, owner, otherAccount, stableCoinMintAmount, contractTokenMintAmount };
  }

  describe("deployment", function () {
    it("Should have zero reserves for both contracts", async function () {
      const { stableToken, contractToken, liquidityPool, owner, otherAccount } = await loadFixture(deployLiquidityPoolFixture);

      expect(await liquidityPool.reserves(stableToken)).to.equal(0);
      expect(await liquidityPool.reserves(contractToken)).to.equal(0);
    });
  });

  describe("addLiquidity", function () {
    it("Should add liquidity to the liquidityPool contracts", async function () {
      const { otherAccount, stableToken, contractToken, liquidityPool, stableCoinMintAmount, contractTokenMintAmount } = await loadFixture(deployLiquidityPoolFixture);

      await liquidityPool.connect(otherAccount).addLiquidity(stableToken, stableCoinMintAmount);
      await liquidityPool.addLiquidity(contractToken, contractTokenMintAmount);
      
      expect(await liquidityPool.reserves(stableToken)).to.equal(stableCoinMintAmount);
      expect(await liquidityPool.reserves(contractToken)).to.equal(contractTokenMintAmount);
    });
  });

  describe("removeLiquidity", function () {
    it("Should revert if more token is being withdrawn than is available", async function () {
      const { otherAccount, stableToken, contractToken, liquidityPool, stableCoinMintAmount, contractTokenMintAmount } = await loadFixture(deployLiquidityPoolFixture);

      await liquidityPool.connect(otherAccount).addLiquidity(stableToken, stableCoinMintAmount);
      await liquidityPool.addLiquidity(contractToken, contractTokenMintAmount);
      
      await expect(liquidityPool.connect(otherAccount).removeLiquidity(stableToken, 2_000_000_000_000)).to.revertedWith("Insufficient liquidity");
    });

    it("Should allow token owner remove part liquidity", async function () {
      const { otherAccount, stableToken, contractToken, liquidityPool, stableCoinMintAmount, contractTokenMintAmount } = await loadFixture(deployLiquidityPoolFixture);

      await liquidityPool.connect(otherAccount).addLiquidity(stableToken, stableCoinMintAmount);
      await liquidityPool.addLiquidity(contractToken, contractTokenMintAmount);

      await liquidityPool.connect(otherAccount).removeLiquidity(stableToken, 400_000_000_000);
      
      expect(await liquidityPool.connect(otherAccount).reserves(stableToken)).to.equal(600_000_000_000);
    });

    it("Should allow token owner remove all liquidity", async function () {
      const { otherAccount, stableToken, contractToken, liquidityPool, stableCoinMintAmount, contractTokenMintAmount } = await loadFixture(deployLiquidityPoolFixture);

      await liquidityPool.connect(otherAccount).addLiquidity(stableToken, stableCoinMintAmount);
      await liquidityPool.addLiquidity(contractToken, contractTokenMintAmount);

      await liquidityPool.connect(otherAccount).removeLiquidity(stableToken, stableCoinMintAmount);
      
      expect(await liquidityPool.connect(otherAccount).reserves(stableToken)).to.equal(0);
    });
  });

  describe("swapTokens", function () {
    it("Should revert if same token is being swapped", async function () {
      const { otherAccount, stableToken, contractToken, liquidityPool, stableCoinMintAmount, contractTokenMintAmount } = await loadFixture(deployLiquidityPoolFixture);

      await liquidityPool.connect(otherAccount).addLiquidity(stableToken, stableCoinMintAmount);
      await liquidityPool.addLiquidity(contractToken, contractTokenMintAmount);
      
      await expect(liquidityPool.connect(otherAccount).swapTokens(stableToken, stableToken, 5000e6)).to.revertedWith("Input and output tokens must be different");
    });

    it("Should revert if input reserve is less than 0", async function () {
      const { otherAccount, stableToken, contractToken, liquidityPool, contractTokenMintAmount } = await loadFixture(deployLiquidityPoolFixture);

      await liquidityPool.addLiquidity(contractToken, contractTokenMintAmount);
      
      await expect(liquidityPool.connect(otherAccount).swapTokens(stableToken, contractToken, 5000e6)).to.revertedWith("Insufficient reserves");
    });

    it("Should revert if input reserve is less than 0", async function () {
      const { otherAccount, stableToken, contractToken, liquidityPool, stableCoinMintAmount } = await loadFixture(deployLiquidityPoolFixture);

      await liquidityPool.connect(otherAccount).addLiquidity(stableToken, stableCoinMintAmount);
      
      await expect(liquidityPool.connect(otherAccount).swapTokens(stableToken, contractToken, 5000e6)).to.revertedWith("Insufficient reserves");
    });

    it("Should swap tokens successfully", async function () {
      const { otherAccount, stableToken, contractToken, liquidityPool, contractTokenMintAmount } = await loadFixture(deployLiquidityPoolFixture);

      await liquidityPool.connect(otherAccount).addLiquidity(stableToken, 700000e6);
      await liquidityPool.addLiquidity(contractToken, contractTokenMintAmount);

      await liquidityPool.connect(otherAccount).swapTokens(stableToken, contractToken, 5000e6);
      
      expect(await liquidityPool.reserves(stableToken)).to.greaterThan(700000e6);
    });

    it("Should revert if input amount is 0 or less", async function () {
      const { otherAccount, stableToken, contractToken, liquidityPool, contractTokenMintAmount } = await loadFixture(deployLiquidityPoolFixture);

      await liquidityPool.connect(otherAccount).addLiquidity(stableToken, 700000e6);
      await liquidityPool.addLiquidity(contractToken, contractTokenMintAmount);
      
      await expect(liquidityPool.connect(otherAccount).swapTokens(stableToken, contractToken, 0)).to.revertedWith("Input amount must be greater than zero");
    });

    // it("Should reverse swap tokens successfully", async function () {
    //   const { otherAccount, stableToken, contractToken, liquidityPool, contractTokenMintAmount, stableCoinMintAmount } = await loadFixture(deployLiquidityPoolFixture);

    //   await liquidityPool.connect(otherAccount).addLiquidity(stableToken, stableCoinMintAmount);
    //   await liquidityPool.addLiquidity(contractToken, 700000e18);

    //   await liquidityPool.connect(otherAccount).swapTokens(contractToken, stableToken, ethers.parseUnits("10000", 18));
      
    //   expect(await liquidityPool.reserves(contractToken)).to.greaterThan(700000e18);
    // });
  });

  describe("withdrawTokens", function () {
    it("Should revert not owner calls this function", async function () {
      const { otherAccount, stableToken, contractToken, liquidityPool, contractTokenMintAmount, stableCoinMintAmount } = await loadFixture(deployLiquidityPoolFixture);

      await liquidityPool.connect(otherAccount).addLiquidity(stableToken, stableCoinMintAmount);
      await liquidityPool.addLiquidity(contractToken, contractTokenMintAmount);
      
      expect(liquidityPool.connect(otherAccount).withdrawTokens(stableToken, 0)).to.revertedWithCustomError;
    });

    it("Should allow owner drain stableToken contract", async function () {
      const { otherAccount, stableToken, contractToken, liquidityPool, contractTokenMintAmount, stableCoinMintAmount } = await loadFixture(deployLiquidityPoolFixture);

      await liquidityPool.connect(otherAccount).addLiquidity(stableToken, stableCoinMintAmount);
      await liquidityPool.addLiquidity(contractToken, contractTokenMintAmount);

      await liquidityPool.withdrawTokens(stableToken, stableCoinMintAmount);
      
      expect(await liquidityPool.reserves(stableToken)).to.equal(0);
    });

    it("Should allow owner drain contractToken contract", async function () {
      const { otherAccount, stableToken, contractToken, liquidityPool, contractTokenMintAmount, stableCoinMintAmount } = await loadFixture(deployLiquidityPoolFixture);

      await liquidityPool.connect(otherAccount).addLiquidity(stableToken, stableCoinMintAmount);
      await liquidityPool.addLiquidity(contractToken, contractTokenMintAmount);

      await liquidityPool.withdrawTokens(contractToken, contractTokenMintAmount);
      
      expect(await liquidityPool.reserves(contractToken)).to.equal(0);
    });
  });
});