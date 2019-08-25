const path = require('path');

module.exports = {
  entry: './docs2/example.js',
  output: {
    path: path.resolve(__dirname, './build'),
    filename: 'example.js'
  },
  module: {
    rules: [
      {
        test: /opus-media-recorder\/encoderWorker\.js$/,
        loader: 'worker-loader'
      },
      {
        test: /opus-media-recorder\/.*\.wasm$/,
        type: 'javascript/auto',
        loader: 'file-loader'
      },
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },

  devServer: {
    contentBase: [`${__dirname}/build`, `${__dirname}/docs`],
    compress: true,
    host: '0.0.0.0',
    port: 9000,
    https: true,
    index: 'index.html',
    overlay: {
      warnings: true,
      errors: true
    },
    watchOptions: {
      poll: false
    },    
        headers: {
            'Access-Control-Allow-Origin': '*'
        }
  }
}
