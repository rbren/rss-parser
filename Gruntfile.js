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
        }
    });
    grunt.loadNpmTasks('grunt-browserify');
}
