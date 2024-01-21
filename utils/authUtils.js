var validator = require("validator");
const cleanUpAndValidate = ({ name, email, username, password }) => {
  return new Promise((resolve, reject) => {
    console.log(name, email, username, password);
    if (!name || !email || !username || !password) {
      reject("Missing credentials");
    }

    if (typeof name !== "string") reject("Datatype of name is wrong");
    if (typeof email !== "string") reject("Datatype of email is wrong");
    if (typeof password !== "string") reject("Datatype of password is wrong");
    if (typeof username !== "string") reject("Datatype of username is wrong");

    if (username.length <= 2 || username.length > 30)
      reject("Username's length  should be between 2 t0 30 ");

    if (password.length <= 2 || password.length > 30)
      reject("Password's length  should be between 2 to 30 ");

    if (!validator.isEmail(email)) reject("Format of email is wrong");

    resolve();
  });
};

module.exports = cleanUpAndValidate;
