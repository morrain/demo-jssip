'use strict';



const gulp = require('gulp');
const gulpif = require('gulp-if');
const gutil = require('gulp-util');
const less = require('gulp-less');
const autoprefixer = require('gulp-autoprefixer');
const cached = require('gulp-cached');
const remember = require('gulp-remember');
const del = require('del');
const plumber = require('gulp-plumber');
const eslint = require('gulp-eslint');
const rename = require('gulp-rename');
const header = require('gulp-header');
const touch = require('gulp-touch');
const stylus = require('gulp-stylus');
const browserify = require('browserify');
const envify = require('envify/custom');
const uglify = require('gulp-uglify');
const watchify = require('watchify');
const path = require('path');
const PKG = require('./package.json');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const nib = require('nib');
const cssBase64 = require('gulp-css-base64');
const mkdirp = require('mkdirp');
const ncp = require('ncp');

const fs = require('fs');
const BANNER = fs.readFileSync('banner.txt').toString();
const BANNER_OPTIONS = {
    pkg: PKG,
    currentYear: (new Date()).getFullYear()
};

var src = {
    // html 文件
    html: 'src/html/*.html',
    // lib 
    lib: 'src/lib/**/*',
    // style 目录下所有 xx/index.less
    style: 'src/style/*/index.less',
    // 图片，声音等应用资源
    assets: 'src/assets/**/*',
    js: ['src/js/**/*.js', 'src/js/**/*.jsx']
};

var dest = {
    root: 'dest/',
    html: 'dest/',
    style: 'dest/style',
    lib: 'dest/lib',
    assets: 'dest/assets'
};

function logError(err) {
    if (err.message) {
        gutil.log(gutil.colors.red(String(err.message)));
    } else {
        gutil.log(gutil.colors.red(String(err)));
    }
}

gulp.task('style', () => {
    return gulp.src(src.style)
        .pipe(cached('style'))
        .pipe(less())
        .on('error', logError)
        .pipe(autoprefixer({
            browsers: ['last 3 version']
        }))
        .pipe(remember('style'))
        .pipe(gulp.dest(dest.style));
});



gulp.task('env:dev', (done) => {
    gutil.log('setting "dev" environment');

    process.env.NODE_ENV = 'development';
    done();
});

gulp.task('clean', () => del(dest.root, {
    force: true
}));

gulp.task('lint', () => {
    return gulp.src(src.js.concat('gulpfile.js'))
        .pipe(plumber())
        .pipe(eslint({
            plugins: ['react', 'import'],
            extends: ['eslint:recommended', 'plugin:react/recommended'],
            settings: {
                react: {
                    pragma: 'React', // Pragma to use, default to 'React'
                    version: '15' // React version, default to the latest React stable release
                }
            },
            parserOptions: {
                ecmaVersion: 6,
                sourceType: 'module',
                ecmaFeatures: {
                    impliedStrict: true,
                    jsx: true
                }
            },
            envs: [
                'browser',
                'es6',
                'node',
                'commonjs'
            ],
            'rules': {
                'no-console': 0,
                'no-undef': 2,
                'no-unused-vars': [2, {
                    vars: 'all',
                    args: 'after-used'
                }],
                'no-empty': 0,
                'quotes': [2, 'single', {
                    avoidEscape: true
                }],
                'semi': [2, 'always'],
                'no-multi-spaces': 0,
                'no-whitespace-before-property': 2,
                'space-before-blocks': 2,
                'space-before-function-paren': [2, 'never'],
                'space-in-parens': [2, 'never'],
                'spaced-comment': [2, 'always'],
                'comma-spacing': [2, {
                    before: false,
                    after: true
                }],
                'jsx-quotes': [2, 'prefer-single'],
                'react/display-name': [2, {
                    ignoreTranspilerName: false
                }],
                'react/forbid-prop-types': 0, // TODO: recheck
                'react/jsx-boolean-value': 1,
                'react/jsx-closing-bracket-location': 1,
                'react/jsx-curly-spacing': 1,
                'react/jsx-equals-spacing': 1,
                'react/jsx-handler-names': 1,
                'react/jsx-indent-props': [2, 'tab'],
                'react/jsx-indent': [2, 'tab'],
                'react/jsx-key': 1,
                'react/jsx-max-props-per-line': 0,
                'react/jsx-no-bind': 0,
                'react/jsx-no-duplicate-props': 1,
                'react/jsx-no-literals': 0,
                'react/jsx-no-undef': 1,
                'react/jsx-pascal-case': 1,
                'react/jsx-sort-prop-types': 0,
                'react/jsx-sort-props': 0,
                'react/jsx-uses-react': 1,
                'react/jsx-uses-vars': 1,
                'react/no-danger': 1,
                'react/no-deprecated': 1,
                'react/no-did-mount-set-state': 1,
                'react/no-did-update-set-state': 1,
                'react/no-direct-mutation-state': 1,
                'react/no-is-mounted': 1,
                'react/no-multi-comp': 0,
                'react/no-set-state': 0,
                'react/no-string-refs': 0, // TODO: recheck
                'react/no-unknown-property': 1,
                'react/prefer-es6-class': 1,
                'react/prop-types': 1,
                'react/react-in-jsx-scope': 1,
                'react/self-closing-comp': 1,
                'react/sort-comp': 0,
                'react/jsx-wrap-multilines': [1, {
                    declaration: false,
                    assignment: false,
                    return: true
                }],
                'import/extensions': 1
            }
        }))
        .pipe(eslint.format());
});

