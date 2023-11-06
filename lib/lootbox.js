const WizData = require("@script-wiz/wiz-data");
const hex2a = (hexx) => {
  const hex = hexx.toString(); //force conversion
  let str = "";
  for (var i = 0; i < hex.length; i += 2) str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  return str;
};

const fetchLootboxItem = async (stateRootHash, index, dt) => {
  const urefMap = dt.Contract.namedKeys.find((nm) => nm.name === "items");
  const uref = urefMap.key;

  const body = {
    jsonrpc: "2.0",
    id: "0",
    method: "state_get_dictionary_item",
    params: {
      state_root_hash: stateRootHash,
      dictionary_identifier: {
        URef: {
          seed_uref: uref,
          dictionary_item_key: index.toString(),
        },
      },
    },
  };

  const res = await fetch("https://node-clarity-testnet.make.services/rpc", {
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    method: "POST",
  });

  const data = await res.json();
  const nonparsedData = data.result.stored_value.CLValue.bytes;

  const id = nonparsedData.slice(0, 16);

  const rarity = nonparsedData.slice(16, 32);
  const tokenId = nonparsedData.slice(32, 48);
  const name = nonparsedData.slice(48);

  const idLe = WizData.hexLE(id);

  const idValue = parseInt(idLe, 16);

  const rarityLe = WizData.hexLE(rarity);

  const rarityValue = parseInt(rarityLe, 16);

  const tokenIdLe = WizData.hexLE(tokenId);

  const tokenIdValue = parseInt(tokenIdLe, 16);

  const nameText = hex2a(name);

  return { idValue, rarityValue, tokenIdValue, nameText };
};

const fetchLootboxItems = async (stateRootHash, contract, dt) => {
  const indexCount = await contract.queryContractData(["deposited_item_count"]);
  const currentIndex = indexCount.toNumber();

  try {
    let promises = [];
    for (let index = 0; index < currentIndex; index++) {
      promises.push(fetchLootboxItem(stateRootHash, index, dt));
    }

    // const result = await Promise.all(promises);

    const result1 = await promises[0];
    const result2 = await promises[1];

    console.log(result1);
    console.log(result2);
  } catch (err) {
    console.log(err);
  }
};

module.exports = { fetchLootboxItem, fetchLootboxItems };
