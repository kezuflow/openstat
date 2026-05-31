import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    mantleSepolia: {
      type: "http",
      chainId: 5003,
      url: configVariable("MANTLE_SEPOLIA_RPC_URL"),
      accounts: [configVariable("MANTLE_DEPLOYER_PRIVATE_KEY")],
    },
  },
});
