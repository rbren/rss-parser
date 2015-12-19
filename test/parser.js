var FS = require('fs');

var Parser = require('../index.js');

var Expect = require('chai').expect;

var INPUT_FILE = __dirname + '/input/reddit.rss';
var OUTPUT_FILE = __dirname + '/output/reddit.json';

describe('Parser', function() {
  it('should parse Reddit', function(done) {
    Parser.parseFile(INPUT_FILE, function(err, parsed) {
      Expect(err).to.equal(null);
      if (process.env.WRITE_GOLDEN) {
        FS.writeFileSync(OUTPUT_FILE, JSON.stringify(parsed, null, 2));
      } else {
        var expected = FS.readFileSync(OUTPUT_FILE, 'utf8')
        expected = JSON.parse(expected);
        Expect(parsed).to.deep.equal(expected);
      }
      done();
    })
  })

  it('should parse craigslist', function(done) {
    Parser.parseURL('https://seattle.craigslist.org/search/act?format=rss', function(err, parsed) {
      Expect(err).to.not.equal(null);
      done();
    })
  })
})
