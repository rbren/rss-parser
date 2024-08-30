const Parser = require('../lib/parser');
const assert = require('assert');

describe('iTunes Episode Type', () => {
  it('should parse itunes:episodeType', async () => {
    const parser = new Parser();
    const feed = await parser.parseString(`
      <?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
        <channel>
          <title>Test Podcast</title>
          <item>
            <title>Test Episode 1</title>
            <itunes:episodeType>full</itunes:episodeType>
          </item>
          <item>
            <title>Test Episode 2</title>
            <itunes:episodeType>trailer</itunes:episodeType>
          </item>
        </channel>
      </rss>
    `);

    assert.strictEqual(feed.items[0].itunes.episodeType, 'full');
    assert.strictEqual(feed.items[1].itunes.episodeType, 'trailer');
  });
});
