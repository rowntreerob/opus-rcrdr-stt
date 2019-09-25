const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const devMode = process.env.NODE_ENV !== 'production';

module.exports = {
  entry: {main: ['./docs2/example.js', './button.scss'],},
  output: {
    path: path.resolve(__dirname, './build'),
    filename: '[name].js'
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
      },
      { test: /\.(scss|css)$/,
        use: [
              MiniCssExtractPlugin.loader,
              {
                loader: "css-loader",
              },
              {
                loader: "sass-loader",
                options: {
                  sassOptions: {
                    includePaths: ['./node_modules']
                  }
                }
              }
            ]
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
  filename: "[name].css",
  chunkFilename: "[id].css"
  }),
  ],


   devtool: 'source-map',
  devServer: {
    contentBase: [`${__dirname}/build`, `${__dirname}/docs2`],
    compress: true,
    host: '0.0.0.0',
    port: 9000,
    https: true,
    index: 'index2.html',
    overlay: {
      warnings: true,
      errors: true
    },
    watchOptions: {
      poll: false
    },
    headers: {
      'Access-Control-Allow-Origin': '*'
    },

  }
}
