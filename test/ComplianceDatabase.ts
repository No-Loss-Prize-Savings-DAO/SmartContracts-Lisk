import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("ComplianceDatabase", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployComplianceDatabaseFixture() {
    const randomKey = "random";
    const key = "test";
    const regulations = "This is just to check if it passes.";
    const userKey = "Securities";
    const userRegulations = "Securities regulations govern the sale and distribution of investment products, including digital assets such as tokens. Compliance with these regulations helps protect investors and ensures fair and transparent markets.";
    const daoKey = "New DAO";
    const daoRegulations = "A lock period will be initiated for an amount of $3000 for one year. All DAOs gets to share 30% of the total complete on each prize distribution. A DAO can earn more when his proposal is accepted. Before proposing a business idea within the DAO, members should conduct thorough due diligence to assess potential risks and ensure the viability of the proposal. DAO funds are at risk, and improper proposals may lead to losses for the community. Members found to have knowingly proposed fraudulent or risky ventures may face penalties, including loss of tokens or expulsion from the DAO.";

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await hre.ethers.getSigners();

    const ComplianceDatabase = await hre.ethers.getContractFactory("ComplianceDatabase");
    const complianceDatabase = await ComplianceDatabase.deploy();

    return { complianceDatabase, randomKey, key, userKey, daoKey, regulations, userRegulations, daoRegulations, owner, otherAccount };
  }

  describe("deployment", function () {
    it("Should add regulation to user regulation", async function () {
      const { complianceDatabase, key, regulations } = await loadFixture(deployComplianceDatabaseFixture);

      await complianceDatabase.addUserRegulation(key, regulations);
      expect(await complianceDatabase.getUserRegulation(key)).to.equal(regulations);
    });

    it("Should fail if another account tries to add user regulation", async function () {
      const { complianceDatabase, otherAccount, key, regulations } = await loadFixture(deployComplianceDatabaseFixture);

      await expect(complianceDatabase.connect(otherAccount).addUserRegulation(key, regulations)).to.be.revertedWithCustomError(
        complianceDatabase, "OwnableUnauthorizedAccount"
      ).withArgs(otherAccount.address);
    });

    it("Should add regulation to DAO regulation", async function () {
      const { complianceDatabase, key, regulations } = await loadFixture(deployComplianceDatabaseFixture);

      await complianceDatabase.addDAORegulation(key, regulations);
      expect(await complianceDatabase.getDAORegulation(key)).to.equal(regulations);
    });

    it("Should fail if another account tries to add dao regulation", async function () {
      const { complianceDatabase, otherAccount, key, regulations } = await loadFixture(deployComplianceDatabaseFixture);

      await expect(complianceDatabase.connect(otherAccount).addDAORegulation(key, regulations)).to.be.revertedWithCustomError(
        complianceDatabase, "OwnableUnauthorizedAccount"
      ).withArgs(otherAccount.address);
    });

    it("Should get default set user regulation", async function () {
      const { complianceDatabase, userKey, userRegulations } = await loadFixture(deployComplianceDatabaseFixture);

      expect(await complianceDatabase.getUserRegulation(userKey)).to.equal(userRegulations);
    });

    it("Should get default set dao regulation", async function () {
      const { complianceDatabase, daoKey, daoRegulations } = await loadFixture(deployComplianceDatabaseFixture);

      expect(await complianceDatabase.getDAORegulation(daoKey)).to.equal(daoRegulations);
    });

    it("Should allow any user get user regulation", async function () {
      const { complianceDatabase, userKey, userRegulations } = await loadFixture(deployComplianceDatabaseFixture);

      expect(await complianceDatabase.getUserRegulation(userKey)).to.equal(userRegulations);
    });

    it("Should allow any user get dao regulation", async function () {
      const { complianceDatabase, daoKey, daoRegulations } = await loadFixture(deployComplianceDatabaseFixture);

      expect(await complianceDatabase.getDAORegulation(daoKey)).to.equal(daoRegulations);
    });

    it("Should return an empty string if a wrong key is passed", async function () {
      const { complianceDatabase, randomKey, daoRegulations } = await loadFixture(deployComplianceDatabaseFixture);

      expect(await complianceDatabase.getDAORegulation(randomKey)).to.equal("");
    });
  });
});