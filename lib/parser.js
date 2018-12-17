"use strict";
const http = require('http');
const https = require('https');
const xml2js = require('xml2js');
const url = require('url');

const fields = require('./fields');
const utils = require('./utils');

const DEFAULT_HEADERS = {
  'User-Agent': 'rss-parser',
  'Accept': 'application/rss+xml',
}
const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_TIMEOUT = 60000;

class Parser {
  constructor(options={}) {
    options.headers = options.headers || {};
    options.xml2js = options.xml2js || {};
    options.customFields = options.customFields || {};
    options.customFields.item = options.customFields.item || [];
    options.customFields.feed = options.customFields.feed || [];
    if (!options.maxRedirects) options.maxRedirects = DEFAULT_MAX_REDIRECTS;
    if (!options.timeout) options.timeout = DEFAULT_TIMEOUT;
    this.options = options;
    this.xmlParser = new xml2js.Parser(this.options.xml2js);
  }

  parseString(xml, callback) {
    let prom = new Promise((resolve, reject) => {
      this.xmlParser.parseString(xml, (err, result) => {
        if (err) return reject(err);
        if (!result) {
          return reject(new Error('Unable to parse XML.'));
        }
        let feed = null;
        if (result.feed) {
          feed = this.buildAtomFeed(result);
        } else if (result.rss && result.rss.$ && result.rss.$.version && result.rss.$.version.match(/^2/)) {
          feed = this.buildRSS2(result);
        } else if (result['rdf:RDF']) {
          feed = this.buildRSS1(result);
        } else if (result.rss && result.rss.$ && result.rss.$.version && result.rss.$.version.match(/0\.9/)) {
          feed = this.buildRSS0_9(result);
        } else if (result.rss && this.options.defaultRSS) {
          switch(this.options.defaultRSS) {
            case 0.9:
              feed = this.buildRSS0_9(result);
              break;
            case 1:
              feed = this.buildRSS1(result);
              break;
            case 2:
              feed = this.buildRSS2(result);
              break;
            default:
              return reject(new Error("default RSS version not recognized."))
          }
        } else {
          return reject(new Error("Feed not recognized as RSS 1 or 2."))
        }
        resolve(feed);
      });
    });
    prom = utils.maybePromisify(callback, prom);
    return prom;
  }

  parseURL(feedUrl, callback, redirectCount=0) {
    let xml = '';
    let get = feedUrl.indexOf('https') === 0 ? https.get : http.get;
    let urlParts = url.parse(feedUrl);
    let headers = Object.assign({}, DEFAULT_HEADERS, this.options.headers);
    let prom = new Promise((resolve, reject) => {
      let req = get({
        headers,
        auth: urlParts.auth,
        protocol: urlParts.protocol,
        hostname: urlParts.hostname,
        port: urlParts.port,
        path: urlParts.path,
      }, (res) => {
        if (this.options.maxRedirects && res.statusCode >= 300 && res.statusCode < 400 && res.headers['location']) {
          if (redirectCount === this.options.maxRedirects) {
            return reject(new Error("Too many redirects"));
          } else {
            return this.parseURL(res.headers['location'], null, redirectCount + 1).then(resolve, reject);
          }
        } else if (res.statusCode >= 300) {
          return reject(new Error("Status code " + res.statusCode))
        }
        let encoding = utils.getEncodingFromContentType(res.headers['content-type']);
        res.setEncoding(encoding);
        res.on('data', (chunk) => {
          xml += chunk;
        });
        res.on('end', () => {
          return this.parseString(xml).then(resolve, reject);
        });
      })
      req.setTimeout(this.options.timeout, () => {
        return reject(new Error("Request timed out after " + this.options.timeout + "ms"));
      });
      req.on('error', reject);
    });
    prom = utils.maybePromisify(callback, prom);
    return prom;
  }

  buildAtomFeed(xmlObj) {
    let feed = {items: []};
    utils.copyFromXML(xmlObj.feed, feed, this.options.customFields.feed);
    if (xmlObj.feed.link) {
      feed.link = utils.getLink(xmlObj.feed.link, 'alternate', 0);
      feed.feedUrl = utils.getLink(xmlObj.feed.link, 'self', 1);
    }
    if (xmlObj.feed.title) {
      let title = xmlObj.feed.title[0] || '';
      if (title._) title = title._
      if (title) feed.title = title;
    }
    if (xmlObj.feed.updated) {
      feed.lastBuildDate = xmlObj.feed.updated[0];
    }
    (xmlObj.feed.entry || []).forEach(entry => {
      let item = {};
      utils.copyFromXML(entry, item, this.options.customFields.item);
      if (entry.title) {
        let title = entry.title[0] || '';
        if (title._) title = title._;
        if (title) item.title = title;
      }
      if (entry.link && entry.link.length) {
        item.link = utils.getLink(entry.link, 'alternate', 0);
      }
      if (entry.published && entry.published.length && entry.published[0].length) item.pubDate = new Date(entry.published[0]).toISOString();
      if (!item.pubDate && entry.updated && entry.updated.length && entry.updated[0].length) item.pubDate = new Date(entry.updated[0]).toISOString();
      if (entry.author && entry.author.length) item.author = entry.author[0].name[0];
      if (entry.content && entry.content.length) {
        item.content = utils.getContent(entry.content[0]);
        item.contentSnippet = utils.getSnippet(item.content)
      }
      if (entry.id) {
        item.id = entry.id[0];
      }
      this.setISODate(item);
      feed.items.push(item);
    });
    return feed;
  }

