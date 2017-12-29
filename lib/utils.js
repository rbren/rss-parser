const utils = module.exports = {};
const entities = require('entities');
const xml2js = require('xml2js');

utils.stripHtml = function(str) {
  return str.replace(/<(?:.|\n)*?>/gm, '');
}

utils.getSnippet = function(str) {
  return entities.decode(utils.stripHtml(str)).trim();
}

utils.getLink = function(links, rel, fallbackIdx) {
  if (!links) return;
  for (var i = 0; i < links.length; ++i) {
    if (links[i].$.rel === rel) return links[i].$.href;
  }
  if (links[fallbackIdx]) return links[fallbackIdx].$.href;
}

utils.getContent = function(content) {
  if (typeof content._ === 'string') {
    return content._;
  } else if (typeof content === 'object') {
    var builder = new xml2js.Builder({headless: true, explicitRoot: true, rootName: 'div', renderOpts: {pretty: false}});
    return builder.buildObject(content);
  } else {
    return content;
  }
}

utils.copyFromXML = function(xml, dest, fields) {
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

utils.maybePromisify = function(callback, promise) {
  if (!callback) return promise;
  return promise.then(
    data => setTimeout(() => callback(null, data)),
    err => setTimeout(() => callback(err))
  );
}
