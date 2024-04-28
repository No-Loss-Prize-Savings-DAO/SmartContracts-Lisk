import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const SavingsContractModule = buildModule("SavingsContractModule", (m) => {

  const stableToken = m.contract("USDT");
  const contractToken = m.contract("BLZ");

  const complianceDatabase = m.contract("ComplianceDatabase");
  const regulatoryCompliance = m.contract("RegulatoryCompliance", [complianceDatabase]);
  const nftContract = m.contract("NFTContract");

  const savingsContract = m.contract("SavingsContract", [stableToken, contractToken, regulatoryCompliance, nftContract]);
  const daoGovernance = m.contract("DAOGovernance", [savingsContract]);
  const prizeDistribution = m.contract("PrizeDistribution", [savingsContract, daoGovernance]);

  const SwapContract = m.contract("SwapContract");

  return { stableToken, contractToken, complianceDatabase, regulatoryCompliance, nftContract, savingsContract, daoGovernance, prizeDistribution, SwapContract };
});

export default SavingsContractModule;
