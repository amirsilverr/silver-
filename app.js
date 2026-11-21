"use strict";

const STORAGE_KEY="amir_series_manager_v3";
const OMDB_KEY_STORAGE="silver_tv_omdb_api_key";
const DEFAULT_OMDB_API_KEYS=["d9393270","e48f39d4","5e376a0c","76a3cfaf","16b790e1"];
const DEFAULT_OMDB_API_KEY=DEFAULT_OMDB_API_KEYS[0];
const OMDB_ACTIVE_INDEX_STORAGE="silver_tv_omdb_active_default_index";
let omdbDefaultKeyIndex=0;
const POSTER_CACHE_STORAGE="silver_tv_omdb_posters_v1";
let omdbApiKey=DEFAULT_OMDB_API_KEY;
let omdbPersonalKey="";
let posterCache={};
const posterRequests=new Map();
try{
  omdbPersonalKey=localStorage.getItem(OMDB_KEY_STORAGE)||"";
  omdbDefaultKeyIndex=Math.max(0,Math.min(DEFAULT_OMDB_API_KEYS.length-1,Number(localStorage.getItem(OMDB_ACTIVE_INDEX_STORAGE)||0)||0));
  omdbApiKey=omdbPersonalKey||DEFAULT_OMDB_API_KEYS[omdbDefaultKeyIndex];
}catch{omdbPersonalKey="";omdbDefaultKeyIndex=0;omdbApiKey=DEFAULT_OMDB_API_KEY;}
function updateOmdbActiveStatus(message=""){
  const el=document.getElementById("omdbActiveStatus");
  if(!el)return;
  el.textContent=omdbPersonalKey?"Active API: Your personal key" : `Active default API: #${omdbDefaultKeyIndex+1} of ${DEFAULT_OMDB_API_KEYS.length}`;
  if(message)el.textContent+=` — ${message}`;
}
function isOmdbLimitError(data){
  const error=String(data?.Error||"").toLowerCase();
  return error.includes("request limit")||error.includes("daily limit")||error.includes("limit reached")||error.includes("too many requests");
}
async function omdbFetch(url,options){
  const personal=!!omdbPersonalKey;
  const attempts=personal?1:DEFAULT_OMDB_API_KEYS.length;
  let lastResponse=null;
  for(let attempt=0;attempt<attempts;attempt++){
    const key=personal?omdbPersonalKey:DEFAULT_OMDB_API_KEYS[omdbDefaultKeyIndex];
    const requestUrl=new URL(url,location.href);
    requestUrl.searchParams.set("apikey",key);
    const response=await fetch(requestUrl.toString(),options);
    const data=await response.clone().json().catch(()=>null);
    lastResponse=response;
    if(!isOmdbLimitError(data))return response;
    if(personal) return response;
    if(attempt<attempts-1){
      omdbDefaultKeyIndex=(omdbDefaultKeyIndex+1)%DEFAULT_OMDB_API_KEYS.length;
      omdbApiKey=DEFAULT_OMDB_API_KEYS[omdbDefaultKeyIndex];
      try{localStorage.setItem(OMDB_ACTIVE_INDEX_STORAGE,String(omdbDefaultKeyIndex));}catch{}
      updateOmdbActiveStatus("Limit reached; switched automatically");
    }
  }
  return lastResponse;
}
try{posterCache=JSON.parse(localStorage.getItem(POSTER_CACHE_STORAGE)||"{}");if(!posterCache||typeof posterCache!=="object")posterCache={};}catch{posterCache={};}
function posterKey(title){return String(title||"").trim().toLowerCase();}
function getCachedPoster(title){return posterCache[posterKey(title)]||"";}
async function getPosterByTitle(title,type="series"){
  if(typeof title!=="string"||!title.trim()||!omdbApiKey)return "";
  const key=posterKey(title);
  if(Object.prototype.hasOwnProperty.call(posterCache,key))return posterCache[key]||"";
  if(posterRequests.has(key))return posterRequests.get(key);
  const request=(async()=>{
    try{
      const url=`https://www.omdbapi.com/?apikey=${encodeURIComponent(omdbApiKey)}&s=${encodeURIComponent(title.trim())}&type=${type==="movie"?"movie":"series"}`;
      const response=await omdbFetch(url);
      const result=await response.json();
      const poster=result?.Response==="True"&&result?.Search?.[0]?.Poster&&result.Search[0].Poster!=="N/A"?result.Search[0].Poster:"";
      posterCache[key]=poster;
      try{localStorage.setItem(POSTER_CACHE_STORAGE,JSON.stringify(posterCache));}catch{}
      document.querySelectorAll("img[data-poster-title]").forEach(img=>{
        if(img.dataset.posterTitle!==key||!poster)return;
        img.src=poster;img.style.display="block";
        const placeholder=img.parentElement?.querySelector(".poster-placeholder");if(placeholder)placeholder.style.display="none";
      });
      return poster;
    }catch(error){console.warn("OMDb poster lookup failed:",error);return "";}
    finally{posterRequests.delete(key);}
  })();
  posterRequests.set(key,request);
  return request;
}
function hydratePosters(){
  if(!omdbApiKey)return;
  const names=[...data.series,...data.watchlist,...data.amirWatched,...data.amirWant,...data.topList.map(resolveFavorite).filter(Boolean),...data.customLists.flatMap(l=>l.items),...(data.overviewItems||[]),]
    .filter(item=>item&&item.name&&!item.poster).map(item=>item.name);
  [...new Set(names.map(posterKey))].forEach(key=>{
    if(!Object.prototype.hasOwnProperty.call(posterCache,key)&&!posterRequests.has(key))getPosterByTitle(key);
  });
}

const defaultData={series:[],watchlist:[],topList:[],amirWatched:[],amirWant:[],customLists:[],overviewItems:[],telegramUrl:"https://t.me/silvertv24"};

let data=loadData();

// One-time import of Amir's supplied read-only series collections.
const AMIR_COLLECTIONS_MIGRATION="silver_tv_amir_collections_v1";
const AMIR_WATCHED_SEED=["Breaking Bad","Better call Saul","Game of Thrones","Dark","Chernobyl","Mr.robot","Money Heist","Peaky blinders","Attack on titan","Hannibal","Dexter","Sopranos","Prison Break","Vikings","Gravity Falls","Death Note","Loki","Sherlock","Punisher","Stranger Things","Dr House","House of the Dragon","Grimm","The Boys","Arcane","Band of Brothers","Lucifer","Severance","Moon Knight","Dexter(Resurrection)","Andor","Succession","Ben 10(Ultimate Alien)","Ben 10(Alien Force)","Ben 10","Rick and Morty","Avatar","Clone Wars","Bojack Horseman","Ben 10(Omniverse)","The Queen's Gambit","Alice in Borderland","Squid Game","Doctor who","Disenchantment","Berlin and the Lady with an Ermine","Berlin","VisionQuest","It(welcome to Derry)","Dexter(New Blood)","Knight of Seven Kingdoms","Pluribus","Wednesday","Merlin","Obi-Wan kenobi","Mandalorian","Maul","Avatar: The Last Airbender","Dexter(Original Sin)","Vikings(Valhalla)","Gen V","Black mirror","What if","Star Wars: Rebels","Bad Batch","Takopi's Original Sin","Kung Fu Panda: Legends of Awesomeness","Lost in space","The Last of Us","Narcos","Tales of the jedi","Penguin","Hawkeye","Ahsoka","WandaVision","Tales of underworld","Tales of the empire","Boba fett","From","Legend of the korra","Under the dome","War Land and Sea","Adolescence","Kaleidoscope","Baymax","I am Groot","The silent sea","Acolyte"];
const AMIR_WANT_SEED=["the wire","westworld","Person of Interest","lost","the oA","Mentalist","spartacus","you","Six feet under","Fringe","House of cards","Fargo","vampire","the 100","Mindhunter","Last kingdom","Ozark","Twin Peaks","mad men","mouse","friends","Office","Walking dead","Witcher","Daredevil","Invincible","Silo","True Detective","Supernatural"];
function seedAmirCollection(key,names,status){
  const list=Array.isArray(data[key])?data[key]:[];
  const existing=new Set(list.map(item=>cleanName(item?.name).toLowerCase()));
  names.forEach(name=>{
    const clean=cleanName(name),normalized=clean.toLowerCase();
    if(!clean||existing.has(normalized))return;
    list.push(normalizeItem({id:uid(),name:clean,status,addedAt:new Date().toISOString()}));
    existing.add(normalized);
  });
  data[key]=list;
}
try{
  if(localStorage.getItem(AMIR_COLLECTIONS_MIGRATION)!=="done"){
    seedAmirCollection("amirWatched",AMIR_WATCHED_SEED,"Watched");
    seedAmirCollection("amirWant",AMIR_WANT_SEED,"Planned");
    if(save())localStorage.setItem(AMIR_COLLECTIONS_MIGRATION,"done");
  }
}catch(error){console.warn("Could not import Amir's collections:",error);}

let editingId=null;
let editingTarget="series";
let bulkTarget="series";

const editModes={series:false,watchlist:false,topList:false,amirWatched:false,amirWant:false};
const privateEditUnlocked={amirWatched:false,amirWant:false};
const PRIVATE_EDIT_PASSWORD="amir13";

function cloneDefault(){return JSON.parse(JSON.stringify(defaultData));}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
function cleanName(s){return String(s??"").trim().replace(/\s+/g," ");}
function isValidReleaseYear(value){
  const year=String(value??"").trim();
  if(!year)return true;
  const match=year.match(/^(\d{4})(?:\s*[-–—]\s*(\d{4}|present)?)?$/i);
  if(!match)return false;
  const start=Number(match[1]);
  if(start<1888||start>2100)return false;
  if(match[2]&&match[2].toLowerCase()!=="present"){
    const end=Number(match[2]);
    if(end<start||end>2100)return false;
  }
  return true;
}

function normalizeItem(item){
  if(!item||typeof item!=="object")return null;
  const name=cleanName(item.name);
  if(!name)return null;
  return{
    id:String(item.id||uid()),
    name,
    year:item.year??"",
    status:["Planned","Watching","Watched","Stop Watching"].includes(item.status)?item.status:"Planned",
    rating:item.rating??"",
    episodesWatched:item.episodesWatched??"",
    episodeMinutes:item.episodeMinutes??"",
    imdbID:item.imdbID||"",
    poster:item.poster||"",
    addedAt:item.addedAt||new Date().toISOString()
  };
}

function loadData(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(!saved)return cloneDefault();

    const series=Array.isArray(saved.series)?saved.series.map(normalizeItem).filter(Boolean):[];
    const seriesById=new Map(series.map(s=>[s.id,s]));
    const rawWatch=Array.isArray(saved.watchlist)?saved.watchlist:[];
    const watchlist=[];
    const watchIds=new Set();
    const watchNames=new Set();

    rawWatch.forEach(entry=>{
      let item=null;
      if(typeof entry==="string"){
        const original=seriesById.get(entry);
        if(original)item={...original,id:uid()};
      }else{
        item=normalizeItem(entry);
      }
      if(!item)return;
      item.status="Planned";
      if(watchIds.has(item.id))item.id=uid();
      const key=item.name.toLowerCase();
      if(watchNames.has(key))return;
      watchIds.add(item.id);
      watchNames.add(key);
      watchlist.push(item);
    });

    const customLists=Array.isArray(saved.customLists)?saved.customLists.map(list=>({id:String(list.id||uid()),name:cleanName(list.name),type:list.type==="movie"?"movie":"series",items:Array.isArray(list.items)?list.items.map(normalizeItem).filter(Boolean):[]})).filter(list=>list.name):[{id:"legacy-series",name:"My Series",type:"series",items:series.map(item=>({...item}))}];
    const amirWatched=Array.isArray(saved.amirWatched)?saved.amirWatched.map(normalizeItem).filter(Boolean):[];
    const amirWant=Array.isArray(saved.amirWant)?saved.amirWant.map(normalizeItem).filter(Boolean):[];
    const overviewItems=Array.isArray(saved.overviewItems)?saved.overviewItems.map(entry=>{const item=normalizeItem(entry);if(item)item.mediaType=entry.mediaType==="movie"?"movie":"series";return item;}).filter(Boolean):[];
    const topList=[];
    (Array.isArray(saved.topList)?saved.topList:[]).forEach(entry=>{
      let oldItem=null;let oldMediaType="series";
      if(entry&&typeof entry==="object"&&entry.itemId){
        const sourceList=entry.source==="custom"?customLists.find(list=>list.id===String(entry.listId)):null;
        oldItem=entry.source==="overview"?overviewItems.find(x=>x.id===String(entry.itemId)):entry.source==="series"?seriesById.get(String(entry.itemId)):sourceList?.items.find(x=>x.id===String(entry.itemId))||null;
        oldMediaType=entry.source==="overview"?(oldItem?.mediaType||"series"):sourceList?.type||"series";
      }else if(entry&&typeof entry==="object"){
        oldItem=entry.item&&typeof entry.item==="object"?normalizeItem(entry.item):normalizeItem(entry);
        oldMediaType=entry.mediaType==="movie"||entry.item?.mediaType==="movie"?"movie":"series";
      }else if(entry){oldItem=seriesById.get(String(entry))||null;}
      const entryName=typeof entry==="string"?entry:entry?.name||entry?.title||entry?.item?.name||oldItem?.name||"";
      const match=(oldItem?overviewItems.find(item=>item.name.toLowerCase()===oldItem.name.toLowerCase()&&item.mediaType===oldMediaType):null)
        ||(entryName?overviewItems.find(item=>item.name.toLowerCase()===String(entryName).toLowerCase()&&(item.mediaType===oldMediaType||!oldItem)):null);
      if(match&&!topList.some(f=>f.itemId===match.id))topList.push({id:String(entry?.id||uid()),source:"overview",listId:"",itemId:match.id,addedAt:entry?.addedAt||oldItem?.addedAt||new Date().toISOString()});
    });
    return{series,watchlist,topList,amirWatched,amirWant,customLists,overviewItems,telegramUrl:"https://t.me/silvertv24"};
  }catch(error){
    console.error("Could not load saved data:",error);
    return cloneDefault();
  }
}

function save(){
  try{
    localStorage.setItem(STORAGE_KEY,JSON.stringify(data));
    return true;
  }catch(error){
    console.error("Could not save data:",error);
    toast("Could not save data. Check browser storage.");
    return false;
  }
}

function cleanRating(value){return value===""?"":String(value);}
function escapeHTML(v){
  return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function toast(message){
  const el=document.getElementById("toast");
  el.textContent=message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer=setTimeout(()=>el.classList.remove("show"),2600);
}

function formatRating(v){
  if(v===null||v===undefined||v==="")return "Not rated";
  return Number(v).toFixed(2).replace(/\.?0+$/,"");
}

function normalizePosition(value,length){
  const n=Number(value);
  if(!Number.isFinite(n))return length;
  return Math.max(0,Math.min(length,Math.floor(n)-1));
}

function insertAt(list,item,position){
  const index=position===""||position===null||position===undefined
    ?list.length:normalizePosition(position,list.length);
  list.splice(index,0,item);
}

function findSeries(id){return data.series.find(s=>s.id===id);}
function resolveFavorite(fav){
  if(!fav)return null;
  const overview=Array.isArray(data.overviewItems)?data.overviewItems:[];
  let item=null;
  if(typeof fav==="string"){
    item=overview.find(x=>x.id===fav)||overview.find(x=>x.name?.toLowerCase()===fav.toLowerCase());
  }else{
    item=overview.find(x=>x.id===String(fav.itemId||""));
    if(!item){
      const legacyName=fav.name||fav.title||fav.item?.name;
      const mediaType=fav.mediaType||fav.item?.mediaType;
      if(legacyName)item=overview.find(x=>x.name?.toLowerCase()===String(legacyName).toLowerCase()&&(!mediaType||x.mediaType===mediaType));
    }
  }
  return item?{...item,id:fav.id||item.id,_favoriteSource:"overview",_favoriteListId:"",_favoriteItemId:item.id}:null;
}
function favoriteExists(source,listId,itemId){return data.topList.some(f=>f.source===source&&f.listId===(listId||"")&&f.itemId===itemId);}
function favoriteSourceItem(fav){return fav?.source==="overview"?data.overviewItems.find(x=>x.id===fav.itemId):null;}
function favoriteCandidates(){return data.overviewItems.map(item=>({source:"overview",listId:"",itemId:item.id,item,listName:item.mediaType==="movie"?"Overview · Movie":"Overview · Series"}));}
function findWatchItem(id){return data.watchlist.find(s=>s.id===id);}
function getListByKey(key){return data[key]||[];}
function findItemInList(key,id){return getListByKey(key).find(s=>s.id===id);}
function listPrefix(key){return key==="amirWatched"?"amirWatched":key==="amirWant"?"amirWant":key==="watchlist"?"watch":"series";}

function isDuplicate(list,name,excludeId=null){
  return list.some(s=>s.name.toLowerCase()===name.toLowerCase()&&s.id!==excludeId);
}

function makeItem(name,details){
  return{
    id:uid(),name,
    year:details.year||"",
    status:details.status||"Planned",
    rating:cleanRating(details.rating??""),
    episodesWatched:details.episodesWatched??"",
    episodeMinutes:details.episodeMinutes??"",
    imdbID:details.imdbID||"",
    poster:details.poster||"",
    addedAt:new Date().toISOString()
  };
}

function sortItems(items,mode){
  const list=[...items];
  const statusOrder={Watching:0,Planned:1,Watched:2,"Stop Watching":3};
  if(mode==="az")list.sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:"base"}));
  if(mode==="za")list.sort((a,b)=>b.name.localeCompare(a.name,undefined,{sensitivity:"base"}));
  if(mode==="oldest")list.sort((a,b)=>(Number(a.year)||99999)-(Number(b.year)||99999));
  if(mode==="newest")list.sort((a,b)=>(Number(b.year)||0)-(Number(a.year)||0));
  if(mode==="rating")list.sort((a,b)=>(Number(b.rating)||-1)-(Number(a.rating)||-1));
  if(mode==="status")list.sort((a,b)=>(statusOrder[a.status]??9)-(statusOrder[b.status]??9));
  return list;
}

