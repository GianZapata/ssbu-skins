'use strict';
/* ============================ utilidades ============================ */
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const LS=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);v===null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){return null}};
const J=(k,d)=>{try{return JSON.parse(LS(k)||'null')??d}catch(e){return d}};
const enc=encodeURIComponent;
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const stable=o=>JSON.stringify(o,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(x=>[x,v[x]])):v);
const gU=(f,s)=>s==='o'?META.base+'/'+f:META.base+'/'+(s==='m'?'530':'220')+'-90_'+f;
const buzz=p=>{try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};
const PAGE=40;
const SIZES='(min-width:1000px) 250px,(min-width:700px) 240px,calc((100vw - 40px) / 2)';
const trajeName=n=>'Traje '+(n+1);
const techName=n=>'c0'+n;

/* ============================ datos ============================ */
let F=F_EMBED||[];                                    // catálogo (copia incrustada; Firestore la actualiza)
const byCode={},idx={},legacyMap={},all=[];
function buildData(){
 Object.keys(byCode).forEach(k=>delete byCode[k]);Object.keys(idx).forEach(k=>delete idx[k]);Object.keys(legacyMap).forEach(k=>delete legacyMap[k]);all.length=0;
 F.forEach((f,i)=>{byCode[f.code]=f;f.picks.forEach(p=>{idx[p.vid]={f,p,i};if(!p.withdrawn){all.push({f,p,i});if(p.legacy&&!legacyMap[p.legacy])legacyMap[p.legacy]=p.vid}})});
 all.sort((a,b)=>(b.p.audited-a.p.audited)||(a.i-b.i))}
buildData();
let INV=META.inventory||null;                         // {meta,fighters:{código:{slots:{n:{src,name,img,vid,staged}}}}}
let PLAN={};                                          // «código_traje» → {vid,at,by}: el borrador compartido
let PEND=J('ssbu_pend3',[]);                          // cambios hechos aquí que aún no llegaron a la base
let HIST=[];                                          // historial reciente
let STATUS={};                                        // estado de instalación por variante
let lastAct=null;                                     // último cambio de esta sesión, para «Deshacer»
const S={fq:'',cat:J('ssbu_cat',{q:'',f:'',on:false,aud:false}),shown:PAGE,nav:0,fresh:true,dest:null,destFor:null,galI:0};
let RT=null,lastHash=null;const scrollMem={};

/* --- el plan efectivo: lo compartido + lo pendiente de este dispositivo --- */
const keyOf=(c,n)=>c+'_'+n;
function planVid(code,n){let v=(PLAN[keyOf(code,n)]||{}).vid||null;for(const o of PEND)if(o.code===code&&o.slot===n)v=o.to;return v}
function planEntries(){const ks=new Set(Object.keys(PLAN));PEND.forEach(o=>ks.add(keyOf(o.code,o.slot)));const out=[];
 ks.forEach(k=>{const i=k.lastIndexOf('_'),code=k.slice(0,i),n=+k.slice(i+1),vid=planVid(code,n);if(vid&&byCode[code])out.push({code,n,vid})});
 const ord=Object.keys(byCode);out.sort((a,b)=>ord.indexOf(a.code)-ord.indexOf(b.code)||a.n-b.n);return out}
const changesOf=code=>planEntries().filter(e=>e.code===code);
function proposedMap(){const m={};planEntries().forEach(e=>(m[e.vid]=m[e.vid]||[]).push(e));return m}

/* --- lo que hay ahora en cada traje (inventario con su nivel de verificación) --- */
function curOf(code,n){const f=byCode[code];if(!f)return null;
 if(f.mii)return {kind:'na',name:'Sin trajes de este tipo',img:null,badge:''};
 const s=INV&&INV.fighters[code]&&INV.fighters[code].slots[String(n)];
 const stg=s&&s.staged?{name:s.staged.name,img:s.staged.img,branch:(s.staged.branch||'').split('/').pop(),src:s.staged.name_src}:null;
 if(s&&s.src){
  const prof=s.src==='perfil',p=s.vid&&idx[s.vid]?idx[s.vid].p:null;let img=s.img||(p&&p.img)||null;
  const base={img,src:s.src,vid:s.vid||null,author:s.author,url:s.url,staged:stg,badge:prof?'Perfil local':'Pack base',verif:prof?'Archivos verificados en local; no probado en la Switch':'Revisado en el repositorio del ModPack'};
  return s.name?{...base,kind:'mod',name:s.name}:{...base,kind:'unknown',name:'Apariencia sin identificar'}}
 return {kind:'original',name:'Original del juego',img:null,badge:'',staged:stg,verif:'Sin ningún mod en el inventario revisado. No está comprobado en la consola.'}}
const portraitCache={};
function portrait(f){if(portraitCache[f.code]!==undefined&&portraitCache[f.code]!==null)return portraitCache[f.code];let r=null;
 const sl=INV&&INV.fighters[f.code]&&INV.fighters[f.code].slots;
 if(sl)for(const n of Object.keys(sl).sort()){const c=curOf(f.code,+n);if(c&&c.img&&c.src==='base'){r=c.img;break}}
 if(!r){const p=f.picks.find(p=>!p.withdrawn&&p.img);r=p?p.img:null}
 return portraitCache[f.code]=r}

/* --- etiquetas --- */
const ONLINE={autor_explicito:['g','Online: lo declara el autor'],autor_condicionado:['y','Online: con condiciones'],tercero:['y','Online: según terceros'],sin_evidencia:['','Online: sin datos'],incompatible:['r','Incompatible online']};
const onlineOf=p=>p.audited?(ONLINE[p.wifi_status]||['','Online: sin datos']):['','Sin auditar'];

/* ============================ imágenes ============================ */
function ph(kind){return kind==='original'?'<span class="noimg" role="img" aria-label="Original del juego"><i>🎮</i><small>Original</small></span>':'<span class="noimg" role="img" aria-label="Sin imagen"><i>🖼</i><small>Sin imagen</small></span>'}
function imBox(src,alt,o={}){const {kind,cls='',srcset,eager}=o;
 return `<span class="im ${cls}">${src?`<img src="${esc(src)}"${srcset?` srcset="${esc(srcset)}" sizes="${SIZES}"`:''} alt="${esc(alt)}" ${eager?'':'loading="lazy" '}decoding="async">`:ph(kind)}</span>`}
// una imagen que falla se sustituye por un aviso con «Reintentar» (nunca un rectángulo vacío)
document.addEventListener('error',e=>{const t=e.target;if(!t||t.tagName!=='IMG'||t.closest('.pswp'))return;
 const s=t.currentSrc||t.src;if(!t.dataset.src0)t.dataset.src0=t.getAttribute('src');
 if(!t.dataset.fb&&s.includes('/530-90_')){t.dataset.fb='1';t.removeAttribute('srcset');t.removeAttribute('sizes');t.src=s.replace('/530-90_','/220-90_');return}
 const box=t.parentElement,alt=t.alt,src0=t.dataset.src0;t.remove();
 if(box.closest('a,button')){box.insertAdjacentHTML('beforeend',`<span class="noimg" role="img" aria-label="La imagen no cargó"><i>⟳</i><small>No cargó</small></span>`);return}
 box.insertAdjacentHTML('beforeend',`<button class="noimg" data-retry="${esc(src0)}" data-alt="${esc(alt)}" aria-label="La imagen no cargó. Reintentar"><i>⟳</i><small>No cargó · Reintentar</small></button>`)},true);
