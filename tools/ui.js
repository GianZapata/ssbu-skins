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
/* ---- componentes reutilizables: iconos, botones, etiquetas y avisos (mismo aspecto en toda la web) ---- */
const IC={search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',back:'<path d="M15 5l-7 7 7 7"/>',more:'<circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>',
 people:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',grid:'<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
 swap:'<path d="M7 7h12l-3-3M17 17H5l3 3"/>',pad:'<path d="M6 8h12a3 3 0 013 3v3a3 3 0 01-5.2 2L14 14h-4l-1.8 2A3 3 0 013 14v-3a3 3 0 013-3z"/><path d="M8 11v2M7 12h2"/>',
 image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',retry:'<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 4v7h-7"/>',zoom:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M11 8v6M8 11h6"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>',share:'<path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 13v6h14v-6"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1-1.5 2M12 17v.01"/>',
 undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',check:'<path d="M5 12l5 5 9-10"/>',plus:'<path d="M12 5v14M5 12h14"/>',wrench:'<path d="M14 6a4 4 0 005 5l-9 9a2.5 2.5 0 01-4-4l9-9"/>',close:'<path d="M6 6l12 12M18 6L6 18"/>'};
const icon=(n,c='')=>`<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${IC[n]||''}</svg>`;
const Pill=(t,k='')=>`<span class="pill ${k}">${esc(t)}</span>`;
const Btn=(label,{k='',ic='',attrs=''}={})=>`<button class="btn ${k}" ${attrs}>${ic?icon(ic):''}<span>${esc(label)}</span></button>`;
const LinkBtn=(label,h,{k='',ic='',ext=false}={})=>`<a class="btn ${k}" href="${esc(h)}"${ext?' target="_blank" rel="noopener"':''}>${ic?icon(ic):''}<span>${esc(label)}</span></a>`;
const Note=(title,body,k='')=>`<div class="note ${k}"><b>${esc(title)}</b>${body}</div>`;
const Empty=(ic,title,sub='')=>`<div class="empty">${icon(ic,'big')}<b>${esc(title)}</b>${sub?`<p>${sub}</p>`:''}</div>`;
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
const S={fq:'',cat:SSBU.migrateCat(J('ssbu_cat',null)),tc:SSBU.emptyCat(),shown:PAGE,nav:0,fresh:true,dest:null,destFor:null,galI:0,mode:'galeria',cand:null};
let RT=null,lastHash=null;const scrollMem={};
const keyOf=SSBU.keyOf;
const SENT={};
function planCtx(){return {PLAN,SENT,PEND,byCode,now:Date.now()}}
function planVid(code,n){return SSBU.planVid(code,n,planCtx())}
function planEntries(){return SSBU.planEntries(planCtx())}
const changesOf=code=>planEntries().filter(e=>e.code===code);
function proposedMap(){const m={};planEntries().forEach(e=>(m[e.vid]=m[e.vid]||[]).push(e));return m}
function curOf(code,n){return SSBU.curOf(code,n,{byCode,INV,idx})}
const initials=SSBU.initials;
const Avatar=(f,cls='')=>`<span class="im av ${cls}">${f.portrait?`<img src="${esc(f.portrait)}" alt="" decoding="async">`:`<span class="mono" aria-hidden="true">${esc(initials(f.name))}</span>`}</span>`;
const cond=p=>[p.conditions,p.deps&&('Necesita: '+p.deps),...(p.conflicts?p.conflicts.split(' · ').filter(c=>!/^choca con propuestas principales/.test(c)):[])].filter(Boolean);
function isAlt(p){return SSBU.isAlt(p)}
function onlineOf(p){return SSBU.onlineOf(p)}
function onlineShort(p){const [k,lab]=onlineOf(p);const map={'Online: lo declara el autor':'Online · autor','Online: con condiciones':'Online · condiciones','Online: según terceros':'Online · terceros','Online: sin datos':'Online · sin datos','Incompatible online':'Incompatible','Sin auditar':'Sin auditar'};return [k,map[lab]||lab]}
function smallSrc(p){if(!p)return null;if(p.srcset){const part=p.srcset.split(',')[0].trim().split(/\s+/)[0];if(part)return part}return p.img||null}

/* ============================ imágenes ============================ */
function ph(kind){return kind==='original'?`<span class="noimg" role="img" aria-label="Original del juego">${icon('pad')}</span>`:kind==='pending'?`<span class="noimg" role="img" aria-label="Sin foto del traje">${icon('image')}</span>`:`<span class="noimg" role="img" aria-label="Sin imagen">${icon('image')}<small>Sin imagen</small></span>`}
function imBox(src,alt,o={}){const {kind,cls='',srcset,eager,orig}=o;
 return `<span class="im ${cls}${kind==='original'&&src?' av':''}">${src?`<img src="${esc(src)}"${srcset?` srcset="${esc(srcset)}" sizes="${SIZES}"`:''}${orig?` data-orig="${esc(orig)}"`:''} alt="${esc(alt)}" ${eager?'':'loading="lazy" '}decoding="async">`:ph(kind)}</span>`}
// una imagen que falla se sustituye por un aviso con «Reintentar» (nunca un rectángulo vacío)
document.addEventListener('error',e=>{const t=e.target;if(!t||t.tagName!=='IMG'||(t.closest('.pswp')&&!t.closest('.pswp__thumbs')))return;
 const s=t.currentSrc||t.src;if(!t.dataset.src0)t.dataset.src0=t.getAttribute('src');
 if(!t.dataset.fb&&s.includes('/530-90_')){t.dataset.fb='1';t.removeAttribute('srcset');t.removeAttribute('sizes');t.src=s.replace('/530-90_','/220-90_');return}
 if(!t.dataset.origTried&&t.dataset.orig&&t.getAttribute('src')!==t.dataset.orig){t.dataset.origTried='1';t.removeAttribute('srcset');t.removeAttribute('sizes');t.src=t.dataset.orig;return}
 const box=t.parentElement,alt=t.alt,src0=t.dataset.src0;t.remove();
 if(box.closest('a,button')){box.insertAdjacentHTML('beforeend',`<span class="noimg" role="img" aria-label="La imagen no cargó">${icon('retry')}<small>No cargó</small></span>`);return}
 box.insertAdjacentHTML('beforeend',`<button class="noimg" data-retry="${esc(src0)}" data-alt="${esc(alt)}" aria-label="La imagen no cargó. Reintentar">${icon('retry')}<small>Reintentar</small></button>`)},true);
document.addEventListener('click',e=>{const b=e.target.closest('[data-retry]');if(!b)return;e.preventDefault();e.stopPropagation();
 const box=b.parentElement,src=b.dataset.retry,alt=b.dataset.alt;b.remove();
 const im=new Image();im.alt=alt;im.decoding='async';im.dataset.src0=src;im.dataset.fb='1';im.src=src+(src.startsWith('http')?(src.includes('?')?'&':'?')+'r='+Date.now():'');box.appendChild(im)},true);

/* ============================ avisos y hojas ============================ */
function toast(msg,act){const t=$('toast');const undo=act?`<button type="button" id="toastA">${esc(act.label)}</button>`:'';const plan=act&&act.plan?'<button type="button" data-toast="plan">Ver plan</button>':'';
 t.innerHTML=`<span>${esc(msg)}</span>${undo}${plan}`;t.classList.add('on');
 clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove('on'),act?9000:3500);if(act)$('toastA').onclick=()=>{t.classList.remove('on');act.fn()}}
$('toast').addEventListener('click',e=>{if(!e.target.closest('[data-toast="plan"]'))return;$('toast').classList.remove('on');go('#/cambios')});
const ovs=[];let skip=0,dlgOpener=null,afterOv=null;
function ovPush(id){ovs.push(id);try{history.pushState({ov:id},'')}catch(e){}}
function ovDone(id,then){const i=ovs.lastIndexOf(id);if(i<0)return false;ovs.splice(i,1);if(history.state&&history.state.ov===id){afterOv=then||null;skip++;history.back();return true}if(then)then();return true}
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
function parentOf(R){if(R.v==='ficha')return para(R.q.para)?href.traje(para(R.q.para).code,para(R.q.para).n):'#/catalogo';return '#/luchadores'}
$('back').onclick=()=>{if(S.nav>0)history.back();else go(parentOf(RT),true)};
function viewId(R){if(!R)return '';if(R.v==='luchador'||R.v==='traje')return 'fighter:'+R.code;if(R.v==='ficha')return 'ficha:'+R.vid;return R.v}
function slotOf(R){return R&&R.v==='traje'&&SSBU.validSlot(R.n)?R.n:0}
function onFighter(){return !!(RT&&(RT.v==='luchador'||RT.v==='traje')&&byCode[RT.code]&&!byCode[RT.code].mii)}
function canPatch(){const el=document.querySelector('main [data-view]');return !!(el&&el.getAttribute('data-view')===viewId(RT))}
function captureFocus(){const el=document.activeElement;const base={scroll:scrollY,galI:S.galI};if(!el||el===document.body||el===document.documentElement)return base;return {id:el.id||'',slot:el.dataset?el.dataset.slot||'':'',start:typeof el.selectionStart==='number'?el.selectionStart:null,end:typeof el.selectionEnd==='number'?el.selectionEnd:null,...base}}
function restoreFocus(s){if(!s)return;S.galI=s.galI;let el=s.id?document.getElementById(s.id):null;if(!el&&s.slot)el=document.querySelector('[data-slot="'+s.slot+'"]');if(el&&el.focus){try{el.focus({preventScroll:true})}catch(e){}if(s.start!=null&&el.setSelectionRange){try{el.setSelectionRange(s.start,s.end)}catch(e){}}}if(typeof s.scroll==='number')scrollTo(0,s.scroll)}
function draw(){const R=RT;({luchadores:vFighters,luchador:vFighter,traje:vFighter,catalogo:vCatalog,ficha:vFicha,cambios:vChanges}[R.v]||vFighters)(R);paintTabs()}
function render(keep){if(!RT)return;if(keep&&canPatch()){paintLive();return}const snap=keep?captureFocus():null;draw();if(snap)restoreFocus(snap)}
function rebuild(){const snap=captureFocus();const el=document.querySelector('main [data-view]');if(el)el.setAttribute('data-view','');draw();restoreFocus(snap)}
function onRoute(force){if(!force&&location.hash===lastHash)return;const fresh=S.fresh;S.fresh=false;
 if(RT)scrollMem[RT.key]=scrollY;const prev=viewId(RT);const prevR=RT;lastHash=location.hash;S.nav=Math.max(0,S.nav+(fresh?1:-1));
 RT=parse();RT.key=location.hash||'#/luchadores';
 const prevF=prevR&&(prevR.v==='luchador'||prevR.v==='traje')?prevR.code:null;
 const nextF=(RT.v==='luchador'||RT.v==='traje')?RT.code:null;
 if(nextF&&prevF&&prevF!==nextF){S.tc=SSBU.emptyCat();S.cand=null;S.galI=0;S.mode='galeria'}
 if(prev&&prev===viewId(RT)&&canPatch()){paintLive();return}
 render(false);scrollTo(0,fresh?0:(scrollMem[RT.key]||0));try{$('ttl').focus({preventScroll:true})}catch(e){}}
