module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      marketplace: String,
      collection_hash: String,
      price: Number,
      tokenId: Number,
      nftName: String,
      nftDescription: String,
      nftImage: String,
      listingIndex: Number,
      active: Boolean,
    },
    { timestamps: true }
  );

  schema.method("toJSON", function () {
    const { __v, _id, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  const Listing = mongoose.model("listing", schema);
  return Listing;
};
