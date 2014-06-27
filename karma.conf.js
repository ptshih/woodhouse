// karma.conf.js
module.exports = function(config) {
  config.set({
    browsers: ['PhantomJS'],
    frameworks: ['qunit'],
    plugins: [
      'karma-qunit',
      'karma-phantomjs-launcher'
    ],
    files: [
      'test/vendor/underscore/underscore.js',
      'test/vendor/jquery/dist/jquery.js',
      'test/vendor/backbone/backbone.js',
      'test/helpers/*.js',
      'woodhouse.js',
      'test/*.spec.js'
    ]
  });
};
