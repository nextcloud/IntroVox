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
    }
  },
  mode: 'production'
};