function measureNav(){const n=document.querySelector('nav.tabs');if(n&&n.offsetHeight){const h=n.offsetHeight-parseFloat(getComputedStyle(n).paddingBottom||0);document.documentElement.style.setProperty('--navh',h+'px')}const top=document.querySelector('.top');if(top&&top.offsetHeight)document.documentElement.style.setProperty('--bar',top.offsetHeight+'px')}
if(window.ResizeObserver){const ro=new ResizeObserver(measureNav);const tabs=document.querySelector('nav.tabs'),top=document.querySelector('.top');if(tabs)ro.observe(tabs);if(top)ro.observe(top)}addEventListener('resize',measureNav);addEventListener('orientationchange',()=>setTimeout(measureNav,200));
function paintTabs(){const n=planEntries().length;document.querySelectorAll('#tabN,#tabN2').forEach(b=>{b.hidden=!n;b.textContent=String(n)});
 const tab={luchadores:'luchadores',luchador:'luchadores',traje:'luchadores',catalogo:'catalogo',ficha:'catalogo',cambios:'cambios'}[RT&&RT.v];
 document.querySelectorAll('nav.tabs a, nav.desk a').forEach(a=>a.getAttribute('data-tab')===tab?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'))}
function paintLive(){paintTabs();if(!RT)return;
 if(RT.v==='luchadores'){paintFighterCounts();return}
 if(RT.v==='luchador'||RT.v==='traje'){const f=byCode[RT.code];if(!f||f.mii)return;paintSum(f);paintSlots(f);paintStage();paintCatBadges();return}
 if(RT.v==='catalogo'){paintCatBadges();return}
 if(RT.v==='ficha'){const e=idx[RT.vid];const box=$('usebox');if(e&&box)box.innerHTML=useBox(e.f,e.p,para(RT.q.para));return}
 if(RT.v==='cambios'){paintChanges();return}}

const FILTERS=[['rec','Recomendadas'],['autor_explicito','Declarada por el autor'],['autor_condicionado','Con condiciones'],['tercero','Según terceros'],['sin_evidencia','Sin evidencia'],['incompatible','Incompatible'],['unaudited','Sin auditar'],['avail','Disponibles']];
function filtersOn(st){return !!(st&&(st.q||st.f||SSBU.FILTER_KEYS.some(k=>st[k])))}
function activeHtml(st){return FILTERS.filter(([k])=>st[k]).map(([k,lab])=>`<button type="button" class="chip on" data-off="${k}" aria-label="Quitar filtro ${esc(lab)}">${esc(lab)}</button>`).join('')}
function originLine(c){if(!c)return '';if(c.kind==='original')return 'Original del juego. No está comprobado en la consola.';if(c.kind==='pending')return 'Retrato en el inventario, nombre pendiente. No está comprobado en la consola.';if(c.kind==='unknown')return 'Hay un mod en el inventario y no se pudo identificar.';if(c.kind==='na')return 'Sin trajes de este tipo.';return (c.badge?c.badge+' · ':'')+'Inventario revisado. No está comprobado en la consola.'}

function fTile(f){const n=changesOf(f.code).length;
 return `<a class="ft ${n?'has':''}" href="${href.fighter(f.code)}" aria-label="${esc(f.name)}${n?`, ${n} ${n>1?'propuestas':'propuesta'}`:''}">${n?`<span class="cnt" aria-hidden="true">${n}</span>`:''}${Avatar(f)}<b>${esc(f.name)}</b></a>`}
function fList(){const q=norm(S.fq);return F.filter(f=>!q||norm(f.name).includes(q)).map(fTile).join('')}
function vFighters(){head('Luchadores',false);const h=fList();
 const list=F.length?`<div class="fgrid" id="fg">${h}</div><div id="fe" ${h?'hidden':''}>${Empty('search','Ningún luchador con ese nombre','Prueba con otra parte del nombre.')}</div>`:`<div class="fgrid" id="fg" aria-busy="true">${'<span class="ft sk"></span>'.repeat(9)}<span class="sr">Cargando luchadores</span></div><div id="fe" hidden></div>`;
 $('main').innerHTML=`<div data-view="luchadores"><div class="search">${icon('search')}<input id="fq" type="search" placeholder="Buscar luchador" value="${esc(S.fq)}" autocomplete="off" enterkeyhint="search" aria-label="Buscar luchador"></div>${list}</div>`}
function paintFighterCounts(){document.querySelectorAll('.ft').forEach(a=>{const hrefA=a.getAttribute('href')||'';const code=decodeURIComponent(hrefA.split('/').pop());const n=changesOf(code).length;a.classList.toggle('has',!!n);let c=a.querySelector('.cnt');if(n&&!c)a.insertAdjacentHTML('afterbegin',`<span class="cnt" aria-hidden="true">${n}</span>`);else if(n&&c)c.textContent=n;else if(c)c.remove();const f=byCode[code];if(f)a.setAttribute('aria-label',f.name+(n?`, ${n} ${n>1?'propuestas':'propuesta'}`:''))})}

function slotBtn(f,n){const c=curOf(f.code,n)||{name:'',kind:'unknown',img:null};const pv=planVid(f.code,n);const pp=pv&&idx[pv]?idx[pv].p:null;const sel=slotOf(RT)===n;
 const name=pv?(pp?pp.name:'Apariencia ya no disponible'):c.name;const img=pv?(pp?smallSrc(pp):null):c.img;const prep=!!(c.staged&&!pv);
 return `<button type="button" class="tj${pv?' chg':''}" role="radio" data-slot="${n}" aria-checked="${sel}" tabindex="${sel?0:-1}" aria-label="${trajeName(n)}, ${techName(n)}, ${esc(name)}${pv?', con propuesta':''}${prep?', en preparación':''}"><span class="imwrap">${imBox(img,name,{kind:pv?null:c.kind})}</span><span class="tj-tx"><span class="tj-h"><b>${trajeName(n)}</b><small>${techName(n)}</small></span><span class="nm">${esc(name)}</span>${pv?'<span class="stg">Propuesta</span>':''}${prep?'<span class="stg">En preparación</span>':''}</span></button>`}
function paintSlots(f){const el=$('slots');if(!el)return;const had=document.activeElement&&el.contains(document.activeElement);el.innerHTML=[0,1,2,3,4,5,6,7].map(i=>slotBtn(f,i)).join('');if(had){const b=el.querySelector('[aria-checked="true"]');if(b)b.focus()}}
function paintSum(f){const el=$('sum');if(!el)return;const n=changesOf(f.code).length;el.textContent=f.mii?'Sin trajes de este tipo':n+' de 8 trajes con propuesta'}
function selectSlot(n){if(!RT||!byCode[RT.code])return;S.cand=null;S.galI=0;const h=href.traje(RT.code,n);if((location.hash||'#/luchadores')===h){paintLive();return}S.fresh=true;location.hash=h.slice(1)}
function bigImg(src,alt,kind){return imBox(src,alt,{kind,cls:'c',eager:true})}
function galleryBody(c,cand){if(!cand)return `<div class="cur">${bigImg(c.img,c.name,c.kind)}<div><em>Actual</em><b class="nm">${esc(c.name)}</b>${c.badge?Pill(c.badge):''}${c.staged?Pill('En preparación','b'):''}<p class="mu sm">${esc(originLine(c))}</p></div></div>`;
 const imgs=imgsOf(cand);const i=Math.min(S.galI,Math.max(imgs.length-1,0));S.galI=imgs.length?i:0;
 const hero=imgs.length?`<button type="button" class="hero" data-gal="${i}" aria-label="Ampliar las fotos de ${esc(cand.name)}">${imBox(imgs[i].m,cand.name,{cls:'c',eager:true,orig:imgs[i].o})}<span class="zoom">${icon('zoom')}Ampliar</span><span class="n">${i+1} / ${imgs.length}</span></button>`:`<div class="hero"><span class="noimg" role="img" aria-label="Sin fotos">${icon('image')}<small>Este diseño no tiene fotos</small></span></div>`;
 const thumbs=imgs.length>1?`<div class="thumbs" role="group" aria-label="Fotos">${imgs.map((x,k)=>`<button type="button" data-thumb="${k}" aria-label="Foto ${k+1}" ${k===i?'aria-current="true"':''}><img src="${esc(x.s)}" data-orig="${esc(x.o)}" alt="" loading="lazy" decoding="async"></button>`).join('')}</div>`:'';
 const [oc,ol]=onlineShort(cand);
 return `${hero}${thumbs}<h2 class="ttl2">${esc(cand.name)}</h2><p class="mu by">por ${esc(cand.author)}</p><p class="pl">${Pill(ol,oc)}</p>${cand.pack?`<div class="note b"><b>Paquete compartido</b>Las fotos pueden mostrar otros luchadores del paquete: ${esc(cand.pack.with.join(', '))}.</div>`:''}`}
function compareBody(n,c,pv,pp,cand){const right=cand||(pv?pp:null);const rightName=cand?cand.name:(pv?(pp?pp.name:'Apariencia ya no disponible'):'');
 if(!pv&&!cand)return `<div class="cur">${bigImg(c.img,c.name,c.kind)}<div><em>Actual</em><b>${esc(c.name)}</b><p class="mu sm">${esc(originLine(c))}</p></div></div><p class="note">No hay propuesta para este traje.</p>`;
 const label=cand?'Elegida':'Propuesta';const img=cand?smallSrc(cand):(pp?smallSrc(pp):null);
 const warn=cand&&pv&&cand.vid!==pv?`<p class="note y" role="status">Reemplazar la propuesta quita «${esc(pp?pp.name:'la anterior')}» de este traje. No mueve las demás.</p>`:'';
 const who=cand||pp;const conds=who&&cond(who).length?`<div class="note y"><b>Condiciones</b>${cond(who).map(esc).join('<br>')}</div>`:'';
 const native=who&&who.native&&who.native.length&&!who.native.includes(n)?`<p class="note y" role="status">El mod trae los trajes ${who.native.map(x=>x+1).join(', ')}. En el ${trajeName(n)} hay que moverlo y no está comprobado.</p>`:'';
 return `<div class="cmp2"><div class="card2"><em>Actual</em>${bigImg(c.img,c.name,c.kind)}<b>${esc(c.name)}</b><p class="mu sm">${esc(originLine(c))}</p></div><div class="card2 prop"><em>${label}</em>${bigImg(img,rightName,null)}<b>${esc(rightName)}</b>${who?Pill(onlineShort(who)[1],onlineShort(who)[0]):''}</div></div>${warn}${conds}${native}`}
function actionsHtml(f,n,pv,pp,cand){const planLink=changesOf(f.code).length?LinkBtn('Revisar plan','#/cambios',{ic:'swap'}):'';
 if(cand){const block=SSBU.assignBlock(planEntries(),f.code,n,cand.vid);
  if(block.kind==='duplicate')return `<div class="note y" role="status"><b>Ya está en el ${trajeName(block.other)}</b>Esta apariencia no se duplica en otro traje. Elige otra, o revisa la que ya está.</div><div class="acts">${Btn('Ver '+trajeName(block.other),{k:'p',attrs:`data-goto-slot="${block.other}"`})}${Btn('Elegir otra',{attrs:'data-clear-cand="1"'})}</div>`;
  if(block.kind==='same')return `<div class="acts">${Btn('Quitar propuesta',{k:'p',ic:'undo',attrs:`data-undo="${keyOf(f.code,n)}"`})}${planLink}</div>`;
  const label=block.kind==='replace'?'Reemplazar propuesta · '+trajeName(n):'Agregar al plan · '+trajeName(n);
  const warn=block.kind==='replace'?`<p class="note y" role="status">${trajeName(n)} ya tiene una propuesta${pp?': '+esc(pp.name):''}. Si sigues, la reemplazas.</p>`:'';
  const before=cond(cand).length?`<div class="note y"><b>Antes de agregar</b>${cond(cand).map(esc).join('<br>')}</div>`:'';
  return `${warn}${before}<div class="acts">${Btn(label,{k:'p',ic:'check',attrs:'data-add="1"'})}${planLink}</div>`}
 if(pv)return `<div class="acts">${Btn('Quitar propuesta',{ic:'undo',attrs:`data-undo="${keyOf(f.code,n)}"`})}${Btn('Explorar skins',{k:'p',attrs:'data-explore="1"'})}${planLink}</div>`;
 return `<div class="acts">${Btn('Explorar skins',{k:'p',attrs:'data-explore="1"'})}</div>`}
function stageHtml(){const f=byCode[RT.code];const n=slotOf(RT);const c=curOf(f.code,n)||{kind:'unknown',name:'Sin identificar',img:null};const pv=planVid(f.code,n);const pp=pv&&idx[pv]?idx[pv].p:null;const cand=S.cand&&idx[S.cand]?idx[S.cand].p:null;const mode=S.mode==='comparar'?'comparar':'galeria';
 const modes=`<div class="modes" role="radiogroup" aria-label="Modo de visualización"><button type="button" role="radio" data-mode="galeria" aria-checked="${mode==='galeria'}" tabindex="${mode==='galeria'?0:-1}">Galería</button><button type="button" role="radio" data-mode="comparar" aria-checked="${mode==='comparar'}" tabindex="${mode==='comparar'?0:-1}">Comparar</button></div>`;
 const body=mode==='comparar'?compareBody(n,c,pv,pp,cand):galleryBody(c,cand);
 return `<p class="mu sm" id="slotLabel">${trajeName(n)} · ${techName(n)}</p>${modes}${body}${provenance(c)}${actionsHtml(f,n,pv,pp,cand)}`}
function paintStage(){const el=$('stage');if(!el)return;const active=document.activeElement;const mode=active&&active.dataset&&active.dataset.mode;const inside=!!(active&&el.contains(active));el.innerHTML=stageHtml();if(mode){const b=el.querySelector(`[data-mode="${mode}"]`);if(b)b.focus();return}if(inside){const b=el.querySelector('[data-gal]')||el.querySelector('[aria-checked="true"]');if(b)b.focus()}}
function vFighter(R){const f=byCode[R.code];if(!f){head('Luchador',true);$('main').innerHTML=Empty('search','No encontramos ese luchador');return}
 if(f.mii){if(R.v==='traje'){go(href.fighter(f.code),true);return}head(f.name,true);$('main').innerHTML=`<div data-view="${viewId(R)}"><div class="fh">${Avatar(f)}<div><h2>${esc(f.name)}</h2><p class="sum" id="sum">Sin trajes de este tipo</p></div></div>${Note('Trajes Mii','Estos luchadores no usan los ocho trajes habituales, así que aquí no se proponen cambios.')}</div>`;return}
 head(f.name,true);
 $('main').innerHTML=`<div data-view="${viewId(R)}" class="fighter"><div class="fh">${Avatar(f)}<div><h2>${esc(f.name)}</h2><p class="sum" id="sum"></p></div></div><div class="work"><div class="tgrid" id="slots" role="radiogroup" aria-label="Trajes de ${esc(f.name)}"></div><div class="stage-col"><div id="stage"></div><div id="explore"><h2 class="sec">Skins</h2>${catBlock(catSt(),false)}</div></div></div></div>`;
 paintSum(f);paintSlots(f);paintStage();catWatch(catCtx())}

const trajeCtx=R=>({code:R.code,n:slotOf(R),raw:keyOf(R.code,slotOf(R))});
function provenance(c){return `<details class="prov"><summary>Procedencia y verificación</summary><div class="dl"><p>${esc(c.verif||'')}</p>
  ${c.badge?`<p><b>Origen:</b> ${esc(c.badge)}${c.version?` · versión ${esc(c.version)}`:''}${c.author?` · ${esc(c.author)}`:''}</p>`:''}
  ${c.url?`<p><a href="${esc(c.url)}" target="_blank" rel="noopener">Página del mod</a></p>`:''}
  ${c.staged?`<p><b>En preparación (sin confirmar):</b> ${c.staged.name?esc(c.staged.name):'una skin sin nombre'} · rama ${esc(c.staged.branch)}. Está en el repositorio del ModPack; no se ha comprobado que esté instalada.</p>`:''}</div></details>`}

function skinPills(p,where){const [oc,ol]=onlineShort(p);const pm=where||proposedMap()[p.vid]||[];
 return `<span class="pl"><span class="pill ${oc}">${esc(ol)}</span>${!isAlt(p)?'<span class="pill y">Recomendada</span>':''}${p.variant?'<span class="pill">Variante</span>':''}${p.pack?'<span class="pill b">Paquete</span>':''}${p.withdrawn?'<span class="pill r">Retirada</span>':''}${p.mii?'<span class="pill">Mii</span>':''}${pm.map(x=>`<span class="pill y" data-prop="1">En ${trajeName(x.n)}</span>`).join('')}</span>`}
function cCard(e,i){const p=e.p;return `<a class="cd" data-vid="${esc(p.vid)}" href="${href.ficha(p.vid,null)}" aria-label="${esc(p.name)}, ${esc(e.f.name)}">${imBox(p.img,p.name,{srcset:p.srcset,eager:i<2})}<span class="tx"><span class="nm">${esc(p.name)}</span><span class="fg">${esc(e.f.name)}</span>${skinPills(p)}</span></a>`}
function skinCard(e,i){const p=e.p;const on=S.cand===p.vid;return `<article class="cd${on?' on':''}" data-vid="${esc(p.vid)}"><button type="button" class="skin" data-skin="${esc(p.vid)}" aria-pressed="${on}" aria-label="Elegir apariencia ${esc(p.name)}">${imBox(smallSrc(p)||p.img,p.name,{srcset:p.srcset,eager:i<2})}<span class="tx"><span class="nm">${esc(p.name)}</span><span class="fg">${esc(p.author||e.f.name)}</span>${skinPills(p)}</span><span class="picklab">${on?'Elegida':'Elegir apariencia'}</span></button><a class="mas" href="${href.ficha(p.vid,{raw:keyOf(e.f.code,slotOf(RT))})}">Más información</a></article>`}
function catList(ctx,st){return SSBU.catList(all,ctx,st||S.cat)}
function catBlock(st,withFighter){return `<div class="search">${icon('search')}<input id="cq" type="search" placeholder="Buscar apariencia" value="${esc(st.q)}" autocomplete="off" enterkeyhint="search" aria-label="Buscar apariencia"></div>
 ${withFighter?`<select class="sel" id="cf" aria-label="Luchador"><option value="">Todos los luchadores</option>${F.map(f=>`<option value="${esc(f.code)}"${f.code===st.f?' selected':''}>${esc(f.name)}</option>`).join('')}</select>`:''}
 <div class="filterbar">${Btn('Filtros',{attrs:'data-filters="1" aria-haspopup="dialog"'})}${Btn('Limpiar filtros',{k:'g',attrs:'data-clear-filters="1"'})}</div>
 <div class="chips" id="activeChips" aria-label="Filtros activos">${activeHtml(st)}</div>
 <p class="mu sm" id="cc" aria-live="polite"></p><div class="cgrid" id="cg"></div><div id="ce" hidden>${Empty('search','Ninguna apariencia coincide','Prueba con otras palabras o quita un filtro.')}<div class="acts">${Btn('Limpiar filtros',{k:'p',attrs:'data-clear-filters="1"'})}</div></div><button type="button" class="more" id="cm" hidden></button><div id="cs" style="height:1px"></div>`}
function catSt(){return onFighter()?S.tc:S.cat}
function catCtx(){return onFighter()?trajeCtx(RT):null}
function catGrid(ctx){const st=catSt();const l=catList(ctx,st);const box=$('cg');if(!box)return l;
 box.innerHTML=l.slice(0,S.shown).map((e,i)=>ctx?skinCard(e,i):cCard(e,i)).join('');
 if($('cc'))$('cc').textContent=l.length+' apariencia'+(l.length===1?'':'s');
 if($('ce')){$('ce').hidden=!!l.length;const b=$('ce').querySelector('[data-clear-filters]');if(b)b.hidden=!filtersOn(st)}
 document.querySelectorAll('.filterbar [data-clear-filters]').forEach(b=>{b.hidden=!filtersOn(st)});
 if($('cm')){$('cm').hidden=l.length<=S.shown;$('cm').textContent='Ver más ('+Math.max(l.length-S.shown,0)+')'}
 const ac=$('activeChips');if(ac)ac.innerHTML=activeHtml(st);return l}
let catObs=null;
function catWatch(ctx){S.shown=PAGE;catGrid(ctx);if(catObs)catObs.disconnect();
 catObs=new IntersectionObserver(es=>{if(es[0]&&es[0].isIntersecting&&RT&&(RT.v==='catalogo'||RT.v==='traje'||RT.v==='luchador')&&$('cm')&&!$('cm').hidden){S.shown+=PAGE;catGrid(catCtx())}},{rootMargin:'600px'});if($('cs'))catObs.observe($('cs'))}
function vCatalog(R){const old=para(R.q.para);if(old){location.replace(href.traje(old.code,old.n));return}
 if(R.q.f!==undefined&&!R._applied){R._applied=1;S.cat.f=R.q.f;S.cat.q='';LS('ssbu_cat',JSON.stringify(S.cat))}
 head('Catálogo',false);$('main').innerHTML=`<div data-view="catalogo">${catBlock(S.cat,true)}</div>`;catWatch(null)}
function saveCat(){if(!onFighter())LS('ssbu_cat',JSON.stringify(S.cat))}
function paintCatBadges(){const pm=proposedMap();document.querySelectorAll('#cg .cd').forEach(el=>{const vid=el.dataset.vid;if(!vid)return;const pl=el.querySelector('.pl');if(!pl)return;pl.querySelectorAll('[data-prop]').forEach(x=>x.remove());(pm[vid]||[]).forEach(x=>pl.insertAdjacentHTML('beforeend',`<span class="pill y" data-prop="1">En ${trajeName(x.n)}</span>`))})}
function openFilters(){const st=catSt();const chips=FILTERS.map(([k,lab])=>`<button type="button" class="chip" data-chip="${k}" aria-pressed="${!!st[k]}">${esc(lab)}</button>`).join('');
 openDlg('Filtros',`<p class="mu sm">La compatibilidad es la evidencia del catálogo, no una prueba en la consola.</p><div class="chips" role="group" aria-label="Filtros">${chips}</div><div class="acts">${Btn('Listo',{k:'p',attrs:'id="filtrosOk"'})}</div>`)}
function toggleFilter(key,btn){const st=catSt();if(!SSBU.FILTER_KEYS.includes(key))return;st[key]=!st[key];if(btn)btn.setAttribute('aria-pressed',String(!!st[key]));S.shown=PAGE;saveCat();catGrid(catCtx())}
function clearFilters(){const st=catSt();const fresh=SSBU.emptyCat();Object.keys(st).forEach(k=>{delete st[k]});Object.assign(st,fresh);S.shown=PAGE;saveCat();const q=$('cq');if(q)q.value='';const sel=$('cf');if(sel)sel.value='';document.querySelectorAll('#dlg [data-chip]').forEach(b=>b.setAttribute('aria-pressed','false'));catGrid(catCtx())}

function imgsOf(p){return p.g&&p.g.length?p.g.map(f=>({o:gU(f,'o'),m:gU(f,'m'),s:gU(f,'s')})):(p.img?[{o:p.img,m:p.img,s:p.img}]:[])}
function destTile(f,n,sel){const c=curOf(f.code,n),pv=planVid(f.code,n),pp=pv&&idx[pv]?idx[pv].p:null;
 return `<button type="button" data-dest="${n}" aria-pressed="${sel===n}" class="${pv?'has':''}" aria-label="${trajeName(n)}, ${techName(n)}, ahora ${esc(c.name)}${pv?', ya tiene una propuesta':''}">${imBox(pv&&pp?smallSrc(pp):c.img,c.name,{kind:c.kind})}<span>${n+1}<small> ${techName(n)}</small></span></button>`}
function vFicha(R){const e=idx[R.vid];
 if(!e){head('Apariencia',true);$('main').innerHTML=`<div data-view="${viewId(R)}">${Empty('search','Esta apariencia ya no está en el catálogo')}</div>`;return}
 const {f,p}=e,ctx=para(R.q.para),[oc,ol]=onlineOf(p),imgs=imgsOf(p);
 if(S.destFor!==R.key){S.destFor=R.key;S.dest=ctx?ctx.n:null;S.galI=0}
 head(f.name,true);
 const hero=imgs.length?`<button type="button" class="hero" data-gal="${S.galI}" aria-label="Ampliar las fotos de ${esc(p.name)}">${imBox(imgs[S.galI].m,p.name+' — foto '+(S.galI+1),{cls:'c',eager:true,orig:imgs[S.galI].o})}<span class="zoom">${icon('zoom')}Ampliar</span><span class="n">${S.galI+1} / ${imgs.length}</span></button>`:`<div class="hero"><span class="noimg" role="img" aria-label="Sin fotos">${icon('image')}<small>Este diseño no tiene fotos</small></span></div>`;
 const thumbs=imgs.length>1?`<div class="thumbs" role="group" aria-label="Fotos">${imgs.map((x,i)=>`<button type="button" data-thumb="${i}" aria-label="Foto ${i+1}" ${i===S.galI?'aria-current="true"':''}><img src="${esc(x.s)}" data-orig="${esc(x.o)}" alt="" loading="lazy" decoding="async"></button>`).join('')}</div>`:'';
 $('main').innerHTML=`<div data-view="${viewId(R)}">${hero}${thumbs}
 ${p.pack?`<div class="note b"><b>Paquete compartido</b>Este mod también trae diseños para ${esc(p.pack.with.join(', '))}. Las fotos muestran todo el paquete, no solo esta apariencia.</div>`:''}
 <h2 class="ttl2">${esc(p.name)}</h2><p class="mu by">por ${esc(p.author)} · fotos de la página del mod</p>
 <p class="pl">${isAlt(p)?Pill('Alternativa'):Pill('Recomendada','y')}${Pill(ol,oc)}${p.mii?Pill('Traje Mii'):''}</p>
 ${cond(p).length?`<div class="note y"><b>Condiciones</b>${cond(p).map(esc).join('<br>')}</div>`:''}
 ${p.variant?`<div class="note b"><b>Variante</b>${esc(p.variant)}</div>`:''}
 ${p.withdrawn?'<div class="note y"><b>Retirada</b>Esta apariencia se retiró del catálogo.</div>':''}
 <div id="usebox">${useBox(f,p,ctx)}</div>
 <details><summary>Detalles y fuentes</summary><div class="dl">
  ${p.wifi_quote?`<p class="q">«${esc(p.wifi_quote)}»</p>`:''}
  <p>${p.audited?`Estado online: ${esc(ol)}. Es una declaración registrada${p.wifi_source?` (${esc(p.wifi_source)})`:''}, no una prueba en tu consola.`:'Todavía no se ha revisado esta apariencia.'} ${p.wifi_source_url?`<a href="${esc(p.wifi_source_url)}" target="_blank" rel="noopener">Ver fuente</a>`:''}</p>
  ${p.dl!=null?`<p><b>Descargas:</b> ${p.dl.toLocaleString('es')}${p.rank?` · puesto ${p.rank} en su categoría`:''}${p.dlshared?' (contador compartido con otros luchadores)':''}${(p.downloads_scope||'').replace(/; puesto \d+/,'')?`<br><span class="mu sm">${esc((p.downloads_scope||'').replace(/; puesto \d+/,''))}</span>`:''}</p>`:''}
  ${p.images_scope?`<p><b>Fotos:</b> ${esc(p.images_scope)}; si el mod es un paquete pueden mostrar otros diseños.</p>`:''}
  ${p.audit_scope?`<p><b>Revisión:</b> ${esc(p.audit_scope)}</p>`:''}
  ${p.depkind?`<p><b>Dependencias:</b> ${esc(p.depkind)}</p>`:''}
  ${p.conflicts?`<p><b>Choques anotados:</b> ${esc(p.conflicts)}</p>`:''}
  <p><b>Slots originales del mod:</b> ${esc(p.slots_orig||'sin especificar')}</p>
  ${p.dest?`<p><b>Destino sugerido por el análisis:</b> ${esc(p.dest)} (solo orientativo: ese traje puede estar ocupado)</p>`:''}
  ${p.design?`<p><b>Diseño:</b> ${esc(p.design)}</p>`:''}
  <p><b>Compatibilidad:</b> ${esc(p.compat||'no verificada')} · ${esc(p.console_test||'sin prueba en consola')}</p>
  ${p.file_note?`<p><b>Archivos:</b> ${esc(p.file_note)}</p>`:''}${p.notes?`<p><b>Notas:</b> ${esc(p.notes)}</p>`:''}
  <p>${LinkBtn('Abrir en GameBanana',p.url,{ic:'share',ext:true})}</p>
  <p class="mu sm">Identificador: ${esc(p.vid)}</p></div></details></div>`}
function useBox(f,p,ctx){
 if(p.mii)return '<div class="note"><b>Traje Mii</b>Los Mii no usan los ocho trajes, así que esta apariencia no se puede asignar a un traje.</div>';
 if(p.withdrawn)return '<div class="note y"><b>Retirada</b>Esta apariencia ya no se puede agregar al plan.</div>';
 const sel=ctx?ctx.n:S.dest;const block=sel!=null?SSBU.assignBlock(planEntries(),f.code,sel,p.vid):null;
 const target=sel!=null?{c:curOf(f.code,sel),pv:planVid(f.code,sel)}:null;const tpp=target&&target.pv&&idx[target.pv]?idx[target.pv].p:null;
 let act;
 if(block&&block.kind==='duplicate')act=`<p class="note y" role="status">Esta apariencia ya está en el ${trajeName(block.other)}. No se duplica.</p><div class="acts">${LinkBtn('Ver '+trajeName(block.other),href.traje(f.code,block.other),{k:'p'})}</div>`;
 else if(block&&block.kind==='same')act=`<div class="acts">${Btn('Quitar propuesta',{k:'p',ic:'undo',attrs:`data-clear="${keyOf(f.code,sel)}"`})}</div>`;
 else{const label=sel==null?'Elige un traje':(block&&block.kind==='replace'?'Reemplazar propuesta · '+trajeName(sel):'Agregar al plan · '+trajeName(sel));
  act=`${block&&block.kind==='replace'?`<p class="note y" role="status">${trajeName(sel)} ya tiene una propuesta: <b style="display:inline">${esc(tpp?tpp.name:'otra apariencia')}</b>. Si sigues, la reemplazas.</p>`:''}<div class="acts">${Btn(label,{k:'p',ic:'check',attrs:`data-use="1" ${sel==null?'disabled':''}`})}</div>`}
 return `<h2 class="sec">${ctx?'Destino: '+trajeName(ctx.n):'¿En qué traje?'}</h2>
  ${ctx?'':`<div class="dest" role="group" aria-label="Elegir traje">${[0,1,2,3,4,5,6,7].map(n=>destTile(f,n,sel)).join('')}</div>`}
  ${target?`<div class="row2"><div class="card2"><em>${target.pv&&!(block&&block.kind==='same')?'Propuesta actual':'Actual'}</em>${imBox(target.pv&&tpp?smallSrc(tpp):target.c.img,'',{kind:target.c.kind})}<b>${esc(target.pv&&tpp?tpp.name:target.c.name)}</b></div><span class="arrow" aria-hidden="true">→</span><div class="card2 prop"><em>Nueva</em>${imBox(smallSrc(p),p.name,{})}<b>${esc(p.name)}</b></div></div>`:''}
  ${cond(p).length?`<div class="note y"><b>Antes de agregar</b>${cond(p).map(esc).join('<br>')}</div>`:''}
  ${act}
  ${sel!=null&&p.native&&p.native.length&&!p.native.includes(sel)?`<p class="note y" role="status">Este mod trae trajes para ${p.native.map(n=>n+1).join(', ')}. Usarlo en el ${trajeName(sel)} exige moverlo y no está comprobado.</p>`:''}`}

function changeRow(e){const f=byCode[e.code],c=curOf(e.code,e.n),pp=idx[e.vid]?idx[e.vid].p:null;
 const extra=pp&&cond(pp).length?`<p class="note y"><b>Condiciones</b>${cond(pp).map(esc).join('<br>')}</p>`:'';
 const miss=!pp?'<p class="note y">Esta apariencia ya no está en el catálogo.</p>':'';
 return `<div class="chg-row"><div class="hd"><span>${trajeName(e.n)}</span><small>${techName(e.n)}</small></div>
  <div class="row2"><div class="card2"><em>Inventario</em>${imBox(c.img,c.name,{kind:c.kind})}<b>${esc(c.name)}</b></div><span class="arrow" aria-hidden="true">→</span><div class="card2 prop"><em>Propuesta</em>${imBox(pp?smallSrc(pp):null,pp?pp.name:'',{})}<b>${esc(pp?pp.name:'Apariencia ya no disponible')}</b>${pp?Pill(onlineShort(pp)[1],onlineShort(pp)[0]):''}</div></div>
  ${extra}${miss}<div class="acts">${LinkBtn('Cambiar opción',href.traje(e.code,e.n),{k:'p',ic:'swap'})}${Btn('Quitar propuesta',{ic:'undo',attrs:`data-undo="${keyOf(e.code,e.n)}"`})}</div></div>`}
function recBanner(){const n=legacyItems().length;return n?`<div class="note b"><b>Elecciones de antes</b>Este dispositivo guardó ${n}. <button type="button" data-m="recover" class="btn g">Revisar</button></div>`:''}
function changesBody(){const es=planEntries();
 if(!es.length)return Empty('swap','Todavía no hay propuestas','Elige un luchador y un traje para agregar una apariencia al plan.')+`<div class="acts">${LinkBtn('Elegir luchador','#/luchadores',{k:'p',ic:'people'})}</div>`;
 const groups={};es.forEach(e=>(groups[e.code]=groups[e.code]||[]).push(e));const sync=syncInfo()[1];
 return `<p class="sum" id="planSum"><b>${es.length} ${es.length===1?'propuesta':'propuestas'}</b> · ${Object.keys(groups).length} ${Object.keys(groups).length===1?'luchador':'luchadores'}</p><p class="mu sm" id="planSync">Sincronización: ${esc(sync)}. Una propuesta guardada no está instalada en la consola.</p>`+Object.entries(groups).map(([code,l])=>{const f=byCode[code];return `<div class="grp">${Avatar(f,'sm')}<h2>${esc(f.name)}</h2></div>${l.map(changeRow).join('')}`}).join('')}
function vChanges(){head('Cambios',false);$('main').innerHTML=`<div data-view="cambios"><div class="acts">${Btn('Exportar plan',{k:'p',ic:'share',attrs:'data-export="1"'})}</div>${recBanner()}<div id="planBody">${changesBody()}</div></div>`}
function paintChanges(){const body=$('planBody');if(body)body.innerHTML=changesBody()}

function enqueue(op){PEND.push(op);savePend();paintSync();render(true);flush()}
const savePend=()=>LS('ssbu_pend3',JSON.stringify(PEND));
let toastSlot=null;
function toastProposal(n,saved){toastSlot=n;const body=saved?'El cambio se registró en el plan compartido. Todavía no se ha instalado en la consola.':'Quedó pendiente en este dispositivo. Todavía no se ha instalado en la consola.';toast('Propuesta agregada al Traje '+(n+1)+'. '+body,{label:'Deshacer',fn:undoLast,plan:true})}
function noteSaved(op){if(!op||op.to==null||toastSlot!==op.slot)return;const t=$('toast');if(!t.classList.contains('on')||!t.textContent.startsWith('Propuesta agregada'))return;toastProposal(op.slot,true)}
function proposeAt(code,n,vid){if(!SSBU.validSlot(n))return;const prev=planVid(code,n);const block=SSBU.assignBlock(planEntries(),code,n,vid);
 if(block.kind==='duplicate'){toast('Esa apariencia ya está en el '+trajeName(block.other)+'. Elige otra, o revisa ese traje.',{label:'Ver traje',fn:()=>go(href.traje(code,block.other))});return false}
 if(block.kind==='same'||block.kind==='bad-slot')return false;const op=SSBU.setOp(code,n,vid,prev);if(!op)return false;
 S.mode='comparar';S.cand=null;enqueue(op);lastAct={code,slot:n,from:prev,to:vid};buzz(15);toastProposal(n,false);return true}
function clearAt(code,n){const prev=planVid(code,n);const op=SSBU.clearOp(code,n,prev);if(!op)return;enqueue(op);lastAct={code,slot:n,from:prev,to:null};buzz(15);toast(trajeName(n)+' · '+byCode[code].name+': propuesta quitada.',{label:'Deshacer',fn:undoLast})}
function undoLast(){if(!lastAct)return;const a=lastAct;lastAct=null;enqueue({code:a.code,slot:a.slot,to:a.from,exp:a.to,kind:'undo'});toast('Deshecho')}
function undoKey(k){const i=k.lastIndexOf('_');clearAt(k.slice(0,i),+k.slice(i+1))}

/* --- clic en la zona principal --- */
function moveRadio(e){const keys=['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'];if(!keys.includes(e.key))return;
 const slot=e.target.closest&&e.target.closest('#slots');const mode=e.target.closest&&e.target.closest('.modes');const g=slot||mode;if(!g)return;
 const items=[...g.querySelectorAll('[role="radio"]')];const i=items.indexOf(document.activeElement);if(i<0)return;e.preventDefault();
 let n=e.key==='Home'?0:e.key==='End'?items.length-1:(e.key==='ArrowRight'||e.key==='ArrowDown')?(i+1)%items.length:(i-1+items.length)%items.length;
 if(slot)selectSlot(+items[n].dataset.slot);else{S.mode=items[n].dataset.mode;paintStage();const b=document.querySelector('.modes [aria-checked="true"]');if(b)b.focus()}}
$('main').addEventListener('click',e=>{const t=e.target;let b;
 if(b=t.closest('[data-m="recover"]')){e.preventDefault();showRecover();return}
 if(b=t.closest('[data-undo]')){e.preventDefault();undoKey(b.dataset.undo);return}
 if(b=t.closest('[data-clear]')){e.preventDefault();undoKey(b.dataset.clear);return}
 if(b=t.closest('[data-off]')){toggleFilter(b.dataset.off,null);return}
 if(b=t.closest('[data-clear-filters]')){clearFilters();return}
 if(b=t.closest('[data-filters]')){openFilters();return}
 if(b=t.closest('[data-export]')){showExport();return}
 if(b=t.closest('[data-slot]')){selectSlot(+b.dataset.slot);return}
 if(b=t.closest('[data-mode]')){S.mode=b.dataset.mode;paintStage();return}
 if(b=t.closest('[data-skin]')){S.cand=b.dataset.skin;S.galI=0;S.mode='galeria';paintStage();document.querySelectorAll('[data-skin]').forEach(x=>{const on=x.dataset.skin===S.cand;x.setAttribute('aria-pressed',on?'true':'false');const card=x.closest('.cd');if(card)card.classList.toggle('on',on);const lab=x.querySelector('.picklab');if(lab)lab.textContent=on?'Elegida':'Elegir apariencia'});return}
 if(b=t.closest('[data-add]')){if(S.cand)proposeAt(RT.code,slotOf(RT),S.cand);return}
 if(b=t.closest('[data-explore]')){const s=$('cq');if(s){s.focus();s.scrollIntoView({block:'center'})}return}
 if(b=t.closest('[data-clear-cand]')){S.cand=null;S.galI=0;paintStage();document.querySelectorAll('[data-skin]').forEach(x=>{x.setAttribute('aria-pressed','false');const card=x.closest('.cd');if(card)card.classList.remove('on')});return}
 if(b=t.closest('[data-goto-slot]')){selectSlot(+b.dataset.gotoSlot);return}
 if(b=t.closest('#cm')){S.shown+=PAGE;catGrid(catCtx());return}
 if(b=t.closest('[data-thumb]')){S.galI=+b.dataset.thumb;if(onFighter())paintStage();else if(RT&&RT.v==='ficha')vFicha(RT);return}
 if(b=t.closest('[data-gal]')){if(onFighter()&&S.cand&&idx[S.cand])openGallery(idx[S.cand].p,+b.dataset.gal);else if(RT&&idx[RT.vid])openGallery(idx[RT.vid].p,+b.dataset.gal);return}
 if(b=t.closest('[data-dest]')){S.dest=+b.dataset.dest;const e2=idx[RT.vid];$('usebox').innerHTML=useBox(e2.f,e2.p,para(RT.q.para));return}
 if(b=t.closest('[data-use]')){const e2=idx[RT.vid],c=para(RT.q.para),n=c?c.n:S.dest;if(n==null||!e2)return;if(proposeAt(e2.f.code,n,e2.p.vid)!==false)go(href.traje(e2.f.code,n),true);return}});
$('main').addEventListener('input',e=>{const t=e.target;
 if(t.id==='fq'){S.fq=t.value;clearTimeout(S.ft);S.ft=setTimeout(()=>{const h=fList();$('fg').innerHTML=h;$('fe').hidden=!!h},120)}
 if(t.id==='cq'){catSt().q=t.value;S.shown=PAGE;saveCat();clearTimeout(S.ct);S.ct=setTimeout(()=>catGrid(catCtx()),160)}});
$('main').addEventListener('change',e=>{if(e.target.id==='cf'){S.cat.f=e.target.value;S.shown=PAGE;saveCat();catGrid(catCtx())}});
$('main').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.target.id==='fq'||e.target.id==='cq'))e.target.blur();moveRadio(e)});
const isTxt=el=>el&&el.matches&&el.matches('input[type=search],input[type=text]');
document.addEventListener('focusin',e=>{if(isTxt(e.target))document.body.classList.add('typing')});
document.addEventListener('focusout',()=>setTimeout(()=>{if(!isTxt(document.activeElement))document.body.classList.remove('typing')},50));

