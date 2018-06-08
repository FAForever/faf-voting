const request = require('request');
const fs = require('fs');
const express = require('express');
const {validationResult} = require('express-validator/check')
const {sanitizeBody} = require('express-validator/filter');
const expressValidator = require('express-validator');
const bodyParser = require('body-parser');
const session = require('express-session');

const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2');
const app = express();
const path = require('path');

const API_URL = process.env.API_URL;

const CLIENT_ID = process.env.CLIENT_ID,
  CLIENT_SECRET = process.env.CLIENT_SECRET,
  CALLBACK_URL = process.env.CALLBACK_URL || "https://voting.faforever.com/auth";

app.use(session({
    "secret": process.env.SESSION_SECRET,
    "resave": true,
    "saveUninitialized": true
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({extended: false}));
app.use(expressValidator());

app.use("/res", express.static(__dirname + '/public/res'));


passport.serializeUser(function (user, done) {
  done(null, JSON.stringify(user));
});

passport.deserializeUser(function (user, done) {
  done(null, JSON.parse(user));
});

passport.use(
  new OAuth2Strategy({
      authorizationURL: API_URL + '/oauth/authorize',
      tokenURL: API_URL + '/oauth/token',
      clientID: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      callbackURL: CALLBACK_URL
    },
    function (accessToken, refreshToken, profile, done) {
      request.get(
        {
          url: API_URL + '/me',
          headers: {'Authorization': 'Bearer ' + accessToken}
        },
        function (e, r, body) {
          if (r.statusCode !== 200) {
            console.log("Auth failure: " + r.statusCode);
            return done(null);
          }
          let user = JSON.parse(body);
          user.data.attributes.token = accessToken;
          return done(null, user);
        }
      );
    })
);

app.get('/auth',
  passport.authenticate('oauth2'),
  function (req, res) {
    console.log('Successful authentication, redirect home.')
    res.redirect('/');
  }
);
app.get('/',
  function (req, res, next) {
    if (req.isAuthenticated()) {
      res.sendFile(path.join(__dirname, './public', 'vote.html'));
    } else {
      res.redirect("/login");
    }
  }
);

app.get('/authed/getSubjects',
  function (req, res) {
    if (req.isAuthenticated()) {
      const token = req.user.data.attributes.token;

      request({
          url: API_URL + "/voting/votingSubjectsAbleToVote",
          method: 'GET',
          headers: {
            "Authorization": "Bearer " + token
          }
        },
        function (e, r, returnBody) {
          if (r.statusCode !== 200) {
            console.log(returnBody);
            res.redirect("/login");
            return;
          }
          res.setHeader('Content-Type', 'application/json');
          res.send(returnBody);
        });
    } else {
      res.redirect("/login");
    }
  }
);

app.get('/authed/getQuestions',
  function (req, res) {
    if (req.isAuthenticated()) {
      const token = req.user.data.attributes.token;
      const id = req.query.subjectId;
      if (id === undefined) {
        return;
      }
      request({
          url: API_URL + "/data/votingQuestion?filter=votingSubject.id==" + id + "&include=votingChoices",
          method: 'GET',
          headers: {
            "Authorization": "Bearer " + token
          }
        },
        function (e, r, returnBody) {
          if (r.statusCode !== 200) {
            console.log(returnBody);
            res.redirect("/login");
            return;
          }
          res.setHeader('Content-Type', 'application/json');
          res.send(returnBody);
        });
    } else {
      res.redirect("/login");
    }
  }
);

app.get('/authed/vote',
  function (req, res) {
    if (req.isAuthenticated()) {
      const vote = req.query.vote;
      if (vote === undefined) {
        return;
      }
      const token = req.user.data.attributes.token;
      const voteJSON = Buffer.from((vote), 'base64').toString();

      request({
          url: API_URL + "/voting/vote",
          method: 'POST',
          headers: {
            "Authorization": "Bearer " + token,
            'Content-Type': 'application/json'
          },
          body: voteJSON
        },
        function (e, r, returnBody) {
          if (r.statusCode !== 200) {
            console.log(returnBody);
            res.status(500).send(returnBody);
          } else {
            console.log("Everything OK");
            res.status(200).send('OK');
          }
        });
    } else {
      res.redirect("/login");
    }
  }
);

app.get('/login', function (req, res) {
  res.redirect(API_URL + "/oauth/authorize?client_id=" + CLIENT_ID + "&response_type=code&redirect_uri=" + encodeURIComponent(CALLBACK_URL));
});

app.listen(3000, function () {
  console.log('Listening on port 3000');
});
