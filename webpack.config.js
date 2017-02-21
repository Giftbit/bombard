var failPlugin = require('webpack-fail-plugin');
var ZipPlugin = require('zip-webpack-plugin');

module.exports = {
    entry: './src/lambda/index.ts',
    target: 'node',
    node: {
        // Allow these globals.
        __filename: false,
        __dirname: false
    },
    output: {
        path: './lib/lambda',
        filename: 'index.js',
        libraryTarget: 'commonjs2'
    },
    externals: {
        // These modules are already installed on the Lambda instance.
        'aws-sdk': 'aws-sdk',
        'awslambda': 'awslambda',
        'dynamodb-doc': 'dynamodb-doc',
        'imagemagick': 'imagemagick'
    },
    bail: true,
    resolve: {
        extensions: ['', '.webpack.js', '.web.js', '.ts', '.tsx', '.js','.json']
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                loader: 'babel-loader?presets[]=es2015&compact=false'
            },
            {
                test: /\.json$/,
                loader: 'json-loader'
            },
            {
                test: /\.ts(x?)$/,
                loader: 'babel-loader?presets[]=es2015&compact=false!ts-loader'
            },
            {
                test: /\.jpe?g$|\.gif$|\.png$|\.svg$|\.woff$|\.ttf$|\.wav$|\.mp3$/,
                loader: "file-loader"
            }
        ]
    },
    plugins: [
        failPlugin,
        new ZipPlugin({
            filename: 'bombard.0.1.0.zip',
            path: './zip'
        })
    ]
};
