const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { CasperClient, Contracts, RuntimeArgs, CLValueBuilder, CLPublicKey, DeployUtil, CasperServiceByJsonRPC } = require("casper-js-sdk");
const { getNamedKeys } = require("./utils");
const port = process.env.PORT || 3000;
const app = express();

const db = require("./index_db");

const Listing = db.listings;
const Vesting = db.vestings;
const { fetchVestingContract, getRaffle, uint32ArrayToHex, getValidators } = require("./lib/index");

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(cors());

const client = new CasperClient("https://rpc.testnet.casperlabs.io/rpc");

db.mongoose
  .connect(db.url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to the database!");
  })
  .catch((err) => {
    console.log("Cannot connect to the database!", err);
    process.exit();
  });

app.get("/api/", async (req, res) => {
  return res.send("hello world");
});

app.post("/api/deploy", async (req, res) => {
  try {
    const deploy = DeployUtil.deployFromJson(req.body).unwrap();
    const deployHash = await client.putDeploy(deploy);
    res.send(deployHash);
  } catch (error) {
    res.status(400).send(error.message);
  }
});

app.get("/api/getERC20Token", async (req, res) => {
  const contractHash = req.query.contractHash;

  try {
    const contract = new Contracts.Contract(client);
    contract.setContractHash(contractHash);

    let token = {};

    token.name = await contract.queryContractData(["name"]);
    token.symbol = await contract.queryContractData(["symbol"]);
    token.decimals = await contract.queryContractData(["decimals"]);
    token.total_supply = await contract.queryContractData(["total_supply"]);
    token.balances = await contract.queryContractData(["balances"]);
    token.enable_mint_burn = await contract.queryContractData(["enable_mint_burn"]);

    console.log(await contract.queryContractData(["allowances"]));

    return res.send(token);
  } catch (err) {
    return res.status(500).send(err);
  }
});

app.get("/api/stateRootHash", async (req, res) => {
  try {
    const instance = new CasperServiceByJsonRPC("https://rpc.testnet.casperlabs.io/rpc");

    const stateRootHash = await instance.getStateRootHash();
    return res.send(stateRootHash);
  } catch (err) {
    return res.status(500).send(err);
  }
});

app.get("/api/getCollection", async (req, res) => {
  const contractHash = req.query.contractHash;

  try {
    const contract = new Contracts.Contract(client);
    contract.setContractHash(contractHash);

    let collection = {};

    collection.collection_name = await contract.queryContractData(["collection_name"]);
    collection.collection_symbol = await contract.queryContractData(["collection_symbol"]);
    collection.total_token_supply = await contract.queryContractData(["total_token_supply"]);
    collection.number_of_minted_tokens = await contract.queryContractData(["number_of_minted_tokens"]);
    collection.json_schema = await contract.queryContractData(["json_schema"]);

    return res.send(collection);
  } catch (err) {
    return res.status(500).send(err);
  }
});

app.get("/api/getNftMetadata", async (req, res) => {
  const contractHash = req.query.contractHash;
  const index = req.query.index;

  try {
    const contract = new Contracts.Contract(client);
    contract.setContractHash(contractHash);

    const result = await contract.queryContractDictionary("metadata_raw", index);

    return res.send(result);
  } catch (err) {
    return res.status(500).send(err);
  }
});

app.get("/api/getNamedKeys", async (req, res) => {
  const pubkey = req.query.pubkey;

  try {
    const instance = new CasperServiceByJsonRPC("https://rpc.testnet.casperlabs.io/rpc");

    const stateRootHash = await instance.getStateRootHash();

    try {
      const data = await getNamedKeys(client, stateRootHash, CLPublicKey.fromHex(pubkey));
      return res.send(data.namedKeys);
    } catch {
      return res.send([]);
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send([]);
  }
});

app.get("/api/getMarketplace", async (req, res) => {
  const contractHash = req.query.contractHash;

  try {
    const contract = new Contracts.Contract(client);
    contract.setContractHash(contractHash);

    let marketplace = {};

    marketplace.contractName = await contract.queryContractData(["contract_name"]);

    marketplace.listingCount = await contract.queryContractData(["listing_counter"]);

    return res.send(marketplace);
  } catch (err) {
    return res.status(500).send(err);
  }
});

app.post("/api/add_listing", async (req, res) => {
  const data = req.body;

  const listingInstance = new Listing({
    marketplace: data.marketplace,
    collection_hash: data.collection_hash,
    price: data.price,
    tokenId: data.tokenId,
    nftName: data.nftName,
    nftDescription: data.nftDescription,
    nftImage: data.nftImage,
    listingIndex: data.listingIndex,
    active: true,
  });

  listingInstance
    .save(listingInstance)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while creating the listings.",
      });
    });
});

app.get("/api/fetch_my_listing", async (req, res) => {
  const marketplaceContract = req.query.contractHash;

  const condition = { marketplace: { $regex: new RegExp(marketplaceContract), $options: "i" } };

  Listing.find(condition)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving listings.",
      });
    });
});