document.addEventListener('click',e=>{const b=e.target.closest('[data-retry]');if(!b)return;e.preventDefault();e.stopPropagation();
 const box=b.parentElement,src=b.dataset.retry,alt=b.dataset.alt;b.remove();
 const im=new Image();im.alt=alt;im.decoding='async';im.dataset.src0=src;im.dataset.fb='1';im.src=src+(src.startsWith('http')?(src.includes('?')?'&':'?')+'r='+Date.now():'');box.appendChild(im)},true);

/* ============================ avisos y hojas ============================ */
function toast(msg,act){const t=$('toast');t.innerHTML=`<span>${esc(msg)}</span>${act?`<button id="toastA">${esc(act.label)}</button>`:''}`;t.classList.add('on');
 clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove('on'),act?9000:3500);if(act)$('toastA').onclick=()=>{t.classList.remove('on');act.fn()}}
const ovs=[];let skip=0,dlgOpener=null;
function ovPush(id){ovs.push(id);try{history.pushState({ov:id},'')}catch(e){}}
function ovDone(id){const i=ovs.lastIndexOf(id);if(i<0)return;ovs.splice(i,1);if(history.state&&history.state.ov===id){skip++;history.back()}}
function hideOv(id){if(id==='dlg')closeDlgDom();else if(id==='gal'&&PSWP){const p=PSWP;PSWP=null;try{p.destroy()}catch(e){}}}
function closeDlgDom(){$('dlg').classList.remove('open');document.body.classList.remove('lock');if(dlgOpener&&dlgOpener.focus)try{dlgOpener.focus()}catch(e){}}
function openDlg(title,html,back){$('dlgT').textContent=title;$('dlgB').innerHTML=html;$('dlgBack').hidden=!back;
 if(!$('dlg').classList.contains('open')){dlgOpener=document.activeElement;$('dlg').classList.add('open');document.body.classList.add('lock');ovPush('dlg')}
 setTimeout(()=>{const f=$('dlg').querySelector('.bd2 button,.bd2 a,#dlgX');if(f)f.focus()},30)}
const closeDlg=()=>{closeDlgDom();ovDone('dlg')};
$('dlgX').onclick=closeDlg;$('dlg').onclick=e=>{if(e.target===$('dlg'))closeDlg()};
$('dlgBack').onclick=()=>showMenu();
$('dlg').addEventListener('keydown',e=>{if(e.key==='Escape'){closeDlg();return}
 if(e.key!=='Tab')return;const els=[...$('dlg').querySelectorAll('button:not([hidden]),a[href],summary,input')].filter(x=>x.offsetParent!==null);if(!els.length)return;
 const a=els[0],z=els[els.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}});

