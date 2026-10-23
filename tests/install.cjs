const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
test('installation help handles Safari standalone, browser and local file mode',()=>{
  for(const [standalone,displayMode,protocol,hidden,localHidden] of [
    [true,false,'https:',true,true],[false,true,'https:',true,true],
    [false,false,'https:',false,true],[false,false,'file:',false,false]
  ]){
    const guide={}, note={};
    vm.runInNewContext(fs.readFileSync('install.js','utf8'),{
      window:{matchMedia:()=>({matches:displayMode,addEventListener(){}})},
      navigator:{standalone}, location:{protocol},
      document:{querySelector:s=>s==='#installGuide'?guide:note}
    });
    assert.equal(guide.hidden,hidden);assert.equal(note.hidden,localHidden);
  }
});