function render(){
  // Render the dashboard first and independently: an error in another page
  // must not prevent the home page widgets from showing stored data.
  try{renderDashboardLists();}catch(error){console.error("Dashboard render failed:",error);}
  const safeRender=(label,fn)=>{try{fn();}catch(error){console.error(label+" render failed:",error);}};
  safeRender("Custom lists",renderCustomLists);
  safeRender("Stats",renderStats);
  safeRender("My List",renderSeries);
  safeRender("Watchlist",renderWatchlist);
  safeRender("Favorites page",renderTop);
  safeRender("Overview",renderOverview);
  safeRender("Watched list",()=>renderPrivateList("amirWatched"));
  safeRender("Want list",()=>renderPrivateList("amirWant"));
  safeRender("Private stats",renderPrivateStats);
  safeRender("Selectors",renderSelectors);
  safeRender("Selection counts",renderSelectionCounts);
  safeRender("Posters",hydratePosters);
  const setCount=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
  setCount("seriesCount",(data.series||[]).length+" series");
  setCount("watchCount",(data.watchlist||[]).length+" series");
  setCount("topCount",(data.topList||[]).length+" items");
  setCount("amirWatchedCount",(data.amirWatched||[]).length+" series");
  setCount("amirWantCount",(data.amirWant||[]).length+" series");
  safeRender("Edit buttons",updateEditButtons);
}

function renderStats(){
  const statuses=["Planned","Watching","Watched","Stop Watching"];
  const countFor=(type,status)=>data.overviewItems.filter(item=>item.mediaType===type&&item.status===status).length;
  const typeGroup=(type,label)=>{
    const items=data.overviewItems.filter(item=>item.mediaType===type);
    return `<section class="stats-group">
      <h2 class="stats-group-title">${label.toUpperCase()} OVERVIEW <span style="float:right;letter-spacing:0;font-weight:600">${items.length} Total</span></h2>
      <div class="status-stats">${statuses.map(status=>`<div class="stat"><small>${status}</small><strong>${countFor(type,status)}</strong><div class="hint">${status==="Watched"?"Completed":status==="Watching"?"In progress":status==="Planned"?"Not started":"Paused or stopped"}</div></div>`).join("")}</div>
    </section>`;
  };
  const rated=data.overviewItems.filter(item=>item.rating!==""&&item.rating!==null&&item.rating!==undefined&&Number.isFinite(Number(item.rating)));
  const average=rated.length?(rated.reduce((sum,item)=>sum+Number(item.rating),0)/rated.length).toFixed(2):"—";
  document.getElementById("stats").innerHTML=`
    ${typeGroup("movie","Movies")}
    ${typeGroup("series","Series")}
    <section class="stats-group" style="grid-column:1/-1">
      <h2 class="stats-group-title">RATING OVERVIEW</h2>
      <div class="rating-stats">
        <div class="stat"><small>Rated Titles</small><strong>${rated.length}</strong><div class="hint">Overview items with a rating</div></div>
        <div class="stat"><small>Average Rating</small><strong>${average}</strong><div class="hint">Out of 10 · Overview only</div></div>
      </div>
    </section>`;
}
function seriesCard(s,index,total,options={}){
  const statusClass=String(s.status||"Planned").toLowerCase();
  const poster=s.poster||getCachedPoster(s.name);
  return `<div class="series-card${options.select?" has-select":""}">
    ${options.select?`<input class="select-box item-select" type="checkbox" data-item-select="${escapeHTML(options.select)}" data-id="${escapeHTML(s.id)}" aria-label="Select ${escapeHTML(s.name)}">`:``}
    <div class="number">${index+1}</div>
    <div class="poster-wrap"><img class="poster-thumb" data-poster-title="${escapeHTML(s.name.toLowerCase())}" src="${escapeHTML(poster)}" alt="${escapeHTML(s.name)} poster" loading="lazy" style="${poster?"":"display:none"}" onerror="this.style.display='none'"><span class="poster-placeholder" style="${poster?"display:none":""}">▧</span></div>
    <div class="series-info">
      <div class="series-name"><span>${escapeHTML(s.name)}</span>${options.titleExtra||""}</div>
      <div class="meta">
        ${s.year?`<span class="badge year-badge">${escapeHTML(s.year)}</span>`:""}
        <span class="badge ${statusClass} ${statusClass==='stop watching'?'stop':''}">${escapeHTML(s.status)}</span>
        <span class="badge rating-badge">★ ${formatRating(s.rating)}</span>
        ${options.extraMeta||""}
      </div>
    </div>
    <div class="actions">
      ${options.move?`
        <button class="icon-btn" title="Move up" data-action="up" data-id="${escapeHTML(s.id)}" ${options.canMoveUp===false||index===0?"disabled":""}>↑</button>
        <button class="icon-btn" title="Move down" data-action="down" data-id="${escapeHTML(s.id)}" ${options.canMoveDown===false||index===total-1?"disabled":""}>↓</button>`:""}
      ${options.edit?`<button class="icon-btn" data-action="edit" data-id="${escapeHTML(s.id)}">Edit</button>`:""}
      ${options.remove?`<button class="icon-btn" data-action="remove" data-id="${escapeHTML(s.id)}">✕</button>`:""}
    </div>
  </div>`;
}

function renderSeries(){
  const query=document.getElementById("seriesSearch").value.trim().toLowerCase();
  const filter=document.getElementById("statusFilter").value;
  const manual=document.getElementById("sortSelect").value==="manual";
  const list=sortItems(data.series,document.getElementById("sortSelect").value).filter(s=>
    s.name.toLowerCase().includes(query)&&(filter==="all"||s.status===filter)
  );

  document.getElementById("seriesList").innerHTML=list.length
    ?list.map((s,i)=>{
      const actualIndex=data.series.findIndex(x=>x.id===s.id);
      return seriesCard(s,i,list.length,{
        select:editModes.series?"series":null,
        move:editModes.series&&manual,
        canMoveUp:actualIndex>0,
        canMoveDown:actualIndex<data.series.length-1,
        edit:editModes.series,
        remove:editModes.series
      });
    }).join("")
    :`<div class="empty">No series found.</div>`;
}

function renderWatchlist(){
  const query=document.getElementById("watchSearch").value.trim().toLowerCase();
  const filter=document.getElementById("watchStatusFilter").value;
  const mode=document.getElementById("watchSortSelect").value;
  const list=sortItems(data.watchlist,mode).filter(s=>
    s.name.toLowerCase().includes(query)&&(filter==="all"||s.status===filter)
  );

  document.getElementById("watchList").innerHTML=list.length
    ?list.map((s,i)=>{
      const actualIndex=data.watchlist.findIndex(x=>x.id===s.id);
      return seriesCard(s,i,list.length,{
        select:editModes.watchlist?"watchlist":null,
        move:editModes.watchlist&&mode==="manual",
        canMoveUp:actualIndex>0,
        canMoveDown:actualIndex<data.watchlist.length-1,
        edit:editModes.watchlist,
        remove:editModes.watchlist
      });
    }).join("")
    :`<div class="empty">No watchlist series found.</div>`;
}

function renderTop(){
  const query=(document.getElementById("topSearch")?.value||"").trim().toLowerCase();
  const mode=document.getElementById("topSortSelect")?.value||"manual";
  const items=sortItems(data.topList.map(resolveFavorite).filter(Boolean),mode).filter(x=>x.name.toLowerCase().includes(query));
  document.getElementById("topList").innerHTML=items.length?items.map((item,i)=>seriesCard(item,i,items.length,{select:editModes.topList?"topList":null,move:editModes.topList&&mode==="manual",edit:editModes.topList,remove:editModes.topList})).join(""):`<div class="empty">${query?"No matching favorites found.":"Your favorites list is empty."}</div>`;
}

function renderPrivateList(key){
  const prefix=listPrefix(key);
  const query=document.getElementById(prefix+"Search").value.trim().toLowerCase();
  const mode=document.getElementById(prefix+"SortSelect").value;
  const items=getListByKey(key);
  const list=sortItems(items,mode).filter(item=>item.name.toLowerCase().includes(query));
  document.getElementById(prefix+"List").innerHTML=list.length?list.map((item,index)=>{
    const poster=item.poster||getCachedPoster(item.name);
    return `<div class="series-card amir-archive-card">
      <div class="number">${index+1}</div>
      <div class="poster-wrap"><img class="poster-thumb" data-poster-title="${escapeHTML(item.name.toLowerCase())}" src="${escapeHTML(poster)}" alt="${escapeHTML(item.name)} poster" loading="lazy" style="${poster?"":"display:none"}" onerror="this.style.display='none'"><span class="poster-placeholder" style="${poster?"display:none":""}">▧</span></div>
      <div class="series-info"><div class="series-name"><button type="button" class="overview-title-link amir-title-link" data-amir-details="${escapeHTML(key)}:${escapeHTML(item.id)}">${escapeHTML(item.name)}</button></div></div>
    </div>`;
  }).join(""):`<div class="empty">${key==="amirWatched"?"No watched series added yet.":"Your watch list is empty."}</div>`;
}

function renderPrivateStats(){
  const episodes=data.amirWatched.reduce((sum,item)=>sum+(Number(item.episodesWatched)||0),0);
  const minutes=data.amirWatched.reduce((sum,item)=>sum+(Number(item.episodesWatched)||0)*(Number(item.episodeMinutes)||0),0);
  const hours=minutes/60;
  document.getElementById("amirWatchedEpisodes").textContent=episodes.toLocaleString();
  document.getElementById("amirWatchedHours").textContent=hours.toFixed(2)+" h";
}

function renderSelectors(){renderFavoritePicker();}

function renderDashboardLists(){
  const safeArray=value=>Array.isArray(value)?value:[];
  const setPanel=(id,html)=>{const el=document.getElementById(id);if(el)el.innerHTML=html;};
  const recentEntries=[];
  const addRecent=(items,section,defaultType="series")=>{
    safeArray(items).forEach(raw=>{
      if(!raw||typeof raw!=="object")return;
      const name=cleanName(raw.name||raw.title);
      if(!name)return;
      recentEntries.push({name,year:raw.year??"",addedAt:raw.addedAt||"",_recentSection:section,_recentType:raw.mediaType==="movie"||defaultType==="movie"?"movie":"series"});
    });
  };

  // Recently Added: every collection that supports adding titles.
  try{
    addRecent(data.series,"My List");
    addRecent(data.watchlist,"Watchlist");
    addRecent(data.amirWatched,"Series I've Watched");
    addRecent(data.amirWant,"Watchlist");
    safeArray(data.customLists).forEach(list=>{if(list&&typeof list==="object")addRecent(list.items,list.name||"My List",list.type||"series");});
    addRecent(data.overviewItems,"Overview");
    safeArray(data.topList).forEach(favorite=>{
      const item=resolveFavorite(favorite);
      if(item)recentEntries.push({name:item.name,year:item.year||"",addedAt:favorite?.addedAt||item.addedAt||"",_recentSection:"Favorites",_recentType:item.mediaType||"series"});
    });
    const timestamp=item=>{const t=Date.parse(item.addedAt||"");return Number.isFinite(t)?t:0;};
    const recent=recentEntries.sort((a,b)=>timestamp(b)-timestamp(a)).slice(0,7);
    setPanel("recent",recent.length?recent.map(item=>`<div class="recent-item"><span>${escapeHTML(item.name)} <small class="muted">· ${escapeHTML(item._recentSection)} · ${item._recentType==="movie"?"Movie":"Series"}</small></span><span class="muted">${escapeHTML(item.year||"")}</span></div>`).join(""):'<div class="empty">No titles added yet. Add titles to any list or to Overview.</div>');
  }catch(error){console.error("Dashboard Recently Added error:",error);setPanel("recent",'<div class="empty">Recently Added could not be loaded.</div>');}

  // Top Rated: only rated items stored in Overview.
  try{
    const rated=safeArray(data.overviewItems).filter(item=>{
      if(!item||!cleanName(item.name)||item.rating===""||item.rating===null||item.rating===undefined)return false;
      const rating=Number(String(item.rating).replace(",","."));
      return Number.isFinite(rating)&&rating>=0&&rating<=10;
    }).sort((a,b)=>Number(String(b.rating).replace(",","."))-Number(String(a.rating).replace(",","."))).slice(0,5);
    setPanel("topRated",rated.length?rated.map(item=>`<div class="recent-item"><span>${escapeHTML(item.name)} <small class="muted">(${item.mediaType==="movie"?"Movie":"Series"})</small></span><span class="rating">★ ${formatRating(item.rating)}</span></div>`).join(""):'<div class="empty">No rated titles in Overview yet. Add a rating to an Overview item.</div>');
  }catch(error){console.error("Dashboard Top Rated error:",error);setPanel("topRated",'<div class="empty">Top Rated could not be loaded.</div>');}

  // Favorites are references to Overview items. Resolve older/stale references by title too.
  try{
    const favorites=safeArray(data.topList).map(resolveFavorite).filter(Boolean);
    const unique=[];const seen=new Set();
    favorites.forEach(item=>{const key=item._favoriteItemId||item.name.toLowerCase();if(!seen.has(key)){seen.add(key);unique.push(item);}});
    const top=unique.slice(0,3);
    setPanel("dashboardFavorites",top.length?top.map((item,i)=>`<div class="favorite-mini"><strong>${i+1}. ${escapeHTML(item.name)}</strong><small>${escapeHTML(item.year||"Year unknown")}</small></div>`).join(""):'<div class="empty" style="grid-column:1/-1">No favorites selected. Add titles from Overview.</div>');
  }catch(error){console.error("Dashboard Favorites error:",error);setPanel("dashboardFavorites",'<div class="empty" style="grid-column:1/-1">Favorites could not be loaded.</div>');}
}

/* Edit mode */
function updateEditButtons(){
  const configs=[
    ["series","seriesEditToggle","seriesEditHint"],
    ["watchlist","watchEditToggle","watchEditHint"],
    ["topList","topEditToggle","topEditHint"],
    ["amirWatched","amirWatchedEditToggle","amirWatchedEditHint"],
    ["amirWant","amirWantEditToggle","amirWantEditHint"]
  ];
  configs.forEach(([key,buttonId,hintId])=>{
    const active=Boolean(editModes[key]);
    const button=document.getElementById(buttonId);
    if(button){
      button.textContent=active?"Done":"Edit";
      button.classList.toggle("editing",active);
      button.setAttribute("aria-pressed",String(active));
    }
    const hint=document.getElementById(hintId);
    if(hint)hint.hidden=!active;
    const tools=document.querySelector(`[data-selection-tools="${key}"]`);
    if(tools)tools.hidden=!active;
    if(!active&&selectedItems[key])selectedItems[key].clear();
  });
}

function toggleEditMode(key){
  if(!Object.prototype.hasOwnProperty.call(editModes,key))return;

  if(key==="amirWatched"||key==="amirWant"){
    if(editModes[key]){
      editModes[key]=false;
      privateEditUnlocked[key]=false;
      if(selectedItems[key])selectedItems[key].clear();
      render();
      toast("Edit mode finished.");
      return;
    }
    let allowed=false;
    requestPrivateAccess(key,()=>{allowed=true;});
    if(!allowed)return;
  }

  // Update the state first, then refresh both the button and the list UI.
  editModes[key]=!editModes[key];
  if(!editModes[key]&&selectedItems[key])selectedItems[key].clear();

  const buttonId={
    series:"seriesEditToggle",
    watchlist:"watchEditToggle",
    topList:"topEditToggle",
    amirWatched:"amirWatchedEditToggle",
    amirWant:"amirWantEditToggle"
  }[key];

  const button=document.getElementById(buttonId);
  if(button){
    button.textContent=editModes[key]?"Done":"Edit";
    button.classList.toggle("editing",editModes[key]);
    button.setAttribute("aria-pressed",String(editModes[key]));
  }

  render();
  // Re-apply after render so no other render routine can leave a stale label.
  updateEditButtons();
  toast(editModes[key]?"Edit mode enabled.":"Edit mode finished.");
}

