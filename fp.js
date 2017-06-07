var io;
//Required modules
var FeedParser = require('feedparser');
var request = require('request'); // for fetching the feed
var fs = require('fs');
var express = require('express');
var scheduler = require('node-schedule');
//Express server
var app = express()
var server = require('http').Server(app);
var host = 'localhost';
//io to send data back/forth using socket

io = require('socket.io')(server);
var keywords = ['Java', 'node', 'Node.js', 'memory', 'crashes'];
var resultsDict = {}; // create an empty array
var autoHtmlArray = [];
var manualHtmlArray = [];
var manualFeeds = [];
var manualKeywords = [];
//Because this uses express, you have to tell it to use the public directory
//If that's where your files are
app.use(express.static(__dirname + '/public'));

server.listen(3000, '0.0.0.0', function() {
    console.log('Example app listening on port 3000!')
})

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/results/auto', function(req, res) {
  console.log(autoHtmlArray);
  console.log(autoHtmlArray.length);
  //For every keyword in keywords, write the keyword as a h1/h2 to the page
  //For the length of autoHtmlArray,
  //If indexOf autoHtmlArray[i] contains the keyword, write it under this keyword h1
  for(let i = 0; i < keywords.length; i++) {
    res.write("<h2>" + keywords[i] + ":</h2><br>")
    for(let j = 0; j < autoHtmlArray.length; j++) {
      if(autoHtmlArray[j].indexOf(keywords[i]) > -1) {
        res.write(autoHtmlArray[j] + "<br>");
      }
    }
  }

/**    if (autoHtmlArray.length > 0) {
        for (let i = 0; i < autoHtmlArray.length; i++) {
            res.write(autoHtmlArray[i]);
        }
        res.send();
    } else {
        res.write("No results found!");
        res.send();
    } **/
    res.send();
})

app.get('/results/manual', function(req, res) {
    if (manualHtmlArray.length > 0) {
        for (let i = 0; i < manualHtmlArray.length; i++) {
            res.write(manualHtmlArray[i]);
        }
        res.send();
    } else {
        res.write("No results found!");
        res.send();
    }
    io.send("array",manualHtmlArray)
  })

//Try duplicating for feeds - will need to be done slightly different
//As manualFeeds is defined within io.on('connection')
app.get('/getkeywords', function(req, res) {
    console.log("request received")
    var string = manualKeywords[manualKeywords.length - 1];
    console.log("string '" + string + "' chosen");
    res.writeHead(200, {
        "Content-Type": "text/plain"
    });
    res.end(string);
    console.log("string sent");
})

app.get('/getfeeds', function(req, res) {
    console.log("request received")
    var string = manualFeeds[manualFeeds.length - 1];
    console.log("string '" + string + "' chosen");
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
        console.log(data.feedParams);
        manualFeeds.push(data.feedParams);
    })
    socket.on('keyword', function(data) {
        console.log("SUCCESS");
        console.log(data.keywordParams);
        manualKeywords.push(data.keywordParams);
        console.log("Keywords: " + manualKeywords);
    })
    socket.on('begin', function() {
        console.log("doing everything else")
        if(manualFeeds.length && manualKeywords.length > 0) {
          doEverythingElse(manualFeeds, 'manual');
        }
    })
    socket.on('removeKeyword', function() {
      if(manualKeywords.length > 0) {
        manualKeywords.pop();
      }
    })

    socket.on('removeFeed', function() {
      if(manualFeeds.length > 0) {
        manualFeeds.pop();
      }
    })
    socket.on('clear', function() {
      manualFeeds = [];
      console.log("Feeds list cleared");
      manualKeywords = [];
      console.log("Keywords list cleared");
    })
});

function arrUnique(arr) {
    var cleaned = [];
    arr.forEach(function(itm) {
        var unique = true;
        cleaned.forEach(function(itm2) {
            if (_.isEqual(itm, itm2)) unique = false;
        });
        if (unique) cleaned.push(itm);
    });
    return cleaned;
}

