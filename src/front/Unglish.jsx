import React from 'react';
import LocalStorageMixin from 'react-localstorage';
import Quill from 'quill'; require('quill/dist/quill.core.css');
import _ from 'lodash';

const displaCy = require('exports?displaCy!displacy/assets/js/displacy');

import coreNLP from './coreNLP';

// https://www.ling.upenn.edu/courses/Fall_2003/ling001/penn_treebank_pos.html
const QUILL_POS_FORMATS = {
  NN:   {color: 'blue'}, // "interest", "role", "beauty", "book", "part", "evolution", "understanding", "appreciation", "form", "Men", "answer", "biologist", "anatomist", "future", "humankind", "proof", "woman", "sense", "comparison", "fatty", "fallback", "task", "reading", "idea", "baser", "appearance", "sex", "heritage", "author", "bingeing", "starvation", "life", "intake", "winter", "time", "food", "supply", "notion", "shroud", "person", "body", "psychology", "revelation", "question", "shape", "success", "world"
  NNS:  {color: 'blue'}, // "newspapers", "women", "curves", "media", "forces", "notions", "men", "undulations", "bodies", "children", "bums", "boobs", "pins", "genes", "terms", "changes", "lives", "couples", "species", "Humans", "matters", "people", "questions", "explanations", "disorders", "answers", "Episodes", "features", "animals", "relics", "observations", "readers", "clothes", "demands"
  NNP:  {color: 'blue', bold: true}, // "Curvology", "David", "Bainbridge", "Mr", "Eating"
  CD:   {color: 'blue'}, // "one"

  VB:   {color: 'gold'}, // "gestate", "bear", "nourish", "ensure", "plump", "be", "have", "want", "reduce", "seem", "protect", "mean", "balance", "answer"
  VBZ:  {color: 'gold'}, // "is", "focuses", "suggests", "carries", "explains", "makes", "provides", "urges", "argues", "writes", "raises", "comes", "does"
  VBG:  {color: 'gold'}, // "constructing", "growing", "reproducing", "eating", "conflicting", "asking"
  VBN:  {color: 'gold'}, // "discussed", "played", "overcome", "existed", "desired", "erased"
  VBD:  {color: 'gold'}, // "was", "were"
  VBP:  {color: 'gold'}, // "take", "flaunt", "differ", "salivate", "are", "begin", "have", "do", "become"
  MD:   {color: 'gold', italic: true}, // "will", "can", "could"

  PRP:  {color: 'gray', bold: true}, // "They", "He", "it", "they", "them", "he", "us"
  PRP$: {color: 'gray', bold: true}, // "their", "his", "our"

  JJ:   {color: 'green'}, // "Tabloid", "prurient", "other", "cultural", "female", "new", "necessary", "simple", "British", "reproductive", "veterinary", "curvy", "straight", "enviable", "well-nourished", "good", "child-feeding", "such", "evolutionary", "single", "arduous", "many", "uncomfortable", "uneasy", "few", "long", "enough", "queasy", "interesting", "speculative", "normal", "pre-agricultural", "unpredictable", "facile", "ultimate", "ancient", "modern", "unnatural", "worth"
  JJR:  {color: 'green'}, // "more"
  RB:   {color: 'green'}, // "often", "simply", "so", "much", "as", "not", "just", "highly", "still", "especially", "passively", "even", "quite"
  RP:   {color: 'green'}, // "over", "up"

  WP:   {color: 'orange'}, // "who", "what"
  WRB:  {color: 'orange'}, // "Why", "when"
  WDT:  {color: 'orange'}, // "that"

  DT:   {color: 'gray'}, // "a", "The", "the", "those", "this", "both", "these", "each", "That", "some", "Some", "no"
  IN:   {color: 'gray'}, // "in", "of", "by", "on", "than", "that", "while", "throughout", "for", "with", "as", "For", "because", "about", "though", "if"
  CC:   {color: 'gray'}, // "and", "But", "but"
  TO:   {color: 'gray'}, // "to"
  POS:  {color: 'gray'}, // "’s"
  '``': {color: 'gray'}, // "“"
  "''": {color: 'gray'}, // "”"
  ':':  {color: 'gray'}, // "—", ":", ";"
  ',':  {color: 'gray'}, // ","
  '.':  {color: 'gray'}, // ".", "?"
};

function ensureValidPromise (getPromise) {
  let promise = getPromise();
  return Promise.resolve(promise).then(val => (
    promise === getPromise()
      ? val
      : ensureValidPromise(getPromise)
  ));
}

