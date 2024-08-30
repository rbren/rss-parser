
"use strict";
const xml2js = require('xml2js');
const utils = require('./utils');
const fields = require('./fields');

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
    options.requestOptions = options.requestOptions || {};
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
    let prom = new Promise((resolve, reject) => {
      fetch(feedUrl, {
        headers: Object.assign({}, DEFAULT_HEADERS, this.options.headers),
        redirect: 'follow',
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP Error Response: ${response.status} ${response.statusText}`);
        }
        return response.text();
      })
      .then(xml => this.parseString(xml))
      .then(resolve)
      .catch(reject);
    });
    prom = utils.maybePromisify(callback, prom);
    return prom;
  }

  buildRSS0_9(xmlObj) {
    let channel = xmlObj.rss.channel[0];
    let items = channel.item || [];
    return this.buildRSS(channel, items);
  }

  buildRSS1(xmlObj) {
    let channel = xmlObj['rdf:RDF'].channel[0];
    let items = xmlObj['rdf:RDF'].item || [];
    return this.buildRSS(channel, items);
  }

  buildRSS2(xmlObj) {
    let channel = xmlObj.rss.channel[0];
    let items = channel.item || [];
    let feed = this.buildRSS(channel, items);
    if (xmlObj.rss.$ && xmlObj.rss.$['xmlns:itunes']) {
      this.decorateItunes(feed, channel);
    }
    return feed;
  }

  buildAtomFeed(xmlObj) {
    let feed = {items: []};
    let channel = xmlObj.feed;
    if (channel.link) {
      feed.link = channel.link[0].$.href;
      feed.feedUrl = channel.link[0].$.href;
    }
    if (channel.title) {
      let title = channel.title[0] || '';
      if (title._) title = title._
      if (title) feed.title = title;
    }
    if (channel.updated) {
      feed.lastBuildDate = channel.updated[0];
    }
    feed.items = (channel.entry || []).map(entry => this.parseItemAtom(entry));
    return feed;
  }

  buildRSS(channel, items) {
    let feed = {items: []};
    if (channel.title) {
      let title = channel.title[0];
      if (title._) title = title._;
      if (title) feed.title = title;
    }
    if (channel.link) {
      let link = channel.link[0];
      if (link._) link = link._;
      if (link) feed.link = link;
    }
    if (channel.description) {
      let description = channel.description[0];
      if (description._) description = description._;
      if (description) feed.description = description;
    }
    if (channel.lastBuildDate) {
      feed.lastBuildDate = channel.lastBuildDate[0];
    }
    if (channel.pubDate) {
      feed.pubDate = channel.pubDate[0];
    }
    feed.items = items.map(xmlItem => this.parseItemRSS(xmlItem));
    return feed;
  }

  parseItemAtom(entry) {
    let item = {};
    if (entry.title) {
      let title = entry.title[0] || '';
      if (title._) title = title._;
      if (title) item.title = title;
    }
    if (entry.link && entry.link.length) {
      item.link = entry.link[0].$.href;
    }
    if (entry.published && entry.published.length && entry.published[0]) {
      item.pubDate = new Date(entry.published[0]).toISOString();
    }
    if (entry.content && entry.content.length) {
      item.content = entry.content[0]._ || entry.content[0];
      item.contentSnippet = utils.getSnippet(item.content)
    }
    if (entry.summary && entry.summary.length) {
      item.summary = entry.summary[0];
    }
    if (entry.id) {
      item.id = entry.id[0];
    }
    this.setISODate(item);
    return item;
  }

  parseItemRSS(xmlItem) {
    let item = {};
    if (xmlItem.title) {
      let title = xmlItem.title[0];
      if (title._) title = title._;
      if (title) item.title = title;
    }
    if (xmlItem.link) {
      let link = xmlItem.link[0];
      if (link._) link = link._;
      if (link) item.link = link;
    }
    if (xmlItem.description) {
      let description = xmlItem.description[0];
      if (description._) description = description._;
      if (description) {
        item.content = description;
        item.contentSnippet = utils.getSnippet(description);
      }
    }
    if (xmlItem.pubDate) {
      item.pubDate = xmlItem.pubDate[0];
    }
    if (xmlItem['dc:creator']) {
      item.creator = xmlItem['dc:creator'][0];
    }
    if (xmlItem.category) {
      item.categories = xmlItem.category;
    }
    this.setISODate(item);
    return item;
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
