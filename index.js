const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const babel = require('@babel/core');
const uglifyjs = require('uglify-js');
const cleancss = require('clean-css');
const recursive = require('recursive-readdir');
const StringDecoder = require('string_decoder').StringDecoder;
const decoder = new StringDecoder('utf8');
const less = require('less');
const timeout = 200;
const config = require('./config');

let working = false;

/**
 * Write styles to destination folder
 *
 * @param {String}
 * @return {Void}
*/

const writeCSS = (content) => {
    fs.writeFile(config.css_dest_file, content, (err) => {
        if(err) {
            return console.log(err);
        }

        console.log('CSS update');
    });
};

/**
 * Build styles
 *
 * @return {Boolean}
*/

const buildCSS = () => {
    let styleContent = fs.readFileSync(config.css_src_file, {"flag": 'rs'}); 
        styleContent = decoder.write(styleContent);   

    try {
        less.render(styleContent, {
            "filename": path.resolve(config.css_src_file)
        }, (e, output) => {
            if (e) { console.log(e); return false; }

            try {
                output.css_min = new cleancss({}).minify(output.css).styles;

                writeCSS(output.css_min);
                console.log('CSS build successfull');
                console.log('-----------------');
                return false;
            } catch (err) {
                console.log(err);
                return false;
            }
        });
    } catch (err) {
        console.log(err);
        return false;
    }
};

/**
 * Write javascript file to dest folder
 *
 * @param {String}
 * @return {Void}
*/

const writeJS = (content) => {
    fs.writeFile(config.js_dest_file, content, (err) => {
        if(err) {
            return console.log(err);
        }

        console.log('JS update');
    });
};

/**
 * Build javascripts
 *
 * @return {Boolean}
*/

const buildJS = () => {
    const spacesNo = 2; 
    let jsContent = fs.readFileSync(config.js_src_file, {"flag": 'rs'}); 
        jsContent = decoder.write(jsContent);   

        const fileOpts = {
            plugins: [
                '@babel/transform-arrow-functions',
                '@babel/transform-block-scoping',
                'transform-es2015-parameters',
                '@babel/proposal-throw-expressions'
            ]
        };

        jsContent = babel.transform(jsContent, fileOpts).code;    
        jsContent = uglifyjs.minify(jsContent).code;   

        writeJS(jsContent);

        console.log('JS build successfull');
        console.log('-----------------');        
}

buildJS();
buildCSS();

/* CSS watch */

config.css_paths.forEach((_path, key) => {
    fs.watch(_path, {encoding: 'utf-8'}, (eventType, filename) => {
        if (path.extname(filename) === '.less' && working === false) {
            working = true;

            console.log(' ');
            console.log('> File ' + filename + ' changed');
            console.log(' ');

    		buildCSS();        

            setTimeout(() => {
                working = false;
            }, timeout);
        }
    });
});

/* JS watch */

config.js_paths.forEach((_path, key) => {
    fs.watch(_path, {encoding: 'utf-8'}, (eventType, filename) => {
        if (path.extname(filename) === '.js' && working === false) {
            working = true;

            console.log(' ');
            console.log('> File ' + filename + ' changed');
            console.log(' ');

            buildJS();        

            setTimeout(() => {
                working = false;
            }, timeout);
        }
    });
});