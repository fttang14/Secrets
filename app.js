//jshint esversion:10
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const encryption = require("mongoose-encryption");

const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));

app.set("view engine", "ejs");

mongoose.connect("mongodb://localhost:27017/userDB",
{
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Secure mongoose schema
const userSchema = new mongoose.Schema(
{
  email: String,
  password: String
});
userSchema.plugin(encryption, { secret: process.env.SECRET, encryptedFields: ["password"] });
const User = new mongoose.model("user", userSchema);

// Home page
app.get("/", function(req, res)
{
  res.render("home");
});

// Login page
app.route("/login")

  .get(function(req, res)
  {
    res.render("login");
  })

  .post(function(req, res)
  {
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({email: username}, function(err, foundUser)
    {
      if(err) { console.log(err); }

      else if(foundUser &&
        foundUser.password === password)
        {
          console.log("User has been found!");
          res.render("secrets");
        }
    });
  });

// Register page
app.route("/register")

  .get(function(req, res)
  {
    res.render("register");
  })

  .post(function(req, res)
  {
    const newUser = new User(
    {
      email: req.body.username,
      password: req.body.password
    });
    newUser.save(function(err)
    {
      if(err) { console.log(err); }
      else    { res.render("secrets"); }
    });
  });

app.listen(3000, function()
{
  console.log("Server listening on port 3000...");
});
