//jshint esversion:10
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const findOrCreate = require("mongoose-findorcreate");

// PASSPORT.JS
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// MONGOOSE-ENCRYPTION
// const encryption = require("mongoose-encryption");

// MD5
// const md5 = require("md5");

// BCRYPT
// const bcrypt = require("bcrypt");
// const saltRounds = 10;

const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(session(
{
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");

mongoose.connect("mongodb://localhost:27017/userDB",
{
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);

// Secure mongoose schema
const userSchema = new mongoose.Schema(
{
  username: String,
  password: String,
  googleId: String,
  secret: String
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
// userSchema.plugin(encryption, { secret: process.env.SECRET, encryptedFields: ["password"] });
const User = new mongoose.model("user", userSchema);

passport.use(User.createStrategy());
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
passport.use(new GoogleStrategy({
    // clientID: process.env.CLIENT_ID,
    // clientSecret: process.env.CLIENT_SECRET,
    clientID: process.env.NEW_CLIENT_ID,
    clientSecret: process.env.NEW_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    useProfileURL: "https://www.google.apis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

// Home page
app.route("/")

  .get(function(req, res)
  {
    res.render("home");
  });

app.route("/auth/google")

  .get(passport.authenticate("google", {scope: ["profile"]}));

app.route("/auth/google/secrets")

    .get(passport.authenticate("google", {failureRedirect: "/login"}),
      function(req, res)
    {
      // Successful authentication, redirect to secrets.
      res.redirect("/secrets");
    });

// Login page
app.route("/login")

  .get(function(req, res)
  {
    res.render("login");
  })

  .post(function(req, res)
  {
    // const username = req.body.username;
    // // const password = md5(req.body.password);
    // const password = req.body.password;
    //
    // User.findOne({email: username}, function(err, foundUser)
    // {
    //   if(err) { console.log(err); }
    //
    //   // else if(foundUser &&
    //   //   foundUser.password === password)
    //   // {
    //   //     console.log("User has been found!");
    //   //     res.render("secrets");
    //   // }
    //   else if(foundUser)
    //   {
    //     bcrypt.compare(password, foundUser.password, function(err, result)
    //     {
    //       if(result === true) { res.render("secrets"); }
    //     });
    //   }
    // });
    const user = new User(
    {
      username: req.body.username,
      password: req.body.password
    });
    req.login(user, function(err)
    {
      if(err) { console.log(err); }
      else
      {
        passport.authenticate("local")(req, res, function()
        {
          res.redirect("/secrets");
        });
      }
    });
  });

  app.route("/logout")

    .get(function(req, res)
    {
      req.logout();
      res.redirect("/");
    });

// Register page
app.route("/register")

  .get(function(req, res)
  {
    res.render("register");
  })

  .post(function(req, res)
  {
    // bcrypt.hash(req.body.password, saltRounds, function(err, hash)
    // {
    //   const newUser = new User(
    //   {
    //     email: req.body.username,
    //     // password: md5(req.body.password)
    //     password: hash
    //   });
    //   newUser.save(function(err)
    //   {
    //     if(err) { console.log(err); }
    //     else    { res.render("secrets"); }
    //   });
    // });
    User.register({username: req.body.username}, req.body.password, function(err, user)
    {
      if(err)
      {
        console.log(err);
        res.redirect("/register");
      }
      else
      {
        passport.authenticate("local")(req, res, function()
        {
          res.redirect("/secrets");
        });
      }
    });
  });

  app.route("/secrets")

    .get(function(req, res)
    {
      User.find({"secret": {$ne: null}}, function(err, foundUsers)
      {
        if(err) {console.log(err); }
        else if(foundUsers)
        {
          res.render("secrets", {usersWithSecrets: foundUsers});
        }
      });
    });

  app.route("/submit")

    .get(function(req, res)
    {
      if(req.isAuthenticated()) { res.render("submit"); }
      else { res.redirect("/login"); }
    })

    .post(function(req, res)
    {
      const submittedSecret = req.body.secret;
      User.findById(req.user.id, function(err, foundUser)
      {
        if(err) { console.log(err); }
        else if(foundUser)
        {
          foundUser.secret = submittedSecret;
          foundUser.save(function()
          {
            res.redirect("/secrets");
          });
        }
      });
    });

app.listen(3000, function()
{
  console.log("Server listening on port 3000...");
});
