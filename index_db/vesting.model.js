module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      v_index: Number,
      v_token: String,
      v_contract: String,
      recipient: String,
      allocation: Number,
    },
    { timestamps: true }
  );

  schema.method("toJSON", function () {
    const { __v, _id, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  const Vesting = mongoose.model("vesting", schema);
  return Vesting;
};
