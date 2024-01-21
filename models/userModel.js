const mongoose = require("mongoose");

const schema = mongoose.Schema;

const userModel = new schema({
  name: {
    type: String,
  },
  email: {
    type: String,
    require: true,
    unique: true,
  },
  username: {
    type: String,
    require: true,
    unique: true,
  },
  password: {
    type: String,
    require: true,
    unique: true,
  },
});

module.exports = mongoose.model("user", userModel);