/* ============================ menú, historial, datos, exportar ============================ */
function showMenu(){const rl=legacyItems().length,row=(m,ic,t)=>`<button data-m="${m}">${icon(ic)}<span>${t}</span></button>`;
 openDlg('Más',`<div class="list">${row('hist','clock','Historial de cambios')}${row('datos','info','Sobre los datos')}${row('export','share','Exportar plan')}${row('ayuda','help','Cómo se usa')}${row('diag','wrench','Estado y diagnóstico')}${rl?row('recover','undo',`Elecciones de antes (${rl})`):''}</div>`,false)}
$('menuBtn').onclick=showMenu;
$('dlgB').addEventListener('click',e=>{
 if(e.target.closest('#filtrosOk')){closeDlg();return}
 const chip=e.target.closest('[data-chip]');if(chip){toggleFilter(chip.dataset.chip,chip);return}
 const b=e.target.closest('[data-m]');if(b){({hist:showHist,datos:showDatos,export:showExport,ayuda:showAyuda,diag:showDiag,recover:showRecover,'recover-go':recoverGo,'recover-no':recoverNo})[b.dataset.m]();return}
 if(e.target.closest('#dgCopy')){const t=JSON.stringify(window.__ssbuDiag(),null,1);(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('Diagnóstico copiado'),()=>toast('No se pudo copiar'));return}
 if(e.target.closest('#dgRetry')){nextTry=0;syncKind=null;paintSync();startDb();flush();toast('Reintentando…');return}
 if(e.target.closest('#hUndo')){closeDlg();undoLast();return}
 if(e.target.closest('#xCopy')){const t=JSON.stringify(buildExport(),null,2);(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('Plan copiado'),()=>{const ta=$('xPre');ta.focus();toast('Selecciona el texto y cópialo')});return}
 if(e.target.closest('#xDown')){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(buildExport(),null,2)],{type:'application/json'}));a.download='plan-skins.json';a.click();return}});