[
  ["seriesEditToggle","series"],
  ["watchEditToggle","watchlist"],
  ["topEditToggle","topList"],
  ["amirWatchedEditToggle","amirWatched"],
  ["amirWantEditToggle","amirWant"]
].forEach(([buttonId,key])=>{
  const button=document.getElementById(buttonId);
  if(!button)return;
  button.type="button";
  button.onclick=(event)=>{
    event.preventDefault();
    event.stopPropagation();
    toggleEditMode(key);
  };
});

/* Add and edit modal */
function openAdd(target="series"){
  editingId=null;
  editingTarget=target;
  document.getElementById("modalTitle").textContent=target==="watchlist"?"Add to Watchlist":target==="amirWatched"?"Add Watched Series":target==="amirWant"?"Add to Want to Watch":"Add Series";
  document.getElementById("formName").value="";
  document.getElementById("formYear").value="";
  document.getElementById("formStatus").value="Planned";
  document.getElementById("formRating").value="";
  document.getElementById("formEpisodesWatched").value="";
  document.getElementById("formEpisodeMinutes").value="";
  document.getElementById("formStatusField").hidden=target==="watchlist";
  const showWatchedFields=target==="amirWatched";
  document.getElementById("watchedEpisodesField").hidden=!showWatchedFields;
  document.getElementById("watchedEpisodeMinutesField").hidden=!showWatchedFields;
  document.getElementById("formPosition").value="";
  document.getElementById("formPosition").disabled=false;
  document.getElementById("modalWrap").classList.add("open");
  document.getElementById("formName").focus();
}

function openEdit(target,id){
  const item=(target==="watchlist"?findWatchItem(id):(target==="series"?findSeries(id):findItemInList(target,id)));
  if(!item)return;
  editingId=id;
  editingTarget=target;
  document.getElementById("modalTitle").textContent=target==="watchlist"?"Edit Watchlist Item":target==="amirWatched"?"Edit Watched Series":target==="amirWant"?"Edit Want to Watch":"Edit Series";
  document.getElementById("formName").value=item.name;
  document.getElementById("formYear").value=item.year;
  document.getElementById("formStatus").value=item.status;
  document.getElementById("formRating").value=item.rating;
  document.getElementById("formEpisodesWatched").value=item.episodesWatched??"";
  document.getElementById("formEpisodeMinutes").value=item.episodeMinutes??"";
  document.getElementById("formStatusField").hidden=target==="watchlist";
  const showWatchedFields=target==="amirWatched";
  document.getElementById("watchedEpisodesField").hidden=!showWatchedFields;
  document.getElementById("watchedEpisodeMinutesField").hidden=!showWatchedFields;
  const list=target==="watchlist"?data.watchlist:target==="series"?data.series:getListByKey(target);
  document.getElementById("formPosition").value=list.indexOf(item)+1;
  document.getElementById("formPosition").disabled=false;
  document.getElementById("modalWrap").classList.add("open");
}

function closeModal(){document.getElementById("modalWrap").classList.remove("open");}

function targetIsWatchedTarget(){return editingTarget==="amirWatched";}

function saveItem(){
  if((editingTarget==="amirWatched"||editingTarget==="amirWant")&&!privateEditUnlocked[editingTarget])return toast("Private edit access required.");
  const name=cleanName(document.getElementById("formName").value);
  const year=document.getElementById("formYear").value.trim();
  const status=editingTarget==="watchlist"?"Planned":document.getElementById("formStatus").value;
  const rating=document.getElementById("formRating").value.trim();
  const position=document.getElementById("formPosition").value.trim();
  const episodesWatched=document.getElementById("formEpisodesWatched").value.trim();
  const episodeMinutes=document.getElementById("formEpisodeMinutes").value.trim();

  if(!name)return toast("Please enter a series name.");
  if(!isValidReleaseYear(year))return toast("Enter a valid year or series range (e.g. 2019–2023).");
  if(rating!==""&&(!Number.isFinite(+rating)||+rating<0||+rating>10))return toast("Rating must be between 0 and 10.");
  if(position!==""&&(!Number.isInteger(+position)||+position<1))return toast("Position must be a positive whole number.");
  if(targetIsWatchedTarget()&&episodesWatched==="")return toast("Enter the number of episodes watched.");
  if(targetIsWatchedTarget()&&(!Number.isInteger(+episodesWatched)||+episodesWatched<0))return toast("Enter a valid number of watched episodes.");
  if(targetIsWatchedTarget()&&episodeMinutes==="")return toast("Enter the average episode length in minutes.");
  if(targetIsWatchedTarget()&&(!Number.isFinite(+episodeMinutes)||+episodeMinutes<1||+episodeMinutes>600))return toast("Episode length must be between 1 and 600 minutes.");

  const target=editingTarget;
  const list=target==="watchlist"?data.watchlist:target==="series"?data.series:getListByKey(target);
  if(isDuplicate(list,name,editingId))return toast("This item already exists in this list.");

  const previousData=JSON.parse(JSON.stringify(data));
  if(editingId){
    const item=target==="watchlist"?findWatchItem(editingId):target==="series"?findSeries(editingId):findItemInList(target,editingId);
    if(!item)return toast("Item could not be found.");
    item.name=name;
    item.year=year;
    item.status=status;
    item.rating=rating;
    if(target==="amirWatched"){item.episodesWatched=episodesWatched;item.episodeMinutes=episodeMinutes;}
    const oldIndex=list.indexOf(item);
    list.splice(oldIndex,1);
    insertAt(list,item,position);
  }else{
    insertAt(list,makeItem(name,{year,status,rating,episodesWatched:target==="amirWatched"?episodesWatched:"",episodeMinutes:target==="amirWatched"?episodeMinutes:""}),position);
  }

  if(target==="series")document.getElementById("sortSelect").value="manual";
  else if(target==="watchlist")document.getElementById("watchSortSelect").value="manual";
  else document.getElementById(listPrefix(target)+"SortSelect").value="manual";

  const wasEditing=Boolean(editingId);
  if(!save()){data=previousData;return;}
  render();
  closeModal();
  toast(wasEditing?"Item updated.":target==="watchlist"?"Added to Watchlist.":target==="amirWatched"?"Added to Series I've Watched.":target==="amirWant"?"Added to Watchlist.":"Series added.");
}

/* Bulk Add: new series are always added at the end. */
function openBulk(target="series"){
  bulkTarget=target;
  document.getElementById("bulkTitle").textContent=target==="watchlist"?"Bulk Add to Watchlist":target==="amirWatched"?"Bulk Add Watched Series":target==="amirWant"?"Bulk Add Want to Watch":"Bulk Add Series";
  document.getElementById("bulkStatusField").hidden=target==="watchlist";
  document.getElementById("bulkEpisodesField").hidden=target!=="amirWatched";
  document.getElementById("bulkEpisodeMinutesField").hidden=target!=="amirWatched";
  document.getElementById("bulkEpisodesWatched").value="";
  document.getElementById("bulkEpisodeMinutes").value="";
  document.getElementById("bulkNames").value="";
  document.getElementById("bulkYear").value="";
  if(document.getElementById("bulkStatus"))document.getElementById("bulkStatus").value="Planned";
  document.getElementById("bulkRating").value="";
  document.getElementById("bulkSave").textContent=target==="watchlist"?"Add All to Watchlist":target==="amirWatched"?"Add All Watched Series":target==="amirWant"?"Add All to Want to Watch":"Add All Series";
  document.getElementById("bulkWrap").classList.add("open");
}

function closeBulk(){document.getElementById("bulkWrap").classList.remove("open");}

function bulkAdd(){
  if((bulkTarget==="amirWatched"||bulkTarget==="amirWant")&&!privateEditUnlocked[bulkTarget])return toast("Private edit access required.");
  const names=[...new Set(document.getElementById("bulkNames").value.split(/\r?\n/).map(cleanName).filter(Boolean))];
  const year=document.getElementById("bulkYear").value.trim();
  const status=bulkTarget==="watchlist"?"Planned":(document.getElementById("bulkStatus")?.value||"Planned");
  const rating=document.getElementById("bulkRating").value.trim();
  const episodesWatched=document.getElementById("bulkEpisodesWatched").value.trim();
  const episodeMinutes=document.getElementById("bulkEpisodeMinutes").value.trim();

  if(!names.length)return toast("Enter at least one series name.");
  if(!isValidReleaseYear(year))return toast("Enter a valid year or series range (e.g. 2019–2023).");
  if(rating!==""&&(!Number.isFinite(+rating)||+rating<0||+rating>10))return toast("Rating must be between 0 and 10.");
  if(bulkTarget==="amirWatched"&&episodesWatched==="")return toast("Enter the number of episodes watched.");
  if(bulkTarget==="amirWatched"&&(!Number.isInteger(+episodesWatched)||+episodesWatched<0))return toast("Enter a valid number of watched episodes.");
  if(bulkTarget==="amirWatched"&&episodeMinutes==="")return toast("Enter the average episode length in minutes.");
  if(bulkTarget==="amirWatched"&&(!Number.isFinite(+episodeMinutes)||+episodeMinutes<1||+episodeMinutes>600))return toast("Episode length must be between 1 and 600 minutes.");

  const target=bulkTarget;
  const list=target==="watchlist"?data.watchlist:target==="series"?data.series:getListByKey(target);
  const existing=new Set(list.map(s=>s.name.toLowerCase()));
  const accepted=names.filter(name=>{
    const key=name.toLowerCase();
    if(existing.has(key))return false;
    existing.add(key);
    return true;
  });

  if(!accepted.length)return toast("All entered series already exist in this list.");

  accepted.forEach(name=>list.push(makeItem(name,{year,status,rating,episodesWatched:target==="amirWatched"?episodesWatched:"",episodeMinutes:target==="amirWatched"?episodeMinutes:""})));

  if(target==="series")document.getElementById("sortSelect").value="manual";
  else if(target==="watchlist")document.getElementById("watchSortSelect").value="manual";
  else document.getElementById(listPrefix(target)+"SortSelect").value="manual";

  if(!save())return;
  render();
  closeBulk();
  const skipped=names.length-accepted.length;
  toast(`${accepted.length} added${skipped?`; ${skipped} duplicate(s) skipped`:""}.`);
}

/* Reordering */
function moveItem(list,index,direction){
  const next=index+direction;
  if(next<0||next>=list.length)return false;
  [list[index],list[next]]=[list[next],list[index]];
  return true;
}

function handleSeriesAction(action,id){
  const index=data.series.findIndex(s=>s.id===id);
  if(index<0)return;
  if(action==="edit"){openEdit("series",id);return;}
  if(action==="remove"){
    const item=data.series[index];
    if(!confirm(`Delete "${item.name}" from Series List and favorites? It will remain in your independent Watchlist.`))return;
    data.series.splice(index,1);
    data.topList=data.topList.filter(f=>!(f.source==="series"&&f.itemId===id));
  }
  if(action==="up")moveItem(data.series,index,-1);
  if(action==="down")moveItem(data.series,index,1);
  document.getElementById("sortSelect").value="manual";
  if(!save())return;
  render();
}

function handleWatchAction(action,id){
  const index=data.watchlist.findIndex(s=>s.id===id);
  if(index<0)return;
  if(action==="edit"){openEdit("watchlist",id);return;}
  if(action==="remove"){
    const item=data.watchlist[index];
    if(!confirm(`Remove "${item.name}" from Watchlist?`))return;
    data.watchlist.splice(index,1);
  }
  if(action==="up")moveItem(data.watchlist,index,-1);
  if(action==="down")moveItem(data.watchlist,index,1);
  if(!save())return;
  render();
}

function handleTopAction(action,id){
  const index=data.topList.findIndex(f=>f.id===id);if(index<0)return;
  if(action==="edit"){openFavoriteEdit(id);return;}
  if(action==="remove"){const item=resolveFavorite(data.topList[index]);data.topList.splice(index,1);toast(item?`Removed "${item.name}" from favorites.`:"Removed from favorites.");}
  if(action==="up")moveItem(data.topList,index,-1);
  if(action==="down")moveItem(data.topList,index,1);
  if(!save())return;render();
}

function handlePrivateAction(key,action,id){
  if(!privateEditUnlocked[key]||!editModes[key])return toast("Edit access required.");
  const list=getListByKey(key);const index=list.findIndex(item=>item.id===id);if(index<0)return;
  if(action==="edit"){openEdit(key,id);return;}
  if(action==="remove"){if(!confirm(`Remove "${list[index].name}" from this list?`))return;list.splice(index,1);}
  if(action==="up")moveItem(list,index,-1);
  if(action==="down")moveItem(list,index,1);
  document.getElementById(listPrefix(key)+"SortSelect").value="manual";
  if(!save())return;render();
}

/* Home page recommendations use the app's existing OMDb API configuration. */
let homeLoaded=false;
let homeLoadingPromise=null;
const HOME_SERIES=["Better Call Saul","Chernobyl","Game of Thrones","The Wire","The Sopranos","Dark"];
const HOME_MOVIES=["The Shawshank Redemption","The Godfather","The Dark Knight","Pulp Fiction","Forrest Gump","Inception"];
async function fetchHomeTitle(title,type){
  const response=await omdbFetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(omdbApiKey)}&t=${encodeURIComponent(title)}&type=${type}&plot=short`);
  const item=await response.json();if(item.Response!=="True")throw new Error(item.Error||"Title unavailable");return item;
}
function homeCard(item){
  const poster=item.Poster&&item.Poster!=="N/A"?escapeHTML(item.Poster):"";
  const rating=item.imdbRating&&item.imdbRating!=="N/A"?escapeHTML(item.imdbRating):"—";
  const year=item.Year&&item.Year!=="N/A"?escapeHTML(item.Year):"Year unavailable";
  const genre=item.Genre&&item.Genre!=="N/A"?escapeHTML(item.Genre):"Genre unavailable";
  const imdb=item.imdbID&&/^tt\d+$/.test(item.imdbID)?`https://www.imdb.com/title/${encodeURIComponent(item.imdbID)}/`:"https://www.imdb.com/";
  return `<article class="home-title-card"><div class="home-poster">${poster?`<img src="${poster}" alt="${escapeHTML(item.Title||"Title")} poster" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">`:``}<div class="home-poster-placeholder" ${poster?'style="display:none"':""}>▧</div><span class="home-imdb-rating">★ ${rating}</span></div><div class="home-card-info"><strong>${escapeHTML(item.Title||"Unknown title")}</strong><small>${year}</small><small class="home-genre">${genre}</small><a class="home-imdb-link" href="${imdb}" target="_blank" rel="noopener noreferrer">View on IMDb ↗</a></div></article>`;
}
async function loadHomePage(force=false){
  if(homeLoaded&&!force)return;
  if(homeLoadingPromise&&!force)return homeLoadingPromise;
  const featured=document.getElementById("homeFeatured"),seriesHost=document.getElementById("homeTopSeries"),moviesHost=document.getElementById("homeTopMovies");
  if(!featured||!seriesHost||!moviesHost)return;
  if(!omdbApiKey){
    featured.querySelector(".home-feature-copy p").textContent="برای نمایش تصاویر و اطلاعات، کلید OMDb را در بخش OMDb API Settings تنظیم کنید.";
    seriesHost.innerHTML=moviesHost.innerHTML='<div class="empty">OMDb API key is not available.</div>';
    homeLoaded=false;return;
  }
  seriesHost.innerHTML=moviesHost.innerHTML='<div class="empty">Loading recommendations…</div>';
  homeLoadingPromise=(async()=>{
    try{
      const [breakingBad,seriesResults,movieResults]=await Promise.all([
        fetchHomeTitle("Breaking Bad","series"),
        Promise.allSettled(HOME_SERIES.map(t=>fetchHomeTitle(t,"series"))),
        Promise.allSettled(HOME_MOVIES.map(t=>fetchHomeTitle(t,"movie")))
      ]);
      const series=seriesResults.filter(x=>x.status==="fulfilled").map(x=>x.value);
      const movies=movieResults.filter(x=>x.status==="fulfilled").map(x=>x.value);
      const heroPoster=breakingBad.Poster&&breakingBad.Poster!=="N/A"?breakingBad.Poster:"";
      featured.style.backgroundImage=heroPoster?`url("${heroPoster.replace(/["\\]/g,"")}")`:"none";
      const breakingBadImdb=breakingBad.imdbID&&/^tt\d+$/.test(breakingBad.imdbID)?`https://www.imdb.com/title/${encodeURIComponent(breakingBad.imdbID)}/`:"https://www.imdb.com/title/tt0903747/";
      featured.querySelector(".home-feature-copy").innerHTML=`<span class="home-eyebrow">FEATURED SERIES</span><h2><a class="home-feature-imdb-link" href="${breakingBadImdb}" target="_blank" rel="noopener noreferrer" aria-label="Open Breaking Bad on IMDb">${escapeHTML(breakingBad.Title||"Breaking Bad")} ↗</a></h2><p>${escapeHTML(breakingBad.Plot&&breakingBad.Plot!=="N/A"?breakingBad.Plot:"A chemistry teacher turns to making methamphetamine after a life-changing diagnosis.")}</p><div class="home-feature-meta"><span>★ ${escapeHTML(breakingBad.imdbRating&&breakingBad.imdbRating!=="N/A"?breakingBad.imdbRating:"—")}/10</span><span>${escapeHTML(breakingBad.Year||"")}</span><span>${escapeHTML(breakingBad.Genre||"")}</span></div>`;
      const byRating=(a,b)=>(Number(b.imdbRating)||0)-(Number(a.imdbRating)||0);
      series.sort(byRating);movies.sort(byRating);
      seriesHost.innerHTML=series.length?series.map(homeCard).join(""):'<div class="empty">Series recommendations are unavailable.</div>';
      moviesHost.innerHTML=movies.length?movies.map(homeCard).join(""):'<div class="empty">Movie recommendations are unavailable.</div>';
      homeLoaded=true;
    }catch(error){
      console.error("Home recommendations could not be loaded:",error);
      const msg="Could not load titles from OMDb. Check your connection or API key.";
      seriesHost.innerHTML=moviesHost.innerHTML=`<div class="empty">${msg}</div>`;
      featured.querySelector(".home-feature-copy p").textContent=msg;
      homeLoaded=false;
    }finally{homeLoadingPromise=null;}
  })();
  return homeLoadingPromise;
}

