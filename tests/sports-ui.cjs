// Synthetic data exercised in an isolated DOM stand-in, never shipped to visitors.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
class Element {
  constructor(tag,cls,text=''){this.tag=tag;this.className=cls;this.textContent=text;this.children=[];this.value='';this.classList={toggle(){}}}
  append(...nodes){this.children.push(...nodes)}
  prepend(...nodes){this.children.unshift(...nodes)}
  replaceChildren(){this.children=[]}
  addEventListener(){}
}
const text=node=>[node.textContent,...node.children.map(text)].join(' ');
function setup(){
  const elements=new Map();
  const context=vm.createContext({Date,Intl,Number,String,Array,console,
    el:(...args)=>new Element(...args),
    $:selector=>{if(!elements.has(selector))elements.set(selector,new Element('div'));return elements.get(selector)},
    shortDate:iso=>iso?.slice(0,10)||'', data:{news:[]}
  });
  const script=fs.readFileSync('app.js','utf8').split('/* VERSION 1.3')[1];
  vm.runInContext('/* VERSION 1.3'+script.split("window.addEventListener('wrexham-news-updated'")[0],context);
  return {context,elements,run:code=>vm.runInContext(code,context)};
}
test('setup, connected empty season and stale table have distinct messaging',()=>{
  const {run,elements}=setup();
  run("sportsHealth.status='not_configured'; renderSports()");
  assert.match(text(elements.get('#sports-updated')),/awaits setup/);
  run("sports.updated_at=new Date().toISOString(); sportsHealth.status='connected'; renderSports()");
  assert.match(text(elements.get('#nextMatch')),/No upcoming Championship/);
  run("sports.updated_at='2020-01-01T00:00:00Z'; sports.standings=[{team:'Wrexham AFC',position:1,points:0,played:0,goal_difference:0}]; renderSports()");
  assert.match(text(elements.get('#sports-updated')),/out of date/);
  assert.match(text(elements.get('#standings-label')),/LAST AVAILABLE/);
  assert.equal(elements.get('#standingsBody').children[0].className,'wrexham-row');
});
test('postponements and past fixtures never become the next match; 0-0 is preserved',()=>{
  const {run,elements}=setup();
  run(`sports.fixtures=[{home:'Past',away:'Wrexham',status:'TIMED',kickoff:'2020-01-01'},
    {home:'Future',away:'Wrexham',status:'TIMED',kickoff:'2099-01-01'},
    {home:'Postponed',away:'Wrexham',status:'POSTPONED',kickoff:'2099-01-02'}];
    sports.results=[{home:'Test',away:'Wrexham',home_score:0,away_score:0}]; renderSports()`);
  assert.match(text(elements.get('#nextMatch')),/Future/);
  assert.doesNotMatch(text(elements.get('#nextMatch')),/Past|Postponed/);
  assert.match(text(elements.get('#pendingMatches')),/Postponed/);
  assert.match(text(elements.get('#recentResults')),/0 : 0/);
  assert.equal(run("scoreText({home_score:1,away_score:null})"),'—');
});
test('unconfirmed kickoff is not shown as a confirmed time',()=>{
  const {run}=setup();
  assert.match(run("fixtureDate({status:'SCHEDULED',kickoff:'2099-01-01T00:00:00Z'})"),/Time to be confirmed/);
  assert.doesNotMatch(run("fixtureDate({status:'POSTPONED',kickoff:'2099-01-01T00:00:00Z'})"),/2099/);
});