var Unglish = React.createClass({
  mixins: [LocalStorageMixin],
  getInitialState () {
    return _.merge({
      text: this.props.initialText,
      coreNLPOpts: {
        url: `${location.protocol !== 'http:' ? `${location.protocol}//cors-anywhere.herokuapp.com/` : ''}${coreNLP.DEFAULT_OPTS.url}`,
      },
    }, _([...new URLSearchParams(location.search.slice(1))])
      .fromPairs()
      .mapValues(JSON.parse)
      .value());
  },

  componentDidMount () {
    process.nextTick(this.initQuill);
    this.displacy = new displaCy('https://api.explosion.ai/displacy/dep/', {});
    this.displacy.container = this.refs.displacy;
  },

  initQuill () {
    this.quill = new Quill(this.refs.quill, {
      placeholder: "Enter some text...",
      theme: 'bubble',
      modules: {
        toolbar: false,
        keyboard: {
          // disable formatting
          bindings: _.mapValues(Quill.imports['modules/keyboard'].DEFAULTS.bindings, _.constant({handler () {}})),
        },
      },
    });
    this.quill.on('text-change', this.onQuillTextChange);
    this.quill.on('selection-change', this.onQuillSelectionChange);

    let {text} = this.state;
    if (typeof text === 'string') this.quill.setText(text, 'initQuill');
  },

  onQuillTextChange (newDelta, oldDelta, source) {
    if (source === 'api') return;
    let text = this.quill.getText();

    this.setState({
      text,
      parsePromise: coreNLP(text, this.state.coreNLPOpts).then(this.onParsed),
    });
    _.invoke(this, 'props.onTextChange', text);
  },

  onParsed (parsed) {
    this.quill.removeFormat(0, Infinity);
    let ops = [];
    let unformattedPOSs = {};
    let i = 0;
    parsed.sentences.forEach(({tokens}) => {
      tokens.forEach(token => {
        let {pos, characterOffsetBegin, characterOffsetEnd} = token;
        if (pos in QUILL_POS_FORMATS) {
          if (i < characterOffsetBegin) ops.push({retain: characterOffsetBegin - i});
          ops.push({retain: characterOffsetEnd - characterOffsetBegin, attributes: QUILL_POS_FORMATS[pos]});
          i = characterOffsetEnd;
        } else if (pos) {
          (unformattedPOSs[pos] = unformattedPOSs[pos] || []).push(token);
        }
      });
    });
    this.quill.updateContents({ops});
    _.forEach(unformattedPOSs, (tokens, pos) => {
      console.error(`Unformatted '${pos}' for ${_(tokens)
        .map('originalText')
        .uniq()
        .map(JSON.stringify)
        .join(", ")}`);
    });

    this.getSelectedSentence().then(this.setSelectedSentence);

    this.setState({parsed});
    _.invoke(this, 'props.onParsed', parsed);
  },

  onQuillSelectionChange (selection, oldSelection, source) {
    this.setState({selection});
    _.invoke(this, 'props.onSelectionChange', selection);

    this.getSelectedSentence().then(this.setSelectedSentence);
  },

  getSelectedSentence () {
    return ensureValidPromise(() => this.state.parsePromise).then(() => {
      let selection = this.quill.getSelection();
      if (!selection) return;

      let beginSentence = this.getSentence(selection.index);
      let begin = _.get(beginSentence, ['tokens', 0,  'characterOffsetBegin']);
      if (typeof begin !== 'number') return;

      let endSentenceTokens = (this.getSentence(selection.index + selection.length) || {}).tokens || [];
      let end   = _.get(endSentenceTokens, [-1 + endSentenceTokens.length, 'characterOffsetEnd']);
      if (typeof end !== 'number') return;

      return {begin, end};
    });
  },

  setSelectedSentence (selectedSentence) {
    let old = this.state.selectedSentence;
    if (old) {
      let {begin, end} = old;
      this.quill.formatText(begin, end - begin, {background: 'white'});
    }
    if (selectedSentence) {
      let {begin, end} = selectedSentence;
      this.quill.formatText(begin, end - begin, {background: 'yellow'});
      this.displacy.parse(this.quill.getText(begin, end - begin));
    }
    this.setState({selectedSentence});
  },

  getSentence (characterOffset) {
    let sentences = _.get(this.state, 'parsed.sentences', []);
    let i = _.clamp(
      _(sentences)
        .map(({tokens: [{characterOffsetBegin}]}) => characterOffsetBegin)
        .sortedIndex(characterOffset),
      sentences.length - 1
    );
    let sentence = sentences[i];
    if (!sentence) return;
    if (_.first(sentence.tokens).characterOffsetBegin >  characterOffset) i--;
    if (_.last (sentence.tokens).characterOffsetEnd   <= characterOffset) i = -1;
    return _.nth(sentences, i);
  },

  render () {
    return (
      <div className="unglish">
        <div ref="quill" className="unglish-quill" />
        <div ref="displacy" className="unglish-displacy" />
      </div>
    );
  },
});

export default Unglish;
