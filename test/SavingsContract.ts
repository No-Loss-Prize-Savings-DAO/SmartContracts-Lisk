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
    const ONE_YEAR_IN_SECS = 366 * 24 * 60 * 60;
    const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;
    const stableCoinMintAmount = 1_000_000_000_000;
    const contractTokenInitialAmount = 500_000_000_000_000_000_000_000n;
    const deposit = 1_000_000_000;

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, thirdAccount, fourthAccount, fifthAccount, sixthAccount, seventhAccount, eighthAccount, ninthAccount, tenthAccount] = await hre.ethers.getSigners();

    const StableToken = await hre.ethers.getContractFactory("USDT");
    const stableToken = await StableToken.deploy();
    await stableToken.transfer(otherAccount, 1_000_000_000);
    await stableToken.transfer(thirdAccount, 5_000_000_000);
    await stableToken.transfer(fourthAccount, 10_000_000_000);
    await stableToken.transfer(fifthAccount, 25_000_000_000);
    await stableToken.transfer(sixthAccount, 70_000_000_000);
    await stableToken.transfer(seventhAccount, 100_000_000_000);
    await stableToken.transfer(eighthAccount, 200_000_000_000);
    await stableToken.transfer(ninthAccount, 250_000_000_000);
    await stableToken.transfer(tenthAccount, 300_000_000_000);

    const ContractToken = await hre.ethers.getContractFactory("BLZ");
    const contractToken = await ContractToken.deploy();
    await contractToken.transfer(owner, 400_000_000_000_000_000_000_000n);
    await contractToken.transfer(otherAccount, 50_000_000_000_000_000_000_000n);
    await contractToken.transfer(thirdAccount, 50_000_000_000_000_000_000_000n);

    const ComplianceDatabase = await hre.ethers.getContractFactory("ComplianceDatabase");
    const complianceDatabase = await ComplianceDatabase.deploy();

    const RegulatoryCompliance = await hre.ethers.getContractFactory("RegulatoryCompliance");
    const regulatoryCompliance = await RegulatoryCompliance.deploy(complianceDatabase.target);

    const NFTContract = await hre.ethers.getContractFactory("NFTContract");
    const nftContract = await NFTContract.deploy();

    const SavingsContract = await hre.ethers.getContractFactory("SavingsContract");
    const savingsContract = await SavingsContract.deploy(stableToken.target, contractToken.target, regulatoryCompliance.target, nftContract.target);
    await contractToken.transfer(savingsContract.target, contractTokenInitialAmount); // This wouldn't be done in real time as funds will remain in owner's wallet for distribution.

    const DAOGovernance = await hre.ethers.getContractFactory("DAOGovernance");
    const daoGovernance = await DAOGovernance.deploy(savingsContract.target);

    const PrizeDistribution = await hre.ethers.getContractFactory("PrizeDistribution");
    const prizeDistribution = await PrizeDistribution.deploy(savingsContract.target, daoGovernance.target);

    await daoGovernance.bindAddress(regulatoryCompliance.target);
    await regulatoryCompliance.bindAddresses(daoGovernance.target, savingsContract.target);
    await nftContract.bindAddress(savingsContract.target);
    await savingsContract.bindAddress(daoGovernance.target, prizeDistribution.target);

    return { savingsContract, contractToken, regulatoryCompliance, daoGovernance, ONE_YEAR_IN_SECS, stableCoinMintAmount, contractTokenInitialAmount, deposit, unlockTime, owner, otherAccount, thirdAccount, fourthAccount, fifthAccount, sixthAccount, seventhAccount, eighthAccount, ninthAccount, tenthAccount, stableToken };
  }

  async function daoMembershipFixture() {
    const { savingsContract, deposit, otherAccount, sixthAccount, seventhAccount, eighthAccount, ninthAccount, tenthAccount, daoGovernance, stableToken, regulatoryCompliance } = await loadFixture(deploySavingsContractFixture);

      await stableToken.connect(eighthAccount).approve(savingsContract.target, 8000e6);
      await stableToken.connect(ninthAccount).approve(savingsContract.target, 14000e6);
      await stableToken.connect(tenthAccount).approve(savingsContract.target, 20000e6);

      await savingsContract.connect(eighthAccount).deposit(8000e6);
      await savingsContract.connect(ninthAccount).deposit(14000e6);
      await savingsContract.connect(tenthAccount).deposit(20000e6);

      await daoGovernance.addMember(eighthAccount.address);
      await daoGovernance.addMember(ninthAccount.address);
      await daoGovernance.addMember(tenthAccount.address);

      return { savingsContract, deposit, otherAccount, sixthAccount, seventhAccount, eighthAccount, ninthAccount, tenthAccount, daoGovernance, stableToken, regulatoryCompliance };
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

  describe('Addresses', function () {
     it("Should log all addresses for reference", async function () {
      const { owner, otherAccount, contractToken, savingsContract } = await loadFixture(deploySavingsContractFixture);
      console.log("owner", owner.address);
      console.log("otherAccount", otherAccount.address);
      console.log("contract", savingsContract.target);
      console.log("contractToken", contractToken.target);
    });
  });

  describe("Deployment", function () {
    it("Should have contractTokenInitialAmount as token contract balance", async function () {
      const { savingsContract, contractTokenInitialAmount, contractToken } = await loadFixture(deploySavingsContractFixture);

      expect(await contractToken.balanceOf(savingsContract.target)).to.equal(contractTokenInitialAmount);
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

      expect(savingsContract.deposit(deposit)).to.be.revertedWithCustomError;
    });
  });

  describe("depositContractToken", function () {
    it("Should allow a user deposit BLZ to savings contract", async function () {
      const { savingsContract, contractToken, otherAccount } = await loadFixture(deploySavingsContractFixture);

      await contractToken.connect(otherAccount).approve(savingsContract.target, 30_000_000_000_000_000_000_000n);
      await savingsContract.connect(otherAccount).depositContractToken(30_000_000_000_000_000_000_000n);

      const userBalance = await savingsContract.getUserBalance(otherAccount);
      expect(userBalance.contractTokenBalance).to.equal(30_000_000_000_000_000_000_000n);

      const contractBalance = await savingsContract.getContractBalance();
      expect(contractBalance.contractTokenBalance).to.equal(30_000_000_000_000_000_000_000n);
    });

    it("Should allow multiple users deposit BLZ to savings contract", async function () {
      const { savingsContract, otherAccount, thirdAccount, contractToken } = await loadFixture(deploySavingsContractFixture);

      await contractToken.connect(otherAccount).approve(savingsContract.target, 30_000_000_000_000_000_000_000n);
      await contractToken.connect(thirdAccount).approve(savingsContract.target, 20_000_000_000_000_000_000_000n);

      await savingsContract.connect(thirdAccount).depositContractToken(20_000_000_000_000_000_000_000n);
      await savingsContract.connect(otherAccount).depositContractToken(30_000_000_000_000_000_000_000n);

      const otherAccountBalance = await savingsContract.getUserBalance(otherAccount);
      const thirdAccountBalance = await savingsContract.getUserBalance(thirdAccount);

      expect(otherAccountBalance.contractTokenBalance).to.equal(30_000_000_000_000_000_000_000n);
      expect(thirdAccountBalance.contractTokenBalance).to.equal(20_000_000_000_000_000_000_000n);
      
      expect(await contractToken.balanceOf(savingsContract.target)).to.equal(550_000_000_000_000_000_000_000n);
      const contractTokenBal = await savingsContract.getContractBalance();
      expect(contractTokenBal.contractTokenBalance).to.equal(50_000_000_000_000_000_000_000n);
    });

    it("Should fail if user tries to deposit without approving savings contract", async function () {
      const { savingsContract, thirdAccount } = await loadFixture(deploySavingsContractFixture);

      expect(savingsContract.connect(thirdAccount).depositContractToken(20_000_000_000_000_000_000_000n)).to.be.revertedWithCustomError;
    });
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

    it("Should allow DAO member withdraw so long balance remains above 3000e6", async function () {
      const { savingsContract, tenthAccount, daoGovernance, stableToken } = await loadFixture(deploySavingsContractFixture);

      await stableToken.connect(tenthAccount).approve(savingsContract.target, 20000e6);
      await savingsContract.connect(tenthAccount).deposit(20000e6);
      await daoGovernance.addMember(tenthAccount.address);

      await savingsContract.connect(tenthAccount).withdraw(15000e6);

      const balance = await savingsContract.getUserBalance(tenthAccount);
      expect(balance.stableCoinBalance).to.equal(5000e6);
    });

    it("Should revert if DAO tries to withdraw his balance to a value below 3000e6", async function () {
      const { savingsContract, tenthAccount, daoGovernance, stableToken } = await loadFixture(deploySavingsContractFixture);

      await stableToken.connect(tenthAccount).approve(savingsContract.target, 10000e6);
      await savingsContract.connect(tenthAccount).deposit(8000e6);
      await daoGovernance.addMember(tenthAccount.address);

      await expect(savingsContract.connect(tenthAccount).withdraw(6000e6)).to.revertedWith("DAO members must forfeit DAO membership to withdraw funds");
    });

    it("Should remove user from array after full withdrawal of stableToken", async function () {
      const { savingsContract, otherAccount, deposit, stableToken } = await loadFixture(deploySavingsContractFixture);

      await stableToken.connect(otherAccount).approve(savingsContract.target, deposit);
      await savingsContract.connect(otherAccount).deposit(deposit);
      await savingsContract.connect(otherAccount).withdraw(deposit);
      const balance = await savingsContract.users(otherAccount);
      expect(balance.stableCoinBalance).to.equal(0);
      expect(balance.contractTokenBalance).to.equal(0);
      expect(balance.slots).to.equal(0);
      expect(balance.isDAO).to.equal(false);
      expect(balance.daoLockExpiry).to.equal(0);
    });

    it("Should revert if DAO tries to forfeit before lockTime expiry", async function () {
      const { savingsContract, tenthAccount, daoGovernance, stableToken } = await loadFixture(deploySavingsContractFixture);

      await stableToken.connect(tenthAccount).approve(savingsContract.target, 10000e6);
      await savingsContract.connect(tenthAccount).deposit(8000e6);
      await daoGovernance.addMember(tenthAccount.address);

      await expect(savingsContract.connect(tenthAccount).forfeitDAO(1)).to.revertedWith("DAO lock period has not expired");
    });

    it("Should allow DAO to withdraw ANY amount after expiry of lock time", async function () {
      const { savingsContract, tenthAccount, daoGovernance, stableToken, unlockTime } = await loadFixture(deploySavingsContractFixture);

      await stableToken.connect(tenthAccount).approve(savingsContract.target, 10000e6);
      await savingsContract.connect(tenthAccount).deposit(8000e6);
      await daoGovernance.addMember(tenthAccount.address);

      await time.increaseTo(unlockTime);
      await savingsContract.connect(tenthAccount).forfeitDAO(1);
      await savingsContract.connect(tenthAccount).withdraw(6000e6)

      const balance = await savingsContract.getUserBalance(tenthAccount);
      expect(balance.stableCoinBalance).to.equal(2000e6);
    });
  });

  describe('withdrawContractToken', function () {
    it("Should allow a user withdraw contractToken from savings contract", async function () {
      const { savingsContract, otherAccount, deposit, contractToken } = await loadFixture(deploySavingsContractFixture);

      await contractToken.connect(otherAccount).approve(savingsContract.target, 40_000_000_000_000_000_000_000n);
      await savingsContract.connect(otherAccount).depositContractToken(40_000_000_000_000_000_000_000n);
      await savingsContract.connect(otherAccount).withdrawContractToken(10_000_000_000_000_000_000_000n);
      const balance = await savingsContract.getUserBalance(otherAccount);
      expect(balance.contractTokenBalance).to.equal(30_000_000_000_000_000_000_000n);
      expect(await contractToken.balanceOf(otherAccount.address)).to.equal(20_000_000_000_000_000_000_000n);
    });

    it("Should allow multiple users withdraw contractToken from savings contract", async function () {
      const { savingsContract, otherAccount, thirdAccount, contractToken } = await loadFixture(deploySavingsContractFixture);

      await contractToken.connect(otherAccount).approve(savingsContract.target, 50_000_000_000_000_000_000_000n);
      await contractToken.connect(thirdAccount).approve(savingsContract.target, 50_000_000_000_000_000_000_000n);

      await savingsContract.connect(otherAccount).depositContractToken(40_000_000_000_000_000_000_000n);
      await savingsContract.connect(thirdAccount).depositContractToken(30_000_000_000_000_000_000_000n);

      await savingsContract.connect(otherAccount).withdrawContractToken(30_000_000_000_000_000_000_000n);
      await savingsContract.connect(thirdAccount).withdrawContractToken(10_000_000_000_000_000_000_000n);

      const balance = await savingsContract.getContractBalance();
      expect(balance.contractTokenBalance).to.equal(30_000_000_000_000_000_000_000n);

      expect(await contractToken.balanceOf(otherAccount.address)).to.equal(40_000_000_000_000_000_000_000n);
      expect(await contractToken.balanceOf(thirdAccount.address)).to.equal(30_000_000_000_000_000_000_000n);
    });

    it("Should revert if a user tries to withdraw more than he has", async function () {
      const { savingsContract, otherAccount, deposit, contractToken } = await loadFixture(deploySavingsContractFixture);

      await contractToken.connect(otherAccount).approve(savingsContract.target, 50_000_000_000_000_000_000_000n);
      await savingsContract.connect(otherAccount).depositContractToken(20_000_000_000_000_000_000_000n);

      await expect(savingsContract.connect(otherAccount).withdrawContractToken(30_000_000_000_000_000_000_000n)).to.be.revertedWith("Insufficient contract token balance");
    });
  });

  describe('transferFund', function () {
     it("Should revert if called by any user", async function () {
      const { savingsContract, tenthAccount } = await loadFixture(deploySavingsContractFixture);

      await expect(savingsContract.transferFund(tenthAccount, 2000e6)).to.revertedWith("Only prizeDistribution contract can call this function");
    });
  });

  describe('withdrawAmount', function () {
    it("Should revert if user tries to withdraw", async function () {
      const { savingsContract, otherAccount, eighthAccount, ninthAccount, tenthAccount, daoGovernance, deposit, stableToken } = await loadFixture(daoMembershipFixture);

      await stableToken.connect(otherAccount).approve(savingsContract.target, deposit);
      await savingsContract.connect(otherAccount).deposit(deposit);

      await daoGovernance.connect(tenthAccount).proposeActivity("I will like us to look into spot trading on bybit", 3 * 24 * 60 * 60);
      await daoGovernance.connect(tenthAccount).voteOnProposal(1, true);
      await daoGovernance.connect(ninthAccount).voteOnProposal(1, false);
      await daoGovernance.connect(eighthAccount).voteOnProposal(1, true);
      
      expect(savingsContract.connect(otherAccount).withdrawAmount(1, deposit)).to.revertedWithCustomError;
    });

    it("Should allow owner withdraw specified amount", async function () {
      const { savingsContract, ninthAccount, tenthAccount, daoGovernance } = await loadFixture(daoMembershipFixture);

      await daoGovernance.connect(tenthAccount).proposeActivity("I will like us to look into spot trading on bybit", 3 * 24 * 60 * 60);
      await daoGovernance.connect(ninthAccount).voteOnProposal(1, true);
      await daoGovernance.connect(tenthAccount).voteOnProposal(1, true);

      await savingsContract.withdrawAmount(1, 22000e6);

      const balance = await savingsContract.getContractBalance();
      expect(balance.stableCoinBalance).to.equal(20000e6);
    });

    it("Should revert if owner tries to withdraw again for same proposal", async function () {
      const { savingsContract, ninthAccount, tenthAccount, daoGovernance } = await loadFixture(daoMembershipFixture);

      await daoGovernance.connect(tenthAccount).proposeActivity("I will like us to look into spot trading on bybit", 3 * 24 * 60 * 60);
      await daoGovernance.connect(ninthAccount).voteOnProposal(1, true);
      await daoGovernance.connect(tenthAccount).voteOnProposal(1, true);

      await savingsContract.withdrawAmount(1, 15000e6);

      await expect(savingsContract.withdrawAmount(1, 12000e6)).to.revertedWith("Amount already withdrawn for this proposal");
    });

    it("Should revert if proposal was not accepted", async function () {
      const { savingsContract, eighthAccount, ninthAccount, tenthAccount, daoGovernance, stableToken } = await loadFixture(daoMembershipFixture);

      await stableToken.connect(tenthAccount).approve(savingsContract.target, 20000e6);
      await savingsContract.connect(tenthAccount).deposit(20000e6);

      await daoGovernance.connect(tenthAccount).proposeActivity("I will like us to look into spot trading on bybit", 3 * 24 * 60 * 60);
      await daoGovernance.connect(eighthAccount).voteOnProposal(1, true);
      await daoGovernance.connect(ninthAccount).voteOnProposal(1, true);
      await daoGovernance.connect(tenthAccount).voteOnProposal(1, false);

      await expect(savingsContract.withdrawAmount(1, 12000e6)).to.revertedWith("Proposal was not accepted");
    });

    it("Should revert if owner tries to withdraw above specified amount", async function () {
      const { savingsContract, ninthAccount, tenthAccount, daoGovernance, stableToken } = await loadFixture(daoMembershipFixture);

      await stableToken.connect(tenthAccount).approve(savingsContract.target, 20000e6);
      await savingsContract.connect(tenthAccount).deposit(20000e6);

      await daoGovernance.connect(tenthAccount).proposeActivity("I will like us to look into spot trading on bybit", 3 * 24 * 60 * 60);
      await daoGovernance.connect(ninthAccount).voteOnProposal(1, true);
      await daoGovernance.connect(tenthAccount).voteOnProposal(1, true);

      await expect(savingsContract.withdrawAmount(1, 38000e6)).to.revertedWith("Withdrawal amount exceeds the maximum allowed");
    });
  });

  describe('refundWithdrawnAmount', function () {
    it("Should revert if user tries to call this function", async function () {
      const { savingsContract, otherAccount, deposit, stableToken } = await loadFixture(deploySavingsContractFixture);

      await stableToken.connect(otherAccount).approve(savingsContract.target, deposit);
      
      expect(savingsContract.connect(otherAccount).refundWithdrawnAmount(1, deposit)).to.revertedWithCustomError;
    });

    it("Should allow owner transfer amount", async function () {
      const { savingsContract, stableToken } = await loadFixture(deploySavingsContractFixture);

      await stableToken.approve(savingsContract.target, 20000e6);
      await savingsContract.refundWithdrawnAmount(1, 12000e6);

      const balance = await savingsContract.getContractBalance();
      expect(balance.stableCoinBalance).to.equal(12000e6);
    });
  });

  describe('distributeAirdrop', function () {
    it("Should allow airdrop BLZ to users", async function () {
      const { savingsContract, otherAccount, thirdAccount, fourthAccount, stableToken, contractToken } = await loadFixture(deploySavingsContractFixture);

      await stableToken.connect(otherAccount).approve(savingsContract.target, 1_000_000_000);
      await stableToken.connect(thirdAccount).approve(savingsContract.target, 5_000_000_000);
      await stableToken.connect(fourthAccount).approve(savingsContract.target, 10_000_000_000);

      await savingsContract.connect(otherAccount).deposit(500_000_000);
      await savingsContract.connect(thirdAccount).deposit(200_000_000);
      await savingsContract.connect(fourthAccount).deposit(100_000_000);

      await savingsContract.distributeAirdrop(100_000_000_000_000_000_000_000n, [otherAccount, thirdAccount, fourthAccount]);

      const otherAccountBalance = await contractToken.balanceOf(otherAccount);
      const thirdAccountBalance = await contractToken.balanceOf(thirdAccount);
      const fourthAccountBalance = await contractToken.balanceOf(fourthAccount);

      // each user gets 2_500_000_000_000_000_000_000n per slots
      expect(otherAccountBalance).to.equal(112_500_000_000_000_000_000_000n); // Note this user previously has 50_000_000_000_000_000_000_000n BLZ
      expect(thirdAccountBalance).to.equal(75_000_000_000_000_000_000_000n); // Note this user previously has 50_000_000_000_000_000_000_000n BLZ
      expect(fourthAccountBalance).to.equal(12_500_000_000_000_000_000_000n);
    });

    it("Should revert if a user tries to call this function", async function () {
      const { savingsContract, otherAccount, thirdAccount, fourthAccount, stableToken } = await loadFixture(deploySavingsContractFixture);

      await stableToken.connect(otherAccount).approve(savingsContract.target, 1_000_000_000);
      await stableToken.connect(thirdAccount).approve(savingsContract.target, 5_000_000_000);
      await stableToken.connect(fourthAccount).approve(savingsContract.target, 10_000_000_000);

      await savingsContract.connect(otherAccount).deposit(500_000_000);
      await savingsContract.connect(thirdAccount).deposit(200_000_000);
      await savingsContract.connect(fourthAccount).deposit(100_000_000);

      const winners = [otherAccount, thirdAccount, fourthAccount];

      expect(savingsContract.distributeAirdrop(100_000_000_000_000_000_000_000n, winners)).to.be.revertedWithCustomError;
    });
  });
});