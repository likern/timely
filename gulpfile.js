let babel = require('rollup-plugin-babel'),
    buffer = require('vinyl-buffer'),
    filter = require('gulp-filter'),
    gulpif = require('gulp-if'),
    lazypipe = require('lazypipe'),
    path = require('path'),
    rename = require('gulp-rename'),
    reporter = require('tap-min'),
    rollup = require('rollup-stream'),
    source = require('vinyl-source-stream'),
    sourcemaps = require('gulp-sourcemaps'),
    tape = require('gulp-tape'),
    uglify = require('gulp-uglify'),
    gulp = require('gulp');

function process(inopts){
  let opts = Object.assign(
    {
      entry: inopts.entry,
      sourceMap: true,
      format: inopts.format,
      plugins: []
    },
    inopts.rollupOpts || {}
  );

  if (inopts.compile || typeof(inopts.compile) == 'undefined'){
    opts.plugins.push(babel());
  }

  return rollup(opts);
}

function processLib(opts){

  return function(){
    opts.entry = './src/luxon.js';

    let dest = `./dist/${opts.dest || opts.format}`,
        minify = lazypipe()
          .pipe(filter, ['**/*.js'])
          .pipe(uglify)
          .pipe(rename, {extname: '.min.js'})
          .pipe(sourcemaps.write, '.')
          .pipe(gulp.dest, dest);

    return process(opts)
      .pipe(source('luxon.js'))
      .pipe(buffer())
      .pipe(sourcemaps.init({loadMaps: true}))
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest(dest))
      .pipe(gulpif(opts.mini), minify());
  };
}

function resolveLib(opts = {}){
  return {
    //It's sort of annoying that we compile the whole library into the tests.
    //Ideally, there would be a Rollup option to replace it with a customized
    //external import, so I could point it at dist/cjs/luxon.js
    resolveId: (importee) =>
      importee === 'luxon' ? path.resolve(__dirname, 'src/luxon.js') : null
  };
}

gulp.task('cjs', processLib({
  format: 'cjs'
}));

gulp.task('es6', processLib({
  format: 'es',
  dest: 'es6',
  compile: false
}));

gulp.task('amd', processLib({
  format: 'amd',
  mini: true
}));

gulp.task('global-es6', processLib({
  format: 'iife',
  rollupOpts: {moduleName: 'luxon'},
  dest: 'global-es6',
  compile: false
}));

gulp.task('global', processLib({
  format: 'iife',
  rollupOpts: {moduleName: 'luxon'},
  dest: 'global',
  mini: true
}));

gulp.task('build', ['cjs', 'es6', 'amd', 'global', 'global-es6']);

gulp.task('test', function(){
  process({
    entry: 'test/index.js',
    format: 'cjs',
    rollupOpts: {
      plugins: [resolveLib()],
      external: ['tape']
    }
  })
    .pipe(source('index.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('.compiled-tests/node'))
    .pipe(filter(['.compiled-tests/node/*.js']))
    .pipe(tape({reporter: reporter()})) ;
});

gulp.task('browserTest', ['global'], function(){
  gulp
    .src('test/index.js')
    .pipe(process({
      format: 'iife'
    }))
    .pipe(gulp.dest('.compiled-tests/browser'));
});

gulp.task('default', ['build']);