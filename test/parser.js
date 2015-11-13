var FS = require('fs');

var Parser = require('../index.js');

var Expect = require('chai').expect;

var INPUT_FILE = __dirname + '/input/reddit.rss';
var OUTPUT_FILE = __dirname + '/output/reddit.json';

describe('Parser', function() {
  it('should parse Reddit', function(done) {
    Parser.parse(INPUT_FILE, function(err, parsed) {
      Expect(err).to.equal(null);
      var expected = FS.readFileSync(OUTPUT_FILE, 'utf8')
      expected = JSON.parse(expected);
      Expect(parsed).to.deep.equal(expected)
    })
  })
})
