var FS = require('fs');

var Parser = require('../index.js');

var Expect = require('chai').expect;

var IN_DIR = __dirname + '/input';
var OUT_DIR = __dirname + '/output';

var INPUT_FILE = __dirname + '/input/reddit.rss';
var OUTPUT_FILE = __dirname + '/output/reddit.json';

describe('Parser', function() {
  var testParseForFile = function(name, done) {
    Parser.parseFile(IN_DIR + '/' + name + '.rss', function(err, parsed) {
      Expect(err).to.equal(null);
      if (process.env.WRITE_GOLDEN) {
        FS.writeFileSync(OUT_DIR + '/' + name + '.json', JSON.stringify(parsed, null, 2));
      } else {
        var expected = FS.readFileSync(OUT_DIR + '/' + name + '.json', 'utf8')
        expected = JSON.parse(expected);
        Expect(parsed).to.deep.equal(expected);
      }
      done();
    })
  }

  it('should parse Reddit', function(done) {
    testParseForFile('reddit', done);
  })

  it('should parse craigslist', function(done) {
    Parser.parseURL('https://seattle.craigslist.org/search/act?format=rss', function(err, parsed) {
      Expect(err).to.not.equal(null);
      done();
    })
  })

  it('should parse atom', function(done) {
    testParseForFile('reddit-atom', done);
  })
})
