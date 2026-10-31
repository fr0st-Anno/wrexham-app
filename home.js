'use strict';
function homeStory(story){
  const row=el('article','home-story');
  safeText(row,'small','',story.source||'Publisher');
  const link=safeText(row,'a','',story.title||'Story'),url=safeHttp(story.url);
  if(url){link.href=url;link.target='_blank';link.rel='noopener noreferrer'}
  safeText(row,'small','',shortDate(story.published));
  return row;
}
function renderHome(){
  const match=$('#homeMatch'),standing=$('#homeStanding'),result=$('#homeResult');
  match.replaceChildren();standing.replaceChildren();result.replaceChildren();
  const next=futureFixtures()[0];
  if(next){safeText(match,'p','fixture-matchdate',fixtureDate(next));match.append(matchTeams(next))}
  else safeText(match,'p','',sports.updated_at?'No upcoming fixture supplied.':'Match information is unavailable.');
  const table=sports.standings.find(r=>/wrexham/i.test(r.team||''));
  if(table){safeText(standing,'strong','home-position',String(table.position));safeText(standing,'p','',`${table.points} points · ${table.played} played · GD ${table.goal_difference}`)}
  else safeText(standing,'p','','League position unavailable.');
  if(sports.results[0]){result.append(matchTeams(sports.results[0]),resultBadge(sports.results[0]));safeText(result,'small','',fixtureDate(sports.results[0]))}
  else safeText(result,'p','','No result supplied.');
  const warning=sportsStale()||!['connected','unknown'].includes(sportsHealth.status);
  $('#homeFreshness').textContent=sports.updated_at?`${warning?'Data may be out of date · ':''}Football updated ${formatKickoff(sports.updated_at)} · Delayed scores`:'Football data currently unavailable';
  for(const [selector,items] of [['#homeNews',data.news.slice(0,4)],['#homeTransfers',data.news.filter(n=>n.category==='Transfers').slice(0,3)]]){
    const list=$(selector);list.replaceChildren();
    items.forEach(n=>list.append(homeStory(n)));
    if(!items.length)safeText(list,'p','sport-empty','No stories available yet.');
  }
  const videos=$('#homeVideos');videos.replaceChildren();
  for(const video of data.videos.slice(0,2)){
    if(!/^[a-zA-Z0-9_-]{11}$/.test(video.video_id||''))continue;
    const button=el('button','home-video');button.type='button';
    const img=el('img');img.src=`https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`;img.alt='';img.loading='lazy';
    button.append(img,el('span','',video.title||'Club video'));button.addEventListener('click',()=>openVideo(video));videos.append(button);
  }
  if(!videos.children.length)safeText(videos,'p','sport-empty','No videos available yet.');
}
window.addEventListener('wrexham-news-updated',renderHome);
window.addEventListener('wrexham-sports-updated',renderHome);
renderHome();

