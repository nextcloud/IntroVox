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
    // Chunks load without Nextcloud's ?v= version parameter, and browsers
    // keep .js for months: without a hash in the name, an update could pair
    // an old chunk with a new entry bundle.
    chunkFilename: '[name].[contenthash:8].js',
    path: path.resolve(__dirname, 'js'),
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          // Template comments stay out of the bundle. vue-loader keeps them
          // otherwise, and they then become real comment nodes: the
          // <!-- TRANSLATORS: … --> hints would ship, and a comment in a
          // slot is a node a component can mistake for its content
          // (NcAction* take their label from the first node of the slot).
          compilerOptions: { comments: false }
        }
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
