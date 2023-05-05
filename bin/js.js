#!/usr/bin/env node

var browserify = require('browserify');
var watchify = require('watchify');
var exorcist = require('exorcist');
var fs = require('fs');
var path = require('path');
var chalk = require('chalk');
var pkg = require('../package.json');
var mkdirp = require('mkdirp');
var argv = require('minimist')(process.argv.slice(2));

pkg.paths.js.forEach((jsPath) => {
    mkdirp(jsPath.dest, function (err) {
        if (err) {
            console.error(err);
            return;
        }
        var options = {
            paths: jsPath,
            watching: Boolean(argv.w || argv.watch),
            sourcemaps: Boolean(argv.sourcemaps)
        }
        var b = createBundler(options);
        if (!b) {
            return;
        }
        rebundle(b, options);
    });
});

function createBundler (options) {
    try {
        var stat = fs.statSync(options.paths.src);
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.error(options.paths.src + ' is not found.');
            return;
        } else {
            throw err;
        }
    }

    var filename, dirname;
    if (stat.isDirectory()) {
        dirname = options.paths.src;
        // trying to heuristically determine JS file name,
        // in order of index.js, main.js and app.js
        try {
            fs.statSync(options.paths.src + '/index.js');
            filename = 'index.js';
        } catch (e) {
            try {
                fs.statSync(options.paths.src + '/main.js');
                filename = 'main.js';
            } catch (e) {
                try {
                    fs.statSync(options.paths.src + '/app.js');
                    filename = 'app.js';
                } catch (e) {
                    console.error('Unable to find a JS file to bundle.');
                    return;
                }
            }
        }
    } else if (stat.isFile()) {
        dirname = path.dirname(options.paths.src);
        filename = path.basename(options.paths.src);
    }

    var opts = {
        entries: path.resolve(dirname, filename),
        debug: options.sourcemaps
    };

    if (options.watching) {
        opts = Object.assign(opts, watchify.args);
    }

    var bundler = browserify(opts);
    if (options.watching) {
        bundler = watchify(bundler);
    }

    // optionally transform
    // bundler.transform('transformer');

    bundler.on('update', function (ids) {
        console.log('File(s) changed: ' + chalk.cyan(ids));
        console.log('Rebundling...');
        rebundle(bundler, options);
    });

    bundler.on('log', console.log.bind(console));

    return bundler;
}

function rebundle (b, options) {
    var filename = path.basename(b._options.entries);
    var bundle = b.bundle()
        .on('error', function (e) {
            console.log(chalk.red('Browserify Error: ', e));
        })
        .on('end', function () {
            console.log(chalk.green(b._options.entries
                + ' -> ' + path.resolve(options.paths.dest, filename)
            ));
        });
    // sourcemaps
    if (options.sourcemaps) {
        bundle = bundle.pipe(exorcist(path.resolve(options.paths.dest, filename + '.map')))
    }
    bundle.pipe(fs.createWriteStream(path.resolve(options.paths.dest, filename)));
}
