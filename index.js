var Entities = require("entities");
var FS = require('fs');
var XML2JS = require('xml2js');

var HTTP = require('http');
var HTTPS = require('https');

var Parser = module.exports = {};

var TOP_FIELDS = ['title', 'description', 'author', 'link'];
var ITEM_FIELDS = [
  'title',
  'link',
  'pubDate',
  'author',
]

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
  if (channel['atom:link']) json.feed.feedUrl = channel['atom:link'][0].href;
  TOP_FIELDS.forEach(function(f) {
    if (channel[f]) json.feed[f] = channel[f][0];
  })
  var items = channel.item;
  (items || []).forEach(function(item) {
    var entry = {};
    ITEM_FIELDS.forEach(function(f) {
      if (item[f]) entry[f] = item[f][0];
    })
    if (item.description) {
      entry.content = getContent(item.description[0]);
      entry.contentSnippet = getSnippet(entry.content);
    }
    if (item.guid) {
      entry.guid = item.guid[0]._;
    }
    if (item.category) entry.categories = item.category;
    json.feed.entries.push(entry);
  })
  callback(null, json);
}

Parser.parseString = function(xml, callback) {
  XML2JS.parseString(xml, function(err, result) {
    if (err) throw err;
    if (result.feed) {
      return parseAtomFeed(result, callback)
    } else if (result.rss && result.rss.$.version && result.rss.$.version.indexOf('2') === 0) {
      return parseRSS2(result, callback);
    } else {
      return parseRSS1(result, callback);
    }
  });
}

Parser.parseURL = function(url, callback) {
  var xml = '';
  var get = url.indexOf('https') === 0 ? HTTPS.get : HTTP.get;
  var req = get(url, function(res) {
    if (res.statusCode >= 300) return callback(new Error("Status code " + res.statusCode))
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
