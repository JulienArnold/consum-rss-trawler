/* This is an alternate version of the rss trawler that is designed to run in Jenkins

/*eslint-env node*/
var express = require('express');
const async = require('async');
const request = require('request');
var FeedParser = require('feedparser');
var fs = require('fs');
///var nodemailer = require('nodemailer');
var io;

function httpGet(url, callback) {
    const options = {
        url: url,
        json: true
    };
}
// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');
// create a new express server
var port = 6001; // Set a default port if one is not supplied
var host ='localhost';
var app = express();
server = require('http').Server(app);
// XXX(sam) specify a path, to not collide with user's socket.io. Not
// changing now, it will need coordination with FE javascript.
io = require('socket.io')(server);
// serve the files out of ./public as our main files
app.use(express.static(__dirname));
console.log(__dirname);
// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();
//container var just to store interesting info
var trawler = require('./trawl.js');

var feeds = fs.readFileSync("./feeds.txt").toString().split("\r\n");
var keywords = fs.readFileSync("./keywords.txt").toString().split("\r\n");
feeds.pop();
keywords.pop();
//console.log(feeds)
//console.log(keywords)

// start server on the specified port and binding host
server.listen(appEnv.port, '0.0.0.0', function() {
    // print a message when the server starts listening
    console.log("server starting on " + appEnv.url);
});

app.get('/', function(req, res) {
    trawler.trawl(feeds, keywords);
});

app.get('/results', function(req, res) {
  if (trawler.getLinkList().length > 0) {
      res.write("<!DOCTYPE html>\n <html>\n<body>\n");
      res.write("KEYWORDS: " + "\n<br>")
      for (var j = 0; j < keywords.length; j++)
          res.write(keywords[j] + "<br>")
      res.write("<br>")
      res.write("FEEDS: " + "<br>")
      for (var i = 0; i < feeds.length; i++)
          res.write(feeds[i] + "<br>")
      res.write("<br><br>")
      res.write("LINKS: " + "\n<br>")

      trawler.getLinkList().forEach(function(value){
        res.write("<a href=" + value + ">" + value + "</a>\n<br>\n");
      })
    } else {
        console.log("NO DATA TO SEND")
    }
  });
