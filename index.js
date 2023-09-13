const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { CasperClient, Contracts, RuntimeArgs, CLValueBuilder, CLPublicKey, DeployUtil, CasperServiceByJsonRPC } = require("casper-js-sdk");
const { getNamedKeys } = require("./utils");
const port = process.env.PORT || 1923;
const app = express();

const db = require("./index_db");

const Listing = db.listings;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb" }));
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

app.get("/", async (req, res) => {
  return res.send("hello world");
});

app.post("/deploy", async (req, res) => {
  try {
    const deploy = DeployUtil.deployFromJson(req.body).unwrap();
    const deployHash = await client.putDeploy(deploy);
    res.send(deployHash);
  } catch (error) {
    res.status(400).send(error.message);
  }
});

app.get("/getERC20Token", async (req, res) => {
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

app.get("/stateRootHash", async (req, res) => {
  try {
    const instance = new CasperServiceByJsonRPC("https://rpc.testnet.casperlabs.io/rpc");

    const stateRootHash = await instance.getStateRootHash();
    return res.send(stateRootHash);
  } catch (err) {
    return res.status(500).send(err);
  }
});

app.get("/getCollection", async (req, res) => {
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

app.get("/getNftMetadata", async (req, res) => {
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

app.get("/getNamedKeys", async (req, res) => {
  const pubkey = req.query.pubkey;

  try {
    const instance = new CasperServiceByJsonRPC("https://rpc.testnet.casperlabs.io/rpc");

    const stateRootHash = await instance.getStateRootHash();

    const data = await getNamedKeys(client, stateRootHash, CLPublicKey.fromHex(pubkey));

    return res.send(data.namedKeys);
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
});

app.get("/getMarketplace", async (req, res) => {
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

app.post("/add_listing", async (req, res) => {
  const data = req.body;

  const listingInstance = new Listing({
    marketplace: data.marketplace,
    collection: data.collection,
    price: data.price,
    tokenId: data.tokenId,
    nftName: data.nftName,
    nftDescription: data.nftDescription,
    nftImage: data.nftImage,
    listingIndex: data.listingIndex,
  });

  listingInstance
    .save(listingInstance)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while creating the Tutorial.",
      });
    });
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
