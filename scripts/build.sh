set -e
webpack
cp dist/rss-parser.min.js dist/rss-parser.js
webpack -p
