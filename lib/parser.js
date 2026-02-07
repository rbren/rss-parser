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
    options.requestOptions = options.requestOptions || {};
    if (!options.maxRedirects) options.maxRedirects = DEFAULT_MAX_REDIRECTS;
    if (!options.timeout) options.timeout = DEFAULT_TIMEOUT;
    this.options = options;
    this.xmlParser = new xml2js.Parser(this.options.xml2js);
    this.orderedXmlParser = new xml2js.Parser(Object.assign({}, this.options.xml2js, {
      preserveChildrenOrder: true,
      explicitChildren: true,
    }));
    this.etags = {};
    this.lastModified = {};
  }

  parseString(xml, callback) {
    let prom = new Promise((resolve, reject) => {
      this.xmlParser.parseString(xml, (err, result) => {
        if (err) return reject(err);
        if (!result) {
          return reject(new Error('Unable to parse XML.'));
        }
        this.orderedXmlParser.parseString(xml, (err2, orderedResult) => {
          this._orderedResult = err2 ? null : orderedResult;
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
          this._orderedResult = null;
          resolve(feed);
        });
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
    if (this.etags[feedUrl]) {
      headers['If-None-Match'] = this.etags[feedUrl];
    }
    if (this.lastModified[feedUrl]) {
      headers['If-Modified-Since'] = this.lastModified[feedUrl];
    }
    let timeout = null;
    let prom = new Promise((resolve, reject) => {
      const requestOpts = Object.assign({headers}, urlParts, this.options.requestOptions);
      let req = get(requestOpts, (res) => {
        if (this.options.maxRedirects && res.statusCode >= 300 && res.statusCode < 400 && res.headers['location']) {
          if (redirectCount === this.options.maxRedirects) {
            return reject(new Error("Too many redirects"));
          } else {
            const newLocation = url.resolve(feedUrl, res.headers['location']);
            return this.parseURL(newLocation, null, redirectCount + 1).then(resolve, reject);
          }
        } else if (res.statusCode === 304) {
          return resolve(null);
        }
        else if (res.statusCode >= 300) {
          return reject(new Error("Status code " + res.statusCode));
        }

        if (res.headers['etag']) {
          this.etags[feedUrl] = res.headers['etag'];
        }

        if (res.headers['last-modified']) {
          this.lastModified[feedUrl] = res.headers['last-modified'];
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
      req.on('error', reject);
      timeout = setTimeout(() => {
        let err = new Error("Request timed out after " + this.options.timeout + "ms");
        req.destroy(err);
        reject(err);
      }, this.options.timeout);
    }).then(data => {
      clearTimeout(timeout);
      return Promise.resolve(data);
    }, e => {
      clearTimeout(timeout);
      return Promise.reject(e);
    });
    prom = utils.maybePromisify(callback, prom);
    return prom;
  }

  _getOrderedItems(feedType) {
    if (!this._orderedResult) return [];
    try {
      if (feedType === 'atom') {
        return this._orderedResult.feed.$$.filter(c => c['#name'] === 'entry');
      } else if (feedType === 'rss1') {
        let rdf = this._orderedResult['rdf:RDF'];
        return rdf.$$.filter(c => c['#name'] === 'item');
      } else {
        let channel = this._orderedResult.rss.$$.find(c => c['#name'] === 'channel');
        return channel.$$.filter(c => c['#name'] === 'item');
      }
    } catch (e) {
      return [];
    }
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
    let orderedEntries = this._getOrderedItems('atom');
    feed.items = (xmlObj.feed.entry || []).map((entry, index) => this.parseItemAtom(entry, orderedEntries[index]));
    return feed;
  }

  parseItemAtom(entry, orderedEntry) {
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
    if (entry.author && entry.author.length && entry.author[0].name && entry.author[0].name.length) item.author = entry.author[0].name[0];
    if (entry.content && entry.content.length) {
      let orderedContent = orderedEntry && orderedEntry.$$ && orderedEntry.$$.find(c => c['#name'] === 'content');
      if (orderedContent && orderedContent.$$) {
        item.content = utils.buildOrderedContent(orderedContent);
      } else {
        item.content = utils.getContent(entry.content[0]);
      }
      item.contentSnippet = utils.getSnippet(item.content)
    }
    if (entry.summary && entry.summary.length) {
      item.summary = utils.getContent(entry.summary[0]);
    }
    if (entry.id) {
      item.id = entry.id[0];
    }
    this.setISODate(item);
    return item;
  }

  buildRSS0_9(xmlObj) {
    var channel = xmlObj.rss.channel[0];
    var items = channel.item;
    return this.buildRSS(channel, items, 'rss');
  }

  buildRSS1(xmlObj) {
    xmlObj = xmlObj['rdf:RDF'];
    let channel = xmlObj.channel[0];
    let items = xmlObj.item;
    return this.buildRSS(channel, items, 'rss1');
  }

  buildRSS2(xmlObj) {
    let channel = xmlObj.rss.channel[0];
    let items = channel.item;
    let feed = this.buildRSS(channel, items, 'rss');
    if (xmlObj.rss.$ && xmlObj.rss.$['xmlns:itunes']) {
      this.decorateItunes(feed, channel);
    }
    return feed;
  }

  buildRSS(channel, items, feedType) {
    items = items || [];
    let feed = {items: []};
    let feedFields = fields.feed.concat(this.options.customFields.feed);
    let itemFields = fields.item.concat(this.options.customFields.item);
    if (channel['atom:link'] && channel['atom:link'][0] && channel['atom:link'][0].$) {
      feed.feedUrl = channel['atom:link'][0].$.href;
    }
    if (channel.image && channel.image[0] && channel.image[0].url) {
      feed.image = {};
      let image = channel.image[0];
      if (image.link) feed.image.link = image.link[0];
      if (image.url) feed.image.url = image.url[0];
      if (image.title) feed.image.title = image.title[0];
      if (image.width) feed.image.width = image.width[0];
      if (image.height) feed.image.height = image.height[0];
    }
    const paginationLinks = this.generatePaginationLinks(channel);
    if (Object.keys(paginationLinks).length) {
      feed.paginationLinks = paginationLinks;
    }
    utils.copyFromXML(channel, feed, feedFields);
    let orderedItems = this._getOrderedItems(feedType);
    feed.items = items.map((xmlItem, index) => this.parseItemRss(xmlItem, itemFields, orderedItems[index]));
    return feed;
  }

  parseItemRss(xmlItem, itemFields, orderedItem) {
    let item = {};
    utils.copyFromXML(xmlItem, item, itemFields);
    if (xmlItem.enclosure) {
      item.enclosure = xmlItem.enclosure[0].$;
    }
    if (xmlItem.description) {
      let orderedDesc = orderedItem && orderedItem.$$ && orderedItem.$$.find(c => c['#name'] === 'description');
      if (orderedDesc && orderedDesc.$$) {
        item.content = utils.buildOrderedContent(orderedDesc);
      } else {
        item.content = utils.getContent(xmlItem.description[0]);
      }
      item.contentSnippet = utils.getSnippet(item.content);
    }
    if (xmlItem.guid) {
      item.guid = xmlItem.guid[0];
      if (item.guid._) item.guid = item.guid._;
    }
    if (xmlItem.$ && xmlItem.$['rdf:about']) {
      item['rdf:about'] = xmlItem.$['rdf:about']
    }
    if (xmlItem.category) item.categories = xmlItem.category;

    var mediaContent = xmlItem['media:content']?.[0]?.$ ?? null;
    if(mediaContent) item.mediaContent = mediaContent;

    this.setISODate(item);
    return item;
  }

  /**
   * Add iTunes specific fields from XML to extracted JSON
   *
   * @access public
   * @param {object} feed extracted
   * @param {object} channel parsed XML
   */
  decorateItunes(feed, channel) {
    let items = channel.item || [];
    let categories = [];
    feed.itunes = {}

    if (channel['itunes:owner']) {
      let owner = {};

      if(channel['itunes:owner'][0]['itunes:name']) {
        owner.name = channel['itunes:owner'][0]['itunes:name'][0];
      }
      if(channel['itunes:owner'][0]['itunes:email']) {
        owner.email = channel['itunes:owner'][0]['itunes:email'][0];
      }
      feed.itunes.owner = owner;
    }

    if (channel['itunes:image']) {
      let image;
      let hasImageHref = (channel['itunes:image'][0] &&
        channel['itunes:image'][0].$ &&
        channel['itunes:image'][0].$.href);
      image = hasImageHref ? channel['itunes:image'][0].$.href : null;
      if (image) {
        feed.itunes.image = image;
      }
    }

    if (channel['itunes:category']) {
      const categoriesWithSubs = channel['itunes:category'].map((category) => {
        return {
          name: category && category.$ && category.$.text,
          subs: category['itunes:category'] ?
            category['itunes:category']
              .map((subcategory) => ({
                name: subcategory && subcategory.$ && subcategory.$.text
              })) : null,
        };
      });

      feed.itunes.categories = categoriesWithSubs.map((category) => category.name);
      feed.itunes.categoriesWithSubs = categoriesWithSubs;
    }

    if (channel['itunes:keywords']) {
      if (channel['itunes:keywords'].length > 1) {
        feed.itunes.keywords = channel['itunes:keywords'].map(
          keyword => keyword && keyword.$ && keyword.$.text
        );
      } else {
        let keywords = channel['itunes:keywords'][0];
        if (keywords && typeof keywords._ === 'string') {
          keywords = keywords._;
        }

        if (keywords && keywords.$ && keywords.$.text) {
          feed.itunes.keywords = keywords.$.text.split(',')
        } else if (typeof keywords === "string") {
          feed.itunes.keywords = keywords.split(',');
        }
      }
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

  /**
   * Generates a pagination object where the rel attribute is the key and href attribute is the value
   *  { self: 'self-url', first: 'first-url', ...  }
   *
   * @access private
   * @param {Object} channel parsed XML
   * @returns {Object}
   */
  generatePaginationLinks(channel) {
    if (!channel['atom:link']) {
      return {};
    }
    const paginationRelAttributes = ['self', 'first', 'next', 'prev', 'last'];

    return channel['atom:link'].reduce((paginationLinks, link) => {
      if (!link.$ || !paginationRelAttributes.includes(link.$.rel)) {
        return paginationLinks;
      }
      paginationLinks[link.$.rel] = link.$.href;
      return paginationLinks;
    }, {});
  }
}

module.exports = Parser;
