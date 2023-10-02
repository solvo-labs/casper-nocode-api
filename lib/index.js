const { Contracts } = require("casper-js-sdk");

const fetchVestingContract = async (contractHash, index, client) => {
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

const getRaffle = async (contractHash, client) => {
  const contract = new Contracts.Contract(client);
  contract.setContractHash(contractHash);

  let raffle = {};

  raffle.key = contractHash;
  raffle.owner = await contract.queryContractData(["owner"]);
  raffle.name = await contract.queryContractData(["name"]);
  raffle.collection = await contract.queryContractData(["collection"]);
  raffle.nft_index = await contract.queryContractData(["nft_index"]);
  raffle.start_date = await contract.queryContractData(["start_date"]);
  raffle.end_date = await contract.queryContractData(["end_date"]);
  raffle.price = await contract.queryContractData(["price"]);

  try {
    raffle.partipiciant_count = await contract.queryContractData(["partipiciant_count"]);
  } catch {
    raffle.partipiciant_count = undefined;
  }

  try {
    raffle.winner = await contract.queryContractData(["winner"]);
    raffle.winner_account = await contract.queryContractDictionary("partipiciant_dict", raffle.winner.toString());
  } catch {
    raffle.winner = undefined;
    raffle.winner_account = undefined;
  }

  return raffle;
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

  const filteredBids = bids.filter((bd) => !bd.bid.inactive);

  return filteredBids;
};

module.exports = {
  fetchVestingContract,
  getRaffle,
  uint32ArrayToHex,
  getValidators,
};