/* ============================ rutas ============================ */
function parse(){const h=location.hash.replace(/^#/,'')||'/luchadores';const [path,qs]=h.split('?');const q=Object.fromEntries(new URLSearchParams(qs||''));
 const seg=path.split('/').filter(Boolean).map(s=>{try{return decodeURIComponent(s)}catch(e){return s}});const v=seg[0]||'luchadores';
 if(v==='luchador'&&seg[2])return {v:'traje',code:seg[1],n:(+seg[2])-1,q};
 if(v==='luchador')return {v:'luchador',code:seg[1],q};
 if(v==='apariencia')return {v:'ficha',vid:seg.slice(1).join('/'),q};
 if(v==='catalogo'||v==='cambios')return {v,q};
 return {v:'luchadores',q}}
const para=q=>{const m=/^(.+)_([0-7])$/.exec(q||'');return m&&byCode[m[1]]?{code:m[1],n:+m[2],raw:q}:null};
const href={fighter:c=>`#/luchador/${enc(c)}`,traje:(c,n)=>`#/luchador/${enc(c)}/${n+1}`,cat:(c,n)=>`#/catalogo?f=${enc(c)}&para=${enc(keyOf(c,n))}`,ficha:(vid,p)=>`#/apariencia/${enc(vid)}${p?'?para='+enc(p.raw||p):''}`};
function go(h,replace){S.fresh=true;if(replace)location.replace(h);else location.hash=h.replace(/^#/,'')}
document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#/"]');if(a)S.fresh=true},true);
function head(title,back){$('ttl').textContent=title;document.title=title+' · Skins SSBU';$('back').hidden=!back}
function parentOf(R){if(R.v==='traje')return href.fighter(R.code);if(R.v==='ficha')return para(R.q.para)?href.traje(para(R.q.para).code,para(R.q.para).n):'#/catalogo';if(R.v==='luchador')return '#/luchadores';return '#/luchadores'}
$('back').onclick=()=>{if(S.nav>0)history.back();else go(parentOf(RT),true)};
function onRoute(force){if(!force&&location.hash===lastHash)return;const fresh=S.fresh;S.fresh=false;
 if(RT)scrollMem[RT.key]=scrollY;lastHash=location.hash;S.nav=Math.max(0,S.nav+(fresh?1:-1));
 RT=parse();RT.key=location.hash||'#/luchadores';render();
 scrollTo(0,fresh?0:(scrollMem[RT.key]||0));try{$('ttl').focus({preventScroll:true})}catch(e){}}
function render(keep){const R=RT;if(!R)return;const y=keep?scrollY:null;
 ({luchadores:vFighters,luchador:vFighter,traje:vTraje,catalogo:vCatalog,ficha:vFicha,cambios:vChanges}[R.v]||vFighters)(R);
 const tab={luchadores:'luchadores',luchador:'luchadores',traje:'luchadores',catalogo:'catalogo',ficha:'catalogo',cambios:'cambios'}[R.v];
 document.querySelectorAll('nav.tabs a').forEach(a=>a.getAttribute('data-tab')===tab?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
 paintTabs();if(y!==null)scrollTo(0,y)}
function paintTabs(){const n=planEntries().length,b=$('tabN');b.hidden=!n;b.textContent=n}

/* ============================ pantalla: Luchadores ============================ */
function fTile(f){const n=changesOf(f.code).length;
 return `<a class="ft ${n?'has':''}" href="${href.fighter(f.code)}" aria-label="${esc(f.name)}${n?`, ${n} cambio${n>1?'s':''} propuesto${n>1?'s':''}`:''}">${n?`<span class="cnt" aria-hidden="true">${n}</span>`:''}${imBox(portrait(f),f.name,{})}<b>${esc(f.name)}</b></a>`}
function fList(){const q=norm(S.fq),l=F.filter(f=>!q||norm(f.name).includes(q));
 return l.length?l.map(fTile).join(''):''}
function vFighters(){head('Luchadores',false);
 $('main').innerHTML=`<div class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="fq" type="search" placeholder="Buscar luchador" value="${esc(S.fq)}" autocomplete="off" enterkeyhint="search" aria-label="Buscar luchador"></div>
 <div class="fgrid" id="fg">${fList()}</div><p class="empty" id="fe" ${fList()?'hidden':''}><span class="big">🔎</span>Ningún luchador con ese nombre</p>`;
 if(!F.length)$('fe').innerHTML='<span class="big">⏳</span>Cargando luchadores…',$('fe').hidden=false}

/* ============================ pantalla: un luchador y sus ocho trajes ============================ */
function trajeTile(f,n){const c=curOf(f.code,n),pv=planVid(f.code,n),pp=pv&&idx[pv]?idx[pv].p:null;
 const head=`<span class="tj-h"><b>${trajeName(n)}</b><small>${techName(n)}</small></span>`;
 let body;
 if(pv){const pn=pp?pp.name:'Apariencia ya no disponible';
  body=`<span class="cmp"><span class="side"><em>Actual</em>${imBox(c.img,c.name,{kind:c.kind})}<small>${esc(c.name)}</small></span><span class="side prop"><em>Propuesta</em>${imBox(pp?pp.img:null,pn,{})}<small>${esc(pn)}</small></span></span>`}
 else body=`<span class="one">${imBox(c.img,c.name,{kind:c.kind})}<small>${esc(c.name)}</small><span class="bdg">${esc(c.badge||(c.kind==='original'?'Sin mod en el inventario':''))}</span>${c.staged?'<span class="stg">En preparación</span>':''}</span><span class="tj-cta">Cambiar</span>`;
 return `<div class="tj ${pv?'chg':''}"><a class="tj-a" href="${href.traje(f.code,n)}" aria-label="${trajeName(n)}: ${esc(c.name)}${pv?', con cambio propuesto a '+esc(pp?pp.name:'otra apariencia'):''}">${head}${body}</a>${pv?`<button class="tj-undo" data-undo="${keyOf(f.code,n)}" aria-label="Deshacer el cambio del ${trajeName(n)}">Deshacer</button>`:''}</div>`}
function vFighter(R){const f=byCode[R.code];if(!f){head('Luchador',true);$('main').innerHTML='<p class="empty"><span class="big">🤷</span>No encontramos ese luchador</p>';return}
 head(f.name,true);const n=changesOf(f.code).length;
 $('main').innerHTML=`<div class="fh">${imBox(portrait(f),f.name,{})}<div><h2>${esc(f.name)}</h2><span class="pill ${n?'y':''}">${n?`${n} cambio${n>1?'s':''} propuesto${n>1?'s':''}`:'Sin cambios propuestos'}</span></div></div>
 ${f.mii?'<div class="note"><b>Trajes Mii</b>Estos luchadores no usan los ocho trajes habituales, así que aquí no se proponen cambios.</div>':`<div class="tgrid">${[0,1,2,3,4,5,6,7].map(i=>trajeTile(f,i)).join('')}</div>`}`}

/* ============================ pantalla: un traje (comparar) ============================ */
function altList(f,exclude){return f.picks.filter(p=>!p.withdrawn&&!p.mii&&p.vid!==exclude).sort((a,b)=>(b.audited-a.audited)||((b.wifi_status==='autor_explicito')-(a.wifi_status==='autor_explicito')))}
function vTraje(R){const f=byCode[R.code],n=R.n;
 if(!f||!(n>=0&&n<=7)){head('Traje',true);$('main').innerHTML='<p class="empty"><span class="big">🤷</span>No encontramos ese traje</p>';return}
 head(`${trajeName(n)} · ${f.name}`,true);
 const c=curOf(f.code,n),pv=planVid(f.code,n),pp=pv&&idx[pv]?idx[pv].p:null,alts=altList(f,pv);
 const propCard=pv?`<div class="card2 prop"><em>Propuesta</em>${imBox(pp?pp.img:null,pp?pp.name:'',{cls:''})}<b>${esc(pp?pp.name:'Apariencia ya no disponible')}</b>${pp?`<span class="pill ${onlineOf(pp)[0]}">${esc(onlineOf(pp)[1])}</span>`:''}${pp&&pp.pack?'<span class="pill b">Paquete compartido</span>':''}</div>`
  :`<div class="card2 empty"><span class="big" aria-hidden="true">＋</span>Sin propuesta</div>`;
 $('main').innerHTML=`<div class="cmp2"><div class="card2"><em>Actual</em>${imBox(c.img,c.name,{kind:c.kind})}<b>${esc(c.name)}</b>${c.badge?`<span class="pill">${esc(c.badge)}</span>`:''}${c.kind==='unknown'?'<span class="pill y">No sabemos qué mod es</span>':''}${c.kind==='original'?'<span class="pill">Original</span>':''}</div>${propCard}</div>
 ${c.verif?`<p class="mu sm">${esc(c.verif)}</p>`:''}
 ${c.staged?`<div class="note b"><b>En preparación (sin confirmar)</b>${c.staged.name?esc(c.staged.name):'Una skin sin nombre'} · rama ${esc(c.staged.branch)}. Está en el repositorio, no se ha comprobado que esté instalada.</div>`:''}
 <div class="acts"><a class="btn p" href="${href.cat(f.code,n)}">${pv?'Cambiar opción':'Elegir alternativa'}</a>${pv?`<button data-undo="${keyOf(f.code,n)}">Deshacer</button>`:''}</div>
 ${alts.length?`<h2>Alternativas para ${esc(f.name)}</h2><div class="rail">${alts.slice(0,12).map(p=>cCard({f,p},-1,keyOf(f.code,n))).join('')}</div><p><a class="btn" href="${href.cat(f.code,n)}">Ver las ${alts.length} alternativas</a></p>`:'<p class="empty">No hay alternativas en el catálogo para este luchador.</p>'}`}

/* ============================ pantalla: Catálogo ============================ */
function cCard(e,i,paraRaw){const p=e.p,[oc,ol0]=onlineOf(p),ol=ol0.replace('Online: lo declara el autor','Online · autor').replace('Online: con condiciones','Online · condiciones').replace('Online: según terceros','Online · terceros').replace('Online: sin datos','Online · sin datos'),pm=proposedMap()[p.vid]||[];
 return `<a class="cd" href="${href.ficha(p.vid,paraRaw)}" aria-label="${esc(p.name)}, ${esc(e.f.name)}">${imBox(p.img,p.name,{srcset:p.srcset,eager:i>=0&&i<2})}<span class="tx"><span class="nm">${esc(p.name)}</span><span class="fg">${esc(e.f.name)}</span><span class="pl"><span class="pill ${oc}">${esc(ol)}</span>${p.pack?'<span class="pill b">Paquete</span>':''}${p.mii?'<span class="pill">Mii</span>':''}${pm.map(x=>`<span class="pill y" data-prop="1">En ${trajeName(x.n)}</span>`).join('')}</span></span></a>`}
function catList(ctx){const c=S.cat,q=norm(c.q),fcode=ctx?ctx.code:c.f;
 return all.filter(e=>{const p=e.p;if(fcode&&e.f.code!==fcode)return false;if(ctx&&p.mii)return false;if(c.on&&!(p.wifi_status==='autor_explicito'||p.wifi_status==='autor_condicionado'))return false;if(c.aud&&!p.audited)return false;
  if(q&&!norm(p.name+' '+e.f.name+' '+p.author).split(' ').length)return false;if(q&&!q.split(/\s+/).every(w=>norm(p.name+' '+e.f.name+' '+p.author).includes(w)))return false;return true})}
function catGrid(ctx){const l=catList(ctx);$('cg').innerHTML=l.slice(0,S.shown).map((e,i)=>cCard(e,i,ctx&&ctx.raw)).join('');$('cc').textContent=l.length+' apariencia'+(l.length==1?'':'s');
 $('ce').hidden=!!l.length;$('cm').hidden=l.length<=S.shown;$('cm').textContent='Ver más ('+(l.length-S.shown)+')';return l}
let catObs=null;
function vCatalog(R){const ctx=para(R.q.para);
 if(R.q.f!==undefined&&S.fresh!==false&&R.key===undefined){}
 if(R.q.f!==undefined&&!R._applied){R._applied=1;S.cat.f=R.q.f;S.cat.q='';S.shown=PAGE;LS('ssbu_cat',JSON.stringify(S.cat))}
 head(ctx?'Elegir':'Catálogo',!!ctx);
 const cu=ctx?curOf(ctx.code,ctx.n):null;
 $('main').innerHTML=`${ctx?`<div class="ctx">${imBox(cu.img,cu.name,{kind:cu.kind})}<div><b>${trajeName(ctx.n)} · ${esc(byCode[ctx.code].name)}</b>Ahora: ${esc(cu.name)}</div></div>`:''}
 <div class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="cq" type="search" placeholder="Buscar apariencia" value="${esc(S.cat.q)}" autocomplete="off" enterkeyhint="search" aria-label="Buscar apariencia"></div>
 ${ctx?'':`<select class="sel" id="cf" aria-label="Luchador"><option value="">Todos los luchadores</option>${F.map(f=>`<option value="${esc(f.code)}"${f.code===S.cat.f?' selected':''}>${esc(f.name)}</option>`).join('')}</select>`}
 <div class="chips" role="group" aria-label="Filtros"><button class="chip" data-chip="on" aria-pressed="${S.cat.on}">Online: lo declara el autor</button><button class="chip" data-chip="aud" aria-pressed="${S.cat.aud}">Solo revisadas</button></div>
 <p class="mu sm" id="cc" aria-live="polite"></p><div class="cgrid" id="cg"></div><p class="empty" id="ce" hidden><span class="big">🔎</span>No hay apariencias con esos filtros</p><button class="more" id="cm" hidden></button><div id="cs" style="height:1px"></div>`;
 catGrid(ctx);
 if(catObs)catObs.disconnect();catObs=new IntersectionObserver(es=>{if(es[0].isIntersecting&&RT&&RT.v==='catalogo'&&!$('cm').hidden){S.shown+=PAGE;catGrid(ctx)}},{rootMargin:'600px'});catObs.observe($('cs'))}
function saveCat(){LS('ssbu_cat',JSON.stringify(S.cat))}
function paintCatBadges(){const pm=proposedMap();document.querySelectorAll('#cg .cd').forEach(a=>{const m=/apariencia\/([^?]+)/.exec(a.getAttribute('href'));if(!m)return;const vid=decodeURIComponent(m[1]),pl=a.querySelector('.pl');if(!pl)return;
 pl.querySelectorAll('[data-prop]').forEach(x=>x.remove());(pm[vid]||[]).forEach(x=>pl.insertAdjacentHTML('beforeend',`<span class="pill y" data-prop="1">En ${trajeName(x.n)}</span>`))})}

/* ============================ pantalla: ficha de una apariencia ============================ */
function imgsOf(p){return p.g&&p.g.length?p.g.map(f=>({o:gU(f,'o'),m:gU(f,'m'),s:gU(f,'s')})):(p.img?[{o:p.img,m:p.img,s:p.img}]:[])}
function destTile(f,n,sel){const c=curOf(f.code,n),pv=planVid(f.code,n),pp=pv&&idx[pv]?idx[pv].p:null;
 return `<button data-dest="${n}" aria-pressed="${sel===n}" class="${pv?'has':''}" aria-label="${trajeName(n)}, ahora ${esc(c.name)}${pv?', ya tiene una propuesta':''}">${imBox(pv&&pp?pp.img:c.img,c.name,{kind:c.kind})}<span>${n+1}</span></button>`}
function vFicha(R){const e=idx[R.vid];
 if(!e){head('Apariencia',true);$('main').innerHTML='<p class="empty"><span class="big">🤷</span>Esta apariencia ya no está en el catálogo</p>';return}
 const {f,p}=e,ctx=para(R.q.para),[oc,ol]=onlineOf(p),imgs=imgsOf(p);
 if(S.destFor!==R.key){S.destFor=R.key;S.dest=ctx?ctx.n:null;S.galI=0}
 head(p.name,true);
 const hero=imgs.length?`<button class="hero" data-gal="${S.galI}" aria-label="Ampliar las fotos de ${esc(p.name)}">${imBox(imgs[S.galI].m,p.name+' — foto '+(S.galI+1),{cls:'c',eager:true}).replace('class="im c"','class="im c" style="position:absolute;inset:0;border-radius:0"')}<span class="zoom">🔍 Ampliar</span><span class="n">${S.galI+1} / ${imgs.length}</span></button>`:`<div class="hero"><span class="noimg" role="img" aria-label="Sin fotos"><i>🖼</i><small>Este diseño no tiene fotos</small></span></div>`;
 const thumbs=imgs.length>1?`<div class="thumbs" role="group" aria-label="Fotos">${imgs.map((x,i)=>`<button data-thumb="${i}" aria-label="Foto ${i+1}" ${i===S.galI?'aria-current="true"':''}><img src="${esc(x.s)}" alt="" loading="lazy" decoding="async"></button>`).join('')}</div>`:'';
 const pmv=proposedMap()[p.vid]||[];
 $('main').innerHTML=`${hero}${thumbs}
 ${p.pack?`<div class="note b"><b>Paquete compartido</b>Este mod también trae diseños para ${esc(p.pack.with.join(', '))}. Las fotos muestran todo el paquete, no solo esta apariencia.</div>`:''}
 <h2 style="margin-top:12px">${esc(p.name)}</h2><p class="mu" style="margin:0 0 8px">${esc(f.name)} · por ${esc(p.author)}</p>
 <p style="margin:0 0 6px"><span class="pill ${oc}">${esc(ol)}</span> ${p.mii?'<span class="pill">Traje Mii</span>':''}</p>
 ${p.conditions?`<div class="note y"><b>Condiciones</b>${esc(p.conditions)}</div>`:''}
 ${p.deps?`<div class="note y"><b>Necesita</b>${esc(p.deps)}</div>`:''}
 ${p.conflicts?`<div class="note y"><b>Posibles conflictos</b>${esc(p.conflicts)}</div>`:''}
 ${p.withdrawn?'<div class="note y"><b>Retirada</b>Esta apariencia se retiró del catálogo.</div>':''}
 <div id="usebox">${useBox(f,p,ctx)}</div>
 <details><summary>Detalles y fuentes</summary><div class="dl">
  ${p.wifi_quote?`<p class="q">«${esc(p.wifi_quote)}»</p>`:''}
  <p>${p.audited?`Estado online: ${esc(ol)}. Es una declaración registrada${p.wifi_source?` (${esc(p.wifi_source)})`:''}, no una prueba en tu consola.`:'Todavía no se ha revisado esta apariencia.'} ${p.wifi_source_url?`<a href="${esc(p.wifi_source_url)}" target="_blank" rel="noopener" style="color:#8ab4ff">Ver fuente</a>`:''}</p>
  <p><b>Slots originales del mod:</b> ${esc(p.slots_orig||'sin especificar')}</p>
  ${p.dest?`<p><b>Destino sugerido por el análisis:</b> ${esc(p.dest)} (solo orientativo: ese traje puede estar ocupado)</p>`:''}
  ${p.design?`<p><b>Diseño:</b> ${esc(p.design)}</p>`:''}
  <p><b>Compatibilidad:</b> ${esc(p.compat||'no verificada')} · ${esc(p.console_test||'sin prueba en consola')}</p>
  ${p.file_note?`<p><b>Archivos:</b> ${esc(p.file_note)}</p>`:''}${p.notes?`<p><b>Notas:</b> ${esc(p.notes)}</p>`:''}
  <p><a class="btn" href="${esc(p.url)}" target="_blank" rel="noopener">Abrir en GameBanana ↗</a></p>
  <p class="mu sm">ID de variante: ${esc(p.vid)}${pmv.length?'':''}</p></div></details>`}
function useBox(f,p,ctx){
 if(p.mii)return '<div class="note"><b>Traje Mii</b>Los Mii no usan los ocho trajes, así que esta apariencia no se puede asignar a un traje.</div>';
 if(p.withdrawn)return '';
 const sel=S.dest,pm=(proposedMap()[p.vid]||[]).filter(x=>x.code===f.code);
 const target=sel!=null?{c:curOf(f.code,sel),pv:planVid(f.code,sel)}:null,tpp=target&&target.pv&&idx[target.pv]?idx[target.pv].p:null;
 const same=target&&target.pv===p.vid;
 return `<h2>${ctx?`Reemplazará el ${trajeName(ctx.n)}`:'¿En qué traje?'}</h2>
 ${ctx?'':`<div class="dest" role="group" aria-label="Elegir traje">${[0,1,2,3,4,5,6,7].map(n=>destTile(f,n,sel)).join('')}</div>`}
 ${target?`<div class="row2"><div class="card2"><em>${target.pv&&!same?'Propuesta actual':'Actual'}</em>${imBox(target.pv&&tpp?tpp.img:target.c.img,'',{kind:target.c.kind})}<b>${esc(target.pv&&tpp?tpp.name:target.c.name)}</b></div><span class="arrow" aria-hidden="true">→</span><div class="card2 prop"><em>Nueva</em>${imBox(p.img,p.name,{})}<b>${esc(p.name)}</b></div></div>
  ${target.pv&&!same?`<p class="note y" role="status">${trajeName(sel)} ya tiene una propuesta del grupo: <b style="display:inline">${esc(tpp?tpp.name:'otra apariencia')}</b>. Si sigues, la reemplazas.</p>`:''}`:''}
 <div class="acts">${same?`<button class="p" data-clear="${keyOf(f.code,sel)}">Deshacer</button>`:`<button class="p" data-use="1" ${sel==null?'disabled':''}>${sel==null?'Elige un traje':'Usar en '+trajeName(sel)}</button>`}</div>
 ${pm.length&&!same?`<p class="mu sm">Ya es una propuesta en ${pm.map(x=>trajeName(x.n)).join(', ')}.</p>`:''}`}

/* ============================ pantalla: Cambios ============================ */
function changeRow(e){const f=byCode[e.code],c=curOf(e.code,e.n),pp=idx[e.vid]?idx[e.vid].p:null;
 return `<div class="chg-row"><div class="hd"><span>${trajeName(e.n)}</span><small>${techName(e.n)}</small></div>
 <div class="row2"><div class="card2"><em>Actual</em>${imBox(c.img,c.name,{kind:c.kind})}<b>${esc(c.name)}</b></div><span class="arrow" aria-hidden="true">→</span><div class="card2 prop"><em>Propuesta</em>${imBox(pp?pp.img:null,pp?pp.name:'',{})}<b>${esc(pp?pp.name:'Apariencia ya no disponible')}</b></div></div>
 <div class="acts"><a class="btn p" href="${href.cat(e.code,e.n)}">Cambiar opción</a><button data-undo="${keyOf(e.code,e.n)}">Deshacer</button></div></div>`}
function vChanges(){head('Cambios',false);const es=planEntries();
 if(!es.length){$('main').innerHTML='<div class="empty"><span class="big" aria-hidden="true">🎽</span><b style="display:block;color:var(--tx);font-size:18px">Todavía no hay cambios</b><p>Elige un luchador y toca un traje para proponer otra apariencia.</p><a class="btn p" href="#/luchadores">Elegir luchador</a></div>';return}
 const groups={};es.forEach(e=>(groups[e.code]=groups[e.code]||[]).push(e));
 $('main').innerHTML=`<p class="mu" style="margin:2px 0 0"><b style="color:var(--tx)">${es.length} cambio${es.length>1?'s':''}</b> en ${Object.keys(groups).length} luchador${Object.keys(groups).length>1?'es':''}</p>`+
  Object.entries(groups).map(([code,l])=>{const f=byCode[code];return `<div class="grp">${imBox(portrait(f),f.name,{})}<h2>${esc(f.name)}</h2></div>${l.map(changeRow).join('')}`}).join('')}

/* ============================ acciones sobre el plan ============================ */
function enqueue(op){PEND.push(op);savePend();paintSync();render(true);flush()}
const savePend=()=>LS('ssbu_pend3',JSON.stringify(PEND));
function proposeAt(code,n,vid,undoLabel){const prev=planVid(code,n);if(prev===vid)return;const p=idx[vid]&&idx[vid].p;
 enqueue({code,slot:n,to:vid,exp:prev,kind:'set'});lastAct={code,slot:n,from:prev,to:vid};buzz(15);
 toast(`${trajeName(n)} · ${byCode[code].name}: ${p?p.name:'cambio guardado'}`,{label:'Deshacer',fn:undoLast})}
function clearAt(code,n){const prev=planVid(code,n);if(!prev)return;enqueue({code,slot:n,to:null,exp:prev,kind:'clear'});lastAct={code,slot:n,from:prev,to:null};buzz(15);
 toast(`${trajeName(n)} · ${byCode[code].name}: vuelve a lo actual`,{label:'Deshacer',fn:undoLast})}
function undoLast(){if(!lastAct)return;const a=lastAct;lastAct=null;enqueue({code:a.code,slot:a.slot,to:a.from,exp:a.to,kind:'undo'});toast('Deshecho')}
function undoKey(k){const i=k.lastIndexOf('_');clearAt(k.slice(0,i),+k.slice(i+1))}

/* --- clic en la zona principal --- */
$('main').addEventListener('click',e=>{const t=e.target;let b;
 if(b=t.closest('[data-undo]')){e.preventDefault();undoKey(b.dataset.undo);return}
 if(b=t.closest('[data-clear]')){e.preventDefault();const k=b.dataset.clear;undoKey(k);return}
 if(b=t.closest('[data-chip]')){S.cat[b.dataset.chip]=!S.cat[b.dataset.chip];b.setAttribute('aria-pressed',S.cat[b.dataset.chip]);S.shown=PAGE;saveCat();catGrid(para(RT.q.para));return}
 if(b=t.closest('#cm')){S.shown+=PAGE;catGrid(para(RT.q.para));return}
 if(b=t.closest('[data-thumb]')){S.galI=+b.dataset.thumb;vFicha(RT);return}
 if(b=t.closest('[data-gal]')){const e2=idx[RT.vid];if(e2)openGallery(e2.p,+b.dataset.gal);return}
 if(b=t.closest('[data-dest]')){S.dest=+b.dataset.dest;const e2=idx[RT.vid];$('usebox').innerHTML=useBox(e2.f,e2.p,para(RT.q.para));return}
 if(b=t.closest('[data-use]')){const e2=idx[RT.vid],c=para(RT.q.para),n=c?c.n:S.dest;if(n==null)return;proposeAt(e2.f.code,n,e2.p.vid);go(href.traje(e2.f.code,n),true);return}});
$('main').addEventListener('input',e=>{const t=e.target;
 if(t.id==='fq'){S.fq=t.value;clearTimeout(S.ft);S.ft=setTimeout(()=>{const h=fList();$('fg').innerHTML=h;$('fe').hidden=!!h},120)}
 if(t.id==='cq'){S.cat.q=t.value;S.shown=PAGE;saveCat();clearTimeout(S.ct);S.ct=setTimeout(()=>catGrid(para(RT.q.para)),160)}});
$('main').addEventListener('change',e=>{if(e.target.id==='cf'){S.cat.f=e.target.value;S.shown=PAGE;saveCat();catGrid(null);e.target.blur()}});
$('main').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.target.id==='fq'||e.target.id==='cq'))e.target.blur()});
const isTxt=el=>el&&el.matches&&el.matches('input[type=search],input[type=text]');
document.addEventListener('focusin',e=>{if(isTxt(e.target))document.body.classList.add('typing')});
document.addEventListener('focusout',()=>setTimeout(()=>{if(!isTxt(document.activeElement))document.body.classList.remove('typing')},50));

