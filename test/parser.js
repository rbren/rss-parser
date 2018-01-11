"use strict";

var FS = require('fs');
var HTTP = require('http');

var Parser = require('../index.js');

var Expect = require('chai').expect;

var IN_DIR = __dirname + '/input';
var OUT_DIR = __dirname + '/output';

var INPUT_FILE = __dirname + '/input/reddit.rss';
var OUTPUT_FILE = __dirname + '/output/reddit.json';

describe('Parser', function() {
  var testParseForFile = function(name, ext, options, done) {
    if (typeof done === 'undefined') {
      done = options;
      options = {};
    }
    Parser.parseFile(IN_DIR + '/' + name + '.' + ext, options, function(err, parsed) {
      if (err) console.log(err);
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

  it('should parse heraldsun', function(done) {
    testParseForFile('heraldsun', 'rss', done);
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

  it('should parse multiple links', function(done) {
    testParseForFile('many-links', 'rss', done);
  });

  it('should pass xml2js options', function(done) {
    testParseForFile('xml2js-options', 'rss', {xml2js: {emptyTag: 'EMPTY'}}, done);
  });

  it('should throw error for unrecognized', function(done) {
    Parser.parseFile(__dirname + '/input/unrecognized.rss', function(err, parsed) {
      Expect(err.message).to.contain('Feed not recognized as RSS');
      done();
    });
  });

  it('should omit iTunes image if none available during decoration', function(done) {
    const rssFeedWithMissingImage = __dirname + '/input/itunes-missing-image.rss';
    Parser.parseFile(rssFeedWithMissingImage, {}, function(err, parsed) {
      Expect(err).to.be.null;
      Expect(parsed).to.not.have.deep.property('feed.itunes.image');
      done();
    });
  });

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

  it('should parse Atom feed custom fields', function(done) {
    var options = {
      customFields: {
        feed: ['totalViews'],
        item: ['media:group']
      }
    };
    Parser.parseFile(__dirname + '/input/atom-customfields.atom',options, function(err, parsed) {
      Expect(err).to.equal(null);
      var str = JSON.stringify(parsed, null, 2);
      var outfile = OUT_DIR + '/atom-customfields.json';
      if (process.env.WRITE_GOLDEN) {
        FS.writeFileSync(outfile, str);
      } else {
        var expected = FS.readFileSync(outfile, 'utf8');
        Expect(str).to.equal(expected);
      }
      done();
    });
  });

  it('should parse URL', function(done) {
    var server = HTTP.createServer(function(req, res) {
      var file = FS.createReadStream(INPUT_FILE, 'utf8');

      file.pipe(res);
    });
    server.listen(function() {
      var port = server.address().port;
      var url = 'http://localhost:' + port;

      Parser.parseURL(url, function(err, parsed) {
        Expect(err).to.equal(null);
        var str = JSON.stringify(parsed, null, 2);
        var expected = FS.readFileSync(OUTPUT_FILE, 'utf8');
        Expect(str).to.equal(expected);
        done();
      });
    });

  });
})
