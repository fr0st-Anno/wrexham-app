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
  try{const response=await fetch(DATA_URL,{cache:'no-store'});if(!response.ok)throw Error('No data yet');const incoming=await response.json();if(!Array.isArray(incoming.news)||!Array.isArray(incoming.videos))throw Error('Invalid news data');data=incoming;renderStatus();renderStories();renderVideos();window.dispatchEvent(new Event("wrexham-news-updated"))}catch(err){$('#statusMessage').textContent=location.protocol==='file:'?'Local preview: automatic news works after GitHub publication.':'No published news yet. Run the GitHub feed updater to populate headlines.'}
}
start();


/* VERSION 1.3 — Match centre, Championship table, transfers and squad */
const SPORTS_URL='data/sports.json';
let sports={updated_at:null,standings:[],fixtures:[],results:[],squad:[],source:null,status:'not_configured'};
let sportsHealth={status:'unknown'};
const sportsStale=()=>!!sports.updated_at && (!Number.isFinite(Date.parse(sports.updated_at)) || Date.now()-Date.parse(sports.updated_at)>2*60*60*1000);
const futureFixtures=()=>sports.fixtures.filter(m=>['TIMED','SCHEDULED'].includes(m.status)&&Date.parse(m.kickoff)>=Date.now());
const matchState=m=>({TIMED:'Scheduled',SCHEDULED:'Time to be confirmed',POSTPONED:'Postponed · new date awaited',CANCELLED:'Cancelled',SUSPENDED:'Suspended',IN_PLAY:'In progress · delayed update',PAUSED:'Half-time · delayed update',FINISHED:'Full time'}[m.status]||'Awaiting provider update');
const scoreText=m=>m.home_score==null||m.away_score==null?'—':`${m.home_score} : ${m.away_score}`;
function fixtureDate(m){return m.status==='TIMED'||m.status==='FINISHED'?formatKickoff(m.kickoff):['POSTPONED','CANCELLED','SUSPENDED'].includes(m.status)?'Date to be confirmed':`${shortDate(m.kickoff)} · ${matchState(m)}`}
function fixturesPanel(){
  const target=$('#upcomingFixtures');target.replaceChildren();
  const upcoming=futureFixtures();
  if(!upcoming.length)safeText(target,'p','sport-empty',sports.updated_at?'No upcoming Championship fixtures supplied.':'Fixtures will appear after the football feed is connected.');
  for(const m of upcoming){const row=el('div','result-row');const info=el('div');safeText(info,'strong','',`${m.home} – ${m.away}`);safeText(info,'span','',fixtureDate(m));row.append(info);safeText(row,'span','fixture-status',matchState(m));target.append(row)}
  const pending=$('#pendingMatches');pending.replaceChildren();
  const waiting=[...(sports.pending||[]),...sports.fixtures.filter(m=>!upcoming.includes(m))];
  if(waiting.length)safeText(pending,'h3','','Match updates');
  for(const m of waiting){const row=el('div','result-row');safeText(row,'strong','',`${m.home} – ${m.away}`);safeText(row,'span','fixture-status',['TIMED','SCHEDULED'].includes(m.status)?'Awaiting result update':matchState(m));pending.append(row)}
}
const formatKickoff=(iso)=>{if(!iso)return 'Kick-off to be confirmed';const d=new Date(iso);if(isNaN(+d))return 'Kick-off to be confirmed';return new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}).format(d)};
function safeText(parent,tag,cls,value){const p=el(tag,cls,String(value??''));parent.append(p);return p}
function resultsPanel(){const target=$('#recentResults');target.replaceChildren();if(!sports.results?.length){safeText(target,'p','sport-empty',sports.updated_at?'No completed Championship matches supplied for this season.':'Latest results will appear after connecting match data.');return}
  for(const m of sports.results.slice(0,8)){const card=el('div','result-row');const teams=el('div');safeText(teams,'strong','',`${m.home} – ${m.away}`);safeText(teams,'span','',`${formatKickoff(m.kickoff)} · Full time`);safeText(card,'div','result-score',scoreText(m));card.prepend(teams);target.append(card)}
}
function nextMatchPanel(){const target=$('#nextMatch');target.replaceChildren();const m=futureFixtures()[0];if(!m){safeText(target,'p','skeleton-match',sports.updated_at?'No upcoming Championship fixture supplied for this season.':'Next fixture will appear once the match data service is connected.');return}
  safeText(target,'div','fixture-matchdate',fixtureDate(m));const teams=el('div','teams');safeText(teams,'strong','',m.home);safeText(teams,'span','versus','VS');safeText(teams,'strong','',m.away);target.append(teams);safeText(target,'div','venue-line',m.competition||'EFL Championship')
}
function tablePanel(){const target=$('#standingsBody');target.replaceChildren();const rows=sports.standings||[];$('#standings-label').classList.toggle('connected',rows.length>0);$('#standings-label').textContent=rows.length?'UPDATED TABLE':'AWAITING DATA';if(!rows.length){const row=el('tr');const cell=safeText(row,'td','empty-cell','The current league table will load once the free football API is configured.');cell.colSpan=5;target.append(row);return}
  for(const r of rows){const tr=el('tr',/wrexham/i.test(r.team)?'wrexham-row':'');for(const k of ['position','team','played','goal_difference','points'])safeText(tr,'td','',r[k]??'—');target.append(tr)}
}
function squadPanel(){const target=$('#squadGrid');target.replaceChildren();const search=$('#playerSearch').value.trim().toLowerCase();const list=(sports.squad||[]).filter(p=>String(p.name||'').toLowerCase().includes(search));if(!list.length){safeText(target,'div','sport-empty-card',search?'No matching player found.':'The player roster will load if the football data provider makes squad information available.');return}
  for(const p of list){const tile=el('article','player-tile');const initials=(p.name||'W').split(/\s+/).slice(0,2).map(n=>n[0]).join('').toUpperCase();safeText(tile,'div','player-portrait',initials);safeText(tile,'div','player-position',p.position||'Player');safeText(tile,'h3','',p.name||'Player');safeText(tile,'p','',p.nationality||'Nationality unavailable');if(p.dob){const age=Math.floor((Date.now()-new Date(p.dob).getTime())/(365.25*864e5));if(age>=15&&age<55)safeText(tile,'p','',`Age: ${age}`)}
    const btn=safeText(tile,'button','','Find news ↗');btn.addEventListener('click',()=>{$('#searchInput').value=p.name;query=p.name.toLowerCase();filter='All';savedOnly=false;updateCategory();renderStories();$('#stories').scrollIntoView({behavior:'smooth'})});target.append(tile)
  }
}
function transferPanel(){const target=$('#transferList');target.replaceChildren();const transfers=(data.news||[]).filter(n=>n.category==='Transfers').slice(0,7);if(!transfers.length){safeText(target,'div','sport-empty-card','Transfer news will appear here when related reports arrive in the news feeds. No deals are labelled official without verification.');return}
 for(let i=0;i<transfers.length;i++){const n=transfers[i];const row=el('article','transfer-story');safeText(row,'div','transfer-number',String(i+1).padStart(2,'0'));const info=el('div');const a=safeText(info,'a','',n.title||'Transfer story');const url=safeHttp(n.url);if(url){a.href=url;a.target='_blank';a.rel='noopener noreferrer'}else a.removeAttribute('href');safeText(info,'small','',`${n.source||'Publisher'} · ${shortDate(n.published)||'Date unavailable'}`);row.append(info);safeText(row,'span','report-label','REPORTED · UNVERIFIED');target.append(row)}
}
function renderSports(){nextMatchPanel();fixturesPanel();resultsPanel();tablePanel();squadPanel();const connected=!!sports.updated_at;
  const failed=!['connected','unknown'].includes(sportsHealth.status);
  const stale=sportsStale();
  $('#sports-updated').textContent=connected?`${stale?'Data may be out of date · ':''}Last success ${formatKickoff(sports.updated_at)}${failed?' · Latest refresh unavailable':''} · Delayed scores`:sportsHealth.status==='not_configured'?'Sports feed awaits setup':'Football data currently unavailable';
  $('.pulse-indicator').classList.toggle('connected',connected&&!stale&&!failed);
  if(sports.standings.length){$('#standings-label').textContent=stale||failed?'LAST AVAILABLE TABLE':'UPDATED TABLE';$('#standings-label').classList.toggle('connected',!stale&&!failed)}
  $('#table-title').textContent=sports.season?`League standings · ${sports.season.start.slice(0,4)}/${sports.season.end.slice(2,4)}`:'League standings';
}
async function loadSports(){
  const [snapshot,health]=await Promise.allSettled([fetch(SPORTS_URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json()}),fetch('data/sports-status.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json()})]);
  sportsHealth=health.status==='fulfilled'&&typeof health.value?.status==='string'?health.value:{status:'unknown'};
  const content=snapshot.status==='fulfilled'?snapshot.value:null;
  if(content&&['standings','fixtures','results','squad'].every(k=>Array.isArray(content[k])&&content[k].every(v=>v&&typeof v==='object'))){
    sports={...content,pending:Array.isArray(content.pending)?content.pending.filter(v=>v&&typeof v==='object'):[]};
    if(typeof sports.season?.start!=='string'||typeof sports.season?.end!=='string')sports.season=null;
  }else sportsHealth={status:'unavailable'};
  renderSports();
}
window.addEventListener('wrexham-news-updated',transferPanel);
$('#playerSearch').addEventListener('input',squadPanel);
renderSports();transferPanel();loadSports();
setInterval(renderSports,60000);
setInterval(loadSports,5*60000);
