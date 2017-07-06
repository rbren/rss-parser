"use strict";

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

  it('should parse sciencemag.org (RSS 1.0)', function(done) {
    testParseForFile('rss-1', 'rss', done);
  })

  it('should parse craigslist (RSS 1.0)', function(done) {
    testParseForFile('craigslist', 'rss', done);
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

  it('should parse Instant Article', function(done) {
    testParseForFile('instant-article', 'rss', done);
  });

  it('should parse Feedburner', function(done) {
    testParseForFile('feedburner', 'atom', done);
  });
  it('should parse podcasts', function(done) {
    testParseForFile('narro', 'rss', done);
  });

  it('should throw error for unrecognized', function(done) {
    Parser.parseFile(__dirname + '/input/unrecognized.rss', (err, parsed) => {
      Expect(err.message).to.contain('Feed not recognized as RSS');
      done();
    })
  })

  it('should parse custom fields', function(done) {
    var options = {
      customFields: {
        feed: ['language', 'copyright', 'nested-field'],
        item: ['subtitle']
      }
    };
    Parser.parseFile(__dirname + '/input/customfields.rss',options, function(err, parsed) {
      Expect(err).to.equal(null);
      var str = JSON.stringify(parsed, null, 2);
      var outfile = OUT_DIR + '/customfields.json';
      if (process.env.WRITE_GOLDEN) {
        FS.writeFileSync(outfile, str);
      } else {
        var expected = FS.readFileSync(outfile, 'utf8');
        Expect(str).to.equal(expected);
      }
      done();
    });
  });
})