/* ============================ menú, historial, datos, exportar ============================ */
function showMenu(){openDlg('Más',`<div class="list"><button data-m="hist"><span class="i">🕘</span>Historial de cambios</button><button data-m="datos"><span class="i">ℹ️</span>Sobre los datos</button><button data-m="export"><span class="i">📤</span>Exportar el plan</button><button data-m="ayuda"><span class="i">❓</span>Cómo se usa</button></div>`,false)}
$('menuBtn').onclick=showMenu;
$('dlgB').addEventListener('click',e=>{const b=e.target.closest('[data-m]');if(b){({hist:showHist,datos:showDatos,export:showExport,ayuda:showAyuda})[b.dataset.m]();return}
 if(e.target.closest('#hUndo')){closeDlg();undoLast();return}
 if(e.target.closest('#xCopy')){const t=JSON.stringify(buildExport(),null,2);(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('Plan copiado'),()=>{const ta=$('xPre');ta.focus();toast('Selecciona el texto y cópialo')});return}
 if(e.target.closest('#xDown')){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(buildExport(),null,2)],{type:'application/json'}));a.download='plan-skins.json';a.click();return}});
const ago=t=>{if(!t)return '';const s=Math.max(0,(Date.now()-t)/1000);return s<60?'ahora':s<3600?`hace ${Math.round(s/60)} min`:s<86400?`hace ${Math.round(s/3600)} h`:`hace ${Math.round(s/86400)} d`};
function showHist(){const rows=HIST.slice(0,40).map(h=>{const f=byCode[h.code],to=h.to&&idx[h.to]?idx[h.to].p:null,fr=h.from&&idx[h.from]?idx[h.from].p:null;
  const what=h.to?`puso «${to?to.name:'otra apariencia'}»`:'quitó la propuesta'+(fr?` «${fr.name}»`:'');
  return `<div class="hrow">${imBox(to?to.img:(fr?fr.img:null),'',{})}<div><b>${trajeName(h.slot)} · ${esc(f?f.name:h.code)}</b><br>Alguien ${esc(what)} <span class="mu">· ${ago(h.t)}</span></div></div>`}).join('');
 openDlg('Historial',`${lastAct?'<div class="acts"><button id="hUndo" class="p">Deshacer mi último cambio</button></div>':''}${rows||'<p class="empty">Todavía no hay cambios en el historial.</p>'}`,true)}
