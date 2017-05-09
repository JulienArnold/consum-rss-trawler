/* This is an alternate version of the rss trawler that is designed to run in Jenkins

/*eslint-env node*/
var express = require('express');
const async = require('async');
const request = require('request');
var FeedParser = require('feedparser');
var fs = require('fs');
var glob = require('glob').Glob;
var path = require('path');
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

var dataSetName = "null"


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


//RESULTS PAGE ORIGINAL
/**
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
}); **/

  var feedFiles = [];
  var keywordFiles = [];


function loadFiles() {
    var savedLinks = [];

    //GET ALL .FEEDS
    glob("./public/data/*.feed", function(er, files) {
      console.log("files: " + files)
      //feedFiles.push(files);
      glob("./public/data/*.keywords", function(er, keys) {
        console.log("keys: " + keys)
        //keywordFiles.push(keys);
        processAllFiles(files, keys);
      });

    });


    // console.log(feedFiles)
    // console.log(keywordFiles)
//processAllFiles(feedFiles, keywordFiles);
}

function processAllFiles(feedFileList, keywordFileList) {
//console.log("process all files entering loop")
//for every file pair in the list
  for (var i = 0; i < feedFileList.length; i++) {
    //ASSIGN FEEDS/KEYWORDS THE CONTENTS OF A FILE POSITION 'I'
      feeds = fs.readFileSync(feedFileList[i]).toString().split("\r\n");
      //POP - CLEAN LAST ELEMENT SO NO ERRORS
      feeds.pop();
      keywords = fs.readFileSync(keywordFileList[i]).toString().split("\r\n");
      //POP - CLEAN LAST ELEMENT SO NO ERRORS
      keywords.pop();

      //console.log("FEEDS::" + feeds)
      //console.log("KEYWORDS::" + keywords)
      //sanityStart(feeds, keywords); //this will fill up linkList
      //Initialise parameters for dynamically generating express pages
      trawler.trawl(feeds, keywords,function(err,linkedlist){
        console.log("TOBES !" + linkedList)
        dataSetName = path.basename(feedFileList[i], '.feed');
        console.log(trawler.linkList)
        console.log(dataSetName)
        postAllResults(dataSetName, linkedList);
      });

  }
}

function postAllResults(dataSetName, savedLinks) {
    //console.log("savedLinks:: " + savedLinks)
    //console.log("go to /" + dataSetName)
    app.get('/' + dataSetName, function(req, res, next) {
        for (var i = 0; i < savedLinks.length; i++) {
            res.write("<a href>\n" + savedLinks[i] + "</href>\n");
        }
        res.send();
    })
}

//app.get('/swift')



function sanityStart(feeds, keywords) {
    //console.log("SANITY")
    if (feeds.length && keywords.length > 0) {
        console.log("entering trawl()")
        trawler.trawl(feeds, keywords);
    } else {
        console.log("You must specify at least 1 feed and 1 keyword.");
        //return;
    }
    return;
}

console.log("####### start")
loadFiles();
//processAllFiles(feedFiles, keywordFiles);
console.log("####### end")