const ago=t=>{if(!t)return '';const s=Math.max(0,(Date.now()-t)/1000);return s<60?'ahora':s<3600?`hace ${Math.round(s/60)} min`:s<86400?`hace ${Math.round(s/3600)} h`:`hace ${Math.round(s/86400)} d`};
function showHist(){const rows=HIST.slice(0,40).map(h=>{const f=byCode[h.code],to=h.to&&idx[h.to]?idx[h.to].p:null,fr=h.from&&idx[h.from]?idx[h.from].p:null;
  const what=h.to?`puso «${to?to.name:'otra apariencia'}»`:'quitó la propuesta'+(fr?` «${fr.name}»`:'');
  return `<div class="hrow">${imBox(to?to.img:(fr?fr.img:null),'',{})}<div><b>${trajeName(h.slot)} · ${esc(f?f.name:h.code)}</b><br>Alguien ${esc(what)} <span class="mu">· ${ago(h.t)}</span></div></div>`}).join('');
 openDlg('Historial',`${lastAct?`<div class="acts">${Btn('Deshacer mi último cambio',{k:'p',ic:'undo',attrs:'id="hUndo"'})}</div>`:''}${rows||'<p class="empty">Todavía no hay cambios en el historial.</p>'}`,true)}
function showDatos(){const m=INV&&INV.meta;const gen=(META.generated||'').replace('T',' ');
 openDlg('Sobre los datos',`<div class="note"><b>Qué es «Actual»</b>Lo que se pudo revisar en los repositorios del ModPack. No es un inventario comprobado en la consola: ${m&&m.verification?`verificación <b style="display:inline">${esc(m.verification)}</b>`:'sin verificar'}.</div>
 ${m?m.sources.map(s=>`<div class="note"><b>${esc(s.label)}</b>${esc(s.verification||'')}${s.ref?`<br><span class="mu sm">${esc(s.ref)}</span>`:''}${s.scope?`<br><span class="mu sm">${esc(s.scope)}</span>`:''}</div>`).join(''):''}
 ${m&&m.profile&&m.profile.name?`<div class="note"><b>Perfil del ModPack</b>Se usa el perfil «${esc(m.profile.name)}» (${esc(m.profile.ref||'')}) con sus exclusiones${m.profile.excluded_base_slots&&m.profile.excluded_base_slots.length?` (quita ${m.profile.excluded_base_slots.length} traje${m.profile.excluded_base_slots.length>1?'s':''} del pack base)`:''}. Otros perfiles (${esc((m.profile.other_profiles||[]).join(', '))}) no se reflejan.<br><span class="mu sm">Versión del inventario ${esc(m.version||'')}</span></div>`:''}
 <div class="note"><b>Original</b>Un traje sin ningún mod en el inventario revisado se muestra como original. No está confirmado en la consola.</div>
 <div class="note"><b>«Online»</b>Es lo que declara el autor del mod. No es una prueba en tu consola.</div>
 <div class="note"><b>Catálogo</b>${esc(gen)} · ${F.reduce((n,f)=>n+f.picks.filter(p=>!p.withdrawn).length,0)} apariencias${m&&m.scanned_at?` · inventario del ${esc(m.scanned_at.slice(0,10))}`:''}</div>
 <div class="note"><b>Cambios compartidos</b>Todos editan el mismo plan. Cada cambio queda en el historial. Después se revisa y se instala a mano.</div>`,true)}
