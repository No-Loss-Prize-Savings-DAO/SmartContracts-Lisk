import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";
import { vars } from "hardhat/config";

const ETHERSCAN_API_KEY = vars.get("ETHERSCAN_API_KEY");

const config: HardhatUserConfig = {
 solidity: "0.8.20",
 networks: {
    sepolia: {
      url: process.env.URL,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
    'lisk-sepolia': {
      url: 'https://rpc.sepolia-api.lisk.com',
      accounts: [process.env.PRIVATE_KEY as string],
      gasPrice: 1000000000,
    },
 },
 etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY,
      "lisk-sepolia": "123",
    },
    customChains: [
      {
          network: "lisk-sepolia",
          chainId: 4202,
          urls: {
              apiURL: "https://sepolia-blockscout.lisk.com/api",
              browserURL: "https://sepolia-blockscout.lisk.com"
          }
       }
     ]
  },
  sourcify: {
    enabled: false
  },
};

export default config;