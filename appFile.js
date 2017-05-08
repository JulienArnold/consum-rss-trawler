/* This is an alternate version of the rss trawler that is designed to run in Jenkins

/*eslint-env node*/
var express = require('express');
const async = require('async');
const request = require('request');
var FeedParser = require('feedparser');
var fs = require('fs');
var glob = require('glob').Glob;
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
var host = 'localhost';
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
//call local scripts
var trawler = require('./trawl.js');
//var loader = require('./loadFiles.js')

var feeds = [];
var keywords = [];

//console.log(feeds)
//console.log(keywords)

// start server on the specified port and binding host
server.listen(appEnv.port, '0.0.0.0', function() {
    // print a message when the server starts listening
    console.log("server starting on " + appEnv.url);
});

//Page for manual running
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', function(socket) {
    console.log("Connection made");

    socket.on('feed', function(data) {
        console.log("SUCCESS");
        console.log(data.feedParams);
        feeds.push(data.feedParams);
    })
    socket.on('keyword', function(data) {
        console.log("SUCCESS");
        console.log(data.keywordParams);
        keywords.push(data.keywordParams);
    })
    socket.on('begin', function() {
        sanityStart(feeds, keywords)
    })
});

//Page for automated running
app.get('/auto', function(req, res) {
    loadFiles();

    app.get('/autoResults', function(req, res) {
        if (trawler.trawl.length > 0) {
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

            trawler.trawl.forEach(function(value) {
                res.write("<a href=" + value + ">" + value + "</a>\n<br>\n");
            })
        } else {
            console.log("NO DATA TO SEND")
        }
    });
});

//we want to do this for each file we read through
//so pageName =
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

        trawler.getLinkList().forEach(function(value) {
            res.write("<a href=" + value + ">" + value + "</a>\n<br>\n");
        })
    } else {
        console.log("NO DATA TO SEND")
    }
});

function loadFiles() {
    glob("./public/data/*", function(er, files) {
        console.log("files " + files)
        files.forEach(function(file) {
          if(file.indexOf('.feed') > -1) {
              console.log("file " + file)
              feeds = fs.readFileSync(file).toString().split("\r\n");
              console.log("FEEDS")
              console.log(feeds)
              feeds.slice(-1);
              console.log("CLEARED FEEDS")
              console.log(feeds);

          } else if(file.indexOf('.keywords') > -1) {
            console.log("file " + file)
            keywords = fs.readFileSync(file).toString().split("\r\n");
            console.log("KEYWORDS")
            console.log(keywords)
            keywords.slice(-1);
            console.log("CLEARED KEYWORDS")
            console.log(keywords);
          }
          sanityStart(feeds, keywords);
        })
    })
}

function sanityStart(feeds, keywords) {
    console.log("SANITY!")
    if (feeds.length && keywords.length > 0) {
        console.log("entering trawl()")
        trawler.trawl(feeds, keywords);
    } else {
        console.log("You must specify at least 1 feed and 1 keyword.");
        return;
    }
}
