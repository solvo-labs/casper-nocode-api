const { Contracts, Keys, RuntimeArgs, DeployUtil } = require("casper-js-sdk");

// const feeWallet = Keys.Secp256K1.loadKeyPairFromPrivateFile("fee_wallet.pem");

const RPC = "https://rpc.testnet.casperlabs.io/rpc";
const CUSTOM_NFT_CONTRACT = "hash-940fd61d953f76ee0a478d0386e503d664d7f9e17702f6cfc0e7708b540be1cd";

const RAFFLE_STATUS = {
  WAITING_DEPOSIT: 0,
  WAITING_START: 1,
  ONGOING: 2,
  WAITING_DRAW: 3,
  WAITING_CLAIM: 4,
  COMPLETED: 5,
};

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
  raffle.claimed = false;
  raffle.status = RAFFLE_STATUS.WAITING_DEPOSIT;
  raffle.winner = undefined;
  raffle.winner_account = undefined;

  const raffleCollection = "hash-" + uint32ArrayToHex(raffle.collection.data);

  const nftContract = new Contracts.Contract(client);
  nftContract.setContractHash(raffleCollection);

  const nftOwner = await nftContract.queryContractDictionary("token_owners", raffle.nft_index.toNumber().toString());
  const nftOwnerHash = "hash-" + uint32ArrayToHex(nftOwner.data.data);

  try {
    raffle.partipiciant_count = await contract.queryContractData(["partipiciant_count"]);
  } catch {
    raffle.partipiciant_count = 0;
  }

  const now = Date.now();

  if (raffle.start_date >= now) {
    if (nftOwnerHash === contractHash) {
      raffle.status = RAFFLE_STATUS.WAITING_START;
    } else {
      raffle.status = RAFFLE_STATUS.WAITING_DEPOSIT;
    }
  }

  if (raffle.start_date <= now && raffle.end_date >= now) {
    raffle.status = RAFFLE_STATUS.ONGOING;
  }

  if (raffle.end_date < now) {
    try {
      raffle.claimed = await contract.queryContractData(["claimed"]);
      raffle.status = RAFFLE_STATUS.COMPLETED;
    } catch {
      try {
        raffle.winner = await contract.queryContractData(["winner"]);
        raffle.winner_account = await contract.queryContractDictionary("partipiciant_dict", raffle.winner.toString());

        raffle.status = RAFFLE_STATUS.WAITING_CLAIM;
      } catch {
        raffle.status = RAFFLE_STATUS.WAITING_DRAW;
      }
    }
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

const getVestingDataLight = async (contractHash, client) => {
  const contract = new Contracts.Contract(client);
  contract.setContractHash(contractHash);

  try {
    const recipient_count = await contract.queryContractData(["recipient_count"]);

    const partipiciantCount = parseInt(recipient_count._hex, 16);

    let recipientsPromises = [];
    let allocationsPromises = [];

    for (let index = 0; index < recipient_count; index++) {
      recipientsPromises.push(contract.queryContractDictionary("recipients_dict", index.toString()));
      allocationsPromises.push(contract.queryContractDictionary("allocations_dict", index.toString()));
    }

    const recipients = await Promise.all(recipientsPromises);

    const allocations = await Promise.all(allocationsPromises);

    const finalData = recipients.map((re, index) => {
      return {
        recipient: re,
        allocation: allocations[index],
      };
    });

    return finalData;
  } catch {
    return {};
  }
};

const getStakePool = async (contractHash, accountHash, client) => {
  const contract = new Contracts.Contract(client);
  contract.setContractHash(contractHash);

  let stake = {};

  stake.key = contractHash;
  stake.deposit_end_time = await contract.queryContractData(["deposit_end_time"]);
  stake.deposit_start_time = await contract.queryContractData(["deposit_start_time"]);
  stake.fixed_apr = await contract.queryContractData(["fixed_apr"]);
  stake.lock_period = await contract.queryContractData(["lock_period"]);
  stake.max_apr = await contract.queryContractData(["max_apr"]);
  stake.max_cap = await contract.queryContractData(["max_cap"]);
  stake.max_stake = await contract.queryContractData(["max_stake"]);
  stake.min_apr = await contract.queryContractData(["min_apr"]);
  stake.min_stake = await contract.queryContractData(["min_stake"]);

  stake.token = uint32ArrayToHex((await contract.queryContractData(["token"])).data);
  stake.total_supply = await contract.queryContractData(["total_supply"]);

  try {
    const myBalance = await contract.queryContractDictionary("stakes_dict", accountHash);

    stake.my_balance = myBalance;
  } catch {
    stake.my_balance = 0;
  }

  return stake;
};

// const fetchTimeableNfts = async (client) => {
//   const contract = new Contracts.Contract(client);
//   contract.setContractHash(CUSTOM_NFT_CONTRACT);

//   try {
//     const nftIndexNumber = await contract.queryContractData(["nft_index"]);
//     const nftIndex = nftIndexNumber.toNumber();

//     const willBurnNftPromises = [];
//     for (let index = 0; index < nftIndex; index++) {
//       willBurnNftPromises.push(contract.queryContractDictionary("timeable_nfts", index.toString()));
//     }

//     const now = Date.now();

//     const willBurnNftString = await Promise.all(willBurnNftPromises);

//     const willBurntNftData = willBurnNftString.map((wb) => JSON.parse(wb.data));

//     console.log(willBurntNftData);

//     const filteredWillBurnNftData = willBurntNftData.filter((wb) => wb.burnt === false);

//     if (filteredWillBurnNftData.length > 0) {
//       const timestamps = filteredWillBurnNftData.map((wb) => wb.timestamp);

//       let count = 0;

//       timestamps.forEach((timestamp) => {
//         if (timestamp < now) {
//           count += 1;
//         }
//       });

//       console.log(count);

//       if (count > 0) {
//         const args = RuntimeArgs.fromMap({});
//         const fee = count * 4 * 1_000_000_000;

//         const deploy = contract.callEntrypoint("burn_timeable_nft", args, feeWallet.publicKey, "casper-test", fee.toString(), [feeWallet]);

//         client
//           .putDeploy(deploy)
//           .then((dt) => {
//             console.log("dt", dt);
//           })
//           .catch((err) => {
//             console.log(err);
//           });
//       }
//     }
//   } catch (error) {
//     console.log("timeable_nft_error", error);
//   }
// };

module.exports = {
  fetchVestingContract,
  getRaffle,
  uint32ArrayToHex,
  getValidators,
  getVestingDataLight,
  RPC,
  getStakePool,
  // fetchTimeableNfts,
  // raffleForFilter,
};
