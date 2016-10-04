module.exports = function coreNLP (text, opts) {
  let url = new URL(`${location.protocol !== 'http:' ? `${location.protocol}//cors-anywhere.herokuapp.com/` : ''}http://corenlp.run`);
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
