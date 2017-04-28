/* This is an alternate version of the rss trawler that is designed to run in Jenkins

/*eslint-env node*/
var express = require('express');
const async = require('async');
const request = require('request');
var FeedParser = require('feedparser');
var fs = require('fs');
var nodemailer = require('nodemailer');
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
var brick = [];
var feeds = ['https://stackoverflow.com/feeds/tag?tagnames=java&sort=newest',
'https://stackoverflow.com/feeds/tag?tagnames=node.js&sort=newest',
'https://groups.google.com/forum/feed/nodejs/topics/rss.xml',
'http://rss.slashdot.org/Slashdot/slashdotDevelopers'];
var keywords = ['Java', 'Swift', 'node', 'Node.js', 'memory', 'crashes'];

var feedIter = 0;
var brickIter = 0;

// start server on the specified port and binding host
server.listen(appEnv.port, '0.0.0.0', function() {
    // print a message when the server starts listening
    console.log("server starting on " + appEnv.url);
});

app.get('/', function(req, res) {
    trawl();
});

function trawl() {
    var req = request(feeds[feedIter]);
    var feedparser = FeedParser();

    req.on('response', function(res) {
        var stream = this; // `this` is `req`, which is a stream

        if (res.statusCode !== 200) {
            this.emit('error', new Error('Bad status code'));
        } else {
            stream.pipe(feedparser);
        }
    });

    feedparser.on('error', function(error) {
        // always handle errors
    });

    //When you GET data FROM A GIVEN FEED::::
    feedparser.on('data', function(chunk) {
        //Store description of a given article, converting JSON to string
        //console.log("CURRENT FEED " + feeds[feedIter]);
        var desc = JSON.stringify(chunk['description']);

        //For every keyword we want to look for in A single given article: ((var i))
        for (var i = 0; i < keywords.length; i++) {
            //console.log("loop")
            //Initialise var n, storing the value of whether/where the keyword is
            var n = desc.indexOf(keywords[i])
            if (n > -1) {
                //The keyword is detected, we assign the current point in brick the link from the given text
                console.log("KEYWORD " + keywords[i] + ": DETECTED" + "\n\n");
                brick[brickIter] = chunk['link'];
                brickIter++;
                console.log("SAVED LINK " + brickIter + ": " + brick[brickIter - 1]);

            }
        }

    });

    feedparser.on('end', function() {
        console.log("END")
        if (feedIter < (feeds.length - 1)) {
            brickIter = 0;
            feedIter++;
            console.log("next feed:: " + feedIter + " " + feeds[feedIter]);
            trawl();
        } else {
            console.log("No more feeds left");
            brick = removeDuplicates(brick);
            console.log("Duplicates removed");
            console.log("Go to /results");
        }
    });



app.get('/results', function(req, res) {

    if (brick.length > 0) {
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
        for (var k = 0; k < brick.length; k++)
            res.write("<a href=" + brick[k] + ">" + brick[k] + "</a>\n<br>\n");
        res.write("</body>\n</html>");
        res.end();
        console.log("DATA SENT TO WEBPAGE")
    } else {
        console.log("NO DATA TO SEND")
    }
  });

  } //End of trawl


//Self explanatory
function removeDuplicates(arr) {
    var i,
        len = arr.length,
        out = [],
        obj = {};

    for (i = 0; i < len; i++) {
        obj[arr[i]] = 0;
    }
    for (i in obj) {
        out.push(i);
    }
    return out;
}
