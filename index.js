var FS = require('fs');
var Parser = module.exports = {};

Parser.parse = function(xml, callback) {
  callback(null, {});
}

Parser.parseURL = function(url, callback) {
  return Parser.parse('', callback);
}

Parser.parseFile = function(file, callback) {
  FS.readFile(file, 'utf8', function(err, contents) {
    return Parser.parse(contents, callback);
  })
}
