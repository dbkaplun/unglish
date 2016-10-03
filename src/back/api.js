const express = require('express');
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

module.exports = api;
