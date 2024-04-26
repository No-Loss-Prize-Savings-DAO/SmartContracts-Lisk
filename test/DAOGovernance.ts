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
    const ONE_WEEK_IN_SECS = 7 * 24 * 60 * 60;
    const unlockTime = (await time.latest()) + ONE_WEEK_IN_SECS;
    const stableCoinMintAmount = 1_000_000_000_000;
    const stableCoinDecimals = 6;
    const contractTokenMintAmount = 1_000_000_000_000_000_000_000_000n;
    const contractTokenDecimals = 18;
    const initialDeposit = 1_000_000_000;
    const mockId = 12345;

    const STABLE_TOKEN_NAME = "USD Tether";
    const STABLE_TOKEN_SYMBOL = "USDT";
    const CONTRACT_TOKEN_NAME = "Blitz";
    const CONTRACT_TOKEN_SYMBOL = "BLZ";

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, sixthAccount, seventhAccount, eighthAccount, ninthAccount, tenthAccount] = await hre.ethers.getSigners();

    const StableToken = await hre.ethers.getContractFactory("FactoryERC20");
    const stableToken = await StableToken.deploy(STABLE_TOKEN_NAME, STABLE_TOKEN_SYMBOL, stableCoinDecimals);
    await stableToken.transfer(otherAccount, 10_000_000_000);
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

    return { savingsContract, contractToken, regulatoryCompliance, daoGovernance, ONE_WEEK_IN_SECS, stableCoinMintAmount, contractTokenMintAmount, initialDeposit, unlockTime, owner, otherAccount, sixthAccount, seventhAccount, eighthAccount, ninthAccount, tenthAccount, stableToken };
  }

  async function daoMembershipFixture() {
    const { savingsContract, owner, otherAccount, sixthAccount, seventhAccount, eighthAccount, ninthAccount, tenthAccount, daoGovernance, stableToken, regulatoryCompliance, unlockTime } = await loadFixture(deploySavingsContractFixture);

      await stableToken.connect(eighthAccount).approve(savingsContract.target, 8000e6);
      await stableToken.connect(ninthAccount).approve(savingsContract.target, 14000e6);
      await stableToken.connect(tenthAccount).approve(savingsContract.target, 20000e6);

      await savingsContract.connect(eighthAccount).deposit(8000e6);
      await savingsContract.connect(ninthAccount).deposit(14000e6);
      await savingsContract.connect(tenthAccount).deposit(20000e6);

      await daoGovernance.addMember(eighthAccount.address);
      await daoGovernance.addMember(ninthAccount.address);
      await daoGovernance.addMember(tenthAccount.address);

      return { savingsContract, owner, otherAccount, sixthAccount, seventhAccount, eighthAccount, ninthAccount, tenthAccount, daoGovernance, stableToken, regulatoryCompliance, unlockTime };
  }

  describe('refundWithdrawnAmount', function () {
    it("Should revert if user tries to call this function", async function () {
      const { otherAccount, owner, daoGovernance } = await loadFixture(deploySavingsContractFixture);
      
      expect(daoGovernance.connect(otherAccount).proposeMembership(owner.address)).to.revertedWith('Only regulatoryCompliance contract can call this function');
    });

    it("Should revert if any dao member tries to call this function", async function () {
      const { tenthAccount, owner, daoGovernance } = await loadFixture(daoMembershipFixture);

      expect(daoGovernance.connect(tenthAccount).proposeMembership(owner.address)).to.revertedWith('Only regulatoryCompliance contract can call this function');
    });
  });

  describe('proposeActivity', function () {
    it("Should revert if user tries to call this function", async function () {
      const { otherAccount, daoGovernance } = await loadFixture(deploySavingsContractFixture);
      
      expect(daoGovernance.connect(otherAccount).proposeActivity("I will like us to look into spot trading on bybit", 3 * 24 * 60 * 60)).to.revertedWith('Only DAO members can propose activity.');
    });

    it("Should allow DAO members propose activity", async function () {
        const { tenthAccount, daoGovernance } = await loadFixture(daoMembershipFixture);

        await daoGovernance.connect(tenthAccount).proposeActivity("I will like us to look into spot trading on bybit", 3 * 24 * 60 * 60);
        const proposal = await daoGovernance.getProposalStatus(1);
        expect(proposal.description).to.equal('I will like us to look into spot trading on bybit');
        expect(proposal.totalVotes).to.equal(0);
        expect(proposal.requiredVotes).to.equal(8);
        expect(proposal.endTime).to.equal(await time.latest() + (3 * 24 * 60 * 60));
        expect(proposal.active).to.equal(true);
    });

    it("Should revert if invalid time is inputed", async function () {
        const { tenthAccount, daoGovernance } = await loadFixture(daoMembershipFixture);

        await expect(daoGovernance.connect(tenthAccount).proposeActivity("I will like us to look into spot trading on bybit", 3600)).to.revertedWith("Invalid voting duration");
    });
  });

  describe('voteOnProposal', function () {
    it("Should revert if user tries to call this function", async function () {
      const { otherAccount, tenthAccount, daoGovernance } = await loadFixture(daoMembershipFixture)
      
      await daoGovernance.connect(tenthAccount).proposeActivity("I will like us to look into spot trading on bybit", 3 * 24 * 60 * 60);
      expect(daoGovernance.connect(otherAccount).voteOnProposal(1, true)).to.revertedWith('Only DAO members can vote');
    });

    it("Should revert if dao member already voted", async function () {
      const { tenthAccount, daoGovernance } = await loadFixture(daoMembershipFixture)
      
      await daoGovernance.connect(tenthAccount).proposeActivity("I will like us to look into spot trading on bybit", 3 * 24 * 60 * 60);
      daoGovernance.connect(tenthAccount).voteOnProposal(1, true)
      expect(daoGovernance.connect(tenthAccount).voteOnProposal(1, true)).to.revertedWith('Already voted');
    });

    it("Should revert if voting has ended", async function () {
      const { unlockTime, ninthAccount, tenthAccount, daoGovernance } = await loadFixture(daoMembershipFixture)
      
      await daoGovernance.connect(tenthAccount).proposeActivity("I will like us to look into spot trading on bybit", 3 * 24 * 60 * 60);
      daoGovernance.connect(tenthAccount).voteOnProposal(1, true);
      await time.increaseTo(unlockTime);

      expect(daoGovernance.connect(ninthAccount).voteOnProposal(1, true)).to.revertedWith('Voting period has ended');
    });

    it("Should revert once the required votes is reached", async function () {
      const { eighthAccount, ninthAccount, tenthAccount, daoGovernance } = await loadFixture(daoMembershipFixture)
      
      await daoGovernance.connect(tenthAccount).proposeActivity("I will like us to look into spot trading on bybit", 3 * 24 * 60 * 60);
      await daoGovernance.connect(tenthAccount).voteOnProposal(1, true);
      await daoGovernance.connect(ninthAccount).voteOnProposal(1, true);

      await expect(daoGovernance.connect(eighthAccount).voteOnProposal(1, true)).to.revertedWith("Proposal is not active");
    });

    it("Should save proposer after voting has ended in favor of proposer", async function () {
      const { eighthAccount, ninthAccount, tenthAccount, daoGovernance } = await loadFixture(daoMembershipFixture)
      
      await daoGovernance.connect(tenthAccount).proposeActivity("I will like us to look into spot trading on bybit", 3 * 24 * 60 * 60);
      await daoGovernance.connect(tenthAccount).voteOnProposal(1, true);
      await daoGovernance.connect(ninthAccount).voteOnProposal(1, false);
      await daoGovernance.connect(eighthAccount).voteOnProposal(1, true);

      expect(await daoGovernance.acceptedDAO()).to.equal(tenthAccount.address);
    });

    it("Should not save proposer after voting has ended against proposer", async function () {
      const { eighthAccount, ninthAccount, tenthAccount, daoGovernance } = await loadFixture(daoMembershipFixture)
      
      await daoGovernance.connect(tenthAccount).proposeActivity("I will like us to look into spot trading on bybit", 3 * 24 * 60 * 60);
      await daoGovernance.connect(tenthAccount).voteOnProposal(1, true);
      await daoGovernance.connect(ninthAccount).voteOnProposal(1, false);
      await daoGovernance.connect(eighthAccount).voteOnProposal(1, false);

      const zero = ethers.ZeroAddress;
      expect(await daoGovernance.acceptedDAO()).to.equal(zero);
    });

    it("Should return current proposer", async function () {
      const { eighthAccount, ninthAccount, tenthAccount, daoGovernance, unlockTime } = await loadFixture(daoMembershipFixture)
      
      await daoGovernance.connect(tenthAccount).proposeActivity("This is the first proposal", 5 * 24 * 60 * 60);
      daoGovernance.connect(tenthAccount).voteOnProposal(1, true);
      await time.increaseTo(unlockTime);

      await daoGovernance.connect(eighthAccount).proposeActivity("I will like us to look into spot trading on bybit", 3 * 24 * 60 * 60);
      await daoGovernance.connect(tenthAccount).voteOnProposal(2, true);
      await daoGovernance.connect(ninthAccount).voteOnProposal(2, false);
      await daoGovernance.connect(eighthAccount).voteOnProposal(2, true);

      expect(await daoGovernance.getCurrentProposer()).to.equal(eighthAccount.address);
    });

    it("Should return number of dao members", async function () {
      const { daoGovernance } = await loadFixture(daoMembershipFixture)

      expect(await daoGovernance.getNumberOfMembers()).to.equal(3);
    });
  });
});