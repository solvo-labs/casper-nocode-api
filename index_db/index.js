const dbConfig = require("../config/db.config.js");

const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const db = {};
db.mongoose = mongoose;
db.url = dbConfig.url;
db.listings = require("./listing.model.js")(mongoose);
db.vestings = require("./vesting.model.js")(mongoose);

module.exports = db;