  buildRSS0_9(xmlObj) {
    var channel = xmlObj.rss.channel[0];
    var items = channel.item;
    return this.buildRSS(channel, items);
  }

  buildRSS1(xmlObj) {
    xmlObj = xmlObj['rdf:RDF'];
    let channel = xmlObj.channel[0];
    let items = xmlObj.item;
    return this.buildRSS(channel, items);
  }

  buildRSS2(xmlObj) {
    let channel = xmlObj.rss.channel[0];
    let items = channel.item;
    let feed = this.buildRSS(channel, items);
    if (xmlObj.rss.$ && xmlObj.rss.$['xmlns:itunes']) {
      this.decorateItunes(feed, channel);
    }
    return feed;
  }

  buildRSS(channel, items) {
    items = items || [];
    let feed = {items: []};
    let feedFields = fields.feed.concat(this.options.customFields.feed);
    let itemFields = fields.item.concat(this.options.customFields.item);
    if (channel['atom:link']) feed.feedUrl = channel['atom:link'][0].$.href;
    if (channel.image && channel.image[0] && channel.image[0].url) {
      feed.image = {};
      let image = channel.image[0];
      if (image.link) feed.image.link = image.link[0];
      if (image.url) feed.image.url = image.url[0];
      if (image.title) feed.image.title = image.title[0];
      if (image.width) feed.image.width = image.width[0];
      if (image.height) feed.image.height = image.height[0];
    }
    utils.copyFromXML(channel, feed, feedFields);
    items.forEach(xmlItem => {
      let item = {};
      utils.copyFromXML(xmlItem, item, itemFields);
      if (xmlItem.enclosure) {
        item.enclosure = xmlItem.enclosure[0].$;
      }
      if (xmlItem.description) {
        item.content = utils.getContent(xmlItem.description[0]);
        item.contentSnippet = utils.getSnippet(item.content);
      }
      if (xmlItem.guid) {
        item.guid = xmlItem.guid[0];
        if (item.guid._) item.guid = item.guid._;
      }
      if (xmlItem.category) item.categories = xmlItem.category;
      this.setISODate(item);
      feed.items.push(item);
    });
    return feed;
  }

  /**
   * Add iTunes specific fields from XML to extracted JSON
   *
   * @access public
   * @param {object} feed extracted
   * @param {object} channel parsed XML
   */
  decorateItunes(feed, channel) {
    let items = channel.item || [],
        entry = {};
    feed.itunes = {}

    if (channel['itunes:owner']) {
      let owner = {},
          image;

      if(channel['itunes:owner'][0]['itunes:name']) {
        owner.name = channel['itunes:owner'][0]['itunes:name'][0];
      }
      if(channel['itunes:owner'][0]['itunes:email']) {
        owner.email = channel['itunes:owner'][0]['itunes:email'][0];
      }
      if(channel['itunes:image']) {
        let hasImageHref = (channel['itunes:image'][0] &&
                              channel['itunes:image'][0].$ &&
                              channel['itunes:image'][0].$.href);
        image = hasImageHref ? channel['itunes:image'][0].$.href : null;
      }

      if(image) {
        feed.itunes.image = image;
      }
      feed.itunes.owner = owner;
    }

    utils.copyFromXML(channel, feed.itunes, fields.podcastFeed);
    items.forEach((item, index) => {
      let entry = feed.items[index];
      entry.itunes = {};
      utils.copyFromXML(item, entry.itunes, fields.podcastItem);
      let image = item['itunes:image'];
      if (image && image[0] && image[0].$ && image[0].$.href) {
        entry.itunes.image = image[0].$.href;
      }
    });
  }

  setISODate(item) {
    let date = item.pubDate || item.date;
    if (date) {
      try {
        item.isoDate = new Date(date.trim()).toISOString();
      } catch (e) {
        // Ignore bad date format
      }
    }
  }
}

module.exports = Parser;
