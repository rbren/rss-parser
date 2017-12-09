# rss-parser

[![Build Status](https://travis-ci.org/bobby-brennan/rss-parser.svg?branch=master)](https://travis-ci.org/bobby-brennan/rss-parser)

## Installation
You can install via npm or bower:
```bash
npm install --save rss-parser
# or
bower install --save rss-parser
```

## Usage
You can parse RSS from a URL, local file (NodeJS only), or a string.
* `parseString(xml, [options,],  callback)`
* `parseFile(filename, [options,], callback)`
* `parseURL(url, [options,] callback)`

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

## Output
Check out the full output format in [test/output/reddit.json](test/output/reddit.json)

```yaml
feed:
    feedUrl: 'https://www.reddit.com/.rss'
    title: 'reddit: the front page of the internet'
    description: ""
    link: 'https://www.reddit.com/'
    entries:
        - title: 'The water is too deep, so he improvises'
          link: 'https://www.reddit.com/r/funny/comments/3skxqc/the_water_is_too_deep_so_he_improvises/'
          pubDate: 'Thu, 12 Nov 2015 21:16:39 +0000'
          creator: "John Doe"
          content: '<a href="http://example.com">this is a link</a> - <b>this is bold text</b>'
          contentSnippet: 'this is a link - this is bold text'
          guid: 'https://www.reddit.com/r/funny/comments/3skxqc/the_water_is_too_deep_so_he_improvises/'
          categories:
              - funny
          isoDate: '2015-11-12T21:16:39.000Z'
```

##### Notes:
* The `contentSnippet` field strips out HTML tags and unescapes HTML entities
* The `dc:` prefix will be removed from all fields
* Both `dc:date` and `pubDate` will be available in ISO 8601 format as `isoDate`
* If `author` is specified, but not `dc:creator`, `creator` will be set to `author` ([see article](http://www.lowter.com/blogs/2008/2/9/rss-dccreator-author))

## Options

### Redirects
By default, `parseURL` will follow up to one redirect. You can change this
with `options.maxRedirects`.

```js
parser.parseURL('https://reddit.com/.rss', {maxRedirects: 3}, function(err, parsed) {
  console.log(parsed.feed.title);
});
```

### Custom Fields
If your RSS feed contains fields that aren't currently returned, you can access them using the `customFields` option.

```js
var options = {
  customFields: {
    feed: ['otherTitle', 'extendedDescription'],
    item: ['coAuthor','subtitle'],
  }
}
parser.parseURL('https://www.reddit.com/.rss', options, function(err, parsed) {
  console.log(parsed.feed.extendedDescription);

  parsed.feed.entries.forEach(function(entry) {
    console.log(entry.coAuthor + ':' + entry.subtitle);
  })
})
```

To rename fields, you can pass in an array with two items, in the format `[fromField, toField]`:

```js
var options = {
  customFields: {
    item: [
      ['dc:coAuthor', 'coAuthor'],
    ]
  }
}
```

### xml2js passthrough
`rss-parser` uses [xml2js](https://github.com/Leonidas-from-XIV/node-xml2js)
to parse XML. You can pass [these options](https://github.com/Leonidas-from-XIV/node-xml2js#options)
to `new xml2js.Parser()` by specifying `options.xml2js`:

```js
let options = {
  xml2js: {
    emptyTag: '--EMPTY--',
  }
}
parser.parseURL('https://www.reddit.com/.rss', options, function(err, parsed) {
  console.log(err, parsed);
})
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
npm run build
git commit -a -m "Build distribution"
npm version minor # or major/patch
npm publish
git push --follow-tags
```