/* Franchise cards use real poster artwork from OMDb and open an in-page movie gallery. */
const FRANCHISES={
  marvel:{title:"MARVEL",subtitle:"Popular Marvel movies",background:"Avengers: Endgame",movies:["Avengers: Endgame","Iron Man","Spider-Man: No Way Home","Black Panther","Guardians of the Galaxy"]},
  dc:{title:"DC",subtitle:"Popular DC movies",background:"The Dark Knight",movies:["The Dark Knight","The Batman","Joker","Man of Steel","Wonder Woman"]},
  starwars:{title:"STAR WARS",subtitle:"Popular Star Wars movies",background:"Star Wars: Episode IV - A New Hope",movies:["Star Wars: Episode IV - A New Hope","Star Wars: Episode V - The Empire Strikes Back","Star Wars: Episode VI - Return of the Jedi","Rogue One: A Star Wars Story","Star Wars: The Force Awakens"]}
};
const franchiseCache=new Map();
async function fetchFranchiseMovie(title){
  if(franchiseCache.has(title))return franchiseCache.get(title);
  const promise=fetchHomeTitle(title,"movie");
  franchiseCache.set(title,promise);
  try{return await promise;}catch(error){franchiseCache.delete(title);throw error;}
}
function closeFranchiseModal(){
  const modal=document.getElementById("franchiseModal");
  modal.classList.remove("open");
  document.body.style.overflow="";
}
async function openFranchiseModal(key){
  const config=FRANCHISES[key];if(!config)return;
  const modal=document.getElementById("franchiseModal"),grid=document.getElementById("franchiseMovieGrid");
  document.getElementById("franchiseModalTitle").textContent=config.title;
  document.getElementById("franchiseModalSubtitle").textContent=config.subtitle;
  grid.innerHTML='<div class="franchise-loading">Loading movies…</div>';
  modal.classList.add("open");document.body.style.overflow="hidden";
  if(omdbApiKey){
    fetchFranchiseMovie(config.background).then(item=>{
      const card=document.querySelector(`[data-franchise="${key}"]`);
      if(card&&item.Poster&&item.Poster!=="N/A")card.style.backgroundImage=`linear-gradient(0deg,#05070def,#080b1240),url("${item.Poster.replace(/["\\]/g,"")}")`;
    }).catch(()=>{});
  }
  if(!omdbApiKey){grid.innerHTML='<div class="franchise-loading">برای نمایش پوسترها، ابتدا کلید OMDb را تنظیم کنید.</div>';return;}
  const results=await Promise.allSettled(config.movies.map(fetchFranchiseMovie));
  if(!modal.classList.contains("open")||document.getElementById("franchiseModalTitle").textContent!==config.title)return;
  const items=results.filter(r=>r.status==="fulfilled").map(r=>r.value);
  grid.innerHTML=items.length?items.map(item=>{
    const poster=item.Poster&&item.Poster!=="N/A"?escapeHTML(item.Poster):"";
    const imdb=item.imdbID&&/^tt\d+$/.test(item.imdbID)?`https://www.imdb.com/title/${encodeURIComponent(item.imdbID)}/`:"https://www.imdb.com/";
    return `<article class="franchise-movie">${poster?`<img src="${poster}" alt="${escapeHTML(item.Title||"Movie")} poster" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">`:''}<div class="poster-empty" ${poster?'style="display:none"':""}>▧</div><div class="franchise-movie-info"><strong>${escapeHTML(item.Title||"Movie")}</strong><small>${escapeHTML(item.Year||"")}</small><small>★ ${escapeHTML(item.imdbRating&&item.imdbRating!=="N/A"?item.imdbRating:"—")}</small><a href="${imdb}" target="_blank" rel="noopener noreferrer">View on IMDb ↗</a></div></article>`;
  }).join(""):'<div class="franchise-loading">Could not load these movies. Check the OMDb API key or connection.</div>';
}
/* Preload franchise poster artwork so the cards already have cinematic backgrounds before the first click. */
if(omdbApiKey){
  Object.entries(FRANCHISES).forEach(([key,config])=>{
    fetchFranchiseMovie(config.background).then(item=>{
      const card=document.querySelector(`[data-franchise="${key}"]`);
      if(card&&item.Poster&&item.Poster!=="N/A")card.style.backgroundImage=`linear-gradient(0deg,#05070def,#080b1240),url("${item.Poster.replace(/["\\]/g,"")}")`;
    }).catch(error=>console.warn(`Could not load ${config.title} artwork:`,error));
  });
}
document.querySelectorAll("[data-franchise]").forEach(card=>card.addEventListener("click",()=>openFranchiseModal(card.dataset.franchise)));
document.getElementById("franchiseModalClose").addEventListener("click",closeFranchiseModal);
document.getElementById("franchiseModal").addEventListener("click",event=>{if(event.target.id==="franchiseModal")closeFranchiseModal();});

/* Path-based navigation: every main section has a clean URL ending in /. */
const PAGE_ROUTES={
  home:"home",dashboard:"dashboard",overview:"overview",series:"my-list",
  watchlist:"watchlist",top:"favorites",amirWatched:"series-ive-watched",
  amirWant:"amirs-watchlist",telegram:"telegram",omdbSettings:"omdb-settings",deleteData:"delete-data"
};
const ROUTE_PAGES=Object.fromEntries(Object.entries(PAGE_ROUTES).map(([page,slug])=>[slug,page]));
function slugifyRoute(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"list";}
function routeForPage(pageId){
  if(pageId==="customListDetail"){
    const list=currentCustomList();
    return list?`/my-list/${slugifyRoute(list.name)}-${encodeURIComponent(list.id)}/`:"/my-list/";
  }
  return `/${PAGE_ROUTES[pageId]||"home"}/`;
}
function showPage(pageId,title,options={}){
  document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===pageId||(pageId==="customListDetail"&&b.dataset.page==="series")));
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  const page=document.getElementById(pageId);if(page)page.classList.add("active");
  document.getElementById("pageTitle").textContent=title||({home:"Home",dashboard:"Dashboard",series:"My List",customListDetail:"My List",watchlist:"Watchlist",top:"Favorites",overview:"OVERVIEW",amirWatched:"Series I've Watched",amirWant:"Watchlist",telegram:"Telegram Channel",deleteData:"Delete Data",omdbSettings:"OMDb API Settings"})[pageId]||"My List";
  if(!options.fromRoute){const next=routeForPage(pageId);if(location.pathname!==next)history.pushState({pageId},"",next);}
  closeSidebar();
  if(pageId==="home")loadHomePage();
}
function renderRouteFromLocation(){
  const parts=decodeURIComponent(location.pathname).split("/").filter(Boolean);
  const slug=parts[0]||"home";
  const pageId=ROUTE_PAGES[slug];
  if(parts.length>1&&slug==="my-list"){
    const listId=parts[1].split("-").slice(-1)[0];
    const list=data.customLists.find(item=>item.id===listId);
    if(list){openCustomList(list.id,{fromRoute:true});return;}
  }
  if(pageId){showPage(pageId,undefined,{fromRoute:true});return;}
  history.replaceState({pageId:"home"},"", "/home/");
  showPage("home",undefined,{fromRoute:true});
}
document.querySelectorAll(".nav button").forEach(btn=>btn.addEventListener("click",()=>showPage(btn.dataset.page)));
window.addEventListener("popstate",renderRouteFromLocation);
/* Resolve the requested URL on first load, including direct visits and refreshes. */
renderRouteFromLocation();
document.querySelectorAll("[data-home-anchor]").forEach(link=>link.addEventListener("click",event=>{
  event.preventDefault();
  const target=document.getElementById(link.dataset.homeAnchor);
  if(target)target.scrollIntoView({behavior:"smooth",block:"start"});
}));
function closeSidebar(){
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("overlay").classList.remove("show");
}

document.getElementById("menuBtn").onclick=()=>{
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("overlay").classList.toggle("show");
};
document.getElementById("overlay").onclick=closeSidebar;

document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){closeModal();closeBulk();closeWatchAddModal();closeFranchiseModal();closeSidebar();document.getElementById("customItemModal").classList.remove("open");document.getElementById("customBulkModal").classList.remove("open");}
});

document.getElementById("addOne").onclick=()=>openAdd("series");
document.getElementById("watchAdd").onclick=()=>openWatchAddModal();
document.getElementById("bulkOpen").onclick=()=>openBulk("series");
document.getElementById("watchBulkOpen").onclick=()=>openBulk("watchlist");
function requestPrivateAccess(key,callback){
  if(privateEditUnlocked[key]){callback();return;}
  const entered=prompt("Enter the private edit password:");
  if(entered!==PRIVATE_EDIT_PASSWORD){toast("Incorrect password. Edit access denied.");return;}
  privateEditUnlocked[key]=true;
  callback();
}
document.getElementById("amirWatchedAdd").onclick=()=>requestPrivateAccess("amirWatched",()=>openAdd("amirWatched"));
document.getElementById("amirWantAdd").onclick=()=>requestPrivateAccess("amirWant",()=>openAdd("amirWant"));
document.getElementById("amirWatchedBulkOpen").onclick=()=>requestPrivateAccess("amirWatched",()=>openBulk("amirWatched"));
document.getElementById("amirWantBulkOpen").onclick=()=>requestPrivateAccess("amirWant",()=>openBulk("amirWant"));

document.getElementById("cancelModal").onclick=closeModal;
document.getElementById("cancelBulk").onclick=closeBulk;
document.getElementById("saveItem").onclick=saveItem;
document.getElementById("bulkSave").onclick=bulkAdd;

/* Search, filter and sort controls */
document.getElementById("seriesSearch").addEventListener("input",renderSeries);
document.getElementById("statusFilter").addEventListener("change",renderSeries);
document.getElementById("sortSelect").addEventListener("change",renderSeries);

document.getElementById("watchSearch").addEventListener("input",renderWatchlist);
document.getElementById("watchStatusFilter").addEventListener("change",renderWatchlist);
document.getElementById("watchSortSelect").addEventListener("change",renderWatchlist);
document.getElementById("topSearch").addEventListener("input",renderTop);
document.getElementById("topSortSelect").addEventListener("change",renderTop);
["amirWatched","amirWant"].forEach(key=>{
  const prefix=listPrefix(key);
  document.getElementById(prefix+"Search").addEventListener("input",()=>renderPrivateList(key));
  document.getElementById(prefix+"SortSelect").addEventListener("change",()=>renderPrivateList(key));
  document.getElementById(prefix+"List").addEventListener("click",e=>{const btn=e.target.closest("[data-action]");if(btn)handlePrivateAction(key,btn.dataset.action,btn.dataset.id);});
});

document.getElementById("sortReset").onclick=()=>{
  document.getElementById("sortSelect").value="manual";
  renderSeries();
  toast("Manual order restored.");
};

/* List action listeners */
document.getElementById("seriesList").addEventListener("click",e=>{
  const btn=e.target.closest("[data-action]");
  if(btn)handleSeriesAction(btn.dataset.action,btn.dataset.id);
});
document.getElementById("watchList").addEventListener("click",e=>{
  const btn=e.target.closest("[data-action]");
  if(btn)handleWatchAction(btn.dataset.action,btn.dataset.id);
});
document.getElementById("topList").addEventListener("click",e=>{
  const btn=e.target.closest("[data-action]");
  if(btn)handleTopAction(btn.dataset.action,btn.dataset.id);
});

/* Favorites picker: one item at a time, sourced from My List and custom collections. */
let favoriteSelectedKey="";
let editingFavoriteId="";
function renderFavoriteItemResults(){
  const host=document.getElementById("favoriteItemResults");
  const q=document.getElementById("favoriteItemSearch").value.trim().toLowerCase();
  if(!q){host.innerHTML='<div class="empty">Type a title to search Overview.</div>';return;}
  const candidates=favoriteCandidates().filter(c=>!favoriteExists(c.source,c.listId,c.itemId)&&(c.item.name.toLowerCase().includes(q)||c.listName.toLowerCase().includes(q)));
  host.innerHTML=candidates.length?candidates.map(c=>{const key=`${c.source}|${c.listId}|${c.itemId}`;return `<button type="button" class="omdb-result" data-favorite-choice="${escapeHTML(key)}" style="width:100%;text-align:left"><strong>${escapeHTML(c.item.name)}</strong><small>${escapeHTML(c.listName)}${c.item.year?` · ${escapeHTML(c.item.year)}`:""}${c.item.rating!==""&&c.item.rating!==null?` · ★ ${escapeHTML(formatRating(c.item.rating))}`:""}</small></button>`;}).join(""):'<div class="empty">No available matching titles found.</div>';
}
function openFavoriteAdd(){editingFavoriteId="";favoriteSelectedKey="";document.getElementById("favoriteItemModalTitle").textContent="Add Favorite";document.getElementById("favoriteSearchField").hidden=false;document.getElementById("favoriteItemSearch").value="";document.getElementById("favoriteItemResults").innerHTML='<div class="empty">Type a title to search Overview.</div>';document.getElementById("favoriteSelectedName").value="";document.getElementById("favoriteItemPosition").value="";document.getElementById("favoriteItemSave").textContent="Add to Favorites";document.getElementById("favoriteItemModal").classList.add("open");}
function openFavoriteEdit(id){const index=data.topList.findIndex(f=>f.id===id);if(index<0)return;const fav=data.topList[index],item=resolveFavorite(fav);if(!item)return;editingFavoriteId=id;favoriteSelectedKey=`${fav.source}|${fav.listId||""}|${fav.itemId}`;document.getElementById("favoriteItemModalTitle").textContent="Edit Favorite Position";document.getElementById("favoriteSearchField").hidden=true;document.getElementById("favoriteSelectedName").value=item.name;document.getElementById("favoriteItemPosition").value=String(index+1);document.getElementById("favoriteItemSave").textContent="Save Position";document.getElementById("favoriteItemModal").classList.add("open");}
function closeFavoriteItemModal(){document.getElementById("favoriteItemModal").classList.remove("open");}
document.getElementById("topAddOpen").onclick=openFavoriteAdd;
document.getElementById("favoriteItemCancel").onclick=closeFavoriteItemModal;
document.getElementById("favoriteItemSearch").addEventListener("input",renderFavoriteItemResults);
document.getElementById("favoriteItemResults").addEventListener("click",e=>{const btn=e.target.closest("[data-favorite-choice]");if(!btn)return;favoriteSelectedKey=btn.dataset.favoriteChoice;const [source,listId,itemId]=favoriteSelectedKey.split("|");const item=source==="overview"?data.overviewItems.find(x=>x.id===itemId):null;if(!item)return;document.getElementById("favoriteSelectedName").value=item.name;document.getElementById("favoriteItemResults").querySelectorAll("[data-favorite-choice]").forEach(x=>x.classList.toggle("selected",x===btn));});
document.getElementById("favoriteItemSave").onclick=()=>{
  const rawPosition=document.getElementById("favoriteItemPosition").value.trim();
  if(rawPosition!==""&&(!Number.isInteger(+rawPosition)||+rawPosition<1))return toast("Position must be a positive whole number.");
  if(editingFavoriteId){const index=data.topList.findIndex(f=>f.id===editingFavoriteId);if(index<0)return closeFavoriteItemModal();const [fav]=data.topList.splice(index,1);insertAt(data.topList,fav,rawPosition);}
  else{if(!favoriteSelectedKey)return toast("Search and select one title first.");const [source,,itemId]=favoriteSelectedKey.split("|");if(favoriteExists("overview","",itemId))return toast("This title is already in Favorites.");const item=source==="overview"?data.overviewItems.find(x=>x.id===itemId):null;if(!item)return toast("The selected title could not be found in Overview.");const fav={id:uid(),source:"overview",listId:"",itemId,addedAt:new Date().toISOString()};insertAt(data.topList,fav,rawPosition);}
  if(!save())return;render();closeFavoriteItemModal();toast(editingFavoriteId?"Favorite position updated.":"Added to Favorites.");editingFavoriteId="";favoriteSelectedKey="";
};

