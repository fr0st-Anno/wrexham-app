'use strict';
const DATA_URL = 'data/content.json';
const SOURCE_LINKS = [
  ['Wrexham Reds', 'https://www.wrexhamreds.com/', 'Independent fan coverage'],
  ['BBC Welsh Football', 'https://www.bbc.co.uk/sport/football/welsh', 'Welsh football reporting'],
  ['BBC Sport', 'https://www.bbc.co.uk/sport/football', 'Football / Championship'],
  ['Sky Sports', 'https://www.skysports.com/football', 'Football reports'],
  ['Wrexham AFC YouTube','https://www.youtube.com/@WxmAFCofficial','Official videos & Shorts']
];
const CLUB_URL='https://www.wrexhamafc.co.uk/news/';
// Clearly labelled layout placeholders. These are NOT sourced headlines or actual videos.
const DEMO_NEWS = [
 {id:'demo-transfer',category:'Transfers',title:'Transfer stories, rumours and completed deals',summary:'This preview card demonstrates how transfer reports will appear, with the original publisher linked when the live feed is connected.',source:'Layout example',preview:true},
 {id:'demo-injury',category:'Injuries',title:'Injury news and return-to-training updates',summary:'Follow fitness news in one place. Real articles will be linked to their original reporting sources.',source:'Layout example',preview:true},
 {id:'demo-match',category:'Matches',title:'Match previews, reports and highlights',summary:'Your future matchday section, bringing Wrexham-related coverage together as it is published.',source:'Layout example',preview:true},
 {id:'demo-player',category:'Players',title:'Player interviews and squad news',summary:'Keep track of player stories, contracts, and interviews without jumping between news websites.',source:'Layout example',preview:true},
 {id:'demo-club',category:'Club',title:'Club announcements and Racecourse developments',summary:'Official club announcements will be clearly distinguished from other reports.',source:'Layout example',preview:true},
 {id:'demo-rumour',category:'Transfers',title:'See which transfer reports are confirmed',summary:'A story tagged as a transfer is not automatically a confirmed signing. Open the source to verify any claim.',source:'Layout example',preview:true}
];
const DEMO_VIDEOS = [
 {title:'Match highlights',subtitle:'Official club uploads will appear here',preview:true,type:'HIGHLIGHTS',symbol:'⚽'},
 {title:'Player interviews',subtitle:'Watch interviews in the app when available',preview:true,type:'INTERVIEWS',symbol:'🎙'},
 {title:'Training ground',subtitle:'Training videos and Shorts together',preview:true,type:'BEHIND THE SCENES',symbol:'▶'}
];
const demoMode = () => !data.updated_at && data.news.length===0 && data.videos.length===0;

