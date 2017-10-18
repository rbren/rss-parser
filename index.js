'use strict';

var Entities = require("entities");
var FS = require('fs');
var url = require('url');
var XML2JS = require('xml2js');

var HTTP = require('http');
var HTTPS = require('https');

var Parser = module.exports = {};

var FEED_FIELDS = [
  ['author', 'creator'],
  ['dc:publisher', 'publisher'],
  ['dc:creator', 'creator'],
  ['dc:source', 'source'],
  ['dc:title', 'title'],
  ['dc:type', 'type'],
  'title',
  'description',
  'author',
  'pubDate',
  'webMaster',
  'managingEditor',
  'generator',
  'link',
];

var ITEM_FIELDS = [
  ['author', 'creator'],
  ['dc:creator', 'creator'],
  ['dc:date', 'date'],
  ['dc:language', 'language'],
  ['dc:rights', 'rights'],
  ['dc:source', 'source'],
  ['dc:title', 'title'],
  'title',
  'link',
  'pubDate',
  'author',
  'content:encoded',
  'enclosure',
  'dc:creator',
  'dc:date',
];

var mapItunesField = function(f) {
  return ['itunes:' + f, f];
}

var PODCAST_FEED_FIELDS = ([
  'author',
  'subtitle',
  'summary',
  'explicit'
]).map(mapItunesField);

var PODCAST_ITEM_FIELDS = ([
  'author',
  'subtitle',
  'summary',
  'explicit',
  'duration',
  'image'
]).map(mapItunesField);


var stripHtml = function(str) {
  return str.replace(/<(?:.|\n)*?>/gm, '');
}

var getSnippet = function(str) {
  return Entities.decode(stripHtml(str)).trim();
}

var getLink = function(links, rel, fallbackIdx) {
  if (!links) return;
  for (var i = 0; i < links.length; ++i) {
    if (links[i].$.rel === rel) return links[i].$.href;
  }
  if (links[fallbackIdx]) return links[fallbackIdx].$.href;
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

var parseAtomFeed = function(xmlObj, options, callback) {
  var feed = xmlObj.feed;
  var json = {feed: {entries: []}};
  if(options && options.customFields && options.customFields.feed){
    copyFromXML(feed, json.feed, options.customFields.feed);
  }
  if (feed.link) {
    json.feed.link = getLink(feed.link, 'alternate', 0);
    json.feed.feedUrl = getLink(feed.link, 'self', 1);
  }
  if (feed.title) {
    var title = feed.title[0] || '';
    if (title._) title = title._
    if (title) json.feed.title = title;
  }
  var entries = feed.entry;
  (entries || []).forEach(function (entry) {
    var item = {};
    if(options && options.customFields && options.customFields.item){
      copyFromXML(entry, item, options.customFields.item);
    }
    if (entry.title) {
      var title = entry.title[0] || '';
      if (title._) title = title._;
      if (title) item.title = title;
    }
    if (entry.link && entry.link.length) {
      item.link = getLink(entry.link, 'alternate', 0);
    }
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

var parseRSS1 = function(xmlObj, options, callback) {
  xmlObj = xmlObj['rdf:RDF'];
  var channel = xmlObj.channel[0];
  var items = xmlObj.item;
  return parseRSS(channel, items, options, callback);
}

var parseRSS2 = function(xmlObj, options, callback) {
  var channel = xmlObj.rss.channel[0];
  var items = channel.item;
  return parseRSS(channel, items, options, function(err, data) {
    if (err) return callback(err);
    if (xmlObj.rss.$['xmlns:itunes']) {
      decorateItunes(data, channel);
    }
    callback(null, data);
  });
}

var parseRSS = function(channel, items, options, callback) {
  items = items || [];
  options.customFields = options.customFields || {};
  var itemFields = ITEM_FIELDS.concat(options.customFields.item || []);
  var feedFields = FEED_FIELDS.concat(options.customFields.feed || []);

  var json = {feed: {entries: []}};

  if (channel['atom:link']) json.feed.feedUrl = channel['atom:link'][0].$.href;
  copyFromXML(channel, json.feed, feedFields);
  items.forEach(function(item) {
    var entry = {};
    copyFromXML(item, entry, itemFields);
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
    var date = entry.pubDate || entry.date;
    if (date) {
      try {
        entry.isoDate = new Date(date.trim()).toISOString();
      } catch (e) {
        // Ignore bad date format
      }
    }
    json.feed.entries.push(entry);
  })
  callback(null, json);
}

var copyFromXML = function(xml, dest, fields) {
  fields.forEach(function(f) {
    var from = f;
    var to = f;
    if (Array.isArray(f)) {
      from = f[0];
      to = f[1];
    }
    if (xml[from] !== undefined) dest[to] = xml[from][0];
  })
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
      var hasImageHref = (channel['itunes:image'][0] &&
                            channel['itunes:image'][0].$ &&
                            channel['itunes:image'][0].$.href);
      image = hasImageHref ? channel['itunes:image'][0].$.href : null;
    }

    if(image) {
      json.feed.itunes.image = image;
    }
    json.feed.itunes.owner = owner;
  }

  copyFromXML(channel, json.feed.itunes, PODCAST_FEED_FIELDS);
  items.forEach(function(item, index) {
    var entry = json.feed.entries[index];
    entry.itunes = {};
    copyFromXML(item, entry.itunes, PODCAST_ITEM_FIELDS);
    var image = item['itunes:image'];
    if (image && image[0] && image[0].$ && image[0].$.href) {
      entry.itunes.image = image[0].$.href;
    }
  });
}

Parser.parseString = function(xml, options, callback) {
  if (!callback) {
    callback = options;
    options = {};
  }
  XML2JS.parseString(xml, function(err, result) {
    if (err) return callback(err);
    if (!result) {
      return callback(new Error('Unable to parse XML.'));
    }
    if (result.feed) {
      return parseAtomFeed(result, options, callback)
    } else if (result.rss && result.rss.$.version && result.rss.$.version.indexOf('2') === 0) {
      return parseRSS2(result, options, callback);
    } else if (result['rdf:RDF']) {
      return parseRSS1(result, options, callback);
    } else {
      return callback(new Error("Feed not recognized as RSS 1 or 2."))
    }
  });
}

Parser.parseURL = function(feedUrl, options, callback) {
  if (!callback) {
    callback = options;
    options = {};
  }
  options.__redirectCount = options.__redirectCount || 0;
  if (options.maxRedirects === undefined) options.maxRedirects = 1;

  var xml = '';
  var get = feedUrl.indexOf('https') === 0 ? HTTPS.get : HTTP.get;
  var parsedUrl = url.parse(feedUrl);
  var req = get({
    auth: parsedUrl.auth,
    protocol: parsedUrl.protocol,
    hostname: parsedUrl.hostname,
    port: parsedUrl.port,
    path: parsedUrl.path,
    headers: {'User-Agent': 'rss-parser'}
  }, function(res) {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers['location']) {
      if (options.maxRedirects === 0) return callback(new Error("Status code " + res.statusCode));
      if (options.__redirectCount === options.maxRedirects) return callback(new Error("Too many redirects"));
      options.__redirectCount++;
      return Parser.parseURL(res.headers['location'], options, callback);
    }
    res.setEncoding('utf8');
    res.on('data', function(chunk) {
      xml += chunk;
    });
    res.on('end', function() {
      return Parser.parseString(xml, options, callback);
    })
  })
  req.on('error', callback);
}

Parser.parseFile = function(file, options, callback) {
  FS.readFile(file, 'utf8', function(err, contents) {
    return Parser.parseString(contents, options, callback);
  })
}