/* TXT Export */
function exportTXT(){
  const lines=[
    "SILVERTV24 SERIES MANAGER",
    "TYPE\tID\tNAME\tYEAR\tSTATUS\tRATING\tPOSITION"
  ];

  data.series.forEach((s,i)=>{
    lines.push(["SERIES",s.id,encodeURIComponent(s.name),s.year,s.status,s.rating,i+1].join("\t"));
  });

  data.watchlist.forEach((s,i)=>{
    lines.push(["WATCH",s.id,encodeURIComponent(s.name),s.year,s.status,s.rating,i+1].join("\t"));
  });

  data.topList.forEach((fav,i)=>{lines.push(["TOP",fav.source==="series"?fav.itemId:`custom:${fav.listId}:${fav.itemId}`,"","","","",i+1].join("\t"));});
  data.amirWatched.forEach((item,i)=>lines.push(["AMIR_WATCHED",item.id,encodeURIComponent(item.name),item.year,item.status,item.rating,i+1,item.episodesWatched??"",item.episodeMinutes??""].join("\t")));
  data.amirWant.forEach((item,i)=>lines.push(["AMIR_WANT",item.id,encodeURIComponent(item.name),item.year,item.status,item.rating,i+1].join("\t")));

  lines.push("TELEGRAM\t"+encodeURIComponent("https://t.me/silvertv24"));

  const blob=new Blob([lines.join("\n")],{type:"text/plain;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="Amir_Silver_Series_Manager.txt";
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast("TXT file exported.");
}

/* TXT Import: supports old and new Watchlist formats. */
function importTXT(text){
  const lines=text.split(/\r?\n/);
  const series=[];
  const watch=[];
  const top=[];
  const amirWatched=[];
  const amirWant=[];
  const usedSeriesIds=new Set();
  const usedWatchIds=new Set();
  const usedWatchNames=new Set();

  for(const line of lines){
    const p=line.split("\t");

    if(p[0]==="SERIES"&&p.length>=3){
      let name="";
      try{name=decodeURIComponent(p[2]||"");}catch{name=p[2]||"";}
      name=cleanName(name);
      if(!name)continue;
      let id=p[1]||uid();
      if(usedSeriesIds.has(id))id=uid();
      usedSeriesIds.add(id);
      series.push({
        id,name,year:p[3]||"",
        status:["Planned","Watching","Watched","Stop Watching"].includes(p[4])?p[4]:"Planned",
        rating:p[5]||"",
        addedAt:new Date().toISOString()
      });
    }

    if(p[0]==="WATCH"){
      if(p.length>=3&&p[2]){
        let name="";
        try{name=decodeURIComponent(p[2]);}catch{name=p[2];}
        name=cleanName(name);
        if(!name)continue;
        const key=name.toLowerCase();
        if(usedWatchNames.has(key))continue;
        usedWatchNames.add(key);
        let id=p[1]||uid();
        if(usedWatchIds.has(id))id=uid();
        usedWatchIds.add(id);
        watch.push({
          id,name,year:p[3]||"",
          status:["Planned","Watching","Watched","Stop Watching"].includes(p[4])?p[4]:"Planned",
          rating:p[5]||"",
          addedAt:new Date().toISOString()
        });
      }else{
        watch.push({legacyId:p[1]||""});
      }
    }

    if(p[0]==="TOP")top.push(p[1]||"");
    if((p[0]==="AMIR_WATCHED"||p[0]==="AMIR_WANT")&&p.length>=3){let name="";try{name=decodeURIComponent(p[2]||"");}catch{name=p[2]||"";}name=cleanName(name);if(!name)continue;const item=normalizeItem({id:p[1]||uid(),name,year:p[3]||"",status:p[4],rating:p[5]||"",episodesWatched:p[7]||"",episodeMinutes:p[8]||""});if(item)(p[0]==="AMIR_WATCHED"?amirWatched:amirWant).push(item);}
  }

  if(!series.length&&!watch.length&&!top.length&&!amirWatched.length&&!amirWant.length)return toast("No valid list data found in this TXT file.");
  if(!confirm("Import this file? Existing data will be replaced."))return;

  const seriesIds=new Set(series.map(s=>s.id));
  const seriesMap=new Map(series.map(s=>[s.id,s]));
  const finalWatch=[...watch.filter(x=>!x.legacyId)];

  watch.forEach(entry=>{
    if(!entry.legacyId)return;
    const original=seriesMap.get(entry.legacyId);
    if(!original)return;
    const key=original.name.toLowerCase();
    if(usedWatchNames.has(key))return;
    usedWatchNames.add(key);
    finalWatch.push({...original,id:uid()});
  });

  data={
    series,
    watchlist:finalWatch,
    topList:[...new Set(top)].filter(id=>seriesIds.has(id)).map(itemId=>({id:uid(),source:"series",listId:"",itemId})),
    amirWatched,amirWant,customLists:data.customLists||[],overviewItems:data.overviewItems||[],
    telegramUrl:"https://t.me/silvertv24"
  };

  Object.keys(editModes).forEach(key=>editModes[key]=false);
  Object.keys(privateEditUnlocked).forEach(key=>privateEditUnlocked[key]=false);
  document.getElementById("sortSelect").value="manual";
  document.getElementById("watchSortSelect").value="manual";
  document.getElementById("seriesSearch").value="";
  document.getElementById("watchSearch").value="";
  document.getElementById("statusFilter").value="all";
  document.getElementById("watchStatusFilter").value="all";

  if(!save())return;
  render();
  toast("Data imported successfully.");
}



/* Delete regular app data while keeping Amir's two protected collections. */
document.getElementById("resetBtn").onclick=()=>{
  const firstConfirm=confirm("Delete your regular lists and OVERVIEW data? Amir's watched series and Amir's watchlist will be kept.");
  if(!firstConfirm)return;

  const secondConfirm=confirm("Final confirmation: delete all other data? Amir's two collections will NOT be deleted.");
  if(!secondConfirm)return;

  // Keep independent copies so resetting the rest of the app cannot erase these lists.
  const protectedAmirWatched=Array.isArray(data.amirWatched)?data.amirWatched.map(item=>({...item})):[];
  const protectedAmirWant=Array.isArray(data.amirWant)?data.amirWant.map(item=>({...item})):[];
  data=cloneDefault();
  data.amirWatched=protectedAmirWatched;
  data.amirWant=protectedAmirWant;
  // Remove any personal override; the built-in default API key remains available.
  omdbPersonalKey="";omdbDefaultKeyIndex=0;omdbApiKey=DEFAULT_OMDB_API_KEY;
  posterCache={};
  posterRequests.clear();
  try{localStorage.removeItem(OMDB_KEY_STORAGE);localStorage.removeItem(OMDB_ACTIVE_INDEX_STORAGE);localStorage.removeItem(POSTER_CACHE_STORAGE);}catch(error){console.warn("Could not clear OMDb local data:",error);}
  if(omdbKeyInput){omdbKeyInput.value="";omdbKeyInput.disabled=true;omdbKeyInput.type="password";}
  if(omdbStatus)omdbStatus.textContent="";
  updateOmdbActiveStatus();
  const revealButton=document.getElementById("omdbRevealBtn");if(revealButton)revealButton.textContent="Show";
  Object.keys(editModes).forEach(key=>editModes[key]=false);
  Object.keys(privateEditUnlocked).forEach(key=>privateEditUnlocked[key]=false);
  document.getElementById("sortSelect").value="manual";
  document.getElementById("watchSortSelect").value="manual";
  document.getElementById("seriesSearch").value="";
  document.getElementById("watchSearch").value="";
  document.getElementById("statusFilter").value="all";
  document.getElementById("watchStatusFilter").value="all";
  if(!save())return;
  render();
  toast("Other data deleted. Amir's two collections were kept.");
};


/* Independent selection and bulk editing for all lists. */
const selectedItems={series:new Set(),watchlist:new Set(),topList:new Set(),amirWatched:new Set(),amirWant:new Set()};
function getListItems(key){
  if(key==="series")return data.series;
  if(key==="watchlist")return data.watchlist;
  if(key==="topList")return data.topList.map(resolveFavorite).filter(Boolean);
  return getListByKey(key);
}
function renderSelectionCounts(){
  Object.keys(selectedItems).forEach(key=>{
    const count=selectedItems[key].size;
    const label=document.querySelector(`[data-selected-count="${key}"]`);
    if(label)label.textContent=`${count} selected`;
    const all=document.querySelector(`[data-select-all="${key}"]`);
    if(all){const total=getListItems(key).length;all.checked=total>0&&count===total;all.indeterminate=count>0&&count<total;}
    document.querySelectorAll(`[data-item-select="${key}"]`).forEach(box=>box.checked=selectedItems[key].has(box.dataset.id));
  });
}
document.addEventListener("change",e=>{
  const item=e.target.closest("[data-item-select]");
  if(item){const key=item.dataset.itemSelect;item.checked?selectedItems[key].add(item.dataset.id):selectedItems[key].delete(item.dataset.id);renderSelectionCounts();return;}
  const all=e.target.closest("[data-select-all]");
  if(all){const key=all.dataset.selectAll;selectedItems[key].clear();if(all.checked)getListItems(key).forEach(x=>selectedItems[key].add(x.id));document.querySelectorAll(`[data-item-select="${key}"]`).forEach(x=>x.checked=all.checked);renderSelectionCounts();}
});
function selectedTargets(key){return [...selectedItems[key]];}
function applyBulk(key,kind,value){
  if((key==="amirWatched"||key==="amirWant")&&(!privateEditUnlocked[key]||!editModes[key]))return toast("Enter the password and enable Edit mode first.");
  const previousData=JSON.parse(JSON.stringify(data));
  const ids=selectedTargets(key);if(!ids.length)return toast("Select at least one item first.");
  const list=key==="series"?data.series:key==="watchlist"?data.watchlist:(key==="topList"?data.topList.map(resolveFavorite).filter(Boolean):getListByKey(key));
  const targets=list.filter(x=>ids.includes(x.id));if(!targets.length)return toast("No selected items found.");
  if(kind==="delete"){
    const message=key==="topList"?`Remove ${ids.length} selected favorite(s)?`:`Delete ${ids.length} selected item(s)?`;
    if(!confirm(message))return;
    if(key==="topList")data.topList=data.topList.filter(f=>!ids.includes(f.id));
    else if(key==="amirWatched"||key==="amirWant")data[key]=data[key].filter(x=>!ids.includes(x.id));
    else if(key==="series"){data.series=data.series.filter(x=>!ids.includes(x.id));data.topList=data.topList.filter(f=>!(f.source==="series"&&ids.includes(f.itemId)));}
    else data.watchlist=data.watchlist.filter(x=>!ids.includes(x.id));
  }else{
    if(kind==="year"&&value!==""&&(!Number.isInteger(+value)||+value<1900||+value>2100))return toast("Enter a valid year between 1900 and 2100.");
    if(kind==="rating"&&value!==""&&(!Number.isFinite(+value)||+value<0||+value>10))return toast("Rating must be between 0 and 10.");
    if(kind==="status"&&!value)return toast("Choose a status first.");
    targets.forEach(item=>{const target=key==="topList"?favoriteSourceItem(data.topList.find(f=>f.id===item.id)):item;if(!target)return;if(kind==="year")target.year=value;if(kind==="rating")target.rating=value;if(kind==="status")target.status=value;});
  }
  if(!save()){data=previousData;return;}
  selectedItems[key].clear();render();toast(kind==="delete"?"Selected items removed.":"Selected items updated.");
}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-bulk-delete],[data-apply-year],[data-apply-rating],[data-apply-status]");if(!b)return;
  const key=b.dataset.bulkDelete||b.dataset.applyYear||b.dataset.applyRating||b.dataset.applyStatus;
  if(b.hasAttribute("data-bulk-delete"))applyBulk(key,"delete");
  if(b.hasAttribute("data-apply-year"))applyBulk(key,"year",document.querySelector(`[data-bulk-year="${key}"]`).value.trim());
  if(b.hasAttribute("data-apply-rating"))applyBulk(key,"rating",document.querySelector(`[data-bulk-rating="${key}"]`).value.trim());
  if(b.hasAttribute("data-apply-status"))applyBulk(key,"status",document.querySelector(`[data-bulk-status="${key}"]`).value);
});

/* Full backup: JSON preserves all lists and their order. */
function fullBackupObject(){return{app:"SILVERTV24",version:7,exportedAt:new Date().toISOString(),series:data.series,watchlist:data.watchlist,topList:data.topList,amirWatched:data.amirWatched,amirWant:data.amirWant,customLists:data.customLists,overviewItems:data.overviewItems};}
function downloadText(filename,text,mime="application/json;charset=utf-8"){
  const blob=new Blob([text],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);
}
document.getElementById("fullBackupBtn").onclick=()=>{downloadText("SILVERTV24_Full_Backup.json",JSON.stringify(fullBackupObject(),null,2));toast("Complete backup downloaded.");};
document.getElementById("fullImportBtn").onclick=()=>document.getElementById("fullBackupFile").click();
document.getElementById("fullBackupFile").onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    const raw=await file.text();
    if(file.name.toLowerCase().endsWith(".txt")){importTXT(raw);}
    else{
      const parsed=JSON.parse(raw);if(!parsed||!Array.isArray(parsed.series)||!Array.isArray(parsed.watchlist)||!Array.isArray(parsed.topList))throw new Error("Invalid backup");
      if(!confirm("Restore this complete backup? Your current lists and custom collections will be replaced."))return;
      const series=parsed.series.map(normalizeItem).filter(Boolean);const ids=new Set(series.map(x=>x.id));
      const watchlist=parsed.watchlist.map(normalizeItem).filter(Boolean);
      const uniqueWatch=[];const names=new Set();watchlist.forEach(x=>{const k=x.name.toLowerCase();if(!names.has(k)){names.add(k);uniqueWatch.push(x);}});
      const restoredCustomLists=Array.isArray(parsed.customLists)?parsed.customLists.map(list=>({id:String(list.id||uid()),name:cleanName(list.name),type:list.type==="movie"?"movie":"series",items:Array.isArray(list.items)?list.items.map(normalizeItem).filter(Boolean):[]})).filter(list=>list.name):data.customLists;
      const restoredFavorites=parsed.topList.map(entry=>entry&&typeof entry==="object"?entry:{id:uid(),source:"series",listId:"",itemId:String(entry)}).filter(f=>f.source==="series"?ids.has(f.itemId):f.source==="custom"&&restoredCustomLists.some(list=>list.id===f.listId&&list.items.some(item=>item.id===f.itemId)));
      data={series,watchlist:uniqueWatch,topList:restoredFavorites,amirWatched:Array.isArray(parsed.amirWatched)?parsed.amirWatched.map(normalizeItem).filter(Boolean):[],amirWant:Array.isArray(parsed.amirWant)?parsed.amirWant.map(normalizeItem).filter(Boolean):[],customLists:restoredCustomLists,overviewItems:Array.isArray(parsed.overviewItems)?parsed.overviewItems.map(entry=>{const item=normalizeItem(entry);if(item)item.mediaType=entry.mediaType==="movie"?"movie":"series";return item;}).filter(Boolean):[],telegramUrl:"https://t.me/silvertv24"};
      if(!save())return;Object.keys(selectedItems).forEach(k=>selectedItems[k].clear());render();toast("Complete backup restored.");
    }
  }catch(err){console.error(err);toast("Invalid or unreadable backup file.");}
  finally{e.target.value="";}
};

