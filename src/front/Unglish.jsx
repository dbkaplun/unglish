const React = require('react');
const Quill = require('quill'); require('quill/dist/quill.core.css');
const _ = require('lodash');

const displaCy = require('exports?displaCy!displacy/assets/js/displacy');

const coreNLP = require('./coreNLP');

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
  '.':  {color: 'gray'} // ".", "?"
};

var Unglish = React.createClass({
  getInitialState () {
    // naming it initialX clearly indicates that the only purpose
    // of the passed down prop is to initialize something internally
    return {text: this.props.initialText};
  },

  componentDidMount () {
    this.initQuill();
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
          bindings: _.mapValues(Quill.imports['modules/keyboard'].DEFAULTS.bindings, _.constant({handler () {}}))
        }
      }
    });
    this.quill.on('text-change', this.onQuillTextChange);
    this.quill.on('selection-change', this.onQuillSelectionChange);
    this.quill.setText(this.state.text, 'initQuill');
  },

  onQuillTextChange (newDelta, oldDelta, source) {
    if (source === 'api') return;
    let text = this.quill.getText();

    this.setState({
      text,
      parsePromise: coreNLP(text).then(this.onParsed)
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

    this.setState({parsed});
    _.invoke(this, 'props.onParsed', parsed);
  },

  onQuillSelectionChange (selection, oldSelection, source) {
    this.setState({selection});
    _.invoke(this, 'props.onSelectionChange', selection);

    if (selection) {
      Promise.resolve(this.state.parsePromise).then(() => {
        // wait for parse to call getSentence
        let {characterOffsetBegin} = _.first(this.getSentence(selection.index)                   .tokens);
        let {characterOffsetEnd}   = _.last (this.getSentence(selection.index + selection.length).tokens);
        let selectedSentence = this.quill.getText(characterOffsetBegin, characterOffsetEnd - characterOffsetBegin);
        this.displacy.parse(selectedSentence);
        this.setState({selectedSentence});
      });
    }
  },

  getSentence (characterOffset) {
    let sentences = _.get(this.state, 'parsed.sentences', []);
    let i = _(sentences)
      .map(({tokens: [{characterOffsetBegin}]}) => characterOffsetBegin)
      .sortedIndex(characterOffset);
    let sentence = sentences[_.clamp(i, sentences.length - 1)];
    if (!sentence) return;
    if (_.first(sentence.tokens).characterOffsetBegin >  characterOffset) i--;
    if (_.last (sentence.tokens).characterOffsetEnd   <= characterOffset) i = -1;
    return _.nth(sentences, i);
  },

  render () {
    let {selectedSentence} = this.state;
    return (
      <div className="unglish">
        <div ref="quill" className="unglish-quill" />
        <div ref="displacy" className="unglish-displacy" />
      </div>
    );
  }
});

module.exports = Unglish;