function getFileContents() {
    //Only put 1 .feed and .keyword file pair under public/data/ . Multiple files will just break this
    var fileContents = [];
    // var filename = path.basename('./public/data/default.feed', '.feed');
    fileContents = fs.readFileSync("./public/data/default.feed").toString().split("\r\n");
    fileContents.pop();
    console.log("FILE CONTENTS: ")
    console.log(fileContents);
    // console.log("FILENAME": + filename);
    autoHtmlArray = [];
    doEverythingElse(fileContents, 'auto');
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

function formatResults(resultsDictionary, inputType, detectedKeywords) {
    //After the dictionary comes in, we just want the value array of objects
    console.log("input type: " + inputType);
    io.emit('message', inputType);
    var value = resultsDictionary.value;
    value = removeDupes(value);
    console.log("value after: " + value);
    var groupedResults = []; //Array to be sent?
    var groupLinks = []; //Array to be filled with

    if (inputType === 'auto') {
        //Fill auto array

        for (let i = 0; i < value.length; i++) {
//            autoHtmlArray.push("<a href=" + value[i]['postLink'] + ">" + value[i]['postTitle'] + "</a> " + value[i]['postKeywords']);// + "\n<br>\n");
            autoHtmlArray.push(value[i]);
        }

        //prototype
        //For every keyword,
        for(let i = 0; i < keywords.length; i++) {
          //This should write the headers
          io.emit('formatAutoResults', keywords[i]);
          //Check the entire array
          for(let j = 0; j < autoHtmlArray.length; j++) {
            //If at position j the current keyword is detected,
            if(autoHtmlArray[j]['postKeywords'].indexOf(keywords[i]) > -1) {
              console.log(autoHtmlArray[j]['postKeywords'] + ' match ' + keywords[i]);
              io.emit('autoArray', autoHtmlArray[j]);
            }
          }
        }

    } else if (inputType === 'manual') {
        //Fill manual array

        for (let i = 0; i < value.length; i++) {
            manualHtmlArray.push(value[i]);
        }
        //For every keyword,
        for(let i = 0; i < manualKeywords.length; i++) {
          //This should write the headers
          io.emit('formatManualResults', manualKeywords[i]);
          //Check the entire array
          for(let j = 0; j < manualHtmlArray.length; j++) {
            //If at position j the current keyword is detected,
            if(manualHtmlArray[j]['postKeywords'].indexOf(keywords[i]) > -1) {
              console.log(manualHtmlArray[j]['postKeywords'] + ' match ' + keywords[i]);
              io.emit('manualArray', manualHtmlArray[j]);
            }
          }
        }
    } else {
        console.log('INPUT TYPE must be MANUAL or AUTO: ' + inputType);
    }
    //By the end of this if statement we should have, after being called once for auto and once for manual input,
    //Two arrays. A manualHtml array which'll get passed into the manual results page

}

//FileContents/1st parameter is an array of feeds or URLs as strings
//inputType/2nd param is a string that can either be manual or auto
function doEverythingElse(fileContents, inputType) {
    console.log("DO EVERYTHING ELSE")
    var feedparser = new FeedParser();
    var savedLinks = [];
    var numberOfFeeds = fileContents.length;
    console.log("number of feeds at loop: " + numberOfFeeds)
    var keyArray = [];
    var detectedKeywords = [];
    //This differentiates whether to use manually input keywords, or a default set for auto
    if (inputType === 'manual') {
        keyArray = manualKeywords;
    } else {
        keyArray = keywords;
    }

    for (var i = 0; i < fileContents.length; i++) {
        console.log("I " + i)
        let currentFeed = fileContents[i];
        console.log("CURRENT FEED: " + currentFeed);
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
            console.log("end called")
            numberOfFeeds--;
            console.log("number of feeds after decrement " + numberOfFeeds);
            io.emit('message', "number of feeds after decrement " + numberOfFeeds + "\n");
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
                formatResults(resultsDict, inputType);
            }
        });

        feedparser.on('data', function(chunk) {
          //Whenever we're looking at a new link, reset detectedKeywords to []
          detectedKeywords = [];
            //console.log("length before " + savedLinks.length);
            //console.log(JSON.stringify(chunk))
            //Store description of a given article, converting JSON to string
            var desc = JSON.stringify(chunk['description']);
            //for every keyword we have
            for (let i = 0; i < keyArray.length; i++) {
              //If the keyword is detected in the description:
                if (desc.indexOf(keyArray[i]) > -1) {
                  detectedKeywords.push(keyArray[i]);
                  console.log("KEYWORD " + keyArray[i]);
                    console.log("SAVED LINK title: " + chunk['title']);
                }
            }
            if(detectedKeywords.length > 0) {
                savedLinks.push({
                    postLink: chunk['link'],
                    postTitle: chunk['title'],
                    postKeywords: detectedKeywords
                });
            }
            //console.log("length after " + savedLinks.length);
        });

    } //end of for loop
    console.log("DISPLAYING RESULTS");
} //End of doing everything else

//Run getFileContents() ONCE (on startup) just so we have a list of results
getFileContents();
//run getFileContents on a cron-like schedule of 9am
scheduler.scheduleJob('* 9 * * *', function() {
  getFileContents();
})