/* Per-list backup, clipboard copy and native share. */
function listExportData(key){
  if(key==="series")return data.series;
  if(key==="watchlist")return data.watchlist;
  if(key==="topList")return data.topList.map(resolveFavorite).filter(Boolean);
  if(key.startsWith("custom:")){const list=data.customLists.find(x=>x.id===key.slice(7));return list?.items||[];}
  return getListByKey(key);
}
/* Plain list text is intentionally names-only. Backup files retain all metadata. */
function listText(key){return listExportData(key).map(x=>String(x.name||"").trim()).filter(Boolean).join("\n");}
async function copyList(key){
  const text=listText(key);
  try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);toast("List copied to clipboard.");return;}}catch{}
  const area=document.createElement("textarea");area.value=text;area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();
  try{const ok=document.execCommand("copy");toast(ok?"List copied to clipboard.":"Clipboard access is unavailable in this browser.");}catch{toast("Clipboard access is unavailable in this browser.");}finally{area.remove();}
}
async function shareList(key){const text=listText(key);if(navigator.share){try{await navigator.share({title:`SILVERTV24 ${key}`,text});}catch(err){if(err.name!=="AbortError")toast("Sharing could not be completed.");}}else copyList(key);}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-backup],[data-copy],[data-share]");if(!b)return;
  const key=b.dataset.backup||b.dataset.copy||b.dataset.share;
  if(b.dataset.backup){const custom=key.startsWith("custom:")?data.customLists.find(x=>x.id===key.slice(7)):null;const payload={app:"SILVERTV24",list:key,listName:custom?.name||key,listType:custom?.type||null,exportedAt:new Date().toISOString(),items:listExportData(key)};const safeName=(custom?.name||key).replace(/[^a-z0-9_-]+/gi,"_");downloadText(`SILVERTV24_${safeName}_Backup.json`,JSON.stringify(payload,null,2));toast("List backup downloaded.");}
  if(b.dataset.copy)copyList(key);
  if(b.dataset.share)shareList(key);
});

/* Watchlist single add: OMDb selection with automatic title/year/poster. Bulk Add is intentionally untouched. */
let selectedWatchOmdbItem=null;
let watchOmdbSearchTimer=null;
let watchOmdbRequestToken=0;
let watchManualMode=false;
function openWatchAddModal(){
  clearTimeout(watchOmdbSearchTimer);selectedWatchOmdbItem=null;watchOmdbRequestToken++;
  watchManualMode=false;
  const manualFields=document.getElementById("watchManualFields");
  const searchField=document.getElementById("watchTitleSearch").closest(".field");
  if(!omdbApiKey){
    const proceed=confirm("OMDb API key is not configured. Do you want to continue without the API and enter the title and year manually?");
    if(!proceed)return;
    watchManualMode=true;
    searchField.hidden=true;manualFields.hidden=false;
  }else{
    searchField.hidden=false;manualFields.hidden=true;
  }
  document.getElementById("watchTitleSearch").value="";
  document.getElementById("watchManualName").value="";
  document.getElementById("watchManualYear").value="";
  document.getElementById("watchOmdbResults").innerHTML="";
  document.getElementById("watchSelectedPreview").hidden=true;
  document.getElementById("watchSelectedPoster").removeAttribute("src");
  document.getElementById("watchSelectedName").textContent="";
  document.getElementById("watchSelectedYear").textContent="";
  document.getElementById("watchAddRating").value="";
  document.getElementById("watchAddPosition").value="";
  document.getElementById("watchAddModal").classList.add("open");
  (watchManualMode?document.getElementById("watchManualName"):document.getElementById("watchTitleSearch")).focus();
}
function closeWatchAddModal(){clearTimeout(watchOmdbSearchTimer);document.getElementById("watchAddModal").classList.remove("open");}
document.getElementById("cancelWatchAdd").onclick=closeWatchAddModal;
document.getElementById("watchTitleSearch").addEventListener("input",()=>{
  clearTimeout(watchOmdbSearchTimer);selectedWatchOmdbItem=null;watchOmdbRequestToken++;
  document.getElementById("watchSelectedPreview").hidden=true;
  const query=document.getElementById("watchTitleSearch").value.trim();
  const host=document.getElementById("watchOmdbResults");
  if(query.length<2){host.innerHTML="";return;}
  watchOmdbSearchTimer=setTimeout(()=>searchWatchOmdb(query),350);
});
async function searchWatchOmdb(query){
  const host=document.getElementById("watchOmdbResults");
  if(!omdbApiKey){host.innerHTML='<div class="empty">Add your OMDb API key first in OMDb API Settings.</div>';return;}
  const token=++watchOmdbRequestToken;
  host.innerHTML='<div class="muted" style="font-size:12px;padding:8px">Searching OMDb database…</div>';
  try{
    const response=await omdbFetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(omdbApiKey)}&s=${encodeURIComponent(query)}`);
    const result=await response.json();
    if(token!==watchOmdbRequestToken)return;
    if(result.Response!=="True"||!Array.isArray(result.Search)){host.innerHTML='<div class="empty">No matching titles found.</div>';return;}
    host.innerHTML=result.Search.slice(0,8).map(item=>`<button type="button" class="watch-omdb-result" data-watch-omdb-id="${escapeHTML(item.imdbID)}"><img src="${item.Poster&&item.Poster!=="N/A"?escapeHTML(item.Poster):""}" alt="" onerror="this.style.visibility='hidden'"><span>${escapeHTML(item.Title)}<small>${escapeHTML(item.Year||"Year unknown")} · ${escapeHTML(item.Type||"title")}</small></span></button>`).join("");
    host.querySelectorAll("[data-watch-omdb-id]").forEach(button=>button.onclick=()=>selectWatchOmdbResult(button.dataset.watchOmdbId,button));
  }catch(error){console.error("Watchlist OMDb search failed:",error);if(token===watchOmdbRequestToken)host.innerHTML='<div class="empty">Could not connect to OMDb. Check your API key and connection.</div>';}
}
async function selectWatchOmdbResult(imdbID,button){
  if(!omdbApiKey)return toast("Add your OMDb API key first.");
  const token=++watchOmdbRequestToken;
  document.querySelectorAll("#watchOmdbResults .watch-omdb-result").forEach(x=>x.classList.remove("selected"));
  if(button)button.classList.add("selected");
  const host=document.getElementById("watchOmdbResults");
  const preview=document.getElementById("watchSelectedPreview");
  preview.hidden=false;document.getElementById("watchSelectedName").textContent="Loading title details…";document.getElementById("watchSelectedYear").textContent="";
  try{
    const response=await omdbFetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(omdbApiKey)}&i=${encodeURIComponent(imdbID)}&plot=short`);
    const item=await response.json();
    if(token!==watchOmdbRequestToken)return;
    if(item.Response!=="True")throw new Error(item.Error||"Title details unavailable");
    selectedWatchOmdbItem=item;
    document.getElementById("watchSelectedName").textContent=item.Title||"Untitled";
    document.getElementById("watchSelectedYear").textContent=item.Year||"Year unknown";
    const poster=document.getElementById("watchSelectedPoster");
    if(item.Poster&&item.Poster!=="N/A"){poster.src=item.Poster;poster.style.visibility="visible";}else{poster.removeAttribute("src");poster.style.visibility="hidden";}
    host.querySelectorAll(".watch-omdb-result").forEach(x=>x.classList.toggle("selected",x.dataset.watchOmdbId===imdbID));
  }catch(error){console.error(error);if(token===watchOmdbRequestToken){selectedWatchOmdbItem=null;preview.hidden=true;toast("Could not load the selected title details.");}}
}
document.getElementById("saveWatchAdd").onclick=()=>{
  const manualName=document.getElementById("watchManualName").value.trim();
  const manualYear=document.getElementById("watchManualYear").value.trim();
  const item=watchManualMode?null:selectedWatchOmdbItem;
  const name=cleanName(watchManualMode?manualName:item?.Title||"");
  const year=watchManualMode?manualYear:(item?.Year||"");
  const rating=document.getElementById("watchAddRating").value.trim();
  const position=document.getElementById("watchAddPosition").value.trim();
  if(!name)return toast("Enter a title first.");
  if(manualYear&&(!Number.isInteger(+manualYear)||+manualYear<1888||+manualYear>2100))return toast("Enter a valid release year between 1888 and 2100.");
  if(isDuplicate(data.watchlist,name))return toast("This title is already in your Watchlist.");
  if(rating!==""&&(!Number.isFinite(+rating)||+rating<0||+rating>10))return toast("Rating must be between 0 and 10.");
  if(position!==""&&(!Number.isInteger(+position)||+position<1))return toast("Position must be a positive whole number.");
  const previousData=JSON.parse(JSON.stringify(data));
  const poster=item?.Poster&&item.Poster!=="N/A"?item.Poster:"";
  const newItem=makeItem(name,{year,status:"Planned",rating,imdbID:item?.imdbID||"",poster});
  if(poster){posterCache[posterKey(name)]=poster;try{localStorage.setItem(POSTER_CACHE_STORAGE,JSON.stringify(posterCache));}catch{}}
  insertAt(data.watchlist,newItem,position);
  document.getElementById("watchSortSelect").value="manual";
  if(!save()){data=previousData;return;}
  render();closeWatchAddModal();toast(watchManualMode?"Added to Watchlist manually.":"Added to Watchlist from OMDb.");
};

