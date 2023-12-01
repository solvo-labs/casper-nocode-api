const { Contracts, Keys, RuntimeArgs, DeployUtil } = require("casper-js-sdk");

// const feeWallet = Keys.Secp256K1.loadKeyPairFromPrivateFile("fee_wallet.pem");

const RPC = "https://rpc.testnet.casperlabs.io/rpc";
const CUSTOM_NFT_CONTRACT = "hash-940fd61d953f76ee0a478d0386e503d664d7f9e17702f6cfc0e7708b540be1cd";

const RAFFLE_STATUS = {
  WAITING_DEPOSIT: 0,
  ONGOING: 1,
  FINISHED: 2,
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

  let status = RAFFLE_STATUS.WAITING_DEPOSIT;
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

    const endDate = parseInt(raffle.end_date._hex, 16);

    if (endDate < Date.now()) {
      status = RAFFLE_STATUS.FINISHED;

      if (parseInt(raffle.partipiciant_count._hex, 16) == 0) {
        try {
          raffle.claimed = await contract.queryContractData(["claimed"]);
          status = RAFFLE_STATUS.COMPLETED;
        } catch {
          raffle.claimed = undefined;
        }
      }
    } else {
      status = RAFFLE_STATUS.ONGOING;
    }

    try {
      raffle.winner = await contract.queryContractData(["winner"]);
      raffle.winner_account = await contract.queryContractDictionary("partipiciant_dict", raffle.winner.toString());
      status = RAFFLE_STATUS.WAITING_CLAIM;

      try {
        raffle.claimed = await contract.queryContractData(["claimed"]);
        status = RAFFLE_STATUS.COMPLETED;
      } catch {
        raffle.claimed = undefined;
      }
    } catch {
      raffle.winner = undefined;
      raffle.winner_account = undefined;
    }
  } catch {
    raffle.partipiciant_count = undefined;
  }

  raffle.status = status;

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
  // fetchTimeableNfts,
  // raffleForFilter,
};
