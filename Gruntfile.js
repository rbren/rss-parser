module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        outputFolder: "./dist",
        browserify: {
            main: {
                src: ['index.js'],
                dest: '<%= outputFolder %>/<%= pkg.name %>.js',
                options: {
                    browserifyOptions: { standalone: 'RSSParser' },
                    banner: '/*! <%= pkg.name %> <%= pkg.version %> */\n',
                },
            }
        },
        uglify: {
            dist: {
                files: {
                  './dist/rss-parser.min.js': ['./dist/rss-parser.js']
                }
            }
        },
    });
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.registerTask('build', ['browserify', 'uglify:dist']);
}
