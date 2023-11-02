const gulp = require("gulp")
const copy = require("gulp-copy")
const ts = require("gulp-typescript")
var clean = require('gulp-clean');

const project = ts.createProject("tsconfig.json")

function swallowError (error) {
    // If you want details of the error in the console
    console.log(error.toString())
  
    this.emit('end')
  }

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
        .on('error', swallowError)
        .js
        .pipe(gulp.dest("dist"))
});

gulp.task('copy-assets', function () {
    return gulp
        .src("public/*", { dot: true })
        .pipe(gulp.dest("dist"))
});



gulp.task('build', gulp.series([
    'clean-dist',
    'compile-ts',
    'copy-assets'
]), function () {
    return gulp
        .src('app/scripts/*.js')
        .pipe(gulp.dest('app/tmp'));
});

gulp.task('default', gulp.series([
    'clean-dist',
    'compile-ts',
    'copy-assets'
]), function () {
    return gulp.task("build")
});

gulp.task('copy-to-vault', function () {
    const pluginPath = "/Users/noahkamara/Library/Mobile Documents/iCloud~md~obsidian/Documents/Vault/.obsidian/plugins/Reusability/"
   
    return gulp
        .src("dist/*", { dot: true })
        .pipe(gulp.dest(pluginPath))
});



gulp.task('watch', function () {
    const files = ['src/*.ts', 'public/*']
    const tasks = ['build', 'copy-to-vault']
    gulp.watch(files, { ignoreInitial: false }, gulp.series(tasks));
});

