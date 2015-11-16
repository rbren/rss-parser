var Entities = require("entities");
var FS = require('fs');
var XML2JS = require('xml2js');

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

Parser.parseString = function(xml, callback) {
  XML2JS.parseString(xml, function(err, result) {
    if (err) throw err;
    var json = {feed: {}};
    var channel = result.rss.channel[0];
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
        entry.content = item.description[0];
        entry.contentSnippet = Entities.decode(stripHtml(entry.content));
      }
      if (item.guid) {
        entry.guid = item.guid[0]._;
      }
      entry.categories = item.category;
      json.entries = json.entries || [];
      json.entries.push(entry);
    })
    callback(null, json);
  });
}

Parser.parseURL = function(url, callback) {
  return Parser.parseString('', callback);
}

Parser.parseFile = function(file, callback) {
  FS.readFile(file, 'utf8', function(err, contents) {
    return Parser.parseString(contents, callback);
  })
}
