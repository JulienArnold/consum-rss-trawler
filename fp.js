var io;
//Required modules
var FeedParser = require('feedparser');
var request = require('request'); // for fetching the feed
var fs = require('fs');
var express = require('express');
var scheduler = require('node-schedule');
var MongoClient = require('mongodb').MongoClient;
var mongoose = require('mongoose');
// var Author = require('./author.js').Author;
// var Site = require('./site.js').Site;
// var Post = require('./post.js').Post;

//Express server
var app = express();
var server = require('http').Server(app);
var host = 'localhost';
//io to send data back/forth using socket

io = require('socket.io')(server);
var keywords = [];
var resultsDict = {}; // create an empty array
var feeds = [];
var resultsArray = [];
var processFile = true;
var authorArray = [];
var fileContents = [];
//9.140.98.116:3000


//Because this uses express, you have to tell it to use the public directory
//If that's where your files are
app.use(express.static(__dirname + '/public'));

server.listen(3000, '0.0.0.0', function() {
    console.log('Example app listening on port 3000!')
})

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/trends', function(req, res) {
    res.sendFile(__dirname + '/public/trends.html');
});

app.get('/nightly', function(req, res) {
    res.sendFile(__dirname + '/public/nightly.html');
});

//Try duplicating for feeds - will need to be done slightly different
//As manualFeeds is defined within io.on('connection')
app.get('/getkeywords', function(req, res) {
    console.log("getkey keywords: " + keywords);
    //len - 1 is for adding/removing latest item i.e. for manual
    var string = keywords[keywords.length - 1];
    console.log("string '" + string + "' chosen from keywords[]");
    res.writeHead(200, {
        "Content-Type": "text/plain"
    });
    res.end(string);
})

app.get('/getfeeds', function(req, res) {
    console.log("getfee feeds: " + fileContents);
    console.log("Processfile@ " + processFile);
    //len - 1 is for adding/removing latest item i.e. for manual
    var string = feeds[feeds.length - 1];
    console.log("string '" + string + "' chosen from feeds[]");
    res.writeHead(200, {
        "Content-Type": "text/plain"
    });
    res.end(string);
    console.log("string sent");
})

io.on('connection', function(socket) {
    console.log("Connection made");

    socket.on('feed', function(data) {
        console.log("SUCCESS");
        feeds.push(data.feedParams);
        console.log("Feeds: " + feeds);
    })
    socket.on('keyword', function(data) {
        console.log("SUCCESS");
        console.log(data.keywordParams);
        keywords.push(data.keywordParams);
        console.log("Keywords: " + keywords);
    })
    socket.on('begin', function() {
        if (feeds.length && keywords.length > 0) {
            console.log("doing everything else")
            processFeeds(feeds);
        } else {
            socket.emit('noFeedsOrKeywords');
        }
    })
    socket.on('removeKeyword', function() {
        console.log('removeKeyword:' + keywords);
        if (keywords.length > 0) {
            keywords.pop();
            console.log("After: " + keywords);
        }
    })
    socket.on('removeFeed', function() {
        console.log("Before: " + feeds);
        if (feeds.length > 0) {
            feeds.pop();
            console.log("After: " + feeds);
        }
    })
});

function getFileContents() {
    //Only put 1 .feed and .keyword file pair under public/data/ . Multiple files will just break this
    fileContents = [];
    // var filename = path.basename('./public/data/default.feed', '.feed');
    fileContents = fs.readFileSync("./public/data/default.feed").toString().split("\r\n");
    fileContents.pop();
    processFeeds(fileContents);
}

function removeDupes(arr) {
    var out = [];

    for (var i = 0, l = arr.length; i < l; i++) {
        var unique = true;
        for (var j = 0, k = out.length; j < k; j++) {
            if ((arr[i].postLink === out[j].postLink) && (arr[i].postTitle === out[j].postTitle)) {
                unique = false;
            }
        }
        if (unique) {
            out.push(arr[i]);
        }
    }
    return out;
}

function formatResults(resultsDictionary) {
    //After the dictionary comes in, we just want the value array of objects
    var value = resultsDictionary.value;
    value = removeDupes(value);
    var groupedResults = []; //Array to be sent?
    var groupLinks = []; //Array to be filled with

    for (let i = 0; i < value.length; i++) {
        resultsArray.push(value[i]);
    }
    if (processFile == true) {
        io.emit('clearAuto');
        io.emit('nightlyfeeds', fileContents);
    }
    //For every keyword,
    for (let i = 0; i < keywords.length; i++) {
        //This should write the headers
        if (processFile == true) {
            io.emit('formatAutoResults', keywords[i]);
        } else {
            io.emit('formatManualResults', keywords[i]);
        }
        //Check the entire array
        for (let j = 0; j < resultsArray.length; j++) {
            //If at position j the current keyword is detected,
            if (resultsArray[j]['postKeywords'].indexOf(keywords[i]) > -1) {
                if (processFile == true) {
                    io.emit('autoArray', resultsArray[j]);
                } else {
                    io.emit('manualArray', resultsArray[j]);
                }

            }
        }
    }
    //Automatic run is done; set to manual, empty keywords array
    processFile = false;
    //keywords = [];
    //By the end of this if statement we should have, after being called once for auto and once for manual input,
    //Two arrays. A manualHtml array which'll get passed into the manual results page
}