/* Custom My List collections: each list is independent and can hold movies or series. */
let activeCustomListId="";
let editingCustomItemId="";
let customEditMode=false;
let customSelectedIds=new Set();
let selectedOmdbItem=null;
let customManualMode=false;
let omdbSearchTimer=null;
function currentCustomList(){return data.customLists.find(x=>x.id===activeCustomListId)||null;}
function renderCustomLists(){
  const query=(document.getElementById("customListSearch")?.value||"").trim().toLowerCase();
  const lists=data.customLists.filter(x=>x.name.toLowerCase().includes(query));
  document.getElementById("customListCount").textContent=`${data.customLists.length} Lists`;
  document.getElementById("customListsGrid").innerHTML=lists.length?lists.map(list=>`<div class="custom-list-card" data-open-custom-list="${escapeHTML(list.id)}"><h3>${escapeHTML(list.name)}</h3><p>${list.type==="movie"?"MOVIE COLLECTION":"SERIES COLLECTION"}</p><div class="custom-list-footer"><span class="muted">${list.items.length} ${list.items.length===1?"item":"items"}</span><div class="custom-list-actions"><button class="btn small" data-rename-custom-list="${escapeHTML(list.id)}">Rename</button><button class="btn small danger" data-delete-custom-list="${escapeHTML(list.id)}">Delete</button></div></div></div>`).join(""):`<div class="empty" style="grid-column:1/-1">${query?"No matching lists found.":"You have not created any lists yet."}</div>`;
}
function openCustomList(id,options={}){
  const list=data.customLists.find(x=>x.id===id);if(!list)return;
  activeCustomListId=id;
  const exportKey=`custom:${id}`;
  document.getElementById("customBackupBtn").dataset.backup=exportKey;
  document.getElementById("customCopyBtn").dataset.copy=exportKey;
  document.getElementById("customShareBtn").dataset.share=exportKey;
  document.getElementById("customDetailTitle").textContent=list.name;
  document.getElementById("customDetailSubtitle").textContent=list.type==="movie"?"Movie collection":"Series collection";
  document.getElementById("customTitleSearch").placeholder=list.type==="movie"?"Search movie title...":"Search series title...";
  document.getElementById("customItemSearch").value="";
  document.getElementById("customItemSort").value="manual";
  customEditMode=false;customSelectedIds.clear();updateCustomEditUI();
  renderCustomItems();showPage("customListDetail",list.name,options);
}
function updateCustomEditUI(){
  const toggle=document.getElementById("customEditToggle");
  if(!toggle)return;
  toggle.textContent=customEditMode?"Done":"Edit";
  toggle.classList.toggle("editing",customEditMode);
  document.getElementById("customEditHint").hidden=!customEditMode;
  document.getElementById("customSelectionTools").classList.toggle("visible",customEditMode);
  if(!customEditMode)customSelectedIds.clear();
  updateCustomSelectionUI();
}
function updateCustomSelectionUI(){
  const list=currentCustomList();if(!list)return;
  const visible=[...document.querySelectorAll("#customItemsList [data-custom-select]")];
  const selected=visible.filter(x=>x.checked).length;
  document.getElementById("customSelectedCount").textContent=`${customSelectedIds.size} selected`;
  const all=document.getElementById("customSelectAll");
  if(all){all.checked=visible.length>0&&selected===visible.length;all.indeterminate=selected>0&&selected<visible.length;}
}
function renderCustomItems(){
  const list=currentCustomList();if(!list)return;
  const q=document.getElementById("customItemSearch").value.trim().toLowerCase();
  const mode=document.getElementById("customItemSort").value;
  const items=sortItems(list.items,mode).filter(x=>x.name.toLowerCase().includes(q));
  document.getElementById("customDetailCount").textContent=`${list.items.length} items`;
  document.getElementById("customItemsList").innerHTML=items.length?items.map((item,i)=>{
    const poster=item.poster||getCachedPoster(item.name);
    return `<div class="series-card${customEditMode?" has-select":""}">
      ${customEditMode?`<input class="custom-item-select" type="checkbox" data-custom-select="${escapeHTML(item.id)}" ${customSelectedIds.has(item.id)?"checked":""} aria-label="Select ${escapeHTML(item.name)}">`:``}
      <div class="number">${i+1}</div>
      <div class="poster-wrap"><img class="poster-thumb" data-poster-title="${escapeHTML(item.name.toLowerCase())}" src="${escapeHTML(poster)}" alt="${escapeHTML(item.name)} poster" loading="lazy" style="${poster?"":"display:none"}" onerror="this.style.display='none'"><span class="poster-placeholder" style="${poster?"display:none":""}">▧</span></div>
      <div class="series-info"><div class="series-name"><span>${escapeHTML(item.name)}</span></div><div class="meta">${item.year?`<span class="badge year-badge">${escapeHTML(item.year)}</span>`:""}<span class="badge">${escapeHTML(item.status||"Planned")}</span><span class="badge rating-badge">★ ${formatRating(item.rating)}</span></div></div>
      <div class="actions">${customEditMode?`<button class="icon-btn" data-custom-up="${escapeHTML(item.id)}" ${i===0?"disabled":""}>↑</button><button class="icon-btn" data-custom-down="${escapeHTML(item.id)}" ${i===items.length-1?"disabled":""}>↓</button><button class="icon-btn" data-custom-edit="${escapeHTML(item.id)}">Edit</button><button class="icon-btn" data-custom-remove="${escapeHTML(item.id)}">✕</button>`:""}</div>
    </div>`;
  }).join(""):`<div class="empty">${q?"No matching titles found.":"This list is empty. Add your first title."}</div>`;
  updateCustomSelectionUI();
  hydrateCustomPosters(list);
}
function hydrateCustomPosters(list){if(!omdbApiKey)return;list.items.forEach(item=>{if(!item.poster&&!getCachedPoster(item.name))getPosterByTitle(item.name,list.type);});}
function createCustomList(){
  const name=cleanName(document.getElementById("newCustomListName").value);const type=document.getElementById("newCustomListType").value;
  if(!name)return toast("Enter a name for your list.");
  if(data.customLists.some(x=>x.name.toLowerCase()===name.toLowerCase()))return toast("A list with this name already exists.");
  const list={id:uid(),name,type:type==="movie"?"movie":"series",items:[]};data.customLists.push(list);
  if(!save())return;document.getElementById("newCustomListName").value="";renderCustomLists();openCustomList(list.id);toast("List created.");
}
document.getElementById("createCustomListBtn").onclick=createCustomList;
document.getElementById("newCustomListName").addEventListener("keydown",e=>{if(e.key==="Enter")createCustomList();});
document.getElementById("customListSearch").addEventListener("input",renderCustomLists);
document.getElementById("backToCustomLists").onclick=()=>{renderCustomLists();showPage("series","My List");};
document.getElementById("customItemSearch").addEventListener("input",renderCustomItems);
document.getElementById("customItemSort").addEventListener("change",renderCustomItems);
document.getElementById("customEditToggle").onclick=()=>{customEditMode=!customEditMode;customSelectedIds.clear();updateCustomEditUI();renderCustomItems();};
document.getElementById("customSelectAll").onchange=e=>{
  document.querySelectorAll("#customItemsList [data-custom-select]").forEach(box=>{box.checked=e.target.checked;if(box.checked)customSelectedIds.add(box.dataset.customSelect);else customSelectedIds.delete(box.dataset.customSelect);});
  updateCustomSelectionUI();
};
document.getElementById("customItemsList").addEventListener("change",e=>{
  const box=e.target.closest("[data-custom-select]");if(!box)return;
  if(box.checked)customSelectedIds.add(box.dataset.customSelect);else customSelectedIds.delete(box.dataset.customSelect);
  updateCustomSelectionUI();
});
document.getElementById("customBulkDelete").onclick=()=>{
  const list=currentCustomList();if(!list)return;
  const ids=[...customSelectedIds].filter(id=>list.items.some(item=>item.id===id));
  if(!ids.length)return toast("Select at least one item first.");
  if(!confirm(`Delete ${ids.length} selected item(s)?`))return;
  list.items=list.items.filter(item=>!ids.includes(item.id));customSelectedIds.clear();
  if(!save())return;renderCustomItems();renderCustomLists();toast(`${ids.length} item(s) deleted.`);
};
function selectedCustomItems(){const list=currentCustomList();return list?list.items.filter(item=>customSelectedIds.has(item.id)):[];}
document.getElementById("customApplyYear").onclick=()=>{
  const items=selectedCustomItems(),value=document.getElementById("customBulkYear").value.trim();
  if(!items.length)return toast("Select at least one item first.");
  if(!value||+value<1900||+value>2100)return toast("Enter a valid year (1900–2100).");
  items.forEach(item=>item.year=value);if(!save())return;renderCustomItems();toast(`Year updated for ${items.length} item(s).`);
};
document.getElementById("customApplyRating").onclick=()=>{
  const items=selectedCustomItems(),value=document.getElementById("customBulkRating").value.trim();
  if(!items.length)return toast("Select at least one item first.");
  if(value===""||!Number.isFinite(+value)||+value<0||+value>10)return toast("Enter a rating between 0 and 10.");
  items.forEach(item=>item.rating=value);if(!save())return;renderCustomItems();toast(`Rating updated for ${items.length} item(s).`);
};
document.getElementById("customApplyStatus").onclick=()=>{
  const items=selectedCustomItems(),value=document.getElementById("customBulkStatus").value;
  if(!items.length)return toast("Select at least one item first.");
  if(!value)return toast("Choose a status first.");
  items.forEach(item=>item.status=value);if(!save())return;renderCustomItems();toast(`Status updated for ${items.length} item(s).`);
};
document.getElementById("customAddOne").onclick=()=>openCustomItemModal();
document.getElementById("customBulkOpen").onclick=()=>document.getElementById("customBulkModal").classList.add("open");
document.getElementById("cancelCustomBulk").onclick=()=>document.getElementById("customBulkModal").classList.remove("open");
document.getElementById("saveCustomBulk").onclick=()=>{
  const list=currentCustomList();if(!list)return;
  const names=[...new Set(document.getElementById("customBulkNames").value.split(/\r?\n/).map(cleanName).filter(Boolean))];
  const year=document.getElementById("customBulkDefaultYear").value.trim();
  const status=document.getElementById("customBulkAddStatus").value;
  const rating=document.getElementById("customBulkAddRating").value.trim();
  if(!names.length)return toast("Enter at least one title.");
  if(year&&(!Number.isInteger(+year)||+year<1900||+year>2100))return toast("Enter a valid release year (1900–2100).");
  if(rating!==""&&(!Number.isFinite(+rating)||+rating<0||+rating>10))return toast("Rating must be between 0 and 10.");
  let added=0;names.forEach(name=>{if(!list.items.some(x=>x.name.toLowerCase()===name.toLowerCase())){list.items.push(makeItem(name,{year,status,rating}));added++;}});
  if(!save())return;document.getElementById("customBulkNames").value="";document.getElementById("customBulkDefaultYear").value="";document.getElementById("customBulkAddStatus").value="Planned";document.getElementById("customBulkAddRating").value="";document.getElementById("customBulkModal").classList.remove("open");renderCustomItems();renderCustomLists();toast(`${added} title(s) added${names.length-added?`; ${names.length-added} duplicate(s) skipped`:""}.`);
};
function openCustomItemModal(item=null){
  const list=currentCustomList();if(!list)return;
  editingCustomItemId=item?.id||"";clearTimeout(omdbSearchTimer);selectedOmdbItem=item?{Title:item.name,Year:item.year,imdbID:item.imdbID||""}:null;
  customManualMode=false;
  if(!item&&!omdbApiKey){
    const proceed=confirm("OMDb API key is not configured. Do you want to continue without the API and enter the title and year manually?");
    if(!proceed)return;
    customManualMode=true;
  }
  document.getElementById("customSearchField").hidden=customManualMode||!!item;
  document.getElementById("customSelectedTitle").readOnly=!customManualMode;
  document.getElementById("customSelectedYear").readOnly=!customManualMode;
  document.getElementById("customItemModalTitle").textContent=item?"Edit Item":`Add ${list.type==="movie"?"Movie":"Series"}`;
  document.getElementById("customTitleSearch").value=item?.name||"";
  document.getElementById("customSelectedTitle").value=item?.name||"";
  document.getElementById("customSelectedYear").value=item?.year||"";
  document.getElementById("customSelectedStatus").value=item?.status||"Planned";
  document.getElementById("customSelectedRating").value=item?.rating||"";
  const currentListPosition=item?list.items.findIndex(x=>x.id===item.id)+1:"";
  document.getElementById("customSelectedPosition").value=currentListPosition||"";
  document.getElementById("customTitleSearch").disabled=!!item;
  document.getElementById("omdbSearchResults").innerHTML=item?"<small class='muted'>Edit mode: title and year are kept from the selected database result.</small>":"";
  document.getElementById("customItemModal").classList.add("open");if(!item)document.getElementById("customTitleSearch").focus();
}
document.getElementById("cancelCustomItem").onclick=()=>document.getElementById("customItemModal").classList.remove("open");
document.getElementById("customTitleSearch").addEventListener("input",()=>{
  if(customManualMode)return;
  clearTimeout(omdbSearchTimer);const query=document.getElementById("customTitleSearch").value.trim();selectedOmdbItem=null;document.getElementById("customSelectedTitle").value="";document.getElementById("customSelectedYear").value="";
  if(query.length<2){document.getElementById("omdbSearchResults").innerHTML="";return;}
  omdbSearchTimer=setTimeout(()=>searchOmdbSuggestions(query),400);
});
async function searchOmdbSuggestions(query){
  const list=currentCustomList();if(!list)return;
  const results=document.getElementById("omdbSearchResults");
  if(!omdbApiKey){results.innerHTML='<div class="empty">First add your OMDb API key in OMDb API Settings.</div>';return;}
  results.innerHTML='<div class="muted" style="font-size:12px;padding:8px">Searching database…</div>';
  try{
    const type=list.type==="movie"?"movie":"series";
    const response=await omdbFetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(omdbApiKey)}&s=${encodeURIComponent(query)}&type=${type}`);
    const dataResult=await response.json();
    if(dataResult.Response!=="True"||!Array.isArray(dataResult.Search)){results.innerHTML='<div class="empty">No matching titles found.</div>';return;}
    results.innerHTML=dataResult.Search.slice(0,8).map(item=>`<button type="button" class="omdb-result" data-omdb-id="${escapeHTML(item.imdbID)}"><img src="${item.Poster&&item.Poster!=="N/A"?escapeHTML(item.Poster):""}" onerror="this.style.visibility='hidden'" alt=""><span>${escapeHTML(item.Title)}<small>${escapeHTML(item.Year||"Year unknown")}</small></span></button>`).join("");
    results.querySelectorAll("[data-omdb-id]").forEach(button=>button.onclick=()=>selectOmdbResult(button.dataset.omdbId));
  }catch(error){console.error(error);results.innerHTML='<div class="empty">Could not connect to OMDb. Check your API key and connection.</div>';}
}
async function selectOmdbResult(imdbID){
  const list=currentCustomList();if(!list)return;
  const results=document.getElementById("omdbSearchResults");
  const button=results.querySelector(`[data-omdb-id="${CSS.escape(imdbID)}"]`);if(button)button.style.borderColor="var(--accent)";
  try{
    const response=await omdbFetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(omdbApiKey)}&i=${encodeURIComponent(imdbID)}&plot=short`);const item=await response.json();
    if(item.Response!=="True")return toast("Could not load the selected title.");
    selectedOmdbItem=item;document.getElementById("customSelectedTitle").value=item.Title||"";document.getElementById("customSelectedYear").value=item.Year||"";
  }catch(error){toast("Could not load the selected title.");}
}
document.getElementById("saveCustomItem").onclick=()=>{
  const list=currentCustomList();if(!list)return;
  const name=cleanName(customManualMode?document.getElementById("customSelectedTitle").value:(selectedOmdbItem?.Title||""));
  const year=customManualMode?document.getElementById("customSelectedYear").value.trim():(selectedOmdbItem?.Year||"");
  const rating=document.getElementById("customSelectedRating").value.trim();
  if(!name)return toast(customManualMode?"Enter a title first.":"Search and select a title from the database first.");
  if(!isValidReleaseYear(year))return toast("Enter a valid year or series range (e.g. 2019–2023).");
  const position=document.getElementById("customSelectedPosition").value.trim();
  if(rating!==""&&(!Number.isFinite(+rating)||+rating<0||+rating>10))return toast("Rating must be between 0 and 10.");
  if(position!==""&&(!Number.isInteger(+position)||+position<1))return toast("Position must be a positive whole number.");
  if(list.items.some(x=>x.name.toLowerCase()===name.toLowerCase()&&x.id!==editingCustomItemId))return toast("This title is already in this list.");
  if(editingCustomItemId){
    const item=list.items.find(x=>x.id===editingCustomItemId);if(!item)return;
    item.status=document.getElementById("customSelectedStatus").value;item.rating=rating;
    const oldIndex=list.items.indexOf(item);list.items.splice(oldIndex,1);
    insertAt(list.items,item,position);
  }else{
    const newItem={...makeItem(name,{year,status:document.getElementById("customSelectedStatus").value,rating}),imdbID:selectedOmdbItem?.imdbID||"",poster:selectedOmdbItem?.Poster&&selectedOmdbItem.Poster!=="N/A"?selectedOmdbItem.Poster:""};
    insertAt(list.items,newItem,position);
  }
  document.getElementById("customItemSort").value="manual";
  if(!save())return;document.getElementById("customItemModal").classList.remove("open");renderCustomItems();renderCustomLists();toast(editingCustomItemId?"Item updated.":(customManualMode?"Item added manually.":"Added from OMDb."));
};
document.getElementById("customItemsList").addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;const list=currentCustomList();if(!list)return;
  const id=b.dataset.customEdit||b.dataset.customRemove||b.dataset.customUp||b.dataset.customDown;const index=list.items.findIndex(x=>x.id===id);if(index<0)return;
  if(b.dataset.customEdit){openCustomItemModal(list.items[index]);return;}
  if(b.dataset.customRemove){if(!confirm(`Remove "${list.items[index].name}" from this list?`))return;const removedId=list.items[index].id;list.items.splice(index,1);data.topList=data.topList.filter(f=>!(f.source==="custom"&&f.listId===list.id&&f.itemId===removedId));}
  if(b.dataset.customUp&&index>0)[list.items[index-1],list.items[index]]=[list.items[index],list.items[index-1]];
  if(b.dataset.customDown&&index<list.items.length-1)[list.items[index+1],list.items[index]]=[list.items[index],list.items[index+1]];
  if(!save())return;renderCustomItems();renderCustomLists();
});
document.getElementById("customListsGrid").addEventListener("click",e=>{
  const rename=e.target.closest("[data-rename-custom-list]");const del=e.target.closest("[data-delete-custom-list]");const card=e.target.closest("[data-open-custom-list]");
  if(rename){e.stopPropagation();const list=data.customLists.find(x=>x.id===rename.dataset.renameCustomList);if(!list)return;const next=cleanName(prompt("Enter a new list name:",list.name));if(!next)return;if(data.customLists.some(x=>x.id!==list.id&&x.name.toLowerCase()===next.toLowerCase()))return toast("That list name already exists.");list.name=next;if(save())renderCustomLists();return;}
  if(del){e.stopPropagation();const list=data.customLists.find(x=>x.id===del.dataset.deleteCustomList);if(!list)return;if(!confirm(`Delete "${list.name}" and all its items?`))return;data.customLists=data.customLists.filter(x=>x.id!==list.id);data.topList=data.topList.filter(f=>!(f.source==="custom"&&f.listId===list.id));if(!save())return;renderCustomLists();toast("List deleted.");return;}
  if(card)openCustomList(card.dataset.openCustomList);
});

