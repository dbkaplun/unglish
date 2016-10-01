#!/usr/bin/env node

const express = require('express');
const bodyParser = require('body-parser');
const retext = require('retext');
const retextPOS = require('retext-pos');

let api = express.Router();
api.post('/parse', (req, res) => {
  retext()
    .use(retextPOS) // this value is modified by the next .use() so we can't store this in a variable
    .use(() => cst => {
      res.send(cst);
      console.log(`Parsed ${req.body.text.length} chars`);
    })
    .process(req.body.text);
});

let server = express();
server.use(bodyParser.json());
server.use(bodyParser.urlencoded({extended: true}));
server.use(express.static('.'));
server.use(['/api', '/api/v1'], api);
server.listen();

let listener = server.listen(3615, () => {
  console.log(`Listening on http://localhost:${listener.address().port}`);
});
