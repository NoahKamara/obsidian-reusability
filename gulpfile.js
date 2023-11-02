const gulp = require("gulp")
const copy = require("gulp-copy")
const ts = require("gulp-typescript")
var clean = require('gulp-clean');

const project = ts.createProject("tsconfig.json")

// Clean dist folder
gulp.task('clean-dist', function () {
    return gulp
        .src('dist/*', { read: false })
        .pipe(clean());
});

// Compile TS to JS
gulp.task('compile-ts', async function () {
    return project
        .src()
        .pipe(ts({ declaration: true }))
        .js
        .pipe(gulp.dest("dist"))
});

gulp.task('copy-assets', function () {
    return gulp
        .src("public/*")
        .pipe(gulp.dest("dist"))
});

gulp.task('default', gulp.series([
    'clean-dist',
    'compile-ts',
    'copy-assets'
]), function () {
    return gulp
        .src('app/scripts/*.js')
        .pipe(gulp.dest('app/tmp'));
});

