const path = require('path');
const { VueLoaderPlugin } = require('vue-loader');

module.exports = {
  entry: {
    main: './src/main.js',
    admin: './src/admin.js',
    personal: './src/personal.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'js'),
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin()
  ],
  resolve: {
    extensions: ['.js', '.vue'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    },
    fallback: {
      'path': false,
      // @nextcloud/dialogs 7.4+ pulls in sax/@file-type/xml for SVG detection,
      // which reference Node core modules. IntroVox only uses dialog toasts, so
      // that code path is never reached — stub the Node built-ins out.
      'stream': false,
      'string_decoder': false
    }
  },
  mode: 'production'
};
