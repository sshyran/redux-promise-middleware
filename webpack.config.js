// Encapsulates a config for Webpack, used to generate UMD builds
const config = {
  mode: process.env.NODE_ENV,
  entry: './src/index.ts',
  resolve: {
    extensions: ['.js', '.ts'],
  },
  module: {
    rules: [
      { test: /\.(js|ts)$/, use: { loader: 'babel-loader' }, exclude: /node_modules/ }
    ]
  },
  output: {
    library: 'ReduxPromiseMiddleware',
    libraryTarget: 'umd'
  },
};

// When the environment is set to production, compress the output file
if (process.env.NODE_ENV === 'production') {
  config.optimization = { minimize: true };
}

module.exports = config;
