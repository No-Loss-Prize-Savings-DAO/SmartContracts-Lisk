import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("SavingsContract", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deploySavingsContractFixture() {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const stableCoinMintAmount = 1_000_000_000_000;
    const stableCoinDecimals = 6;
    const contractTokenMintAmount = 1_000_000_000_000_000_000_000_000n;
    const contractTokenDecimals = 18;
    const deposit = 1_000_000_000;
    const mockId = 12345;

    const STABLE_TOKEN_NAME = "USD Tether";
    const STABLE_TOKEN_SYMBOL = "USDT";
    const CONTRACT_TOKEN_NAME = "Blitz";
    const CONTRACT_TOKEN_SYMBOL = "BLZ";

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, thirdAccount, fourthAccount, fifthAccount, sixthAccount, seventhAccount, eighthAccount, ninthAccount, tenthAccount] = await hre.ethers.getSigners();

    const StableToken = await hre.ethers.getContractFactory("FactoryERC20");
    const stableToken = await StableToken.deploy(STABLE_TOKEN_NAME, STABLE_TOKEN_SYMBOL, stableCoinDecimals);
    await stableToken.transfer(otherAccount, 1_000_000_000);
    await stableToken.transfer(thirdAccount, 5_000_000_000);
    await stableToken.transfer(fourthAccount, 10_000_000_000);
    await stableToken.transfer(fifthAccount, 25_000_000_000);
    await stableToken.transfer(sixthAccount, 70_000_000_000);
    await stableToken.transfer(seventhAccount, 100_000_000_000);
    await stableToken.transfer(eighthAccount, 200_000_000_000);
    await stableToken.transfer(ninthAccount, 250_000_000_000);
    await stableToken.transfer(tenthAccount, 300_000_000_000);

    const ContractToken = await hre.ethers.getContractFactory("FactoryERC20");
    const contractToken = await ContractToken.deploy(CONTRACT_TOKEN_NAME, CONTRACT_TOKEN_SYMBOL, contractTokenDecimals);

    const ComplianceDatabase = await hre.ethers.getContractFactory("ComplianceDatabase");
    const complianceDatabase = await ComplianceDatabase.deploy();

    const RegulatoryCompliance = await hre.ethers.getContractFactory("RegulatoryCompliance");
    const regulatoryCompliance = await RegulatoryCompliance.deploy(complianceDatabase.target);

    const NFTContract = await hre.ethers.getContractFactory("NFTContract");
    const nftContract = await NFTContract.deploy();

    const SavingsContract = await hre.ethers.getContractFactory("SavingsContract");
    const savingsContract = await SavingsContract.deploy(stableToken.target, contractToken.target, regulatoryCompliance.target, nftContract.target);
    await contractToken.transfer(savingsContract.target, contractTokenMintAmount);

    const DAOGovernance = await hre.ethers.getContractFactory("DAOGovernance");
    const daoGovernance = await DAOGovernance.deploy(savingsContract.target);

    const PrizeDistribution = await hre.ethers.getContractFactory("PrizeDistribution");
    const prizeDistribution = await PrizeDistribution.deploy(mockId, savingsContract.target, daoGovernance.target);

    await daoGovernance.bindAddress(regulatoryCompliance.target);
    await regulatoryCompliance.bindAddresses(daoGovernance.target, savingsContract.target);
    await nftContract.bindAddress(savingsContract.target);
    await savingsContract.bindAddress(daoGovernance.target, prizeDistribution.target);

    return { savingsContract, contractToken, regulatoryCompliance, daoGovernance, ONE_YEAR_IN_SECS, stableCoinMintAmount, contractTokenMintAmount, deposit, owner, otherAccount, thirdAccount, fourthAccount, fifthAccount, sixthAccount, seventhAccount, eighthAccount, ninthAccount, tenthAccount, stableToken };
  }

  async function daoMembershipFixture() {
    const { savingsContract, sixthAccount, seventhAccount, eighthAccount, ninthAccount, tenthAccount, daoGovernance, stableToken, regulatoryCompliance } = await loadFixture(deploySavingsContractFixture);

      await stableToken.connect(eighthAccount).approve(savingsContract.target, 8000e6);
      await stableToken.connect(ninthAccount).approve(savingsContract.target, 14000e6);
      await stableToken.connect(tenthAccount).approve(savingsContract.target, 20000e6);

      await savingsContract.connect(eighthAccount).deposit(8000e6);
      await savingsContract.connect(ninthAccount).deposit(14000e6);
      await savingsContract.connect(tenthAccount).deposit(20000e6);

      await daoGovernance.addMember(eighthAccount.address);
      await daoGovernance.addMember(ninthAccount.address);
      await daoGovernance.addMember(tenthAccount.address);

      return { savingsContract, sixthAccount, seventhAccount, eighthAccount, ninthAccount, tenthAccount, daoGovernance, stableToken, regulatoryCompliance };
  }

  async function daoProposalFixture() {
    const { savingsContract, regulatoryCompliance, daoGovernance, otherAccount, thirdAccount, fourthAccount, deposit, stableToken } = await loadFixture(deploySavingsContractFixture);

      await stableToken.connect(otherAccount).approve(savingsContract.target, deposit);
      await stableToken.connect(thirdAccount).approve(savingsContract.target, 5000e6);
      await stableToken.connect(fourthAccount).approve(savingsContract.target, 10000e6);
      await savingsContract.connect(thirdAccount).deposit(2000e6);
      await savingsContract.connect(otherAccount).deposit(deposit);
      await savingsContract.connect(fourthAccount).deposit(1000e6);
      await savingsContract.connect(fourthAccount).deposit(1200e6);
      await savingsContract.connect(fourthAccount).deposit(1300e6);
      await regulatoryCompliance.connect(fourthAccount).acceptAgreement();

    return { savingsContract, regulatoryCompliance, daoGovernance, otherAccount, thirdAccount, fourthAccount, deposit, stableToken };
  }

  describe("Deployment", function () {
    it("Should have contractTokenMintAmount as token contract balance", async function () {
      const { savingsContract, contractTokenMintAmount, contractToken } = await loadFixture(deploySavingsContractFixture);

      expect(await contractToken.balanceOf(savingsContract.target)).to.equal(contractTokenMintAmount);
    });

    it("Should have transferred deposit to other accounts", async function () {
      const { deposit, stableToken, otherAccount, thirdAccount, fourthAccount, fifthAccount, sixthAccount, seventhAccount, eighthAccount, ninthAccount, tenthAccount } = await loadFixture(deploySavingsContractFixture);

      expect(await stableToken.balanceOf(otherAccount.address)).to.equal(deposit);
      expect(await stableToken.balanceOf(thirdAccount.address)).to.equal(5_000_000_000);
      expect(await stableToken.balanceOf(fourthAccount.address)).to.equal(10_000_000_000);
      expect(await stableToken.balanceOf(fifthAccount.address)).to.equal(25_000_000_000);
      expect(await stableToken.balanceOf(sixthAccount.address)).to.equal(70_000_000_000);
      expect(await stableToken.balanceOf(seventhAccount.address)).to.equal(100_000_000_000);
      expect(await stableToken.balanceOf(eighthAccount.address)).to.equal(200_000_000_000);
      expect(await stableToken.balanceOf(ninthAccount.address)).to.equal(250_000_000_000);
      expect(await stableToken.balanceOf(tenthAccount.address)).to.equal(300_000_000_000);
    });
  });

  describe("Deposit", function () {
    it("Should allow a user deposit to savings contract", async function () {
      const { savingsContract, otherAccount, deposit, stableToken } = await loadFixture(deploySavingsContractFixture);

      await stableToken.connect(otherAccount).approve(savingsContract.target, deposit);
      await savingsContract.connect(otherAccount).deposit(deposit);
      const balance = await savingsContract.getUserBalance(otherAccount);
      expect(balance.stableCoinBalance).to.equal(deposit);
    });

    it("Should allow multiple users deposit to savings contract", async function () {
      const { savingsContract, otherAccount, thirdAccount, fourthAccount, deposit, stableToken } = await loadFixture(deploySavingsContractFixture);

      await stableToken.connect(otherAccount).approve(savingsContract.target, deposit);
      await stableToken.connect(thirdAccount).approve(savingsContract.target, 5000e6);
      await stableToken.connect(fourthAccount).approve(savingsContract.target, 10000e6);
      await savingsContract.connect(thirdAccount).deposit(2000e6);
      await savingsContract.connect(otherAccount).deposit(deposit);
      await savingsContract.connect(fourthAccount).deposit(2500e6);
      const balance = await savingsContract.getUserBalance(otherAccount);
      const thirdAccountBalance = await savingsContract.getUserBalance(thirdAccount);
      const fourthAccountBalance = await savingsContract.getUserBalance(fourthAccount);
      expect(balance.stableCoinBalance).to.equal(deposit);
      expect(thirdAccountBalance.stableCoinBalance).to.equal(2000e6);
      expect(fourthAccountBalance.stableCoinBalance).to.equal(2500e6);
      expect(await stableToken.balanceOf(savingsContract.target)).to.equal(deposit + 2000e6 + 2500e6);
      const stableBal = await savingsContract.getContractBalance();
      expect(stableBal.stableCoinBalance).to.equal(deposit + 2000e6 + 2500e6);
    });

    it("Should send agreement when a user saves more than 3000e6", async function () {
      const { regulatoryCompliance, fourthAccount } = await loadFixture(daoProposalFixture);

      expect(await regulatoryCompliance.connect(fourthAccount).agreementStatus(fourthAccount)).to.equal(true);
    });

    it("Should return false for a user with more than 3000e6 and does not accept the acceptAgreement function", async function () {
      const { savingsContract, regulatoryCompliance, seventhAccount, stableToken } = await loadFixture(deploySavingsContractFixture);

      await stableToken.connect(seventhAccount).approve(savingsContract.target, 80000e6);
      await savingsContract.connect(seventhAccount).deposit(25000e6);
      
      // await regulatoryCompliance.connect(seventhAccount).acceptAgreement();

      expect(await regulatoryCompliance.connect(seventhAccount).agreementStatus(seventhAccount)).to.equal(false);
    });

    it("Should send agreement to multiple users when more than one user saves more than 3000e6", async function () {
      const { savingsContract, regulatoryCompliance, fifthAccount, sixthAccount, seventhAccount, stableToken } = await loadFixture(deploySavingsContractFixture);

      await stableToken.connect(fifthAccount).approve(savingsContract.target, 20000e6);
      await stableToken.connect(sixthAccount).approve(savingsContract.target, 50000e6);
      await stableToken.connect(seventhAccount).approve(savingsContract.target, 80000e6);
      await savingsContract.connect(fifthAccount).deposit(5000e6);
      await savingsContract.connect(sixthAccount).deposit(15000e6);
      await savingsContract.connect(seventhAccount).deposit(25000e6);
      // fifth account is assumed to not accept the agreement thereby not calling the acceptAgreement function
      await regulatoryCompliance.connect(sixthAccount).acceptAgreement();
      await regulatoryCompliance.connect(seventhAccount).acceptAgreement();

      expect(await regulatoryCompliance.connect(fifthAccount).agreementStatus(fifthAccount)).to.equal(false);
      expect(await regulatoryCompliance.connect(sixthAccount).agreementStatus(sixthAccount)).to.equal(true);
      expect(await regulatoryCompliance.connect(seventhAccount).agreementStatus(seventhAccount)).to.equal(true);
    });

    it("Should have a proposal created", async function () {
      const { daoGovernance, fourthAccount } = await loadFixture(daoProposalFixture);

        const proposal = await daoGovernance.proposals(1);
        expect(proposal.proposer).to.equal(fourthAccount.address);
        expect(proposal.description).to.equal("New DAO Membership Proposal");
        expect(proposal.totalVotes).to.equal(0);
        expect(proposal.requiredVotes).to.equal(0); // no dao has been instantiated
        expect(proposal.endTime).to.equal(await time.latest() + (7 * 24 * 60 * 60));
        expect(proposal.active).to.equal(true);
    });

    it("Should allow owner to make DAOs", async function () {
      const { savingsContract, eighthAccount, ninthAccount, tenthAccount } = await loadFixture(daoMembershipFixture);

      expect(await savingsContract.isDAO(eighthAccount.address)).to.equal(true);
      expect(await savingsContract.isDAO(ninthAccount.address)).to.equal(true);
      expect(await savingsContract.isDAO(tenthAccount.address)).to.equal(true);
    });

    it("Should make a user who has accepted agreement to be voted as DAO", async function () {
      const { savingsContract, stableToken, regulatoryCompliance, seventhAccount, eighthAccount, ninthAccount, tenthAccount, daoGovernance } = await loadFixture(daoMembershipFixture);

      await stableToken.connect(seventhAccount).approve(savingsContract.target, 80000e6);
      await savingsContract.connect(seventhAccount).deposit(25000e6);
      await regulatoryCompliance.connect(seventhAccount).acceptAgreement();

      await daoGovernance.connect(eighthAccount).voteOnProposal(1, true);
      await daoGovernance.connect(ninthAccount).voteOnProposal(1, false);
      await daoGovernance.connect(tenthAccount).voteOnProposal(1, true);

      expect(await savingsContract.connect(seventhAccount).isDAO(seventhAccount)).to.equal(true);
    });

    it("Should make multiple users who has accepted agreement to be voted as DAO", async function () {
      const { savingsContract, stableToken, regulatoryCompliance, sixthAccount, seventhAccount, eighthAccount, ninthAccount, tenthAccount, daoGovernance } = await loadFixture(daoMembershipFixture);

      await stableToken.connect(sixthAccount).approve(savingsContract.target, 50000e6);
      await stableToken.connect(seventhAccount).approve(savingsContract.target, 80000e6);
      await savingsContract.connect(sixthAccount).deposit(25000e6);
      await savingsContract.connect(seventhAccount).deposit(14000e6);
      await regulatoryCompliance.connect(sixthAccount).acceptAgreement();
      await regulatoryCompliance.connect(seventhAccount).acceptAgreement();

      await daoGovernance.connect(eighthAccount).voteOnProposal(1, true);
      await daoGovernance.connect(ninthAccount).voteOnProposal(1, false);
      await daoGovernance.connect(tenthAccount).voteOnProposal(1, true);
      expect(await savingsContract.connect(sixthAccount).isDAO(sixthAccount)).to.equal(true);

      await daoGovernance.connect(eighthAccount).voteOnProposal(2, false);
      await daoGovernance.connect(ninthAccount).voteOnProposal(2, true);
      await daoGovernance.connect(tenthAccount).voteOnProposal(2, true);
      expect(await savingsContract.connect(seventhAccount).isDAO(seventhAccount)).to.equal(true);
    });

    it("Should make multiple users who has accepted agreement to be voted as DAO or not", async function () {
      const { savingsContract, stableToken, regulatoryCompliance, sixthAccount, seventhAccount, eighthAccount, ninthAccount, tenthAccount, daoGovernance } = await loadFixture(daoMembershipFixture);

      await stableToken.connect(sixthAccount).approve(savingsContract.target, 50000e6);
      await stableToken.connect(seventhAccount).approve(savingsContract.target, 80000e6);
      await savingsContract.connect(sixthAccount).deposit(25000e6);
      await savingsContract.connect(seventhAccount).deposit(14000e6);
      await regulatoryCompliance.connect(sixthAccount).acceptAgreement();
      await regulatoryCompliance.connect(seventhAccount).acceptAgreement();

      await daoGovernance.connect(eighthAccount).voteOnProposal(1, true);
      await daoGovernance.connect(ninthAccount).voteOnProposal(1, false);
      await daoGovernance.connect(tenthAccount).voteOnProposal(1, true);
      expect(await savingsContract.connect(sixthAccount).isDAO(sixthAccount)).to.equal(true);

      await daoGovernance.connect(eighthAccount).voteOnProposal(2, false);
      await daoGovernance.connect(ninthAccount).voteOnProposal(2, true);
      await daoGovernance.connect(tenthAccount).voteOnProposal(2, false);
      expect(await savingsContract.connect(seventhAccount).isDAO(seventhAccount)).to.equal(false);
    });

    it("Should return false for a user who has accepted agreement but not voted as DAO", async function () {
      const { savingsContract, stableToken, regulatoryCompliance, seventhAccount, eighthAccount, ninthAccount, tenthAccount, daoGovernance } = await loadFixture(daoMembershipFixture);

      await stableToken.connect(seventhAccount).approve(savingsContract.target, 80000e6);
      await savingsContract.connect(seventhAccount).deposit(25000e6);
      await regulatoryCompliance.connect(seventhAccount).acceptAgreement();

      await daoGovernance.connect(eighthAccount).voteOnProposal(1, false);
      await daoGovernance.connect(ninthAccount).voteOnProposal(1, false);
      await daoGovernance.connect(tenthAccount).voteOnProposal(1, true);

      expect(await savingsContract.connect(seventhAccount).isDAO(seventhAccount)).to.equal(false);
    });

    it("Should return total voting power after making DAOs", async function () {
      const { daoGovernance } = await loadFixture(daoMembershipFixture);

      expect(await daoGovernance.totalVotingPower()).to.equal(12);
    });

    it("Should fail if user tries to deposit without approving savings contract", async function () {
      const { savingsContract, otherAccount, deposit, owner } = await loadFixture(deploySavingsContractFixture);

    console.log("owner", owner.address);
    console.log("otherAccount", otherAccount.address);
    console.log("contract", savingsContract.target);

    expect(savingsContract.deposit(deposit)).to.be.revertedWithCustomError;
    });

    // it("Should fail if it tries to mint to zero address", async function () {
    //   // We don't use the fixture here because we want a different deployment
    //   const { savingsContract, otherAccount, mintAmount } = await loadFixture(deploySavingsContractFixture);
    //   const zero = ethers.ZeroAddress;

    //   await expect(savingsContract.mint(zero, mintAmount)).to.be.revertedWithCustomError(
    //     savingsContract, "ERC20InvalidReceiver"
    //   ).withArgs(zero);
    // });
  });

  describe('Withdraw', function () {
    it("Should allow a user withdraw stableToken from savings contract", async function () {
      const { savingsContract, otherAccount, deposit, stableToken } = await loadFixture(deploySavingsContractFixture);

      await stableToken.connect(otherAccount).approve(savingsContract.target, deposit);
      await savingsContract.connect(otherAccount).deposit(deposit);
      await savingsContract.connect(otherAccount).withdraw(deposit);
      const balance = await savingsContract.getUserBalance(otherAccount);
      expect(balance.stableCoinBalance).to.equal(0);
      expect(await stableToken.balanceOf(otherAccount.address)).to.equal(deposit);
    });

    it("Should allow multiple users withdraw stableToken from savings contract", async function () {
      const { savingsContract, otherAccount, thirdAccount, fourthAccount, deposit, stableToken } = await loadFixture(deploySavingsContractFixture);

      await stableToken.connect(otherAccount).approve(savingsContract.target, deposit);
      await stableToken.connect(thirdAccount).approve(savingsContract.target, 3000e6);
      await stableToken.connect(fourthAccount).approve(savingsContract.target, 5000e6);

      await savingsContract.connect(otherAccount).deposit(deposit);
      await savingsContract.connect(thirdAccount).deposit(2000e6);
      await savingsContract.connect(fourthAccount).deposit(3000e6);

      await savingsContract.connect(otherAccount).withdraw(deposit);
      await savingsContract.connect(fourthAccount).withdraw(2000e6);
      const balance = await savingsContract.getContractBalance();
      expect(balance.stableCoinBalance).to.equal(3000e6);
      expect(await stableToken.balanceOf(otherAccount.address)).to.equal(deposit);
      expect(await stableToken.balanceOf(thirdAccount.address)).to.equal(3000e6);
      expect(await stableToken.balanceOf(fourthAccount.address)).to.equal(9000e6);
    });

    it("Should revert if a user tries to withdraw more than he has", async function () {
      const { savingsContract, otherAccount, deposit, stableToken } = await loadFixture(deploySavingsContractFixture);

      await stableToken.connect(otherAccount).approve(savingsContract.target, deposit);
      await savingsContract.connect(otherAccount).deposit(deposit);

      await expect(savingsContract.connect(otherAccount).withdraw(1500e6)).to.be.revertedWith("Insufficient stable coin balance");
    });
  });
});