app.get("/api/fetch_listing", async (req, res) => {
  const condition = { active: true };

  Listing.find(condition)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving listings.",
      });
    });
});

app.get("/api/get_vesting_contract", async (req, res) => {
  const contractHash = req.query.contractHash;

  try {
    const contract = new Contracts.Contract(client);
    contract.setContractHash(contractHash);

    let vesting = {};

    vesting.contract_name = await contract.queryContractData(["contract_name"]);
    vesting.cep18_contract_hash = await contract.queryContractData(["cep18_contract_hash"]);
    vesting.cliff_timestamp = await contract.queryContractData(["cliff_timestamp"]);
    vesting.duration = await contract.queryContractData(["duration"]);
    vesting.end_date = await contract.queryContractData(["end_date"]);
    vesting.owner = await contract.queryContractData(["owner"]);
    vesting.period = await contract.queryContractData(["period"]);
    vesting.recipient_count = await contract.queryContractData(["recipient_count"]);
    vesting.release_date = await contract.queryContractData(["release_date"]);
    vesting.released = await contract.queryContractData(["released"]);
    vesting.start_date = await contract.queryContractData(["start_date"]);
    vesting.vesting_amount = await contract.queryContractData(["vesting_amount"]);

    return res.send(vesting);
  } catch (err) {
    return res.status(500).send(err);
  }
});

app.get("/api/set_vesting_recipients", async (req, res) => {
  const contractHash = req.query.contractHash;
  console.log(contractHash);

  const contract = new Contracts.Contract(client);
  contract.setContractHash(contractHash);

  const recipient_count = await contract.queryContractData(["recipient_count"]);
  const cep18_contract_hash = await contract.queryContractData(["cep18_contract_hash"]);
  const cep18_contract_hash_hex = uint32ArrayToHex(cep18_contract_hash);

  console.log(cep18_contract_hash_hex);

  let recipientsPromises = [];
  let allocationsPromises = [];

  for (let index = 0; index < recipient_count; index++) {
    recipientsPromises.push(contract.queryContractDictionary("recipients_dict", index.toString()));
    allocationsPromises.push(contract.queryContractDictionary("allocations_dict", index.toString()));
  }

  const recipients = await Promise.all(recipientsPromises);
  const allocations = await Promise.all(allocationsPromises);

  const finalData = recipients.map((rec, index) => {
    console.log(allocations[index].data.toNumber());
    return {
      v_index: index,
      recipient: uint32ArrayToHex(rec.data.data),
      allocation: allocations[index].data.toNumber(),
      v_token: "hash-" + cep18_contract_hash_hex,
      v_contract: contractHash,
    };
  });

  Vesting.insertMany(finalData)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while creating the vestings.",
      });
    });
});

app.get("/api/get_vesting_list", async (req, res) => {
  const accountHash = req.query.accountHash;

  try {
    const condition = { recipient: { $regex: new RegExp(accountHash), $options: "i" } };
    const vestingList = await Vesting.find(condition);

    const contractPromises = vestingList.map((vl) => fetchVestingContract(vl.v_contract, vl.v_index, client));
    const contractData = await Promise.all(contractPromises);

    const finalData = vestingList.map((vt, index) => {
      return { ...vt._doc, ...contractData[index] };
    });

    return res.send(finalData);
  } catch (err) {
    return res.status(500).send(err);
  }
});

app.get("/api/get_raffle", async (req, res) => {
  const contractHash = req.query.contractHash;

  try {
    const raffle = await getRaffle(contractHash, client);

    return res.send(raffle);
  } catch (err) {
    return res.status(500).send(err);
  }
});

app.get("/api/validators", async (req, res) => {
  try {
    const validators = await getValidators(client);

    return res.send(validators);
  } catch (err) {
    return res.status(500).send(err);
  }
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

app.get("/api/get_all_raffles", async (req, res) => {
  const contractHash = req.query.contractHash;

  try {
    const contract = new Contracts.Contract(client);
    contract.setContractHash(contractHash);

    const data_count = await contract.queryContractData(["data_count"]);
    const count = parseInt(data_count._hex, 16);

    let promisses = [];
    for (let index = 0; index < count; index++) {
      const result = contract.queryContractDictionary("data_dict", index.toString());
      promisses.push(result);
    }

    const promiseResult = await Promise.all(promisses);
    const rafflesContractHashes = promiseResult.map((raffle) => "hash-" + raffle.data);

    const rafflePromisses = rafflesContractHashes.map((raffleHash) => getRaffle(raffleHash, client));

    const raffles = await Promise.all(rafflePromisses);

    return res.send(raffles);
  } catch (err) {
    return res.status(500).send(err);
  }
});

app.get("/api/getbalance", async (req, res) => {
  const pubkey = req.query.publickey;

  client
    .balanceOfByPublicKey(CLPublicKey.fromHex(pubkey))
    .then((data) => {
      res.send(data);
    })
    .catch((error) => {
      res.status(500).send(error);
    });
});
