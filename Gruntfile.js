module.exports = function(grunt) {
  // Load all grunt tasks
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    meta: {
      testFiles: ['test/**/*.js', '!test/vendor/**'],
      libFiles: ['woodhouse.js']
    },
    karma: {
      options: {
        configFile: 'karma.conf.js'
      },
      unit: {
        background: true,
        reporter: 'dots'
      },
      continuous: {
        singleRun: true,
        browsers: ['PhantomJS']
      }
    },
    jshint: {
      options: {
        jshintrc: true
      },
      files: ['<%= meta.libFiles %>']
    },
    watch: {
      karma: {
        files: ['<%= meta.testFiles %>', '<%= meta.libFiles %>'],
        // Ensure karma server is running
        tasks: ['jshint', 'karma:unit:run']
      }
    }
  });

  grunt

  // Default task(s).
  grunt.registerTask('default', ['ci']);

  grunt.registerTask('dev', ['jshint', 'karma:unit:start', 'watch']);
  grunt.registerTask('ci', ['jshint', 'karma:continuous']);

};
