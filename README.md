# rss-parser

## Installation

```bash
npm install --save rss-parser
```

## Usage

```js
var parser = require('rss-parser');

parser.parseURL('https://reddit.com/.rss', function(err, parsed) {
  console.log(parsed)
})
```

rss-parser also exposes `parseString` and `parseFile` functions.