/* OVERVIEW: independent collection, with OMDb-only single add and multi-edit. */
let overviewTypeFilter="all";
let overviewStatusFilter="all";
let overviewEditMode=false;
let overviewSelectedIds=new Set();
let selectedOverviewOmdbItem=null;
let overviewSearchTimer=null;
let overviewRequestToken=0;
let editingOverviewId="";
function overviewVisibleItems(){
  const query=document.getElementById("overviewSearch").value.trim().toLowerCase();
  return data.overviewItems.filter(item=>(overviewTypeFilter==="all"||item.mediaType===overviewTypeFilter)&&(overviewStatusFilter==="all"||item.status===overviewStatusFilter)&&item.name.toLowerCase().includes(query));
}
function updateOverviewControls(){
  document.querySelectorAll("[data-overview-type]").forEach(button=>button.classList.toggle("active",button.dataset.overviewType===overviewTypeFilter));
  document.querySelectorAll("[data-overview-status]").forEach(button=>button.classList.toggle("active",button.dataset.overviewStatus===overviewStatusFilter));
  document.getElementById("overviewEditToggle").classList.toggle("editing",overviewEditMode);
  document.getElementById("overviewEditToggle").textContent=overviewEditMode?"Done":"Edit";
  document.getElementById("overviewEditHint").hidden=!overviewEditMode;
  document.getElementById("overviewSelectionTools").classList.toggle("visible",overviewEditMode);
  document.getElementById("overviewSelectedCount").textContent=`${overviewSelectedIds.size} selected`;
  const visible=overviewVisibleItems();
  const all=document.getElementById("overviewSelectAll");
  all.checked=visible.length>0&&visible.every(item=>overviewSelectedIds.has(item.id));
  all.indeterminate=visible.some(item=>overviewSelectedIds.has(item.id))&&!all.checked;
}
function renderOverview(){
  if(!document.getElementById("overviewItemsList"))return;
  const items=overviewVisibleItems();
  document.getElementById("overviewCount").textContent=`${items.length} items`;
  document.getElementById("overviewItemsList").innerHTML=items.length?items.map((item,index)=>{
    const poster=item.poster||getCachedPoster(item.name);
    return `<div class="series-card${overviewEditMode?" has-select":""}">
      ${overviewEditMode?`<input class="overview-select" type="checkbox" data-overview-select="${escapeHTML(item.id)}" ${overviewSelectedIds.has(item.id)?"checked":""} aria-label="Select ${escapeHTML(item.name)}">`:``}
      <div class="number">${index+1}</div>
      <div class="poster-wrap"><img class="poster-thumb" src="${escapeHTML(poster)}" alt="${escapeHTML(item.name)} poster" style="${poster?"":"display:none"}" onerror="this.style.display='none'"><span class="poster-placeholder" style="${poster?"display:none":""}">▧</span></div>
      <div class="series-info"><div class="series-name"><button type="button" class="overview-title-link" data-overview-details="${escapeHTML(item.id)}">${escapeHTML(item.name)}</button>${overviewEditMode?`<span class="overview-move-inline"><button type="button" class="icon-btn" title="Move up" aria-label="Move ${escapeHTML(item.name)} up" data-overview-move="up" data-id="${escapeHTML(item.id)}" ${index===0?"disabled":""}>↑</button><button type="button" class="icon-btn" title="Move down" aria-label="Move ${escapeHTML(item.name)} down" data-overview-move="down" data-id="${escapeHTML(item.id)}" ${index===items.length-1?"disabled":""}>↓</button></span>`:""}</div><div class="meta">${item.year?`<span class="badge year-badge">${escapeHTML(item.year)}</span>`:""}<span class="badge">${item.mediaType==="movie"?"Movie":"Series"}</span><span class="badge ${String(item.status).toLowerCase()}">${escapeHTML(item.status)}</span><span class="badge rating-badge">★ ${formatRating(item.rating)}</span></div></div>
      <div class="actions">${overviewEditMode?`<button class="icon-btn" data-overview-edit="${escapeHTML(item.id)}">Edit</button><button class="icon-btn" data-overview-remove="${escapeHTML(item.id)}">✕</button>`:""}</div>
    </div>`;
  }).join(""):`<div class="empty">No ${overviewTypeFilter==="all"?"items":overviewTypeFilter+"s"} found for this filter.</div>`;
  updateOverviewControls();
}
function openOverviewModal(item=null){
  if(!item&&!omdbApiKey)return toast("Add your OMDb API key first in OMDb API Settings.");
  editingOverviewId=item?.id||"";selectedOverviewOmdbItem=item?{Title:item.name,Year:item.year,imdbID:item.imdbID,Poster:item.poster,Type:item.mediaType}:null;
  clearTimeout(overviewSearchTimer);overviewRequestToken++;
  document.getElementById("overviewModalTitle").textContent=item?"Edit Overview Item":"Add to Overview";
  document.getElementById("overviewTitleSearch").value=item?.name||"";
  document.getElementById("overviewTitleSearch").disabled=!!item;
  document.getElementById("overviewSelectedStatus").value=item?.status||"Planned";
  document.getElementById("overviewSelectedRating").value=item?.rating??"";
  document.getElementById("overviewPosition").value=item?data.overviewItems.findIndex(x=>x.id===item.id)+1:"";
  const preview=document.getElementById("overviewSelectedPreview");
  preview.hidden=!item;
  if(item){document.getElementById("overviewSelectedName").textContent=item.name;document.getElementById("overviewSelectedYear").textContent=item.year||"Year unknown";document.getElementById("overviewSelectedType").textContent=item.mediaType==="movie"?"Movie":"Series";const img=document.getElementById("overviewSelectedPoster");img.src=item.poster||"";img.style.display=item.poster?"block":"none";}
  document.getElementById("overviewOmdbResults").innerHTML="";
  document.getElementById("overviewAddModal").classList.add("open");
  if(!item)document.getElementById("overviewTitleSearch").focus();
}
function closeOverviewModal(){clearTimeout(overviewSearchTimer);document.getElementById("overviewAddModal").classList.remove("open");}
document.getElementById("overviewAddBtn").onclick=()=>openOverviewModal();
document.getElementById("overviewCancel").onclick=closeOverviewModal;
async function openOverviewDetails(itemId,source="overview"){
  const sourceList=source==="amirWatched"?data.amirWatched:source==="amirWant"?data.amirWant:data.overviewItems;
  const item=sourceList.find(x=>x.id===itemId);if(!item)return;
  const modal=document.getElementById("overviewDetailModal");
  const loading=document.getElementById("overviewDetailLoading");
  const content=document.getElementById("overviewDetailContent");
  document.getElementById("overviewDetailTitle").textContent=item.name;
  content.hidden=true;loading.hidden=false;loading.textContent="Loading details from OMDb…";modal.classList.add("open");
  if(!omdbApiKey){loading.textContent="Add your OMDb API key in OMDb API Settings to load the full title details.";return;}
  try{
    let url;
    if(item.imdbID){url=`https://www.omdbapi.com/?apikey=${encodeURIComponent(omdbApiKey)}&i=${encodeURIComponent(item.imdbID)}&plot=full`;}
    else{url=`https://www.omdbapi.com/?apikey=${encodeURIComponent(omdbApiKey)}&t=${encodeURIComponent(item.name)}&type=${item.mediaType==="movie"?"movie":"series"}&plot=full`;}
    const response=await omdbFetch(url);const result=await response.json();
    if(!modal.classList.contains("open"))return;
    if(result.Response!=="True")throw new Error(result.Error||"Title details were not found.");
    if(!item.imdbID&&result.imdbID){item.imdbID=result.imdbID;if(!item.poster&&result.Poster&&result.Poster!=="N/A")item.poster=result.Poster;if(!item.year&&result.Year)item.year=result.Year;save();}
    const poster=document.getElementById("overviewDetailPoster");
    poster.src=result.Poster&&result.Poster!=="N/A"?result.Poster:"";poster.hidden=!poster.src;
    const put=(id,label,value)=>{document.getElementById(id).innerHTML=`<strong>${label}:</strong> ${escapeHTML(value&&value!=="N/A"?value:"Not available")}`;};
    put("overviewDetailYear","Year",result.Year);put("overviewDetailType","Type",result.Type==="movie"?"Movie":"Series");put("overviewDetailRating","IMDb rating",result.imdbRating);put("overviewDetailPlot","Plot",result.Plot);put("overviewDetailActors","Actors",result.Actors);put("overviewDetailDirector","Director",result.Director);put("overviewDetailGenre","Genre",result.Genre);put("overviewDetailRuntime","Runtime",result.Runtime);
    document.getElementById("overviewDetailTitle").textContent=result.Title||item.name;
    loading.hidden=true;content.hidden=false;
  }catch(error){loading.textContent=error.message||"Could not load title details. Check your API key and connection.";}
}
function moveOverviewItem(itemId,direction){
  const visible=overviewVisibleItems();const index=visible.findIndex(x=>x.id===itemId);const nextIndex=index+(direction==="up"?-1:1);
  if(index<0||nextIndex<0||nextIndex>=visible.length)return;
  const current=visible[index],target=visible[nextIndex];
  const from=data.overviewItems.findIndex(x=>x.id===current.id),to=data.overviewItems.findIndex(x=>x.id===target.id);
  if(from<0||to<0)return;
  [data.overviewItems[from],data.overviewItems[to]]=[data.overviewItems[to],data.overviewItems[from]];
  if(save())renderOverview();
}
document.getElementById("overviewDetailClose").onclick=()=>document.getElementById("overviewDetailModal").classList.remove("open");
document.getElementById("overviewDetailModal").addEventListener("click",event=>{if(event.target.id==="overviewDetailModal")event.currentTarget.classList.remove("open");});

document.querySelectorAll("[data-overview-type]").forEach(button=>button.addEventListener("click",()=>{overviewTypeFilter=button.dataset.overviewType;overviewSelectedIds.clear();renderOverview();}));
document.querySelectorAll("[data-overview-status]").forEach(button=>button.addEventListener("click",()=>{overviewStatusFilter=button.dataset.overviewStatus;overviewSelectedIds.clear();renderOverview();}));
document.getElementById("overviewSearch").addEventListener("input",renderOverview);
document.getElementById("overviewEditToggle").onclick=()=>{overviewEditMode=!overviewEditMode;overviewSelectedIds.clear();renderOverview();};
document.getElementById("overviewTitleSearch").addEventListener("input",()=>{
  clearTimeout(overviewSearchTimer);selectedOverviewOmdbItem=null;document.getElementById("overviewSelectedPreview").hidden=true;
  const query=document.getElementById("overviewTitleSearch").value.trim();
  if(query.length<2){document.getElementById("overviewOmdbResults").innerHTML="";return;}
  overviewSearchTimer=setTimeout(()=>searchOverviewOmdb(query),350);
});
async function searchOverviewOmdb(query){
  if(!omdbApiKey)return toast("Add your OMDb API key first.");
  const token=++overviewRequestToken;const host=document.getElementById("overviewOmdbResults");
  host.innerHTML='<div class="muted" style="font-size:12px;padding:8px">Searching OMDb…</div>';
  try{
    const type=overviewTypeFilter==="all"?"":`&type=${overviewTypeFilter}`;
    const response=await omdbFetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(omdbApiKey)}&s=${encodeURIComponent(query)}${type}`);
    const result=await response.json();if(token!==overviewRequestToken)return;
    if(result.Response!=="True"||!Array.isArray(result.Search)){host.innerHTML='<div class="empty">No matching titles found.</div>';return;}
    host.innerHTML=result.Search.slice(0,10).map(item=>`<button type="button" class="watch-omdb-result" data-overview-imdb="${escapeHTML(item.imdbID)}"><img src="${item.Poster&&item.Poster!=="N/A"?escapeHTML(item.Poster):""}" alt="" onerror="this.style.visibility='hidden'"><span>${escapeHTML(item.Title)}<small>${escapeHTML(item.Year||"Year unknown")} · ${item.Type==="movie"?"Movie":"Series"}</small></span></button>`).join("");
    host.querySelectorAll("[data-overview-imdb]").forEach(button=>button.onclick=()=>selectOverviewOmdb(button.dataset.overviewImdb));
  }catch(error){console.error(error);if(token===overviewRequestToken)host.innerHTML='<div class="empty">Could not connect to OMDb. Check your API key and connection.</div>';}
}
async function selectOverviewOmdb(imdbID){
  if(!omdbApiKey)return toast("Add your OMDb API key first.");
  const token=++overviewRequestToken;
  try{
    const response=await omdbFetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(omdbApiKey)}&i=${encodeURIComponent(imdbID)}&plot=short`);const item=await response.json();
    if(token!==overviewRequestToken)return;
    if(item.Response!=="True")return toast("Could not load the selected title details.");
    selectedOverviewOmdbItem=item;
    document.getElementById("overviewSelectedName").textContent=item.Title||"";
    document.getElementById("overviewSelectedYear").textContent=item.Year||"Year unknown";
    document.getElementById("overviewSelectedType").textContent=item.Type==="movie"?"Movie":"Series";
    const img=document.getElementById("overviewSelectedPoster");img.src=item.Poster&&item.Poster!=="N/A"?item.Poster:"";img.style.display=img.src?"block":"none";
    document.getElementById("overviewSelectedPreview").hidden=false;
  }catch(error){console.error(error);toast("Could not load the selected title details.");}
}
document.getElementById("overviewSave").onclick=()=>{
  if(!editingOverviewId&&!omdbApiKey)return toast("Add your OMDb API key first.");
  const itemData=selectedOverviewOmdbItem;if(!itemData)return toast("Search and select a title from OMDb first.");
  const name=cleanName(itemData.Title);const position=document.getElementById("overviewPosition").value.trim();const ratingValue=document.getElementById("overviewSelectedRating").value.trim();
  if(!name)return toast("Select a valid title first.");
  if(ratingValue!==""&&(!Number.isFinite(Number(ratingValue))||Number(ratingValue)<0||Number(ratingValue)>10))return toast("Rating must be between 0 and 10.");
  if(position!==""&&(!Number.isInteger(+position)||+position<1))return toast("Position must be a positive whole number.");
  if(data.overviewItems.some(x=>x.name.toLowerCase()===name.toLowerCase()&&x.id!==editingOverviewId))return toast("This title is already in Overview.");
  if(editingOverviewId){
    const existing=data.overviewItems.find(x=>x.id===editingOverviewId);if(!existing)return;
    existing.status=document.getElementById("overviewSelectedStatus").value;
    existing.rating=cleanRating(document.getElementById("overviewSelectedRating").value.trim());
    const oldIndex=data.overviewItems.indexOf(existing);data.overviewItems.splice(oldIndex,1);insertAt(data.overviewItems,existing,position);
  }else{
    const newItem={...makeItem(name,{year:itemData.Year||"",status:document.getElementById("overviewSelectedStatus").value,rating:cleanRating(document.getElementById("overviewSelectedRating").value.trim()),imdbID:itemData.imdbID||"",poster:itemData.Poster&&itemData.Poster!=="N/A"?itemData.Poster:""}),mediaType:itemData.Type==="movie"?"movie":"series"};
    insertAt(data.overviewItems,newItem,position);
  }
  if(!save())return;closeOverviewModal();overviewSelectedIds.clear();renderOverview();toast(editingOverviewId?"Overview item updated.":"Added to Overview from OMDb.");
};
document.getElementById("overviewItemsList").addEventListener("change",event=>{
  const box=event.target.closest("[data-overview-select]");if(!box)return;
  if(box.checked)overviewSelectedIds.add(box.dataset.overviewSelect);else overviewSelectedIds.delete(box.dataset.overviewSelect);updateOverviewControls();
});
document.getElementById("overviewSelectAll").onchange=event=>{
  overviewVisibleItems().forEach(item=>event.target.checked?overviewSelectedIds.add(item.id):overviewSelectedIds.delete(item.id));renderOverview();
};
document.getElementById("overviewItemsList").addEventListener("click",event=>{
  const details=event.target.closest("[data-overview-details]");const move=event.target.closest("[data-overview-move]");
  const edit=event.target.closest("[data-overview-edit]");const remove=event.target.closest("[data-overview-remove]");
  if(details){openOverviewDetails(details.dataset.overviewDetails);return;}
  if(move){moveOverviewItem(move.dataset.id,move.dataset.overviewMove);return;}
  if(edit){const item=data.overviewItems.find(x=>x.id===edit.dataset.overviewEdit);if(item)openOverviewModal(item);}
  if(remove){const item=data.overviewItems.find(x=>x.id===remove.dataset.overviewRemove);if(!item)return;if(!confirm(`Remove "${item.name}" from Overview?`))return;data.overviewItems=data.overviewItems.filter(x=>x.id!==item.id);data.topList=data.topList.filter(f=>f.itemId!==item.id);overviewSelectedIds.delete(item.id);if(save())renderOverview();}
});
["amirWatched","amirWant"].forEach(key=>{
  const listEl=document.getElementById(key+"List");
  listEl.addEventListener("click",event=>{
    const title=event.target.closest("[data-amir-details]");
    if(!title)return;
    const [source,...idParts]=title.dataset.amirDetails.split(":");
    openOverviewDetails(idParts.join(":"),source);
  });
});

document.getElementById("overviewBulkDelete").onclick=()=>{
  const ids=[...overviewSelectedIds];if(!ids.length)return toast("Select at least one item first.");
  if(!confirm(`Delete ${ids.length} selected item(s) from Overview?`))return;
  data.overviewItems=data.overviewItems.filter(item=>!overviewSelectedIds.has(item.id));data.topList=data.topList.filter(f=>!overviewSelectedIds.has(f.itemId));overviewSelectedIds.clear();if(save())renderOverview();
};
document.getElementById("overviewApplyStatus").onclick=()=>{
  const status=document.getElementById("overviewBulkStatus").value;if(!status)return toast("Choose a status first.");
  if(!overviewSelectedIds.size)return toast("Select at least one item first.");
  data.overviewItems.forEach(item=>{if(overviewSelectedIds.has(item.id))item.status=status;});overviewSelectedIds.clear();document.getElementById("overviewBulkStatus").value="";if(save())renderOverview();
};

/* OMDb API key controls */
const omdbKeyInput=document.getElementById("omdbApiKey");
const omdbStatus=document.getElementById("omdbStatus");
if(omdbKeyInput){try{omdbKeyInput.value=localStorage.getItem(OMDB_KEY_STORAGE)||"";}catch{omdbKeyInput.value="";}}
updateOmdbActiveStatus();
document.getElementById("omdbEditBtn").onclick=()=>{omdbKeyInput.disabled=false;omdbKeyInput.focus();omdbStatus.textContent="Enter or replace your API key, then save.";};
document.getElementById("omdbRevealBtn").onclick=()=>{const visible=omdbKeyInput.type==="text";omdbKeyInput.type=visible?"password":"text";document.getElementById("omdbRevealBtn").textContent=visible?"Show":"Hide";};
document.getElementById("omdbSaveBtn").onclick=()=>{
  const key=omdbKeyInput.value.trim();
  if(!key)return toast("Enter an OMDb API key first.");
  omdbPersonalKey=key;omdbApiKey=key;
  try{localStorage.setItem(OMDB_KEY_STORAGE,key);}catch{return toast("Could not save the API key in this browser.");}
  omdbKeyInput.disabled=true;omdbKeyInput.type="password";document.getElementById("omdbRevealBtn").textContent="Show";
  updateOmdbActiveStatus();
  omdbStatus.textContent="Your personal API key is active. Automatic default-key switching is paused while it is in use.";
  toast("OMDb API key saved.");
  // Clear negative cache entries so titles can be retried with the new key.
  posterCache={};try{localStorage.removeItem(POSTER_CACHE_STORAGE);}catch{}
  render();
  setTimeout(()=>{omdbStatus.textContent="Personal API lookup is enabled. Results are cached in this browser.";},1200);
};

/* Persistent dark / light theme */
const THEME_STORAGE_KEY="silver_tv_theme";
const themeToggle=document.getElementById("themeToggle");
const themeSwitchThumb=document.getElementById("themeSwitchThumb");

function applyTheme(theme){
  const light=theme==="light";
  document.body.classList.toggle("light",light);
  if(themeToggle){
    themeToggle.setAttribute("aria-checked",String(light));
    themeToggle.setAttribute("aria-label",light?"Light mode is on":"Dark mode is on");
    themeToggle.title=light?"Switch to dark mode":"Switch to light mode";
  }
  if(themeSwitchThumb)themeSwitchThumb.textContent=light?"☀️":"🌙";
}
let savedTheme="dark";
try{savedTheme=localStorage.getItem(THEME_STORAGE_KEY)==="light"?"light":"dark";}catch{}
applyTheme(savedTheme);
if(themeToggle){
  themeToggle.addEventListener("click",()=>{
    const nextTheme=document.body.classList.contains("light")?"dark":"light";
    applyTheme(nextTheme);
    try{localStorage.setItem(THEME_STORAGE_KEY,nextTheme);}catch{}
  });
}

/* Initial load */
render();