function showDatos(){const m=INV&&INV.meta;const gen=(META.generated||'').replace('T',' ');
 openDlg('Sobre los datos',`<div class="note"><b>Qué es «Actual»</b>Lo que se pudo revisar en los repositorios del ModPack. No es un inventario comprobado en la consola: ${m&&m.verification?`verificación <b style="display:inline">${esc(m.verification)}</b>`:'sin verificar'}.</div>
 ${m?m.sources.map(s=>`<div class="note"><b>${esc(s.label)}</b>${esc(s.verification||'')}${s.ref?`<br><span class="mu sm">${esc(s.ref)}</span>`:''}${s.scope?`<br><span class="mu sm">${esc(s.scope)}</span>`:''}</div>`).join(''):''}
 <div class="note"><b>Original</b>Un traje sin ningún mod en el inventario revisado se muestra como original. No está confirmado en la consola.</div>
 <div class="note"><b>«Online»</b>Es lo que declara el autor del mod. No es una prueba en tu consola.</div>
 <div class="note"><b>Catálogo</b>${esc(gen)} · ${F.reduce((n,f)=>n+f.picks.filter(p=>!p.withdrawn).length,0)} apariencias${m&&m.scanned_at?` · inventario del ${esc(m.scanned_at.slice(0,10))}`:''}</div>
 <div class="note"><b>Cambios compartidos</b>Todos editan el mismo plan. Cada cambio queda en el historial. Después se revisa y se instala a mano.</div>`,true)}
