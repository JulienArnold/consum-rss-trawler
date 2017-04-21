# consum-rss-trawler

A small web application that accepts keywords and RSS feeds (as URLs) and parses through searching for the given keywords and displays a list of links to relevant posts from any given feed/s.

## Quick Tutorial

1. Fork/git clone this repository.
2. Ensure the relevant module dependencies have been installed. These can be viewed under the `dependencies` nest within `package.json`, and installed via `npm install modulename`.
3. To launch the app, type `node app.js` from within the command line.
4. A server will begin listening on `localhost:6001`, with a front page (`index.html`) that has an accompanying form.
5. The app requires at least one keyword and feed to function. 
  
  5.i. To add keywords and feeds to be parsed through, paste a URL directly to the feed you wish to be parsed in the "Feeds" textbox, and click the `Add` button alongside. This can be done multiple times.
  
  5.ii. Repeat with the keywords textbox, adding one word at a time.
  
6. When you are satisfied with what you wish to be parsed, click the `Submit` button. This will send the feeds and keywords as parameters to be used. Check the command line for more information while this is running.
7. To view the results, navigate in your browser to `localhost:6001/results`.

**Note:** Exactly one feed or keyword can be added at a time. This is still in development, and may contain unencountered bugs/issues.
  

