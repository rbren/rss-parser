set -e
echo "Building dev..."
webpack-cli --mode=development --target=web
echo "Building prod..."
webpack-cli --mode=production --target=web --output-filename=dist/[name].min.js --profile --json > dist/stats.json