function showAyuda(){openDlg('Cómo se usa',`<div class="steps"><div><b>1</b><span>Elige un <b>luchador</b>.</span></div><div><b>2</b><span>Toca el <b>traje</b> que quieres cambiar.</span></div><div><b>3</b><span>Elige una <b>alternativa</b> y toca «Usar en Traje…».</span></div><div><b>4</b><span>¿Te arrepientes? Toca <b>Deshacer</b>.</span></div></div>`,true)}
function buildExport(){const es=planEntries();
 return {schema:3,generated_at:new Date().toISOString(),catalog:META.generated||null,
  inventory:{verification:INV&&INV.meta&&INV.meta.verification,scanned_at:INV&&INV.meta&&INV.meta.scanned_at,sources:INV&&INV.meta&&INV.meta.sources},
  target:{game:'Super Smash Bros. Ultimate',version:'13.0.5',loader:'ARCropolis 4.1.1'},
  changes:es.map(e=>{const f=byCode[e.code],c=curOf(e.code,e.n),p=idx[e.vid]?idx[e.vid].p:null;
   return {fighter:f.name,roster_no:e.code,traje:e.n+1,slot:'c0'+e.n,current:{kind:c.kind,name:c.name,source:c.src||null,confirmed:false},
    proposal:p?{vid:p.vid,mod_id:p.id,name:p.name,author:p.author,url:p.url,online:onlineOf(p)[1],conditions:p.conditions||null,dependencies:p.deps||null,conflicts:p.conflicts||null,native_slots:p.slots_orig||null,dest_hint:p.dest||null,pack:p.pack,withdrawn:!!p.withdrawn}:null,
    missing_in_catalog:!p,vid:e.vid,status:(STATUS[e.vid]||{}).status||'wanted',result:(STATUS[e.vid]||{}).result||null}}),
  history:HIST.slice(0,50).map(h=>({at:h.t?new Date(h.t).toISOString():null,roster_no:h.code,traje:h.slot+1,from:h.from,to:h.to,kind:h.kind}))}}
