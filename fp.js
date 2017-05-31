var io;
//Required modules
var FeedParser = require('feedparser');
var request = require('request'); // for fetching the feed
var glob = require('glob').Glob; //Performs an asynchronous partial string match search on a directory
var fs = require('fs');
var express = require('express');
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
    for (let i = 0; i < autoHtmlArray.length; i++) {
        res.write(autoHtmlArray[i]);
    }
    res.send();
})

app.get('/results/manual', function(req, res) {
    for (let i = 0; i < manualHtmlArray.length; i++) {
        res.write(manualHtmlArray[i]);
    }
    res.send();
})

//Try duplicating for feeds - will need to be done slightly different
//As manualFeeds is defined within io.on('connection')
app.get('/getkeywords', function(req, res) {
  console.log("request received")
  var string = manualKeywords[manualKeywords.length - 1];
  console.log("string '" + string + "' chosen");
  res.writeHead(200, {"Content-Type": "text/plain"});
  res.end(string);
  console.log("string sent");
})

app.get('/getfeeds', function(req, res) {
  console.log("request received")
  var string = manualFeeds[manualFeeds.length - 1];
  console.log("string '" + string + "' chosen");
  res.writeHead(200, {"Content-Type": "text/plain"});
  res.end(string);
  console.log("string sent");
})

io.on('connection', function(socket) {
    console.log("Connection made");
    manualFeeds = [];
    manualHtmlArray = [];

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
        doEverythingElse(manualFeeds, 'manual');
    })
});

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

function displayResults(resultsDictionary, inputType) {
    //After the dictionary comes in, we just want the value array of objects
    console.log("input type: " + inputType)
    var value = resultsDictionary.value;

    if (inputType === 'auto') {
        //Fill auto array

        for (let i = 0; i < value.length; i++) {
            autoHtmlArray.push("<a href=" + value[i]['postLink'] + ">" + value[i]['postTitle'] + "</a>\n<br>\n");
        }

    } else if (inputType === 'manual') {
        //Fill manual array

        for (let i = 0; i < value.length; i++) {
            manualHtmlArray.push("<a href=" + value[i]['postLink'] + ">" + value[i]['postTitle'] + "</a>\n<br>\n");
        }
        //Clear last element for clean input
        console.log("manual array after pop: " + manualHtmlArray);
    } else {
        console.log('INPUT TYPE must be MANUAL or AUTO: ' + inputType);
    }
    //By the end of this if statement we should have, after being called once for auto and once for manual input,
    //Two arrays. A manualHtml array which'll get passed into the manual results page

    //Duplicate for manual

}

//FileContents/1st parameter is an array of feeds or URLs as strings
//inputType/2nd param is a string that can either be manual or auto
//if auto, follow same pipeline and send results to /results/auto
//if manual, follow same pipeline but send results to /results/manual
function doEverythingElse(fileContents, inputType) {
    console.log("DO EVERYTHING ELSE")
    var feedparser = new FeedParser();
    var savedLinks = [];
    var numberOfFeeds = fileContents.length;
    console.log("number of feeds at loop: " + numberOfFeeds)
    var keyArray = [];
    //This differentiates whether to use manually input keywords, or a default set for auto
    if(inputType === 'manual') {
      keyArray = manualKeywords;
    } else {
      keyArray = keywords;
    }

    for (var i = 0; i < fileContents.length; i++) {
        console.log("I " + i)
        let currentValue = fileContents[i];
        console.log("CURRENT VALUE: " + currentValue);
        var req = request(currentValue);


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
            if (numberOfFeeds === 0) {
                //let key = currentValue.toString(); //String: URL of current feed
                //let value = savedLinks; //Array: Array: String URLs, String titles
                //resultsDict[key] = value;
                resultsDict = {
                    key: currentValue.toString(), //String: URL of current feed
                    value: savedLinks //Array: Array: String URLs, String titles
                };
                console.log("CURRENT VALUE " + currentValue.toString() + " AND SAVED LINKS: " + savedLinks.length);
                displayResults(resultsDict, inputType);
            }
        });

        feedparser.on('data', function(chunk) {
            //console.log("length before " + savedLinks.length);
            //console.log(JSON.stringify(chunk))
            //Store description of a given article, converting JSON to string
            var desc = JSON.stringify(chunk['description']);
            for (var i = 0; i < keyArray.length; i++) {
                if (desc.indexOf(keywords[i]) > -1) {
                    savedLinks.push({
                        postLink: chunk['link'],
                        postTitle: chunk['title']
                    });
                }
            }
            //console.log("length after " + savedLinks.length);
        });

    } //end of for loop
    console.log("DISPLAYING RESULTS");
} //End of doing everything else

//After defining every function, we run the automatic chain of functions, forcing partially synchronous behaviour
getFileContents();