//FileContents/1st parameter is an array of feeds or URLs as strings
//inputType/2nd param is a string that can either be manual or auto
function processFeeds(feedList) {
    var feedparser = new FeedParser();
    var savedLinks = [];
    var numberOfFeeds = feedList.length;
    var detectedKeywords = [];
    //This differentiates whether to use manually input keywords, or a default set for auto
    if (processFile == true) {
        keywords = ['Java', 'node', 'Node.js', 'memory', 'crashes'];
    }

    for (var i = 0; i < feedList.length; i++) {
        let currentFeed = feedList[i];
        var req = request(currentFeed);

        req.on('error', function(error) {
            // handle any request errors
        });

        req.on('response', function(res) {
            //console.log('response')
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

        /* 4pm 23rd may - added this with the attempt to loop or iterate through multiple feeds*/
        feedparser.on('end', function() {
            numberOfFeeds--;
            io.emit('message', "number of feeds after decrement " + numberOfFeeds + "\n");

            //START LOGIC---
            for (let i = 0; i < savedLinks.length; i++) {
                var found = false;
                //For every saved link, look over the entire array of authors for a match
                //console.log("SEARCHING FOR AUTHOR: " + savedLinks[i]['postAuthor']);
                for (let j = 0; j < authorArray.length; j++) {
                    var siteFound = false;
                    //If at any point during iteration we find a match...
                    if (authorArray[j].name === savedLinks[i]['postAuthor']) {
                        //we have found an author
                        found = true;
                        //null/length check for this author's sites array
                        if (authorArray[j].sites.length > 0) {
                            //console.log("SITES IS NOT EMPTY FOR THIS AUTHOR");
                            //Sites array is not empty, so iterate over every site object for this author
                            for (let k = 0; k < authorArray[j].sites.length; k++) {
                                //if the current site object's url matches the current feed,
                                if (currentFeed.indexOf(authorArray[j].sites[k]['url']) > -1) {
                                    //console.log(currentFeed + " URL MATCH " + authorArray[j].sites[k]['url']);
                                    //url found, increment post count for site object k
                                    siteFound = true;
                                    authorArray[j].sites[k]['postCount']++;
                                }
                            } //Finish iterating sites object for author j
                            //Return to iterating over
                        } else {
                            //console.log("SITES IS EMPTY FOR THIS AUTHOR");
                            //sites is empty; add site data

                            var siteData = {
                                url: savedLinks[i]['postSource'],
                                postCount: 0
                            };
                            authorArray[j].sites.push(siteData);
                        }
                    }
                }
                if (!found) {
                    //console.log("AUTHOR NOT FOUND");
                    var tempAuthor = {
                        name: savedLinks[i]['postAuthor'],
                        sites: []
                    };
                    authorArray.push(tempAuthor);
                    console.log("ADDED AUTHOR: " + tempAuthor.name);
                }

            } //END LOGIC--

            if (numberOfFeeds === 0) {
                //let key = currentFeed.toString(); //String: URL of current feed
                //let value = savedLinks; //Array: Array: String URLs, String titles
                //resultsDict[key] = value;
                resultsDict = {
                    key: currentFeed.toString(), //String: URL of current feed
                    value: savedLinks //Array: Array: String URLs, String titles
                };
                console.log("FINAL FEED " + currentFeed.toString() + " & SAVED LINKS: " + savedLinks.length);


                io.emit('message', "FINAL FEED " + currentFeed.toString() + "\n" + " & SAVED LINKS: " + savedLinks.length + "\n");
                formatResults(resultsDict);
                //console.log("AUTHOR ARRAY: " + JSON.stringify(authorArray));
                io.emit('authorArray', authorArray);
            }
        });

        feedparser.on('data', function(chunk) {
            //Whenever we're looking at a new link, reset detectedKeywords to []
            detectedKeywords = [];
            //Store description of a given article, converting JSON to string
            var desc = JSON.stringify(chunk['description']);
            //for every keyword we have
            for (let i = 0; i < keywords.length; i++) {
                //If the keyword is detected in the description:
                if (desc.indexOf(keywords[i]) > -1) {
                    detectedKeywords.push(keywords[i]);
                }
            }

            if (detectedKeywords.length > 0) {
                savedLinks.push({
                    postLink: chunk['link'],
                    postTitle: chunk['title'],
                    postAuthor: chunk['author'],
                    postSource: currentFeed.toString(),
                    postKeywords: detectedKeywords
                });
                removeDupes(savedLinks);
            }
        });
    } //end of process loop
} //End of processFeeds(feedList)

//Run getFileContents() ONCE (on startup) just so we have a list of results
getFileContents();
//run getFileContents on a cron-like schedule of 9am
scheduler.scheduleJob('* * 9 * *', function() {
    processFile = true;
    getFileContents();
})
