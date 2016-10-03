const React = require('react');
const ReactDOM = require('react-dom');

const Unglish = require('./Unglish.jsx');

require('./index.less');

ReactDOM.render(
  <Unglish initialText={localStorage.getItem('text') || ''} />,
  document.getElementById('unglish')
);
