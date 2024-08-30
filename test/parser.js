const assert = require('assert');
const fs = require('fs');
const Parser = require('../index.js');

const IN_DIR = __dirname + '/input';
const OUT_DIR = __dirname + '/output';

function testParseForFile(name, ext, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  let parser = new Parser(options);
  let xml = fs.readFileSync(IN_DIR + '/' + name + '.' + ext, 'utf8');
  parser.parseString(xml, callback);
}

// Test NHS feed
testParseForFile('nhs-feed', 'rss', function(err, parsed) {
  assert.strictEqual(err, null);
  assert.strictEqual(parsed.items.length, 2);
  assert.strictEqual(parsed.items[0].title, 'As measles cases continue to rise, NHS North West invites thousands of school children to catch up with life-saving MMR');
  assert.strictEqual(parsed.items[1].title, 'Second item title');
  console.log('NHS feed test passed');
});

// Add more tests here if needed

console.log('All tests completed');
