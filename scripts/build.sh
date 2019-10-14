set -e
webpack --mode=development --target=web
webpack --mode=production --target=web --output-filename=dist/[name].min.js --profile --json > dist/stats.json

