'use strict';
(() => {
  const key='wrexham-appearance',choices=['system','light','dark'];
  let choice='system';
  try{const saved=localStorage.getItem(key);if(choices.includes(saved))choice=saved}catch{}
  const system=window.matchMedia('(prefers-color-scheme: dark)');
  function apply(){document.documentElement.dataset.theme=choice==='system'?(system.matches?'dark':'light'):choice}
  apply();
  system.addEventListener('change',apply);
  document.addEventListener('DOMContentLoaded',()=>{
    const select=document.querySelector('#themeChoice');select.value=choice;
    select.addEventListener('change',()=>{choice=choices.includes(select.value)?select.value:'system';try{localStorage.setItem(key,choice)}catch{}apply()});
  });
})();

