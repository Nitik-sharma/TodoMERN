const express = require("express");
const mongoose = require("mongoose");
var validator = require("validator");
const bcrypt = require("bcrypt");
const session = require("express-session");
const mongoDBSession = require("connect-mongodb-session")(session);
require("dotenv").config();
var clc = require("cli-color");

// impoort modules--------------
const cleanUpAndValidate = require("./utils/authUtils");
const userModel = require("./models/userModel");
const isAuth = require("./middleware/isAuth");

// contests
const app = express();
const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;
const store = new mongoDBSession({
  uri: process.env.MONGO_URI,
  collection: "sessions",
});

// midlewear
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

// set ejs
app.set("view engine", "ejs");

// mongoconnect

mongoose
  .connect(MONGO_URI)
  .then(() =>
    console.log(clc.greenBright.bgBlue("mongoDB connect sucessfully"))
  )
  .catch((error) => console.log(clc.redBright(error)));

app.get("/", (req, res) => {
  res.send("Server is starting");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", async (req, res) => {
  const { name, email, username, password } = req.body;
  // data validation
  try {
    await cleanUpAndValidate({ name, email, username, password });
    console.log("data cleanup");
  } catch (error) {
    return res.send({
      status: 400,
      message: "Data validation failed",
      error: error,
    });
  }

  // email and username is uniqe
  const userEmailExit = await userModel.findOne({ email: email });
  console.log("userEmail->", userEmailExit);

  if (userEmailExit) {
    return res.send({
      status: 400,
      message: "Email already exist",
    });
  }

  const usernameExist = await userModel.findOne({ username: username });

  if (usernameExist) {
    return res.send({
      status: 400,
      message: "Username is already exist",
    });
  }

  const hashPassword = await bcrypt.hash(password, parseInt(process.env.Salt));
  console.log("HashPassword", password, hashPassword);
  // store data in DB

  const userObj = new userModel({
    name: name,
    email: email,
    password: hashPassword,
    username: username,
  });

  try {
    const userDB = await userObj.save();

    return res.redirect("/login");
  } catch (error) {
    return res.send({
      status: 500,
      message: "Data base error",
      error: error,
    });
  }
});

// login get api

app.get("/login", (req, res) => {
  res.render("login");
});

// login post api
app.post("/login", async (req, res) => {
  console.log(req.body);
  const { loginId, password } = req.body;

  // find username and email for login
  try {
    var usernameOrEmail;

    if (validator.isEmail(loginId)) {
      // Is an email, perform email lookup
      usernameOrEmail = await userModel.findOne({ email: loginId });
      if (!usernameOrEmail) {
        return res.send({
          status: 400,
          message: "Email is not found",
        });
      }
    } else {
      // Not an email, perform username lookup
      usernameOrEmail = await userModel.findOne({ username: loginId });
      if (!usernameOrEmail) {
        return res.send({
          status: 400,
          message: "Username not found",
        });
      }
    }

    // check password
    console.log(usernameOrEmail.password, password);

    const isMatched = await bcrypt.compare(password, usernameOrEmail.password);

    if (!isMatched) {
      return res.send({
        status: 400,
        message: "Password is incorrect",
      });
    }

    // session base auth

    console.log(req.session);

    req.session.isAuth = true;
    req.session.user = {
      email: usernameOrEmail.email,
      username: usernameOrEmail.username,
      userId: usernameOrEmail._id.toString(),
    };

    return res.redirect("/dashboard");
  } catch (error) {
    return res.send({
      status: 500,
      message: "Data base error",
      error: error,
    });
  }
});

// logout api
app.post("/logout", isAuth, (req, res) => {
  console.log(req.session.id);
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
      return res.send({
        status: 500,
        message: "Logout unseccessfull",
      });
    } else {
      return res.redirect("/login");
    }
  });
});

// deshboard api

app.get("/dashboard", isAuth, (req, res) => {
  return res.render("dashboard");
});

app.listen(PORT, () => {
  console.log(
    clc.yellowBright(`Sever is running on : http://localhost:${PORT}`)
  );
});
