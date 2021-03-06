import React from 'react';
import vis from 'vis';
import LocalStorageMixin from 'react-localstorage';
import Quill from 'quill'; require('quill/dist/quill.core.css');
import _ from 'lodash';

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
    this.vis = new vis.Network(this.refs.vis, {}, {
      // layout: {hierarchical: {direction: 'UD'}}
    });
  },

  componentWillUnmount () {
    this.vis.destroy();
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
      parsePromise: coreNLP(text, this.state.coreNLPOpts).then(this.onParsed).catch(console.error),
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

    this.setSelectedSentence().catch(console.error);

    this.setState({parsed});
    _.invoke(this, 'props.onParsed', parsed);
  },

  onQuillSelectionChange (selection, oldSelection, source) {
    this.setState({selection});
    _.invoke(this, 'props.onSelectionChange', selection);
    this.setSelectedSentence().catch(console.error);
  },

  setSelectedSentence () {
    return ensureValidPromise(() => this.state.parsePromise).then(() => {
      let selection = this.quill.getSelection();
      if (selection) this.setState({
        beginSentence: this.getSentence(selection.index),
        endSentence:   this.getSentence(selection.index + selection.length)
      });
    });
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

  getSentenceBegin (sentence) {
    return _.get(sentence, ['tokens', 0, 'characterOffsetBegin']);
  },

  getSentenceEnd (sentence) {
    let tokens = (sentence || {}).tokens || [];
    return _.get(tokens, [-1 + tokens.length, 'characterOffsetEnd']);
  },

  componentWillUpdate (nextProps, nextState) {
    if (this.quill) {
      let begin = this.getSentenceBegin(this.state.beginSentence);
      let end = this.getSentenceEnd(this.state.endSentence);
      if (typeof begin === 'number' && typeof end === 'number') {
        this.quill.formatText(begin, end - begin, {background: 'white'});
      }

      begin = this.getSentenceBegin(nextState.beginSentence);
      end = this.getSentenceEnd(nextState.endSentence);
      if (typeof begin === 'number' && typeof end === 'number') {
        this.quill.formatText(begin, end - begin, {background: 'yellow'});
      }
    }
  },

  render () {
    // FIXME: show all selected sentences, not just beginSentence
    let deps = _.get(this.state, 'beginSentence.enhancedPlusPlusDependencies', []);
    _.invoke(this.vis, 'setData', {
      nodes: deps.reduce((nodes, {dependent, dependentGloss, governor, governorGloss}) => {
        nodes[dependent] = {id: dependent, label: dependentGloss, level: 0};
        nodes[governor]  = {id: governor,  label: governorGloss,  level: 0};
        return nodes;
      }, []),
      edges: deps.reduce((edges, {dependent, governor, dep}, i) => {
        if (i !== dependent) edges.push({label: dep, from: `${i}`,        to: `${dependent}`});
        if (i !== governor)  edges.push({label: dep, from: `${governor}`, to: `${i}`});
        return edges;
      }, [])
    });
    return (
      <div className="unglish">
        <div ref="quill" className="unglish-quill" />
        <div ref="vis" className="unglish-vis" />
      </div>
    );
  },
});

export default Unglish;
