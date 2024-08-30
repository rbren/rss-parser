
'use strict';

if (typeof window === 'undefined') {
  // Node.js environment
  module.exports = require('./lib/parser');
} else {
  // Browser environment
  module.exports = require('./lib/browser-parser');
}
