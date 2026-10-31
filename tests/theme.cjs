const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
test('icon toggles appearance, persists choices and tolerates blocked storage',()=>{
  for(const blocked of [false,true]){
    const events={},button={attrs:{},setAttribute(k,v){this.attrs[k]=v},addEventListener:(k,f)=>events[k]=f},root={dataset:{}};
    let saved;const system={matches:true,addEventListener:(k,f)=>events.system=f};
    vm.runInNewContext(fs.readFileSync('theme.js','utf8'),{window:{matchMedia:()=>system},localStorage:{getItem(){if(blocked)throw Error();return null},setItem(k,v){if(blocked)throw Error();saved=v}},document:{documentElement:root,addEventListener:(k,f)=>events.ready=f,querySelector:()=>button}});
    assert.equal(root.dataset.theme,'dark');events.ready();assert.equal(button.attrs['aria-label'],'Switch to light mode');
    events.click();assert.equal(root.dataset.theme,'light');if(!blocked)assert.equal(saved,'light');
    system.matches=true;events.system();assert.equal(root.dataset.theme,'light');
    events.click();assert.equal(root.dataset.theme,'dark');assert.equal(button.attrs['aria-label'],'Switch to light mode');
  }
});