function showAyuda(){openDlg('Cómo se usa',`<div class="steps"><div><b>1</b><span>Elige un <b>luchador</b>.</span></div><div><b>2</b><span>Elige uno de los <b>ocho trajes</b>.</span></div><div><b>3</b><span>Toca <b>Elegir apariencia</b> y luego <b>Agregar al plan</b>.</span></div><div><b>4</b><span>Revisa el plan y, si quieres, <b>deshaz</b> la propuesta. Guardar no instala nada en la consola.</span></div></div>`,true)}
function buildExport(){const es=planEntries();
 return {schema:3,generated_at:new Date().toISOString(),catalog:META.generated||null,
  inventory:{version:INV&&INV.meta&&INV.meta.version,profile:INV&&INV.meta&&INV.meta.profile,verification:INV&&INV.meta&&INV.meta.verification,scanned_at:INV&&INV.meta&&INV.meta.scanned_at,sources:INV&&INV.meta&&INV.meta.sources},
  target:{game:'Super Smash Bros. Ultimate',version:'13.0.5',loader:'ARCropolis 4.1.1'},
  changes:es.map(e=>{const f=byCode[e.code],c=curOf(e.code,e.n),p=idx[e.vid]?idx[e.vid].p:null;
   return {fighter:f.name,roster_no:e.code,traje:e.n+1,slot:'c0'+e.n,current:{kind:c.kind,name:c.name,source:c.src||null,confirmed:false},
    user_destination:{traje:e.n+1,slot:'c0'+e.n,priority:'el destino elegido manda sobre dest_hint'},replaces:{kind:c.kind,name:c.name,vid:c.vid||null},relocation:p&&p.native&&p.native.length?{native_slots:p.native.map(n=>'c0'+n),needs_move:!p.native.includes(e.n),checked:false}:null,
    proposal:p?{vid:p.vid,role:isAlt(p)?'alternativa':'recomendada',variant:p.variant||null,mod_id:p.id,name:p.name,author:p.author,url:p.url,online:onlineOf(p)[1],conditions:p.conditions||null,dependencies:p.deps||null,conflicts:p.conflicts||null,native_slots:p.slots_orig||null,dest_hint:p.dest||null,pack:p.pack,withdrawn:!!p.withdrawn}:null,
    missing_in_catalog:!p,vid:e.vid,status:(STATUS[e.vid]||{}).status||'wanted',result:(STATUS[e.vid]||{}).result||null}}),
  history:HIST.slice(0,50).map(h=>({at:h.t?new Date(h.t).toISOString():null,roster_no:h.code,traje:h.slot+1,from:h.from,to:h.to,kind:h.kind}))}}
