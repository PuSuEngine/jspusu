var gulp = require('gulp');
var source = require('vinyl-source-stream');
var browserify = require('browserify');
var tsify = require('tsify');
var uglify = require('gulp-uglify');
var pump = require('pump');
var rename = require('gulp-rename');

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

gulp.task('compress', function (cb) {
  pump([
        gulp.src('dist/pusu.js'),
        uglify(),
        rename({
            suffix: ".min"
        }),
        gulp.dest('dist')
    ],
    cb
  );
});

gulp.task('build-and-compress', ['compile-typescript', 'compress']);

gulp.task('watch', function () {
  gulp.watch(config.app.path + "/**/*.ts", ['build-and-compress']).on('change', reportChange);
});

gulp.task('default', ['build-and-compress', 'watch']);