function showExport(){const n=planEntries().length;
 openDlg('Exportar el plan',`<p>Plan actual: <b>${n} cambio${n==1?'':'s'}</b>. Incluye traje de destino, apariencia, variante y condiciones.</p><div class="acts row"><button id="xCopy" class="p">Copiar</button><button id="xDown">Descargar</button></div><pre class="json" id="xPre" tabindex="0">${esc(JSON.stringify(buildExport(),null,2).slice(0,1800))}${n?'…':''}</pre>`,true)}

/* ============================ galería (PhotoSwipe, carga diferida) ============================ */
const PSWP_BASE='https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/';
let PSWP=null,pswpMod=null;
function loadPswp(){return pswpMod||(pswpMod=(async()=>{
 if(!document.getElementById('pswpCss')){const l=document.createElement('link');l.id='pswpCss';l.rel='stylesheet';l.href=PSWP_BASE+'photoswipe.css';document.head.appendChild(l);await new Promise(r=>{l.onload=l.onerror=r})}
 return (await import(PSWP_BASE+'photoswipe.esm.min.js')).default})().catch(e=>{pswpMod=null;throw e}))}
async function openGallery(p,i){const imgs=imgsOf(p);if(!imgs.length)return;
 let PhotoSwipe;try{PhotoSwipe=await loadPswp()}catch(e){toast('No se pudo abrir el visor de fotos',{label:'Reintentar',fn:()=>openGallery(p,i)});return}
 const items=imgs.map((x,k)=>({src:x.o,msrc:x.m,width:1280,height:720,alt:`${p.name} — foto ${k+1} de ${imgs.length}`}));
 const pswp=new PhotoSwipe({dataSource:items,index:i,bgOpacity:.97,loop:false,wheelToZoom:true,closeTitle:'Cerrar',zoomTitle:'Ampliar o reducir',arrowPrevTitle:'Foto anterior',arrowNextTitle:'Foto siguiente',errorMsg:'No se pudo cargar la foto',indexIndicatorSep:' / ',preloaderDelay:200});
 // tamaño real de cada foto al cargarla: se muestra sin deformar
 pswp.on('loadComplete',({content,slide})=>{const el=content.element;if(!el||!el.naturalWidth)return;if(content.data.width===el.naturalWidth&&content.data.height===el.naturalHeight)return;
  content.data.width=el.naturalWidth;content.data.height=el.naturalHeight;content.width=el.naturalWidth;content.height=el.naturalHeight;slide.width=el.naturalWidth;slide.height=el.naturalHeight;
  if(slide.calculateSize){slide.calculateSize();slide.zoomAndPanToInitial();slide.applyCurrentZoomPan()}});
 // foto que falla: aviso claro con «Reintentar»
 pswp.addFilter('contentErrorElement',(el,content)=>{const d=document.createElement('div');d.className='pswp__err';d.innerHTML='<span aria-hidden="true" style="font-size:36px">🖼</span><span>No se pudo cargar esta foto</span>';
  const b=document.createElement('button');b.textContent='Reintentar';b.onclick=()=>{try{if(content.slide)content.slide.container.innerText='';content.load(false,true)}catch(e){pswp.refreshSlideContent(content.index)}};d.appendChild(b);return d});
 // miniaturas visibles, con la actual marcada
 if(imgs.length>1)pswp.on('uiRegister',()=>pswp.ui.registerElement({name:'thumbs',order:9,isButton:false,appendTo:'root',html:'<div class="pswp__thumbs" role="group" aria-label="Fotos"></div>',onInit:(el,ps)=>{
  el.innerHTML=imgs.map((x,k)=>`<button aria-label="Foto ${k+1}"><img src="${esc(x.s)}" alt="" loading="lazy"></button>`).join('');
  const mark=()=>[...el.children].forEach((b,k)=>{k===ps.currIndex?b.setAttribute('aria-current','true'):b.removeAttribute('aria-current');if(k===ps.currIndex&&b.scrollIntoView)b.scrollIntoView({block:'nearest',inline:'center'})});
  el.addEventListener('click',ev=>{const b=ev.target.closest('button');if(b)ps.goTo([...el.children].indexOf(b))});ps.on('change',mark);mark()}}));
 pswp.on('change',()=>{S.galI=pswp.currIndex});
 pswp.on('close',()=>{PSWP=null;ovDone('gal');if(RT&&RT.v==='ficha'){S.galI=Math.min(S.galI,imgs.length-1);vFicha(RT)}});
 PSWP=pswp;ovPush('gal');pswp.init()}

/* ============================ sincronización: Firebase ============================ */
const FBCFG=META.firebase||null;
const EMU=location.hostname==='localhost'&&/[?&]fbemu/.test(location.search);   // solo pruebas con emuladores
let _fb=null,dbState=FBCFG?'off':'local',flushing=false,planLoaded=false,metaCat=null,catSnap=null,metaInst=null,instSnap=null,curGen=META.generated||null,syncErr=null,lastSaved=0;
function fb(){if(!FBCFG)return Promise.reject(new Error('Firebase no configurado'));
 return _fb||(_fb=(async()=>{const B='https://www.gstatic.com/firebasejs/10.14.1/';
  const [app,auth,fs]=await Promise.all([import(B+'firebase-app.js'),import(B+'firebase-auth.js'),import(B+'firebase-firestore.js')]);
  const a=app.initializeApp(FBCFG),au=auth.getAuth(a);
  const db=fs.initializeFirestore(a,{localCache:fs.persistentLocalCache({tabManager:fs.persistentMultipleTabManager()})});
  if(EMU){auth.connectAuthEmulator(au,'http://localhost:9099',{disableWarnings:true});fs.connectFirestoreEmulator(db,'localhost',8080)}
  await new Promise(r=>{const u=auth.onAuthStateChanged(au,()=>{u();r()})});
  if(!au.currentUser)await auth.signInAnonymously(au);   // sesión anónima automática: sin registro ni nombre
  return {...fs,...auth,db,auth:au}})().catch(e=>{_fb=null;throw e}))}