function showExport(){const n=planEntries().length;
 openDlg('Exportar el plan',`<p>Plan actual: <b>${n} ${n==1?'propuesta':'propuestas'}</b>. Incluye traje de destino, apariencia, variante y condiciones. No instala nada.</p><div class="acts row">${Btn('Copiar',{k:'p',attrs:'id="xCopy"'})}${Btn('Descargar',{attrs:'id="xDown"'})}</div><pre class="json" id="xPre" tabindex="0">${esc(JSON.stringify(buildExport(),null,2).slice(0,1800))}${n?'…':''}</pre>`,true)}

/* ============================ galería (PhotoSwipe, carga diferida) ============================ */
const PSWP_BASE='https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/';
let PSWP=null,pswpMod=null;
function loadPswp(){return pswpMod||(pswpMod=(async()=>{
 if(!document.getElementById('pswpCss')){const l=document.createElement('link');l.id='pswpCss';l.rel='stylesheet';l.href=PSWP_BASE+'photoswipe.css';document.head.appendChild(l);await new Promise(r=>{l.onload=l.onerror=r})}
 return (await import(PSWP_BASE+'photoswipe.esm.min.js')).default})().catch(e=>{pswpMod=null;throw e}))}
async function openGallery(p,i){const imgs=imgsOf(p);if(!imgs.length)return;const opener=document.activeElement;
 let PhotoSwipe;try{PhotoSwipe=await loadPswp()}catch(e){toast('No se pudo abrir el visor de fotos',{label:'Reintentar',fn:()=>openGallery(p,i)});return}
 const items=imgs.map((x,k)=>({src:x.o,msrc:x.m,width:1280,height:720,alt:`${p.name} — foto ${k+1} de ${imgs.length}`}));
 const pswp=new PhotoSwipe({dataSource:items,index:i,bgOpacity:.97,loop:false,wheelToZoom:true,returnFocus:false,closeTitle:'Cerrar',zoomTitle:'Ampliar o reducir',arrowPrevTitle:'Foto anterior',arrowNextTitle:'Foto siguiente',errorMsg:'No se pudo cargar la foto',indexIndicatorSep:' / ',preloaderDelay:200});
 // tamaño real de cada foto al cargarla: se muestra sin deformar
 pswp.on('loadComplete',({content,slide})=>{const el=content.element;if(!el||!el.naturalWidth)return;if(content.data.width===el.naturalWidth&&content.data.height===el.naturalHeight)return;
  content.data.width=el.naturalWidth;content.data.height=el.naturalHeight;content.width=el.naturalWidth;content.height=el.naturalHeight;slide.width=el.naturalWidth;slide.height=el.naturalHeight;
  if(slide.calculateSize){slide.calculateSize();slide.zoomAndPanToInitial();slide.applyCurrentZoomPan()}});
 // foto que falla: aviso claro con «Reintentar»
 pswp.addFilter('contentErrorElement',(el,content)=>{const d=document.createElement('div');d.className='pswp__err';d.innerHTML=icon('image','big')+'<span>No se pudo cargar esta foto</span>';
  const b=document.createElement('button');b.textContent='Reintentar';b.onclick=()=>{try{if(content.slide)content.slide.container.innerText='';content.state='loading';content.displayedImageWidth=0;content.load(false,true)}catch(e){pswp.refreshSlideContent(content.index)}};d.appendChild(b);return d});
 // miniaturas visibles, con la actual marcada
 if(imgs.length>1)pswp.on('uiRegister',()=>pswp.ui.registerElement({name:'thumbs',order:9,isButton:false,appendTo:'root',html:'<div class="pswp__thumbs" role="group" aria-label="Fotos"></div>',onInit:(el,ps)=>{
  el.innerHTML=imgs.map((x,k)=>`<button aria-label="Foto ${k+1}"><img src="${esc(x.s)}" data-orig="${esc(x.o)}" alt="" loading="lazy"></button>`).join('');
  const mark=()=>[...el.children].forEach((b,k)=>{k===ps.currIndex?b.setAttribute('aria-current','true'):b.removeAttribute('aria-current');if(k===ps.currIndex&&b.scrollIntoView)b.scrollIntoView({block:'nearest',inline:'center'})});
  el.addEventListener('click',ev=>{const b=ev.target.closest('button');if(b)ps.goTo([...el.children].indexOf(b))});ps.on('change',mark);mark()}}));
 pswp.on('change',()=>{S.galI=pswp.currIndex});
 const restoreGal=()=>{if(RT&&RT.v==='ficha')vFicha(RT);else if(onFighter())paintStage();const back=document.querySelector('[data-gal]');if(back&&back.focus)try{back.focus()}catch(e){}};
 pswp.on('close',()=>{PSWP=null;S.galI=Math.min(S.galI,Math.max(imgs.length-1,0));if(!ovDone('gal',()=>setTimeout(restoreGal,200)))restoreGal()});
 PSWP=pswp;ovPush('gal');pswp.init()}

