#!/usr/bin/env node

const express = require('express');
const bodyParser = require('body-parser');
const nlp = require('nlp_compromise');

let api = express.Router();
api.post('/parse', (req, res) => {
  res.send(nlp.text(req.body.text).terms());
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
