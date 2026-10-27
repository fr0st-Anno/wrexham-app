const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup(href) {
  const names=['news','standings','matches','squad','transfers','videos'];
  const sections=names.map(page=>({dataset:{page},hidden:false}));
  const links=names.map(page=>({href:`https://example.com/wrexham-app/?page=${page}`,attrs:{},handlers:{},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},addEventListener(k,f){this.handlers[k]=f}}));
  const events={},location={href};
  const window={addEventListener:(k,f)=>events[k]=f,scrollTo(){}};
  const document={title:'',querySelectorAll:s=>s==='[data-page]'?sections:links,querySelector:()=>({focus(){}})};
  const history={pushState:(a,b,url)=>location.href=url.href};
  vm.runInNewContext(fs.readFileSync('navigation.js','utf8'),{URL,location,window,document,history});
  return {sections,links,events,location,window,document,visible:()=>sections.filter(s=>!s.hidden).map(s=>s.dataset.page)};
}
test('news default, deep links, unknown routes and legacy bookmarks',()=>{
  for(const [suffix,page] of [['','news'],['?page=squad','squad'],['?page=bad','news'],['#matchcentre','matches']]) {
    const app=setup('https://example.com/wrexham-app/'+suffix);
    assert.deepEqual(app.visible(),[page]);
    assert.equal(app.links.filter(l=>l.attrs['aria-current']==='page').length,1);
  }
});
test('navigation and back select one page, preserving the project path',()=>{
  const app=setup('https://example.com/wrexham-app/');
  app.window.navigatePage('videos');
  assert.deepEqual(app.visible(),['videos']);
  assert.equal(app.location.href,'https://example.com/wrexham-app/?page=videos');
  app.location.href='https://example.com/wrexham-app/?page=standings';app.events.popstate();
  assert.deepEqual(app.visible(),['standings']);
  assert.equal(app.document.title,'Standings · Wrexham Reds');
});
test('modified clicks retain normal browser behavior',()=>{
  const app=setup('https://example.com/wrexham-app/');
  app.links[2].handlers.click({button:0,ctrlKey:true,preventDefault(){throw Error('must not intercept')}});
  assert.deepEqual(app.visible(),['news']);
});
