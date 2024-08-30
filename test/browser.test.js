
const assert = require('assert');
const RSSParser = require('../dist/browser-bundle.js');

describe('Browser compatibility', function() {
  it('should parse RSS feed in browser environment', function(done) {
    const parser = new RSSParser();
    const sampleRSS = `
      <?xml version="1.0" encoding="UTF-8" ?>
      <rss version="2.0">
        <channel>
          <title>Sample RSS Feed</title>
          <link>http://example.com</link>
          <description>This is a sample RSS feed</description>
          <item>
            <title>Sample Item</title>
            <link>http://example.com/item</link>
            <description>This is a sample item</description>
          </item>
        </channel>
      </rss>
    `;

    parser.parseString(sampleRSS, (err, feed) => {
      assert.strictEqual(err, null);
      assert.strictEqual(feed.title, 'Sample RSS Feed');
      assert.strictEqual(feed.items.length, 1);
      assert.strictEqual(feed.items[0].title, 'Sample Item');
      done();
    });
  });
});
