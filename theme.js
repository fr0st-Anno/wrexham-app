'use strict';
(() => {
  const key='wrexham-appearance',choices=['system','light','dark'];
  let choice='system',button;
  try{const saved=localStorage.getItem(key);if(choices.includes(saved))choice=saved}catch{}
  const system=window.matchMedia('(prefers-color-scheme: dark)');
  function apply(){
    const dark=choice==='system'?system.matches:choice==='dark';
    document.documentElement.dataset.theme=dark?'dark':'light';
    if(button){button.textContent=dark?'☀':'☾';button.setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode');button.title=dark?'Switch to light mode':'Switch to dark mode'}
  }
  apply();system.addEventListener('change',apply);
  document.addEventListener('DOMContentLoaded',()=>{
    button=document.querySelector('#themeChoice');apply();
    button.addEventListener('click',()=>{choice=document.documentElement.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem(key,choice)}catch{}apply()});
  });
})();
