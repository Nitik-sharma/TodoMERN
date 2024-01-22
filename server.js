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
const todoModule = require("./models/todoModule");

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

app.use(express.static("public"));

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

// logout from all device

app.post("/logout_from_all_devices", isAuth, async (req, res) => {
  const username = req.session.user.username;
  // schema
  const sessionSchema = new mongoose.Schema({ _id: String }, { strict: false });

  const sessionModel = mongoose.model("session", sessionSchema);

  // delete schema from all device queriy

  try {
    const deleteDb = await sessionModel.deleteMany({
      "session.user.username": username,
    });
    return res.send({
      status: 200,
      message: "Logout from all device sucessfully !!!!!!",
      data: deleteDb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database error",
      error: error,
    });
  }
});

//todo apis

// create api  ---->

app.post("/create-todo", isAuth, async (req, res) => {
  const todoText = req.body.todo;
  const username = req.session.user.username;

  if (!todoText) {
    return res.send({
      status: 400,
      message: "Todo is empty",
    });
  } else if (typeof todoText !== "string") {
    return res.send({
      status: 400,
      message: "Todo format is not correct",
    });
  } else if (todoText.length < 3 || todoText.length >= 100) {
    return res.send({
      status: 400,
      message: "Todo size shloud be 3-100",
    });
  }
  const todoObj = new todoModule({
    todo: todoText,
    username: username,
  });
  console.log("todoText=", todoText, "username=", username);
  try {
    const todoDB = await todoObj.save();
    return res.send({
      status: 201,
      message: "Todo add sucessfully",
      data: todoDB,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "database error",
      error: error,
    });
  }
});

// Edit todo api----------------->
app.post("/edit-todo", isAuth, async (req, res) => {
  const { id, newTodo } = req.body;
  const username = req.session.user.username;
  console.log("username", username);
  if (!newTodo) {
    return res.send({
      status: 400,
      message: "Missing creditional",
    });
  }
  try {
    const userID = await todoModule.findOne({ _id: id });

    // check user is same or different
    if (!userID) {
      return res.send({
        status: 400,
        message: "Todo is not available",
      });
    }

    if (username !== userID.username) {
      return res.send({
        status: 401,
        message: "You can't able  edit this todo ",
      });
    }

    const prevTodo = await todoModule.findOneAndUpdate(
      { _id: id },
      { todo: newTodo }
    );
    console.log(prevTodo);
    return res.send({
      status: 200,
      message: "Todo update sucessfully",
      data: prevTodo,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Data base error",
      error: error,
    });
  }
});

// delete todo api

app.post("/delete-todo", isAuth, async (req, res) => {
  const id = req.body.id;
  const username = req.session.user.username;
  console.log(id, username);
  if (!id) {
    return res.send({
      status: 403,
      message: "missing criditional",
    });
  }
  try {
    const userId = await todoModule.findOne({ _id: id });
    console.log(userId);

    if (!userId) {
      return res.send({
        status: 400,
        message: "Todo is not available",
      });
    }

    if (username !== userId.username) {
      return res.send({
        status: 403,
        message: "You can't delete todo",
      });
    }

    const prevTodo = await todoModule.findOneAndDelete({ _id: id });
    res.send({
      status: 500,
      message: "Deltetion of todo is sucessfull",
      data: prevTodo,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "database error",
      error: error,
    });
  }
});

// todo read api
app.get("/read-todo", isAuth, async (req, res) => {
  const username = req.session.user.username;
  console.log(username);
  try {
    const userDB = await todoModule.find({ username });
    return res.send({
      status: 200,
      message: "Read complete",
      data: userDB,
    });
  } catch (error) {
    res.send({
      status: 500,
      message: "Database error",
      error: error,
    });
  }
  res.send("all okk");
});
// deshboard api

app.get("/dashboard", isAuth, async (req, res) => {
  return res.render("dashboard");
});

app.listen(PORT, () => {
  console.log(
    clc.yellowBright(`Sever is running on : http://localhost:${PORT}`)
  );
});