function syncInfo(){const n=PEND.length;
 if(syncErr)return ['err','No se pudo guardar'];
 if(n)return flushing?['saving','Guardando…']:['pend','Pendiente ('+n+')'];
 if(dbState==='ok')return Date.now()-lastSaved<2500&&lastSaved?['ok','Guardado ✓']:['ok','Guardado ✓'];
 if(dbState==='err')return ['pend','Sin conexión'];
 if(dbState==='local')return ['','Solo en este dispositivo'];
 return ['','Conectando…']}
function paintSync(){const [c,t]=syncInfo(),e=$('sync');e.className='sync '+c;e.textContent=t}
function dbErr(e,quiet){console.warn('Firebase:',e&&e.code||e);if(dbState!=='ok')dbState='err';paintSync()}
async function flush(){if(flushing||!PEND.length)return;
 if(!FBCFG){// sin base de datos: el plan queda en este dispositivo
  PEND.forEach(o=>{const k=keyOf(o.code,o.slot);if(o.to)PLAN[k]={vid:o.to};else delete PLAN[k]});PEND=[];savePend();render(true);paintSync();return}
 if(!navigator.onLine){paintSync();return}
 flushing=true;paintSync();
 try{const f=await fb();const uid=f.auth.currentUser.uid;
  while(PEND.length){const op=PEND[0];
   const res=await f.runTransaction(f.db,async tx=>{const ref=f.doc(f.db,'changes',keyOf(op.code,op.slot)),s=await tx.get(ref),cur=s.exists()?s.data().vid:null;
    if(cur===op.to)return {noop:true};
    if(cur!==op.exp)return {conflict:true,cur};
    const h=f.doc(f.collection(f.db,'history'));
    if(op.to===null)tx.delete(ref);else tx.set(ref,{code:op.code,slot:op.slot,vid:op.to,by:uid,at:f.serverTimestamp()});
    tx.set(h,{code:op.code,slot:op.slot,from:cur,to:op.to,kind:op.kind||(op.to===null?'clear':'set'),by:uid,at:f.serverTimestamp()});return {ok:true}});
   PEND.shift();savePend();
   if(res.conflict)conflict(op,res.cur);
   render(true)}
  syncErr=null;dbState='ok';lastSaved=Date.now()
 }catch(e){const c=e&&e.code;console.warn('flush:',c||e);if(c==='permission-denied'){syncErr='permisos'}else dbState='err'}
 flushing=false;paintSync();render(true)}
// otra persona cambió ese traje mientras tanto: se conserva su opción y se ofrece repetir la mía
function conflict(op,cur){const mine=op.to&&idx[op.to]?idx[op.to].p.name:null,theirs=cur&&idx[cur]?idx[cur].p.name:null;
 toast(`${trajeName(op.slot)}: ${theirs?'alguien eligió «'+theirs+'»':'alguien lo cambió'}. Se conservó su opción.`,mine?{label:'Usar la mía',fn:()=>enqueue({code:op.code,slot:op.slot,to:op.to,exp:cur,kind:'set'})}:null)}
addEventListener('online',()=>{paintSync();flush()});addEventListener('offline',paintSync);setInterval(()=>{if(PEND.length)flush()},15000);

/* --- catálogo, inventario, plan e historial en vivo --- */
function maybeApplyCatalog(){if(!catSnap||!metaCat)return;const gen=metaCat.generated||null;if(F.length&&gen&&gen===curGen)return;
 const L=[];catSnap.forEach(d=>L.push(d.data()));if(!L.length)return;L.sort((a,b)=>(a.order||0)-(b.order||0));
 F=L.map(({order,updatedAt,vids,...f})=>f);curGen=gen;META.generated=gen||META.generated;Object.keys(portraitCache).forEach(k=>delete portraitCache[k]);buildData();render(true)}
function maybeApplyInventory(){if(!instSnap||!metaInst)return;const m={...metaInst};delete m.updatedAt;
 if(INV&&stable(INV.meta)===stable(m))return;const fs={};instSnap.forEach(d=>{const v=d.data();fs[d.id]={slots:v.slots||{}}});if(!Object.keys(fs).length)return;
 INV={meta:m,fighters:fs};Object.keys(portraitCache).forEach(k=>delete portraitCache[k]);render(true)}
const ts=v=>v&&v.toMillis?v.toMillis():null;
async function startDb(){if(!FBCFG){paintSync();return}
 try{const f=await fb(),sub=(ref,ok)=>f.onSnapshot(ref,ok,e=>dbErr(e,true));
  sub(f.doc(f.db,'meta','catalog'),s=>{metaCat=s.exists()?s.data():null;maybeApplyCatalog()});
  sub(f.collection(f.db,'catalog'),s=>{catSnap=s;maybeApplyCatalog()});
  sub(f.doc(f.db,'meta','installed'),s=>{metaInst=s.exists()?s.data():null;maybeApplyInventory()});
  sub(f.collection(f.db,'installed'),s=>{instSnap=s;maybeApplyInventory()});
  sub(f.collection(f.db,'status'),s=>{STATUS={};s.forEach(d=>{const v=d.data();STATUS[v.vid||d.id]=v})});
  sub(f.collection(f.db,'changes'),s=>{const m={};s.forEach(d=>{const v=d.data();m[d.id]={vid:v.vid,by:v.by,at:ts(v.at)}});PLAN=m;LS('ssbu_plan_cache',JSON.stringify(m));
   dbState='ok';syncErr=null;paintSync();render(true);if(!planLoaded){planLoaded=true;migrateLocal()}flush()});
  sub(f.query(f.collection(f.db,'history'),f.orderBy('at','desc'),f.limit(40)),s=>{HIST=[];s.forEach(d=>{const v=d.data();HIST.push({code:v.code,slot:v.slot,from:v.from,to:v.to,kind:v.kind,t:ts(v.at)})})})
 }catch(e){dbErr(e,true)}}

/* --- migración: selecciones del modelo anterior guardadas en este dispositivo → propuestas del plan --- */
function migrateLocal(){if(LS('ssbu_mig3'))return;LS('ssbu_mig3','1');
 const old=J('ssbu_sel_v2',null);if(!old)return;let n=0;
 Object.entries(old).forEach(([k,v])=>{if(!v||v.slot==null)return;const vid=legacyMap[k],code=k.split(':')[0],f=byCode[code];
  if(!vid||!f||f.mii||planVid(code,v.slot))return;PEND.push({code,slot:v.slot,to:vid,exp:null,kind:'set'});n++});
 if(n){savePend();render(true);toast(`Recuperamos ${n} elecci${n>1?'ones':'ón'} de este dispositivo`);flush()}}

/* ============================ arranque ============================ */
PLAN=J('ssbu_plan_cache',{});
addEventListener('popstate',()=>{if(skip){skip--;return}if(ovs.length){hideOv(ovs.pop());return}onRoute()});
addEventListener('hashchange',()=>{if(ovs.length)return;onRoute()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&ovs[ovs.length-1]==='dlg')closeDlg()});
if(!FBCFG){if(!LS('ssbu_mig3'))planLoaded=true}
onRoute(true);paintSync();startDb();if(!FBCFG)migrateLocal();
