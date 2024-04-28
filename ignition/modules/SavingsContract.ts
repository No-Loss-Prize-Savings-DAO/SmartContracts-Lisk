import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// const JAN_1ST_2030 = 1893456000;
// const ONE_GWEI: bigint = 1_000_000_000n;
const STABLE_TOKEN_NAME = "USD Tether";
const STABLE_TOKEN_SYMBOL = "USDT";
const CONTRACT_TOKEN_NAME = "Blitz";
const CONTRACT_TOKEN_SYMBOL = "BLZ";
const stableCoinDecimals = 6;
const contractTokenDecimals = 18;

const SavingsContractModule = buildModule("SavingsContractModule", (m) => {
  // const unlockTime = m.getParameter("unlockTime", JAN_1ST_2030);
  // const lockedAmount = m.getParameter("lockedAmount", ONE_GWEI);

  const stableToken = m.contract("USDT", [STABLE_TOKEN_NAME, STABLE_TOKEN_SYMBOL, stableCoinDecimals]);
  const contractToken = m.contract("BLZ", [CONTRACT_TOKEN_NAME, CONTRACT_TOKEN_SYMBOL, contractTokenDecimals]);

  const complianceDatabase = m.contract("ComplianceDatabase");
  const regulatoryCompliance = m.contract("RegulatoryCompliance", [complianceDatabase]);
  const nftContract = m.contract("NFTContract");

  const savingsContract = m.contract("SavingsContract", [stableToken, contractToken, regulatoryCompliance, nftContract]);
  const daoGovernance = m.contract("DAOGovernance", [savingsContract]);
  const prizeDistribution = m.contract("PrizeDistribution", [savingsContract, daoGovernance]);

  return { stableToken, contractToken, complianceDatabase, regulatoryCompliance, nftContract, savingsContract, daoGovernance, prizeDistribution};
});

export default SavingsContractModule;
