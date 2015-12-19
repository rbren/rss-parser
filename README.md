# rss-parser

## Installation

### NodeJS
```bash
npm install --save rss-parser
```

### Web
```bash
bower install --save rss-parser
```

## Usage
rss-parser exposes `parseURL()`, `parseString()`, and `parseFile()` functions.

Check out the output format in [test/output/reddit.json](test/output/reddit.json)

### NodeJS
```js
var parser = require('rss-parser');

parser.parseURL('https://www.reddit.com/.rss', function(err, parsed) {
  console.log(parsed.feed.title);
  parsed.feed.entries.forEach(function(entry) {
    console.log(entry.title + ':' + entry.link);
  })
})
```

### Web
```html
<script src="/bower_components/rss-parser/dist/rss-parser.js"></script>
<script>
RSSParser.parseURL('https://www.reddit.com/.rss', function(err, parsed) {
  console.log(parsed.feed.title);
  parsed.feed.entries.forEach(function(entry) {
    console.log(entry.title + ':' + entry.link);
  })
})
</script>
```

