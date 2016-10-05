const React = require('react');
const ReactDOM = require('react-dom');

const Unglish = require('./Unglish.jsx');

require('./index.scss');

const GLOBAL_NAME = 'unglish';

global[GLOBAL_NAME] = ReactDOM.render(
  <Unglish
    initialText={localStorage.getItem('text') || ''}
    onTextChange={text => { localStorage.setItem('text', text); }}
    onParsed={() => { console.log(`Parsed ${global.unglish.state.text.length} chars. Access parsed with 'window.${GLOBAL_NAME}.state.parsed' and text with 'window.${GLOBAL_NAME}.state.text'.`); }}
    />,
  document.getElementById('unglish')
);
