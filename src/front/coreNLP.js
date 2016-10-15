import _ from 'lodash';

function coreNLP (text, opts) {
  opts = _.merge({}, coreNLP.DEFAULT_OPTS, opts);
  let url = new URL(opts.url);
  url.searchParams.append('properties', JSON.stringify(opts.props));
  return fetch(url, Object.assign({body: text}, opts.req)).then(res => res.json());
}
coreNLP.DEFAULT_OPTS = {
  url: process.env.CORENLP_URL || 'http://corenlp.run',
  req: {method: 'POST', mode: 'cors'},
  props: {
    annotators: 'tokenize,ssplit,pos,ner,depparse,openie',
    // date: new Date().toISOString(),
    // 'coref.md.type': 'dep',
    // 'coref.mode': 'statistical'
  }
};

export default coreNLP;
