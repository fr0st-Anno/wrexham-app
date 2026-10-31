const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
test('appearance defaults to system, persists choices and tolerates blocked storage',()=>{
  for(const blocked of [false,true]){
    const events={},select={value:'',addEventListener:(k,f)=>events[k]=f},root={dataset:{}};
    let saved;const system={matches:true,addEventListener:(k,f)=>events.system=f};
    vm.runInNewContext(fs.readFileSync('theme.js','utf8'),{window:{matchMedia:()=>system},localStorage:{getItem(){if(blocked)throw Error();return null},setItem(k,v){if(blocked)throw Error();saved=v}},document:{documentElement:root,addEventListener:(k,f)=>events.ready=f,querySelector:()=>select}});
    assert.equal(root.dataset.theme,'dark');events.ready();select.value='light';events.change();assert.equal(root.dataset.theme,'light');
    if(!blocked)assert.equal(saved,'light');system.matches=true;events.system();assert.equal(root.dataset.theme,'light');
    select.value='system';events.change();assert.equal(root.dataset.theme,'dark');system.matches=false;events.system();assert.equal(root.dataset.theme,'light');
  }
});

