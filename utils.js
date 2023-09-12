const getAccountHash = (pubkey) => {
  return Buffer.from(pubkey.toAccountHash()).toString("hex");
};

const getAccountInfo = async (client, stateRootHash, pubkey) => {
  const accountHash = getAccountHash(pubkey);
  const { Account: accountInfo } = await client.nodeClient.getBlockState(stateRootHash, `account-hash-${accountHash}`, []);

  return accountInfo;
};

const getNamedKeys = async (client, stateRootHash, pubkey) => {
  const accountInfo = await getAccountInfo(client, stateRootHash, pubkey);

  return accountInfo;
};

module.exports = { getNamedKeys };
