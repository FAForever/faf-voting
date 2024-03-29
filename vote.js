// Simulate config options from your production environment by
// customising the .env file in your project's root folder.
require('dotenv').config();

const request = require('request');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');

const passport = require('passport');
const OidcStrategy = require('passport-openidconnect');
const app = express();
const path = require('path');

const API_URL = process.env.API_URL,
  OAUTH_URL = process.env.OAUTH_URL;

const CLIENT_ID = process.env.CLIENT_ID,
  CLIENT_SECRET = process.env.CLIENT_SECRET,
  CALLBACK_URL = process.env.CALLBACK_URL || "https://voting.faforever.com/auth";

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        "maxAge": 3600000 * 12 //an api token is valid for 12h
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({extended: false}));

app.use("/res", express.static(__dirname + '/public/res'));


passport.serializeUser(function (user, done) {
  done(null, JSON.stringify(user));
});

passport.deserializeUser(function (user, done) {
  done(null, JSON.parse(user));
});

passport.use(
    'faforever',
  new OidcStrategy({
      issuer: OAUTH_URL + '/',
      tokenURL: OAUTH_URL + '/oauth2/token',
      authorizationURL: OAUTH_URL + '/oauth2/auth',
      userInfoURL: OAUTH_URL + '/userinfo?schema=openid',
      clientID: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      callbackURL: CALLBACK_URL,
      scope: ['openid', 'public_profile', 'vote']
    },
    function (iss, sub, profile, jwtClaims, accessToken, refreshToken, params, verified) {
      request.get(
        {
          url: API_URL + '/me',
          headers: {'Authorization': 'Bearer ' + accessToken}
        },
        function (e, r, body) {
          if (r.statusCode !== 200) {
            console.log("Auth failure: " + r.statusCode);
            return verified(null);
          }
          let user = JSON.parse(body);
          user.data.attributes.token = accessToken;
          return verified(null, user);
        }
      );
    })
);

app.get(['/auth', '/login'],
  passport.authenticate('faforever'),
  function (req, res) {
      console.log('Successful authentication, redirect home.');
      res.redirect('/vote');
  }
);

app.get('/',
    function (req, res, next) {
        res.redirect("/overview");
    }
);

app.get('/overview',
    function (req, res, next) {
        res.sendFile(path.join(__dirname, './public', 'overview.html'));
    });

app.get('/vote',
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
        request({
                url: API_URL + "/data/votingSubject?include=votingQuestions,votingQuestions.votingChoices,votingQuestions.winners",
                method: 'GET',
            },
            function (e, r, returnBody) {
                if (e !== null) {
                    console.log(e);
                    return;
                }
                if (r.statusCode !== 200) {
                    console.log(returnBody);
                    return;
                }
                res.setHeader('Content-Type', 'application/json');
                res.send(returnBody);
            });
    }
);

app.get('/authed/getSubjectsAbleToVote',
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
                    if (e !== null) {
                        console.log(e);
                        return;
                    }
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

app.listen(3000, function () {
  console.log('Listening on port 3000');
});
