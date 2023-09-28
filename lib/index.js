const fetchVestingContract = async (contractHash, index) => {
  const contract = new Contracts.Contract(client);
  contract.setContractHash(contractHash);

  let vesting = {};

  vesting.contract_name = await contract.queryContractData(["contract_name"]);
  vesting.end_date = await contract.queryContractData(["end_date"]);
  vesting.owner = await contract.queryContractData(["owner"]);
  vesting.release_date = await contract.queryContractData(["release_date"]);
  vesting.cliff_timestamp = await contract.queryContractData(["cliff_timestamp"]);
  vesting.vesting_amount = await contract.queryContractData(["vesting_amount"]);
  vesting.claimed_amount = await contract.queryContractDictionary("claimed_dict", index.toString());

  return vesting;
};

const uint32ArrayToHex = (data) => {
  return Object.values(data)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const getValidators = async (client) => {
  const validatorsInfo = await client.nodeClient.getValidatorsInfo();

  const data = validatorsInfo.auction_state;

  const filteredData = data.era_validators;
  const bids = data.bids;

  const filteredBids = bids.filter((bd) => !bd.bid.inactive && bd.bid.delegators.length < 1200);

  return filteredBids;
};

module.exports = {
  fetchVestingContract,
  uint32ArrayToHex,
  getValidators,
};