function bundle(options) {
    options = options || {};

    let watch = !!options.watch;
    let bundler = browserify({
            entries: path.join(__dirname, PKG.main),
            extensions: ['.js', '.jsx'],
            // required for sourcemaps (must be false otherwise)
            debug: process.env.NODE_ENV === 'development',
            // required for watchify
            cache: {},
            // required for watchify
            packageCache: {},
            // required to be true only for watchify
            fullPaths: watch,
            // Don't parse clone dep (not needed)
            noParse: ['clone']
        })
        .transform('babelify', {
            presets: ['es2015', 'react'],
            plugins: ['transform-runtime', 'transform-object-assign']
        })
        .transform(envify({
            NODE_ENV: process.env.NODE_ENV,
            _: 'purge'
        }));

    if (watch) {
        bundler = watchify(bundler);

        bundler.on('update', () => {
            let start = Date.now();

            gutil.log('bundling...');
            rebundle();
            gutil.log('bundle took %sms', (Date.now() - start));
        });
    }

    function rebundle() {
        return bundler.bundle()
            .on('error', logError)
            .pipe(source(`${PKG.name}.js`))
            .pipe(buffer())
            .pipe(rename(`${PKG.name}.js`))
            .pipe(gulpif(process.env.NODE_ENV === 'production',
                uglify()
            ))
            .pipe(header(BANNER, BANNER_OPTIONS))
            .pipe(gulp.dest(dest.root));
    }

    return rebundle();
}

gulp.task('bundle', () => {
    return bundle({
        watch: false
    });
});

gulp.task('bundle:watch', () => {
    return bundle({
        watch: true
    });
});


gulp.task('html', () => {
    return gulp.src('index.html')
        .pipe(gulp.dest(dest.root));
});

gulp.task('css', () => {
    return gulp.src('src/style/index.styl')
        .pipe(plumber())
        .pipe(stylus({
            use: nib(),
            compress: true
        }))
        .on('error', logError)
        .pipe(cssBase64({
            baseDir: '.',
            maxWeightResource: 50000 // So ttf fonts are not included, nice
        }))
        .pipe(rename(`${PKG.name}.css`))
        .pipe(gulp.dest(dest.root))
        .pipe(touch());
});

gulp.task('copy', (done) => {

    // copy assets
    mkdirp.sync(dest.assets);
    ncp('src/assets', dest.assets, {
        stopOnErr: true
    }, (error) => {
        if (error && error[0].code !== 'ENOENT')
            throw new Error(`assets copy failed: ${error}`);

        done();
    });

    // copy libs
    mkdirp.sync(dest.lib);
    ncp('src/lib', dest.lib, {
        stopOnErr: true
    }, (error) => {
        if (error && error[0].code !== 'ENOENT')
            throw new Error(`libs copy failed: ${error}`);

        done();
    });

});


gulp.task('dev', gulp.series(
    'env:dev',
    'clean',
    'lint',
    'bundle',
    'html',
    'css',
    'copy'
));

gulp.task('default', gulp.series('dev'));
