const React = require('react');
const Quill = require('quill');

require('quill/dist/quill.core.css');

// https://cs.nyu.edu/grishman/jet/guide/PennPOS.html
const QUILL_POS_FORMATS = {
  NN:   {color: 'blue'}, // "Tabloid", "interest", "role", "beauty", "Curvology", "book", "part", "evolution", "appreciation", "form", "gestate", "answer", "biologist", "anatomist", "future", "humankind", "proof", "woman", "sense", "comparison", "both", "fallback", "task", "species", "idea", "appearance", "sex", "heritage", "queasy", "author", "bingeing", "starvation", "life", "intake", "winter", "time", "food", "notion", "person", "body", "psychology", "revelation", "question", "balance", "shape", "success", "world", "one"
  NNS:  {color: 'blue'}, // "newspapers", "women", "curves", "media", "forces", "notions", "men", "undulations", "Men", "bodies", "children", "bums", "boobs", "pins", "genes", "terms", "changes", "lives", "couples", "Humans", "matters", "people", "questions", "explanations", "disorders", "answers", "Episodes", "features", "animals", "relics", "observations", "readers", "clothes", "book", "demands"
  NNP:  {color: 'blue', bold: true}, // "David", "Bainbridge", "Mr"

  VB:   {color: 'gold'}, // "take", "flaunt", "bear", "nourish", "salivate", "ensure", "begin", "be", "overcome", "reduce", "seem", "protect", "become", "mean"
  VBG:  {color: 'gold'}, // "constructing", "understanding", "growing", "child", "reproducing", "reading", "eating", "Eating", "conflicting", "asking"
  VBZ:  {color: 'gold'}, // "is", "focuses", "suggests", "carries", "explains", "makes", "provides", "urges", "argues", "writes", "raises", "comes", "does"
  VBN:  {color: 'gold'}, // "discussed", "well", "desired", "erased"
  VBD:  {color: 'gold'}, // "played", "was", "were", "existed"
  VBP:  {color: 'gold'}, // "differ", "are", "have", "want", "do", "shroud"
  MD:   {color: 'gold', italic: true}, // "will", "cannot", "could"

  PRP:  {color: 'gray', bold: true}, // "They", "He", "it", "they", "them", "he", "us"
  PRP$: {color: 'gray', bold: true}, // "their", "his", "our"

  JJ:   {color: 'green'}, // "prurient", "other", "cultural", "female", "new", "necessary", "simple", "British", "reproductive", "veterinary", "curvy", "straight", "enviable", "good", "such", "evolutionary", "plump", "single", "fatty", "arduous", "many", "uncomfortable", "uneasy", "few", "much", "long", "interesting", "speculative", "normal", "pre", "unpredictable", "facile", "ultimate", "ancient", "modern", "unnatural", "worth"
  JJR:  {color: 'green'}, // "more", "baser"
  RB:   {color: 'green'}, // "often", "simply", "so", "enough", "just", "highly", "still", "supply", "especially", "passively", "even", "not", "quite"

  WP:   {color: 'orange'}, // "who", "what"
  WRB:  {color: 'orange'}, // "Why", "when"

  DT:   {color: 'gray'}, // "a", "The", "the", "those", "this", "these", "each", "That", "some", "Some", "no"
  IN:   {color: 'gray'}, // "in", "of", "by", "on", "than", "that", "over", "while", "up", "throughout", "for", "with", "as", "For", "because", "about", "though", "if"
  CC:   {color: 'gray'}, // "and", "But", "but"
  TO:   {color: 'gray'}, // "to"
};

function parse (text, opts) {
  let url = new URL(`http://corenlp.run`);
  url.searchParams.append('properties', JSON.stringify(Object.assign({
    annotators: 'tokenize,ssplit,pos,ner,depparse,openie',
    // date: new Date().toISOString(),
    // 'coref.md.type': 'dep',
    // 'coref.mode': 'statistical'
  }, opts)));
  return fetch(url, {
    method: 'POST',
    body: text,
    mode: 'cors'
  }).then(res => res.json());
}

var Unglish = React.createClass({
  getInitialState () {
    // naming it initialX clearly indicates that the only purpose
    // of the passed down prop is to initialize something internally
    return {text: this.props.initialText};
  },

  componentDidMount () {
    this.initQuill();
  },

  initQuill () {
    this.quill = new Quill(this.refs.quill, {
      placeholder: "Enter some text...",
      theme: 'bubble',
      modules: {
        toolbar: false,
        keyboard: {
          // disable formatting
          bindings: Object.keys(Quill.imports['modules/keyboard'].DEFAULTS.bindings).reduce((bindings, name) => {
            bindings[name] = {handler () {}}
            return bindings;
          }, {})
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
    this.setState({text});
    if (typeof this.props.onChange === 'function') this.props.onChange(text);
    parse(text).then(this.onParsed);
  },

  onParsed (parsed) {
    this.setState({parsed});
    if (typeof this.props.onParsed === 'function') this.props.onParsed(parsed);

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
    Object.keys(unformattedPOSs).forEach(pos => {
      let tokens = {};
      unformattedPOSs[pos].forEach(({originalText}) => {
        tokens[JSON.stringify(originalText)] = true;
      });
      console.error(`Unformatted '${pos}' for ${Object.keys(tokens).join(", ")}`);
    });
  },

  onQuillSelectionChange (selection, oldSelection, source) {
    this.setState({selection});
    if (!selection) return;
    // TODO: get sentences present in selection, send them to
    // http://displacy.spacy.io/?full=This+is+some+sentence+text.
    var selectedText = this.quill.getText(selection.index, selection.length);
  },

  render () {
    return (
      <div ref="quill" />
    );
  }
});

module.exports = Unglish;