let data={updated_at:null,news:[],videos:[],sources:{}};
let filter='All', query='',savedOnly=false;
const $=(selector)=>document.querySelector(selector);
const el=(tag,cls,text)=>{const x=document.createElement(tag); if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;};
const safeHttp=url=>{try{const u=new URL(url);return ['http:','https:'].includes(u.protocol)?u.href:null}catch{return null}};
const bookmarks=()=>{try{return JSON.parse(localStorage.getItem('wrexhamSaved')||'[]')}catch{return []}};
function saveBookmarks(ids){try{localStorage.setItem('wrexhamSaved',JSON.stringify(ids))}catch{}}
function shortDate(iso){if(!iso)return '';let d=new Date(iso);return Number.isNaN(+d)?'':new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(d)}
function renderSources(){const container=$('#sourceList');container.replaceChildren();for(let [name,url,description] of SOURCE_LINKS){let li=el('li');let a=el('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';let details=el('div');details.append(el('span','',name),el('small','',description));a.append(details,el('span','arrow','↗'));li.append(a);container.append(li)}}
function renderStatus(){
  const isPreview=demoMode();
  const updated=!!data.updated_at;
  $('#statusHeadline').textContent=isPreview?'Interactive demo':'News feed connected';
  $('#statusMessage').textContent=isPreview?'The cards below are examples — publish to GitHub to load real RSS and YouTube updates.':'Showing the latest fetched stories. Source links lead to their original publishers.';
  $('#statusDot').classList.toggle('live',updated);
  $('#updatedAt').textContent=updated?`Updated ${shortDate(data.updated_at)}`:'PREVIEW · NOT LIVE';
  $('#feedTag').textContent=isPreview?'EXAMPLE CONTENT':'LATEST STORIES';
  $('#feedCaptionText').textContent=isPreview?'These headlines illustrate the layout. No real news is shown yet.':'News supplied by the linked publishers; categories are automated.';
}
function renderStories(){
  const list=$('#newsList'); list.replaceChildren();
  const saved=bookmarks();
  const items=(demoMode()?DEMO_NEWS:data.news).filter(n =>
    (filter==='All'||n.category===filter) && (!savedOnly||saved.includes(n.id)) &&
    (`${n.title||''} ${n.summary||''} ${n.source||''}`.toLowerCase().includes(query))
  );
  $('#savedCount').textContent=String(saved.length);
  $('#bookmarksBtn').setAttribute('aria-pressed',String(savedOnly));
  if(!items.length){
    const block=el('div','empty');
    block.append(el('h3','',savedOnly?'No saved stories yet':query||filter!=='All'?'Nothing matches your filter':'No articles available right now'));
    block.append(el('p','',savedOnly?'Use the bookmark symbol beside a story to save it.':query||filter!=='All'?'Try another category or search.':'Try the original sources until the next update runs.'));
    const link=el('a','','Visit Wrexham Reds ↗');link.href='https://www.wrexhamreds.com/';link.target='_blank';link.rel='noopener noreferrer';block.append(link);list.append(block);return;
  }
  for (let n of items){
    const card=el('article','story-card'+(n.preview?' sample-story':''));
    const mark=el('div','story-mark',n.category==='Transfers'?'↗':n.category==='Injuries'?'+':n.category==='Matches'?'⚽':n.category==='Players'?'11':'W');
    const main=el('div','story-content');
    const meta=el('div','story-meta');
    meta.append(el('span','pill',n.category||'Club'),el('span','',n.preview?'DEMO / EXAMPLE':n.source||'News'));
    const title=el(n.preview?'h3':'a','story-title',n.title||'Story');
    const safe=n.preview?null:safeHttp(n.url);
    if(safe){title.href=safe;title.target='_blank';title.rel='noopener noreferrer'}
    main.append(meta,title);
    if(n.summary) main.append(el('p','story-description',n.summary));
    const below=el('div','story-bottom',n.preview?'Example only · Not a real news report':shortDate(n.published)||'Date unavailable');
    main.append(below);
    const btn=el('button','bookmark'+(saved.includes(n.id)?' saved':''),saved.includes(n.id)?'♥':'♡');
    btn.title='Save or remove story';btn.setAttribute('aria-label',saved.includes(n.id)?'Remove bookmark':'Save story');
    btn.addEventListener('click',()=>{let newSaved=bookmarks();newSaved=newSaved.includes(n.id)?newSaved.filter(v=>v!==n.id):[...newSaved,n.id];saveBookmarks(newSaved);renderStories()});
    card.append(mark,main,btn);list.append(card);
  }
}
function openVideo(video){const id=video.video_id;if(!/^[a-zA-Z0-9_-]{11}$/.test(id||''))return;let dialog=$('#playerDialog');$('#playerTitle').textContent=video.title||'Wrexham AFC video';$('#playerFrame').src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1` ;$('#externalVideo').href=`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;if(typeof dialog.showModal==='function'){dialog.showModal()}else{window.open($('#externalVideo').href,'_blank','noopener')}}
function renderVideos(){
  const list=$('#videoList');list.replaceChildren();
  const videos=demoMode()?DEMO_VIDEOS:data.videos;
  if(!videos.length){
    const card=el('div','empty');card.append(el('h3','','No recent uploads yet'),el('p','','Videos will appear here once the YouTube feed is connected.'));
    const a=el('a','','Open the official YouTube channel ↗');a.href='https://www.youtube.com/@WxmAFCofficial';a.target='_blank';a.rel='noopener noreferrer';card.append(a);list.append(card);return;
  }
  for (const video of videos){
    const card=el('div','video-card'+(video.preview?' sample-video':''));
    if(video.preview){
      const cover=el('div','video-placeholder');cover.append(el('span','video-placeholder-kicker',video.type),el('span','video-placeholder-symbol',video.symbol),el('span','video-placeholder-mark','WREXHAM AFC'));
      const info=el('div','video-info');info.append(el('strong','',video.title),el('small','',video.subtitle));card.append(cover,info);
    }else{
      const btn=el('button','video-cover');btn.setAttribute('aria-label',`Play ${video.title||'video'}`);
      const thumb=el('img');thumb.alt='';thumb.loading='lazy';thumb.src=`https://i.ytimg.com/vi/${encodeURIComponent(video.video_id)}/hqdefault.jpg`;
      btn.append(thumb,el('span','play-icon','▶'));btn.addEventListener('click',()=>openVideo(video));
      const info=el('div','video-info');info.append(el('strong','',video.title||'Wrexham video'),el('small','',`Wrexham AFC · ${shortDate(video.published)}`));card.append(btn,info);
    }
    list.append(card);
  }
}
function updateCategory(){document.querySelectorAll('[data-category]').forEach(btn=>{let selected=btn.dataset.category===filter;btn.classList.toggle('active',selected);btn.setAttribute('aria-pressed',String(selected))})}
async function start(){const crest=$('#crest');crest.addEventListener('error',()=>crest.parentElement.classList.add('missing'));renderSources();renderStatus();renderStories();renderVideos();
  document.querySelectorAll('[data-category]').forEach(btn=>btn.addEventListener('click',()=>{filter=btn.dataset.category;savedOnly=false;updateCategory();renderStories()}));
  $('#searchInput').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();renderStories()});
  $('#bookmarksBtn').addEventListener('click',()=>{savedOnly=!savedOnly;$('#stories').scrollIntoView({behavior:'smooth'});renderStories()});
  $('#playerClose').addEventListener('click',()=>$('#playerDialog').close());
  $('#playerDialog').addEventListener('close',()=>{$('#playerFrame').src='about:blank'});
  try{const response=await fetch(DATA_URL,{cache:'no-store'});if(!response.ok)throw Error('No data yet');const incoming=await response.json();if(!Array.isArray(incoming.news)||!Array.isArray(incoming.videos))throw Error('Invalid news data');data=incoming;renderStatus();renderStories();renderVideos()}catch(err){$('#statusMessage').textContent=location.protocol==='file:'?'Local preview: automatic news works after GitHub publication.':'No published news yet. Run the GitHub feed updater to populate headlines.'}
}
start();