/* ============================ sincronización: Firebase ============================ */
const FBCFG=META.firebase||null;
const EMU=location.hostname==='localhost'&&/[?&]fbemu/.test(location.search);   // solo pruebas con emuladores
let _fb=null,dbState=FBCFG?'off':'local',flushing=false,planLoaded=false,metaCat=null,catSnap=null,metaInst=null,instSnap=null,curGen=META.generated||null;
function fb(){if(!FBCFG)return Promise.reject(new Error('Firebase no configurado'));
 return _fb||(_fb=(async()=>{const B='https://www.gstatic.com/firebasejs/10.14.1/';
  const [app,auth,fs]=await Promise.all([import(B+'firebase-app.js'),import(B+'firebase-auth.js'),import(B+'firebase-firestore.js')]);
  const a=app.initializeApp(FBCFG),au=auth.getAuth(a);
  const db=fs.initializeFirestore(a,{localCache:fs.persistentLocalCache({tabManager:fs.persistentMultipleTabManager()})});
  if(EMU){auth.connectAuthEmulator(au,'http://localhost:9099',{disableWarnings:true});fs.connectFirestoreEmulator(db,'localhost',8080)}
  await new Promise(r=>{const u=auth.onAuthStateChanged(au,()=>{u();r()})});
  if(!au.currentUser)await auth.signInAnonymously(au);   // sesión anónima automática: sin registro ni nombre
  return {...fs,...auth,db,auth:au}})().catch(e=>{_fb=null;throw e}))}
/* Un fallo de conexión (se arregla solo al volver la red) no es lo mismo que un fallo de configuración, permisos o autenticación
   (hay que arreglarlo en Firebase). El visitante ve un estado breve; el detalle queda en el diagnóstico y en la consola. */
let syncKind=null;                                    // null · 'offline' · 'service'
const DIAG=J('ssbu_diag',[]);let lastOk=null,lastOkAt=0,backoff=15000,nextTry=0;
function classify(e){const t=String(e&&(e.code||'')+' '+(e&&e.message||'')+' '+(e&&e.name||''));
 if(!navigator.onLine||/network-request-failed|unavailable|deadline-exceeded|Failed to fetch|NetworkError|Load failed/i.test(t))return 'offline';
 if(/unauthenticated|auth\/(operation-not-allowed|admin-restricted-operation|configuration-not-found|unauthorized-domain|invalid-api-key|api-key-not-valid|app-not-authorized|internal-error|requests-from-referer)|OPERATION_NOT_ALLOWED|CONFIGURATION_NOT_FOUND/i.test(t))return 'auth';
 if(/permission-denied|PERMISSION_DENIED|Missing or insufficient|API has not been used|SERVICE_DISABLED/i.test(t))return 'perm';
 if(/not-found|failed-precondition|project/i.test(t))return 'config';
 return 'other'}
function diag(where,e,extra){const k=classify(e),d={t:Date.now(),where,kind:k,code:(e&&(e.code||e.name))||'',msg:String(e&&e.message||e||'').slice(0,220),online:navigator.onLine,pend:PEND.length,project:FBCFG&&FBCFG.projectId,...extra};
 DIAG.unshift(d);DIAG.length=Math.min(DIAG.length,12);LS('ssbu_diag',JSON.stringify(DIAG));try{console.warn('[ssbu-sync] '+JSON.stringify(d))}catch(_){}return k}
window.__ssbuDiag=()=>({state:dbState,syncKind,pend:PEND.length,lastOk:lastOk,online:navigator.onLine,project:FBCFG&&FBCFG.projectId,errors:DIAG});
function syncInfo(){const n=PEND.length;
 if(syncKind==='service')return ['err',n?'No se pudo guardar ('+n+')':'Servicio no disponible'];
 if(n)return flushing?['saving','Guardando…']:['pend','Pendiente ('+n+')'];
 if(syncKind==='offline')return ['pend','Sin conexión'];
 if(dbState==='ok')return ['ok','Guardado ✓'];
 if(dbState==='local')return ['','Solo en este dispositivo'];
 return ['','Conectando…']}
