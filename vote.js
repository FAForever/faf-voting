const request = require('request');
const fs = require('fs');
const express = require('express');
const { validationResult } = require('express-validator/check')
const { sanitizeBody } = require('express-validator/filter');
const expressValidator = require('express-validator');
const bodyParser = require('body-parser');
const session = require('express-session');

const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2');
const app = express();
const path = require('path');

const api = JSON.parse(fs.readFileSync('_private/api.json'));
const sessionData = JSON.parse(fs.readFileSync('_private/session.json'));
const client = JSON.parse(fs.readFileSync('_private/client.json'));
app.use(
	session(
		sessionData
		)
	);

app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(expressValidator());

app.use("/res", express.static(__dirname + '/public/res'));


passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

passport.use(
	new OAuth2Strategy({
		authorizationURL: api.URL+'/oauth/authorize',
		tokenURL: api.URL+'/oauth/token',
		clientID: client.id,
		clientSecret: client.secret,
		callbackURL: "http://rk.sytes.net:3001/auth"
	},
	function(accessToken, refreshToken, profile, done) {
		request.get(
			{
				url: api.URL+ '/me', 
				headers: {'Authorization': 'Bearer ' + accessToken}
			},
			function (e, r, body) {
				if (r.statusCode != 200) {
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
	function(req, res) {
		console.log('Successful authentication, redirect home.')
		res.redirect('/');
	}
 );
app.get('/',
	function (req, res, next) {
		if (req.isAuthenticated()){
			res.sendFile(path.join(__dirname, './public', 'vote.html'));
		}
		else{
			res.redirect("/login");
		}
	}
);

app.get('/authed/getSubjects',
	function (req, res){
		if (req.isAuthenticated()){
			const token = req.session.passport.user.data.attributes.token;
		
			request({
				url: api.URL+"/voting/votingSubjectsAbleToVote",
				method: 'GET',
				headers : {
					"Authorization" : "Bearer "+token
				}
			},
			function (e, r, returnBody){
				if (r.statusCode != 200) {
					console.log(returnBody);
					res.redirect("/login");
					return;
				}
				res.setHeader('Content-Type', 'application/json');
				res.send(returnBody);
			});
		}
		else{
			res.redirect("/login");
		}
	}
);

app.get('/authed/getQuestions',
	function (req, res){
		if (req.isAuthenticated()){
			const token = req.session.passport.user.data.attributes.token;
			const id = req.query.subjectId;
			if (id == undefined){
				return;
			}
			request({
				url: api.URL+"/data/votingQuestion?filter=votingSubject.id=="+id+"&include=votingChoices",
				method: 'GET',
				headers : {
					"Authorization" : "Bearer "+token
				}
			},
			function (e, r, returnBody){
				if (r.statusCode != 200) {
					console.log(returnBody);
					res.redirect("/login");
					return;
				}
				res.setHeader('Content-Type', 'application/json');
				res.send(returnBody);
			});
		}
		else{
			res.redirect("/login");
		}
	}
);

app.get('/authed/vote',
	function (req, res){
		if (req.isAuthenticated()){
			const vote = req.query.vote;
			if (vote == undefined){
				return;
			}
			const token = req.session.passport.user.data.attributes.token;
			const voteJSON = Buffer.from((vote), 'base64').toString();
			
			request({
				url: api.URL+"/voting/vote",
				method: 'POST',
				headers : {
					"Authorization" : "Bearer "+token,
					'Content-Type': 'application/json'
				},
				body: voteJSON
			},
			function (e, r, returnBody){
				console.log("Sent vote");
				if (r.statusCode != 200){
					console.log(returnBody);
					res.status(500).send(returnBody);
				}
				else{
					console.log("Everything OK");
					res.status(200).send('OK');
				}
			});
		}
		else{
			res.redirect("/login");
		}
	}
);

app.get('/login', function(req, res){
	res.redirect(api.URL+"/oauth/authorize?client_id="+client.id+"&response_type=code&redirect_uri=http%3A%2F%2Frk.sytes.net%3A3001%2Fauth");
});

app.listen(3001, function () {
  console.log('Listening on port 3001!');
  console.log('Go right there : ');
  console.log('http://rk.sytes.net:3001/login');
});

console.log("Script reached EOF\n======");