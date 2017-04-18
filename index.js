var Entities = require("entities");
var FS = require('fs');
var url = require('url');
var XML2JS = require('xml2js');

var HTTP = require('http');
var HTTPS = require('https');

var Parser = module.exports = {};

var TOP_FIELDS = [
  'title',
  'description',
  'author',
  'pubDate',
  'webMaster',
  'managingEditor',
  'generator',
  'link'
];
var PODCAST_TOP_FIELDS = [
  'author',
  'subtitle',
  'summary',
  'explicit'
];
var ITEM_FIELDS = [
  'title',
  'link',
  'pubDate',
  'author',
  'content:encoded',
  'enclosure',
  'dc:creator',
  'dc:date'
];
var PODCAST_ITEM_FIELDS = [
  'author',
  'subtitle',
  'summary',
  'explicit',
  'duration',
  'image'
];


var stripHtml = function(str) {
  return str.replace(/<(?:.|\n)*?>/gm, '');
}

var getSnippet = function(str) {
  return Entities.decode(stripHtml(str)).trim();
}

var getContent = function(content) {
  if (typeof content._ === 'string') {
    return content._;
  } else if (typeof content === 'object') {
    var builder = new XML2JS.Builder({headless: true, explicitRoot: true, rootName: 'div', renderOpts: {pretty: false}});
    return builder.buildObject(content);
  } else {
    return content;
  }
}

var parseAtomFeed = function(xmlObj, callback) {
  var feed = xmlObj.feed;
  var json = {feed: {entries: []}};
  if (feed.link) {
    if (feed.link[0] && feed.link[0].$.href) json.feed.link = feed.link[0].$.href;
    if (feed.link[1] && feed.link[1].$.href) json.feed.feedUrl = feed.link[1].$.href;
  }
  if (feed.title) {
    var title = feed.title[0] || '';
    if (title._) title = title._
    if (title) json.feed.title = title;
  }
  var entries = feed.entry;
  (entries || []).forEach(function (entry) {
    var item = {};
    if (entry.title) {
      var title = entry.title[0] || '';
      if (title._) title = title._;
      if (title) item.title = title;
    }
    if (entry.link && entry.link.length) item.link = entry.link[0].$.href;
    if (entry.updated && entry.updated.length) item.pubDate = new Date(entry.updated[0]).toISOString();
    if (entry.author && entry.author.length) item.author = entry.author[0].name[0];
    if (entry.content && entry.content.length) {
      item.content = getContent(entry.content[0]);
      item.contentSnippet = getSnippet(item.content)
    }
    if (entry.id) {
      item.id = entry.id[0];
    }
    json.feed.entries.push(item);
  });
  callback(null, json);
}

var parseRSS1 = function(xmlObj, callback) {
  callback("RSS 1.0 parsing not yet implemented.")
}

var parseRSS2 = function(xmlObj, callback) {
  var json = {feed: {entries: []}};
  var channel = xmlObj.rss.channel[0];
  if (channel['atom:link']) json.feed.feedUrl = channel['atom:link'][0].$.href;
  TOP_FIELDS.forEach(function(f) {
    if (channel[f]) json.feed[f] = channel[f][0];
  })
  var items = channel.item;
  (items || []).forEach(function(item) {
    var entry = {};
    ITEM_FIELDS.forEach(function(f) {
      if (item[f]) entry[f] = item[f][0];
    })
    if (item.enclosure) {
        entry.enclosure = item.enclosure[0].$;
    }
    if (item.description) {
      entry.content = getContent(item.description[0]);
      entry.contentSnippet = getSnippet(entry.content);
    }
    if (item.guid) {
      entry.guid = item.guid[0];
      if (entry.guid._) entry.guid = entry.guid._;
    }
    if (item.category) entry.categories = item.category;
    json.feed.entries.push(entry);
  })
  if (xmlObj.rss.$['xmlns:itunes']) {
    decorateItunes(json, channel);
  }
  callback(null, json);
}

/**
 * Add iTunes specific fields from XML to extracted JSON
 *
 * @access public
 * @param {object} json extracted
 * @param {object} channel parsed XML
 */
var decorateItunes = function decorateItunes(json, channel) {
  var items = channel.item || [],
      entry = {};
  json.feed.itunes = {}

  if (channel['itunes:owner']) {
    var owner = {},
        image;

    if(channel['itunes:owner'][0]['itunes:name']) {
      owner.name = channel['itunes:owner'][0]['itunes:name'][0];
    }
    if(channel['itunes:owner'][0]['itunes:email']) {
      owner.email = channel['itunes:owner'][0]['itunes:email'][0];
    }
    if(channel['itunes:image']) {
      image = channel['itunes:image'][0].$.href
    }

    if(image) {
      json.feed.itunes.image = image;
    }
    json.feed.itunes.owner = owner;
  }

  PODCAST_TOP_FIELDS.forEach(function(f) {
    if (channel['itunes:' + f]) json.feed.itunes[f] = channel['itunes:' + f][0];
  });
  (items).forEach(function(item, index) {
    entry = json.feed.entries[index];
    PODCAST_ITEM_FIELDS.forEach(function(f) {
      entry.itunes = entry.itunes || {};
      if (item['itunes:' + f]) {
        if (f == 'image' && item['itunes:' + f][0].$ && item['itunes:' + f][0].$.href) {
          entry.itunes[f] = item['itunes:' + f][0].$.href;
        } else {
          entry.itunes[f] = item['itunes:' + f][0];
        }
      }
    });
    json.feed.entries[index] = entry;
  });
}

Parser.parseString = function(xml, callback) {
  XML2JS.parseString(xml, function(err, result) {
    if (err) return callback(err);
    if (result.feed) {
      return parseAtomFeed(result, callback)
    } else if (result.rss && result.rss.$.version && result.rss.$.version.indexOf('2') === 0) {
      return parseRSS2(result, callback);
    } else {
      return parseRSS1(result, callback);
    }
  });
}

Parser.parseURL = function(feedUrl, settings, callback) {
  if (!callback) {
    callback = settings;
    settings = {};
  }
  settings.__redirectCount = settings.__redirectCount || 0;
  if (settings.maxRedirects === undefined) settings.maxRedirects = 1;

  var xml = '';
  var get = feedUrl.indexOf('https') === 0 ? HTTPS.get : HTTP.get;
  var parsedUrl = url.parse(feedUrl);
  var req = get({
    protocol: parsedUrl.protocol,
    hostname: parsedUrl.hostname,
    path: parsedUrl.path,
    headers: {'User-Agent': 'rss-parser'}
  }, function(res) {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers['location']) {
      if (settings.maxRedirects === 0) return callback(new Error("Status code " + res.statusCode));
      if (settings.__redirectCount === settings.maxRedirects) return callback(new Error("Too many redirects"));
      settings.__redirectCount++;
      return Parser.parseURL(res.headers['location'], settings, callback);
    }
    res.setEncoding('utf8');
    res.on('data', function(chunk) {
      xml += chunk;
    });
    res.on('end', function() {
      return Parser.parseString(xml, callback);
    })
  })
  req.on('error', callback);
}

Parser.parseFile = function(file, callback) {
  FS.readFile(file, 'utf8', function(err, contents) {
    return Parser.parseString(contents, callback);
  })
}
