# rss-parser

## Installation
You can install via npm or bower:
```bash
npm install --save rss-parser
# or
bower install --save rss-parser
```

## Usage
You can parse RSS from a URL, local file (NodeJS only), or a string.
* `parseString(xml, callback)`
* `parseFile(filename, callback)`
* `parseURL(url, [options,] callback)`

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
<script src="/bower_components/rss-parser/dist/rss-parser.min.js"></script>
<script>
RSSParser.parseURL('https://www.reddit.com/.rss', function(err, parsed) {
  console.log(parsed.feed.title);
  parsed.feed.entries.forEach(function(entry) {
    console.log(entry.title + ':' + entry.link);
  })
})
</script>
```

### Redirects
By default, `parseURL` will follow up to one redirect. You can change this
with `options.maxRedirects`.

```js
parser.parseURL('https://reddit.com/.rss', {maxRedirects: 3}, function(err, parsed) {
  console.log(parsed.feed.title);
});
```

## Contributing
Contributions welcome!

### Running Tests
The tests run the RSS parser for several sample RSS feeds in `test/input` and outputs the resulting JSON into `test/output`. If there are any changes to the output files the tests will fail.

To check if your changes affect the output of any test cases, run

`npm test`

To update the output files with your changes, run

`WRITE_GOLDEN=true npm test`

### Publishing Releases
```bash
npm version minor # or major/patch
grunt build
git commit -a -m "browserify"
npm publish
git push --follow-tags
```

