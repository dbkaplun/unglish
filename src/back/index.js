#!/usr/bin/env node

const express = require('express');
const bodyParser = require('body-parser');

let app = express();

switch (process.env.NODE_ENV) {
  case 'production': break;
  case 'development':
  default:
    app.use(require('webpack-dev-middleware')(require('webpack')(require('../../webpack.config')), {
      publicPath: "/dist/front/"
    }));
    break;
}
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(['/api', '/api/v1'], require('./api'));
app.use(express.static('.'));

app.listener = app.listen(3615, () => {
  console.log(`Listening on http://localhost:${app.listener.address().port}`);
});

module.exports = app;
