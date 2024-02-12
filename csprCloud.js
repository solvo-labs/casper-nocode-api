const axios = require("axios");
require("dotenv").config();

const auth_token = process.env.AUTHORIZATION_TOKEN;

class CSPR {
  constructor() {
    if (!CSPR.instance) {
      CSPR.instance = this;

      this.axiosInstance = axios.create({
        baseURL: `https://api.testnet.cspr.cloud/`,
        headers: {
          Authorization: `${auth_token}`,
        },
      });
    }

    return CSPR.instance;
  }

  getAccount = async (account) => {
    return this.axiosInstance.get("/accounts/" + account);
  };

  // getAccounts = async () => {
  //   return this.axiosInstance.get("/accounts");
  // };

  getContractWithPackageHash = async (contract_package_hash) => {
    return this.axiosInstance.get("/contract-packages/" + contract_package_hash + "/contracts");
  };

  getNFTDetail = async (contract_package_hash, token_id) => {
    return this.axiosInstance.get("/contract-packages/" + contract_package_hash + "/nft-tokens/" + token_id);
  };

  getAccountNFTs = async (account_identifier) => {
    return this.axiosInstance.get("/accounts/" + account_identifier + "/nft-tokens?page_size=250");
  };

  getContractPackageNFTs = async (contract_package_hash) => {
    return this.axiosInstance.get("/contract-packages/" + contract_package_hash + "/nft-tokens?page_size=250");
  };

  getTokens = async (account_identifier) => {
    return this.axiosInstance.get("/accounts/" + account_identifier + "/ft-token-ownership?page_size=250", {
      params: {
        includes: "contract_package{name,metadata}",
      },
    });
  };

  getContract = async (contract_hash) => {
    return this.axiosInstance.get("/contracts/" + contract_hash);
  };

  // getContracts = async () => {
  //   return this.axiosInstance.get("/contracts");
  // };

  // getContractWithPackageHash = async (contract_package_hash) => {
  //   return this.axiosInstance.get("/contract-packages/" + contract_package_hash + "/contracts");
  // };

  // getContractTypes = () => {
  //   return this.axiosInstance.get("/contract-types");
  // };

  // getContractEntryPoints = (contract_hash) => {
  //   return this.axiosInstance.get("/contracts/" + contract_hash + "/entry-points");
  // };

  // getContractEntryPointCost = (contract_hash, entry_point_name) => {
  //   return this.axiosInstance.get("/contracts/" + contract_hash + "/entry-points/" + entry_point_name + "/costs");
  // };

  // getAccountTransfers = (account_identifier) => {
  //   return this.axiosInstance.get("/accounts/" + account_identifier + "/transfers");
  // };

  // getDeployTransfers = (deploy_hash) => {
  //   return this.axiosInstance.get("/deploys/" + deploy_hash + "/transfers");
  // };
}

module.exports = CSPR;