function paintSync(){const [c,t]=syncInfo(),e=$('sync');e.className='sync '+c;e.textContent=t}
function fail(where,e){const k=diag(where,e);syncKind=k==='offline'?'offline':'service';if(dbState!=='ok')dbState='err';
 backoff=syncKind==='offline'?15000:Math.min(backoff*2,300000);nextTry=Date.now()+backoff;paintSync();return k}
function good(){syncKind=null;dbState='ok';lastOkAt=Date.now();lastOk=new Date(lastOkAt).toISOString();backoff=15000;nextTry=0}
async function flush(){if(flushing||!PEND.length)return;
 if(!FBCFG){// sin base de datos: el plan queda en este dispositivo
  PEND.forEach(o=>{const k=keyOf(o.code,o.slot);if(o.to)PLAN[k]={vid:o.to};else delete PLAN[k]});PEND=[];savePend();render(true);paintSync();return}
 if(!navigator.onLine){syncKind='offline';paintSync();return}
 flushing=true;paintSync();
 try{const f=await fb();const uid=f.auth.currentUser.uid;
  while(PEND.length){const op=PEND[0];
   let res;
   try{res=await f.runTransaction(f.db,async tx=>{const ref=f.doc(f.db,'changes',keyOf(op.code,op.slot)),s=await tx.get(ref),cur=s.exists()?s.data().vid:null;
    if(cur===op.to)return {noop:true};
    if(cur!==op.exp)return {conflict:true,cur};
    const h=f.doc(f.collection(f.db,'history'));
    if(op.to===null)tx.delete(ref);else tx.set(ref,{code:op.code,slot:op.slot,vid:op.to,by:uid,at:f.serverTimestamp()});
    tx.set(h,{code:op.code,slot:op.slot,from:cur,to:op.to,kind:op.kind||(op.to===null?'clear':'set'),by:uid,at:f.serverTimestamp()});return {ok:true}})}
   catch(e){ // las reglas rechazan una apariencia que ya no existe: ese cambio se descarta para no bloquear la cola.
             // Con una apariencia conocida, un rechazo apunta a configuración (reglas sin publicar): se conserva el cambio
    if(classify(e)==='perm'&&op.to&&!idx[op.to]){PEND.shift();savePend();diag('descartado',e,{op:op.code+'_'+op.slot,to:op.to});toast('Un cambio ya no es válido y se descartó');continue}
    throw e}
   PEND.shift();savePend();
   if(!res.conflict){SENT[keyOf(op.code,op.slot)]={to:op.to,t:Date.now()};noteSaved(op)}
   if(res.conflict)conflict(op,res.cur);
   render(true)}
  good()
 }catch(e){fail('flush',e)}
 flushing=false;paintSync();render(true)}
// otra persona cambió ese traje mientras tanto: se conserva su opción y se ofrece repetir la mía
function conflict(op,cur){const mine=op.to&&idx[op.to]?idx[op.to].p.name:null,theirs=cur&&idx[cur]?idx[cur].p.name:null;
 toast(`${trajeName(op.slot)}: ${theirs?'alguien eligió «'+theirs+'»':'alguien lo cambió'}. Se conservó su opción.`,mine?{label:'Usar la mía',fn:()=>enqueue({code:op.code,slot:op.slot,to:op.to,exp:cur,kind:'set'})}:null)}
addEventListener('online',()=>{syncKind=syncKind==='offline'?null:syncKind;paintSync();flush();if(!_fb&&FBCFG)startDb()});addEventListener('offline',()=>{syncKind='offline';paintSync()});
setInterval(()=>{if(PEND.length&&Date.now()>=nextTry)flush()},5000);
function showDiag(){const d=window.__ssbuDiag(),k={offline:'Sin conexión: se resuelve solo al volver la red.',service:'Servicio no disponible: hace falta revisar la configuración de Firebase (ver docs/FIREBASE.md).'}[d.syncKind]||'Todo en orden.';
 openDlg('Estado y diagnóstico',`${Note(d.syncKind?'Atención':'Sincronización',esc(k),d.syncKind==='service'?'y':'')}
 <div class="dl"><p><b>Estado:</b> ${esc(d.state)} · <b>Pendientes:</b> ${d.pend} · <b>En línea:</b> ${d.online?'sí':'no'}</p><p><b>Proyecto:</b> ${esc(d.project||'—')} · <b>Último guardado correcto:</b> ${esc(d.lastOk||'—')}</p>
 ${d.errors.length?d.errors.slice(0,6).map(e=>`<p class="mu sm"><b>${esc(new Date(e.t).toISOString().slice(11,19))}</b> ${esc(e.where)} · ${esc(e.kind)} · ${esc(e.code)} ${esc(e.msg)}</p>`).join(''):'<p class="mu">Sin errores registrados.</p>'}</div>
 <div class="acts row">${Btn('Copiar diagnóstico',{k:'p',ic:'share',attrs:'id="dgCopy"'})}${Btn('Reintentar ahora',{ic:'retry',attrs:'id="dgRetry"'})}</div>`,true)}

/* --- catálogo, inventario, plan e historial en vivo --- */
function maybeApplyCatalog(){if(!catSnap||!metaCat)return;const gen=metaCat.generated||null;if(F.length&&gen&&gen===curGen)return;
 const L=[];catSnap.forEach(d=>L.push(d.data()));if(!L.length)return;L.sort((a,b)=>(a.order||0)-(b.order||0));
 F=L.map(({order,updatedAt,vids,...f})=>f);curGen=gen;META.generated=gen||META.generated;buildData();rebuild()}
function maybeApplyInventory(){if(!instSnap||!metaInst)return;const m={...metaInst};delete m.updatedAt;
 if(INV&&stable(INV.meta)===stable(m))return;const fs={};instSnap.forEach(d=>{const v=d.data();fs[d.id]={slots:v.slots||{}}});if(!Object.keys(fs).length)return;
 INV={meta:m,fighters:fs};render(true)}
const ts=v=>v&&v.toMillis?v.toMillis():null;
let unsubs=[],dbGen=0;
async function startDb(){if(!FBCFG){paintSync();return}
 const gen=++dbGen;unsubs.splice(0).forEach(u=>{try{u()}catch(e){}});
 try{const f=await fb();if(gen!==dbGen)return;const sub=(ref,ok)=>{const u=f.onSnapshot(ref,ok,e=>fail('lectura',e));unsubs.push(u)};
  sub(f.doc(f.db,'meta','catalog'),s=>{metaCat=s.exists()?s.data():null;maybeApplyCatalog()});
  sub(f.collection(f.db,'catalog'),s=>{catSnap=s;maybeApplyCatalog()});
  sub(f.doc(f.db,'meta','installed'),s=>{metaInst=s.exists()?s.data():null;maybeApplyInventory()});
  sub(f.collection(f.db,'installed'),s=>{instSnap=s;maybeApplyInventory()});
  sub(f.collection(f.db,'status'),s=>{STATUS={};s.forEach(d=>{const v=d.data();STATUS[v.vid||d.id]=v})});
  sub(f.collection(f.db,'changes'),s=>{const m={};s.forEach(d=>{const v=d.data();m[d.id]={vid:v.vid,by:v.by,at:ts(v.at)}});const same=stable(PLAN)===stable(m);PLAN=m;Object.keys(SENT).forEach(k=>{if(((m[k]||{}).vid||null)===SENT[k].to||Date.now()-SENT[k].t>=8000)delete SENT[k]});LS('ssbu_plan_cache',JSON.stringify(m));
   good();paintSync();if(!same)render(true);planLoaded=true;flush()});
  sub(f.query(f.collection(f.db,'history'),f.orderBy('at','desc'),f.limit(40)),s=>{HIST=[];s.forEach(d=>{const v=d.data();HIST.push({code:v.code,slot:v.slot,from:v.from,to:v.to,kind:v.kind,t:ts(v.at)})})})
 }catch(e){if(gen===dbGen)fail('inicio',e)}}

/* --- selecciones del modelo anterior (guardadas en este navegador): nunca se suben solas; se ofrecen y la persona decide --- */
function legacyItems(){if(LS('ssbu_mig3'))return [];const old=J('ssbu_sel_v2',null);if(!old)return [];const out=[];
 Object.entries(old).forEach(([k,v])=>{if(!v||v.slot==null)return;const vid=legacyMap[k],code=k.split(':')[0],f=byCode[code];
  if(!vid||!f||f.mii||planVid(code,v.slot))return;out.push({code,slot:v.slot,vid})});return out}
function showRecover(){const l=legacyItems();
 openDlg('Elecciones de antes',l.length?`<p class="mu">Este dispositivo guardó ${l.length} elecci${l.length>1?'ones':'ón'} de la versión anterior. No se han añadido al plan: tú decides.</p>${l.map(x=>{const p=idx[x.vid].p;return `<div class="hrow">${imBox(p.img,'',{})}<div><b>${trajeName(x.slot)} · ${esc(byCode[x.code].name)}</b><br>${esc(p.name)}</div></div>`}).join('')}<div class="acts">${Btn('Añadir al plan compartido',{k:'p',attrs:'data-m="recover-go"'})}${Btn('No añadir',{attrs:'data-m="recover-no"'})}</div>`:'<p class="empty">No hay elecciones antiguas pendientes.</p>',true)}
function recoverGo(){const l=legacyItems();LS('ssbu_mig3','1');l.forEach(x=>enqueue({code:x.code,slot:x.slot,to:x.vid,exp:planVid(x.code,x.slot),kind:'set'}));closeDlg();toast(`${l.length} elecci${l.length>1?'ones añadidas':'ón añadida'} al plan`)}
function recoverNo(){LS('ssbu_mig3','1');closeDlg();render(true)}

/* ============================ arranque ============================ */
PLAN=J('ssbu_plan_cache',{});
addEventListener('popstate',()=>{if(skip){skip--;const fn=afterOv;afterOv=null;if(fn)fn();return}if(ovs.length){hideOv(ovs.pop());return}onRoute()});
addEventListener('hashchange',()=>{if(ovs.length)return;onRoute()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&ovs[ovs.length-1]==='dlg')closeDlg()});
onRoute(true);paintSync();startDb();
