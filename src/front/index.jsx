import React from 'react';
import ReactDOM from 'react-dom';

import Unglish from './Unglish.jsx';

require('./index.scss');

const GLOBAL_NAME = 'unglish';

global[GLOBAL_NAME] = ReactDOM.render(
  <Unglish onParsed={() => {
    console.log(`Parsed ${global[GLOBAL_NAME].state.text.length} chars. Access parsed with '${GLOBAL_NAME}.state.parsed' and text with '${GLOBAL_NAME}.state.text'.`);
  }} />,
  document.getElementById('unglish')
);
