const path = require('path');

module.exports = {
    entry: './src/app.js',
    module: {
        rules: [
            {
                test: /\.(js)$/, use: 'esbuild-loader'
            },
            {
                test: /\.svg$/,
                loader: 'svg-inline-loader'
            }
        ]
    },
    resolve: {
        alias: {
            three: path.resolve('./node_modules/three')
        },
    },

    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, './build'),
    },

};