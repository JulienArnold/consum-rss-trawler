/*eslint-env node*/
var express = require('express');
const async = require('async');
var fs = require('fs');
var trawler = require('./trawl.js');
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
var feeds = [];
var keywords = [];


// start server on the specified port and binding host
server.listen(appEnv.port, '0.0.0.0', function() {
    // print a message when the server starts listening
    console.log("server starting on " + appEnv.url);
});

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', function(socket) {
  console.log("Connection made");

  socket.on('feed', function (data) {
    console.log("SUCCESS");
    console.log(data.feedParams);
    feeds.push(data.feedParams);
  })
  socket.on('keyword', function (data) {
    console.log("SUCCESS");
    console.log(data.keywordParams);
    keywords.push(data.keywordParams);
  })
  socket.on('begin', function() {
    sanityStart(feeds, keywords)
  })
});

function sanityStart(feeds, keywords) {
    console.log("SANITY!")
    if (feeds.length && keywords.length > 0) {
      console.log("entering foobar()")
      trawler.trawl(feeds, keywords);
    } else {
      console.log("You must specify at least 1 feed and 1 keyword.");
    }
}

/**
function sanitise(data) {
if(data == 'valid format') {
  return true;
} else {
  'sanitise and'
  return false;}
}**/

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


        res.write("</body>\n</html>");
        res.end();
        console.log("DATA SENT TO WEBPAGE")
    } else {
        console.log("NO DATA TO SEND")
    }
});
