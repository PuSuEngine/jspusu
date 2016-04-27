var gulp = require('gulp');
var source = require('vinyl-source-stream');
var browserify = require('browserify');
var tsify = require('tsify');

var config = {
    dist: __dirname + '/dist/',
    app: {
        path: __dirname + '/src/',
        main: 'pusu.ts',
        result: 'pusu.js'
    }
};

// outputs changes to files to the console
function reportChange(event) {
  console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
}

gulp.task('compile-typescript', function () {
    var bundler = browserify({basedir: config.app.path})
        .add(config.app.path + '/' + config.app.main)
        .plugin(tsify);

    return bundler.bundle()
        .pipe(source(config.app.result))
        .pipe(gulp.dest(config.dist));
});

gulp.task('watch', function () {
  gulp.watch(config.app.path + "/**/*.ts", ['compile-typescript']).on('change', reportChange);
});

gulp.task('default', ['compile-typescript', 'watch']);
