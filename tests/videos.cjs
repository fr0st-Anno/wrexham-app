const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('app.js','utf8');
const context=vm.createContext({});
vm.runInContext(source.slice(source.indexOf('const VIDEO_CATEGORIES'),source.indexOf('function renderVideos')),context);
test('club video titles map to useful categories without dropping unknown uploads',()=>{
  for(const [title,expected] of [
    ['INTERVIEW | Callum after Blackburn','Interviews'],
    ['HIGHLIGHTS | Wrexham AFC Women','Highlights'],
    ['PRESS CONFERENCE | Manager interview','Press Conferences'],
    ['HOT TAKE | Blackburn v Wrexham','Hot Takes'],['Hottake: reaction','Hot Takes'],
    ['TRIPLE A | Preston','Behind the Scenes'],['POV: Walking to the Kop','Behind the Scenes'],
    ['Wrexham Match Day Live','Matchday'],['Y CHWIBAN TERFYNOL | Wrecsam','Matchday'],
    ['Welcome to Wrexham','Other'],[null,'Other']
  ]) {
    context.video={title};assert.equal(vm.runInContext('videoCategory(video)',context),expected);
  }
});
test('All preserves the feed and category filters preserve chronological order',()=>{
  context.videos=[{title:'Interview | New',video_id:'a'},{title:'Highlights',video_id:'b'},{title:'Interview | Old',video_id:'c'}];
  assert.equal(vm.runInContext("filteredVideos(videos,'All')===videos",context),true);
  assert.equal(vm.runInContext("filteredVideos(videos,'Interviews').map(v=>v.video_id).join(',')",context),'a,c');
  assert.equal(vm.runInContext("filteredVideos(videos,'Hot Takes').length",context),0);
  assert.equal(context.videos.length,3);
});
