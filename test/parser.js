var FS = require('fs');

var Parser = require('../index.js');

var Expect = require('chai').expect;

var IN_DIR = __dirname + '/input';
var OUT_DIR = __dirname + '/output';

var INPUT_FILE = __dirname + '/input/reddit.rss';
var OUTPUT_FILE = __dirname + '/output/reddit.json';

describe('Parser', function() {
  var testParseForFile = function(name, ext, done) {
    Parser.parseFile(IN_DIR + '/' + name + '.' + ext, function(err, parsed) {
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
    testParseForFile('reddit', 'rss', done);
  })

  it('should not parse craigslist (RSS 1.0)', function(done) {
    Parser.parseFile(__dirname + '/input/craigslist.rss', function(err, parsed) {
      Expect(err.indexOf('not yet implemented')).to.not.equal(-1);
      done();
    })
  })

  it('should parse atom', function(done) {
    testParseForFile('reddit-atom', 'rss', done);
  })

  it('should parse atom feed', function(done) {
    testParseForFile('gulp-atom', 'atom', done);
  })

  it('should parse reddits new feed', function(done) {
    testParseForFile('reddit-home', 'rss', done);
  })

  it('should parse with missing fields', function(done) {
    testParseForFile('missing-fields', 'atom', done)
  })

  it('should parse heise', function(done) {
    testParseForFile('heise', 'atom', done);
  })
})
