const request = require('request');
var FeedParser = require('feedparser')


var feedIter = 0;
var linkListIter = 0;
var linkList = [];

exports.trawl = function(feeds, keywords) {
    processLoop(feeds, keywords);
}

//could export a trawlfile option

exports.getLinkList = function() {
  return linkList;
}

function processLoop(feeds, keywords) {
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
            if (desc.indexOf(keywords[i]) > -1) {
                //The keyword is detected, we assign the current point in linkList the link from the given text
                console.log("KEYWORD " + keywords[i] + ": DETECTED" + "\n\n");
                linkList[linkListIter] = chunk['link'];
                linkListIter++;
                //console.log("SAVED LINK " + linkListIter + ": " + linkList[linkListIter - 1]);

            }
        }

    });

    feedparser.on('end', function() {
        console.log("END")
        linkListIter = 0;
        feedIter++;
        if (feedIter < (feeds.length - 1)) {
            console.log("next feed:: " + feedIter + " " + feeds[feedIter]);
            processLoop(feeds, keywords);
        } else {
            console.log("No more feeds left");
            linkList = removeDuplicates(linkList);
            console.log("Duplicates removed");
            return linkList;
        }
    });

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

}
