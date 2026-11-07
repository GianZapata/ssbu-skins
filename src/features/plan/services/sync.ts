// @ts-nocheck
/* Cola compartida y Firebase. confirmPlan, mergeChanges y ssbu_pend3 se portan tal cual. */
const $ = (id) => document.getElementById(id)
const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); return v } catch (e) { return null } }
const J = (k, d) => { try { return JSON.parse(LS(k) || 'null') ?? d } catch (e) { return d } }
const stable = (o) => JSON.stringify(o, (k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((x) => [x, v[x]])) : v)
const keyOf = (c, n) => c + '_' + n
const PEOPLE = ['Gian', 'Alan', 'Ches', 'Samu']
const validPerson = (name) => PEOPLE.includes(name)
const docKey = (c, n, name) => (validPerson(name) ? c + '_' + n + '_' + name : c + '_' + n)
function parseDocKey(key) {
  const parts = String(key || '').split('_')

  if (parts.length !== 2 && parts.length !== 3) return null

  const slot = Number(parts[1])

  if (!Number.isInteger(slot) || slot < 0 || slot > 7 || !parts[0]) return null

  const name = parts.length === 3 ? parts[2] : null

  if (name !== null && !validPerson(name)) return null

  return { code: parts[0], slot, name }
}
/* La cola guardada antes de las propuestas por persona apunta al documento antiguo, que ahora es de solo lectura,
   y no dice quién la hizo: atribuirla a quien abra la página sería inventar un autor. Esas operaciones se descartan. */
const namedOps = (ops) => (Array.isArray(ops) ? ops.filter((o) => o && validPerson(o.name)) : [])
let activePerson = validPerson(LS('ssbu_person')) ? LS('ssbu_person') : null
function getPerson() { return activePerson }
function setPerson(name) {
  const next = validPerson(name) ? name : null

  if (activePerson === next) return next

  activePerson = next
  LS('ssbu_person', next)
  render(true)

  if (next && PEND.length) flush()

  return next
}
const byCode = {}
const idx = {}
const legacyMap = {}
const all = []
let F = globalThis.F_EMBED || []
let INV = (globalThis.META && globalThis.META.inventory) || null
let PLAN = J('ssbu_plan_cache', {})
let render = () => {}
let noteSaved = () => {}
let toast = () => {}
let rebuild = () => {}
let paint = () => {}
const trajeName = (n) => 'Traje ' + (n + 1)
const savePend = () => LS('ssbu_pend3', JSON.stringify(PEND))
function buildData() {
  Object.keys(byCode).forEach((k) => delete byCode[k])
  Object.keys(idx).forEach((k) => delete idx[k])
  Object.keys(legacyMap).forEach((k) => delete legacyMap[k])
  all.length = 0
  F.forEach((f, i) => {
    byCode[f.code] = f
    f.picks.forEach((p) => {
      idx[p.vid] = { f, p, i }
      if (!p.withdrawn) {
        all.push({ f, p, i })
        if (p.legacy && !legacyMap[p.legacy]) legacyMap[p.legacy] = p.vid
      }
    })
  })
  all.sort((a, b) => (b.p.audited - a.p.audited) || (a.i - b.i))
}
buildData()

const confirmedPlan={},removedPlanAt={};
function confirmPlan(key,vid,after,variant=null,name=null){
 if((PLAN[key]?.at||0)>after||(removedPlanAt[key]||0)>after)return;

 const parsed=parseDocKey(key);
 let person=validPerson(name)?name:null;

 if(!person&&parsed)person=parsed.name;

 confirmedPlan[key]={vid,after,variant,name:person};

 if(vid)PLAN[key]={vid,variant,...(person?{name:person}:{})};
 else delete PLAN[key];

 LS('ssbu_plan_cache',JSON.stringify(PLAN))}
function mergeChanges(m,changes){
 for(const c of changes)if(c.type==='removed')removedPlanAt[c.doc.id]=ts(c.doc.data().at)||0;
 for(const [key,a] of Object.entries(confirmedPlan)){
  const value=m[key],removed=changes.find(c=>c.doc.id===key&&c.type==='removed'),removedAt=removed?(ts(removed.doc.data().at)||0):null;
  if((value&&((value.vid===a.vid&&(value.variant||null)===(a.variant||null)&&value.at!==null&&value.at>=a.after)||(value.at||0)>a.after))||(removedAt!==null&&(a.vid===null?removedAt>=a.after:removedAt>a.after)))delete confirmedPlan[key];
  else if(a.vid)m[key]={vid:a.vid,variant:a.variant||null,...(a.name?{name:a.name}:{})};else delete m[key];
 }

 return m}
let PEND=namedOps(J('ssbu_pend3',[]));
const droppedPend=(J('ssbu_pend3',[])||[]).length-PEND.length;
savePend();
let HIST = []
let STATUS = {}
let lastAct = null
function proposalsAt(code,n){
 const byAuthor=new Map();

 Object.entries(PLAN).forEach(([k,val])=>{
  const parsed=parseDocKey(k);

  if(!parsed||parsed.code!==code||parsed.slot!==n||!val||!val.vid)return;

  const author=parsed.name||(validPerson(val.name)?val.name:null);

  byAuthor.set(author||'__legacy__',{key:k,code,n,vid:val.vid,variant:val.variant||null,name:author,by:val.by||null,at:val.at??null,unsent:false});
 });

 for(const o of PEND){
  const opName=validPerson(o.name)?o.name:activePerson;

  if(o.code!==code||o.slot!==n||!opName)continue;

  if(o.to)byAuthor.set(opName,{key:docKey(code,n,opName),code,n,vid:o.to,variant:o.variant||null,name:opName,by:null,at:Date.now(),unsent:true});
  else byAuthor.delete(opName);
 }

 const list=Array.from(byAuthor.values());

 list.sort((a,b)=>{
  const aMine=activePerson&&a.name===activePerson?1:0;
  const bMine=activePerson&&b.name===activePerson?1:0;

  if(aMine!==bMine)return bMine-aMine;

  const aLeg=a.name===null?1:0;
  const bLeg=b.name===null?1:0;

  if((b.at||0)!==(a.at||0))return (b.at||0)-(a.at||0);
  if(aLeg!==bLeg)return aLeg-bLeg;

  return PEOPLE.indexOf(a.name)-PEOPLE.indexOf(b.name);
 });

 return list}
function ownVid(code,n){
 if(!activePerson)return null;

 const hit=proposalsAt(code,n).find(x=>x.name===activePerson);

 return hit?hit.vid:null}
function ownVariant(code,n){
 if(!activePerson)return null;

 const hit=proposalsAt(code,n).find(x=>x.name===activePerson);

 return hit?(hit.variant||null):null}
function planVid(code,n){const first=proposalsAt(code,n)[0];return first?first.vid:null}
function planVariant(code,n){const first=proposalsAt(code,n)[0];return first?(first.variant||null):null}
function planEntries(){
 const pairs=new Set();

 Object.keys(PLAN).forEach(k=>{
  const p=parseDocKey(k);

  if(p&&byCode[p.code])pairs.add(p.code+'_'+p.slot);
 });

 PEND.forEach(o=>{
  if(byCode[o.code]&&Number.isInteger(o.slot)&&o.slot>=0&&o.slot<=7)pairs.add(o.code+'_'+o.slot);
 });

 const out=[];

 pairs.forEach(pair=>{
  const i=pair.lastIndexOf('_');
  const code=pair.slice(0,i);
  const n=+pair.slice(i+1);

  proposalsAt(code,n).forEach(r=>out.push(r));
 });

 const ord=Object.keys(byCode);
 const rank=r=>(r.name===null?99:PEOPLE.indexOf(r.name));

 out.sort((a,b)=>ord.indexOf(a.code)-ord.indexOf(b.code)||a.n-b.n||rank(a)-rank(b));

 return out}
function ownEntries(){
 if(!activePerson)return [];

 return planEntries().filter(r=>r.name===activePerson)}
const META = globalThis.META
const FBCFG=META.firebase||null;
const EMU=location.hostname==='localhost'&&/[?&]fbemu/.test(location.search);   // solo pruebas con emuladores
let _fb=null,dbState=FBCFG?'off':'local',flushing=false,planLoaded=false,metaCat=null,catSnap=null,metaInst=null,instSnap=null,curGen=META.generated||null;
let metaSlots=null,slotSnap=null,SLOT_PLAN={},slotPlanReady=false;
function applySlotPlan() {
  const next = {}

  if (!slotSnap || !metaSlots) {
    SLOT_PLAN = {}
    slotPlanReady = false
    render(true)
    return
  }

  slotSnap.forEach((doc) => {
    const data = doc.data() || {}

    next[doc.id] = { slots: data.slots || [] }
  })

  if (!Object.keys(next).length) {
    SLOT_PLAN = {}
    slotPlanReady = false
    render(true)
    return
  }

  SLOT_PLAN = next
  slotPlanReady = true
  render(true)
}
function fb(){if(!FBCFG)return Promise.reject(new Error('Firebase no configurado'));
 return _fb||(_fb=(async()=>{const B='https://www.gstatic.com/firebasejs/10.14.1/';
  const [app,auth,fs]=await Promise.all([import(B+'firebase-app.js'),import(B+'firebase-auth.js'),import(B+'firebase-firestore.js')]);
  const a=app.getApps().length?app.getApp():app.initializeApp(FBCFG),au=auth.getAuth(a);
  let db;try{db=fs.initializeFirestore(a,{localCache:fs.persistentLocalCache({tabManager:fs.persistentMultipleTabManager()})})}catch(e){db=fs.getFirestore(a)}
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

if(droppedPend>0)diag('cola descartada',new Error('operaciones sin persona'),{dropped:droppedPend});

window.__ssbuDiag=()=>({state:dbState,syncKind,pend:PEND.length,lastOk:lastOk,online:navigator.onLine,project:FBCFG&&FBCFG.projectId,errors:DIAG});
function syncInfo(){const n=PEND.length;
 if(syncKind==='service')return ['err',n?'No se pudo guardar ('+n+')':'Servicio no disponible'];
 if(n)return flushing?['saving','Guardando…']:['pend','Pendiente ('+n+')'];
 if(syncKind==='offline')return ['pend','Sin conexión'];
 if(dbState==='ok')return ['ok','Guardado ✓'];
 if(dbState==='local')return ['','Solo en este dispositivo'];
 return ['','Conectando…']}
function paintSync(){try{paint()}catch(e){}paintSaveErr()}
function paintSaveErr(){const el=$('saveErr');if(!el)return;const show=syncKind==='service';el.hidden=!show;if(!show)return;const op=PEND[0];const name=op&&op.to&&idx[op.to]?idx[op.to].p.name:'';const n=el.querySelector('[data-err-name]');if(n)n.textContent=name?('Skin que no se pudo guardar: '+name):'La elección sigue aquí. No se guardó.';}
function fail(where,e){const k=diag(where,e);syncKind=k==='offline'?'offline':'service';if(dbState!=='ok')dbState='err';
 backoff=syncKind==='offline'?15000:Math.min(backoff*2,300000);nextTry=Date.now()+backoff;paintSync();return k}
function good(){syncKind=null;dbState='ok';lastOkAt=Date.now();lastOk=new Date(lastOkAt).toISOString();backoff=15000;nextTry=0}
async function flush(){
 if(flushing||!PEND.length)return;

 if(!FBCFG){// sin base de datos: el plan queda en este dispositivo
  PEND.forEach(o=>{
   const opName=validPerson(o.name)?o.name:activePerson;

   if(!opName)return;

   const k=docKey(o.code,o.slot,opName);

   if(o.to)PLAN[k]={vid:o.to,variant:o.variant||null,name:opName};
   else delete PLAN[k];
  });

  PEND=[];
  savePend();
  LS('ssbu_plan_cache',JSON.stringify(PLAN));
  noteSaved(null);
  render(true);
  paintSync();

  return}

 if(!navigator.onLine){
  syncKind='offline';
  paintSync();

  return}

 flushing=true;
 paintSync();

 try{
  const f=await fb();
  const uid=f.auth.currentUser.uid;

  while(PEND.length){
   const op=PEND[0];
   const opName=validPerson(op.name)?op.name:activePerson;

   if(!opName)break;

   const key=docKey(op.code,op.slot,opName);
   let res;

   try{
    res=await f.runTransaction(f.db,async tx=>{
     const ref=f.doc(f.db,'changes',key);
     const s=await tx.get(ref);
     const cur=s.exists()?s.data().vid:null;
     const curVariant=s.exists()?(s.data().variant||null):null;
     const observedAt=s.exists()?(ts(s.data().at)||0):(PLAN[key]?.at||removedPlanAt[key]||0);

     if(cur===op.to&&curVariant===(op.variant||null))return {noop:true,observedAt};
     if(cur!==op.exp||('expVariant' in op&&curVariant!==(op.expVariant||null)))return {conflict:true,cur,curVariant,observedAt};

     const h=f.doc(f.collection(f.db,'history'));

     if(op.to===null)tx.delete(ref);
     else tx.set(ref,{code:op.code,slot:op.slot,vid:op.to,name:opName,...(op.variant?{variant:op.variant}:{}),by:uid,at:f.serverTimestamp()});

     tx.set(h,{code:op.code,slot:op.slot,name:opName,from:cur,to:op.to,...(curVariant?{from_variant:curVariant}:{}),...(op.variant?{variant:op.variant}:{}),kind:op.kind||(op.to===null?'clear':'set'),by:uid,at:f.serverTimestamp()});

     return {ok:true,observedAt}})}
   catch(e){ // las reglas rechazan una apariencia que ya no existe: ese cambio se descarta para no bloquear la cola.
             // Con una apariencia conocida, un rechazo apunta a configuración (reglas sin publicar): se conserva el cambio
    if(classify(e)==='perm'&&op.to&&!idx[op.to]){
     PEND.shift();
     savePend();
     diag('descartado',e,{op:op.code+'_'+op.slot,to:op.to});
     toast('Un cambio ya no es válido y se descartó');

     continue}

    throw e}

   // El commit puede resolverse antes del listener. El plan confirmado entra antes de soltar la cola,
   // así una instantánea vieja no borra la propuesta ni la revive al deshacer.
   confirmPlan(key,res.conflict?res.cur:op.to,res.observedAt,res.conflict?res.curVariant:(op.variant||null),opName);
   PEND.shift();
   savePend();

   if(!res.conflict)noteSaved(op);
   if(res.conflict)conflict(op,res.cur,res.curVariant);

   render(true)}

  good()
 }catch(e){fail('flush',e)}

 flushing=false;
 paintSync();
 render(true)}
// otra persona cambió ese traje mientras tanto: se conserva su opción y se ofrece repetir la mía
function enqueue(op){PEND.push(op);savePend();paintSync();render(true);flush()}
function conflict(op,cur,curVariant=null){const mine=op.to&&idx[op.to]?idx[op.to].p.name:null,theirs=cur&&idx[cur]?idx[cur].p.name:null;
 toast(`${trajeName(op.slot)}: ${theirs?'alguien eligió «'+theirs+'»':'alguien lo cambió'}. Se conservó su opción.`,mine?{label:'Usar la mía',fn:()=>enqueue({code:op.code,slot:op.slot,name:op.name||activePerson,to:op.to,exp:cur,expVariant:curVariant,...(op.variant?{variant:op.variant}:{}),kind:'set'})}:null)}
addEventListener('online',()=>{syncKind=syncKind==='offline'?null:syncKind;paintSync();flush();if(!_fb&&FBCFG)startDb()});addEventListener('offline',()=>{syncKind='offline';paintSync()});
setInterval(()=>{if(PEND.length&&Date.now()>=nextTry)flush()},5000);
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
  sub(f.doc(f.db,'meta','slot_plan'),s=>{metaSlots=s.exists()?s.data():null;applySlotPlan()});
  sub(f.collection(f.db,'slot_plan'),s=>{slotSnap=s;applySlotPlan()});
  sub(f.collection(f.db,'status'),s=>{STATUS={};s.forEach(d=>{const v=d.data();STATUS[v.vid||d.id]=v})});
  sub(f.collection(f.db,'changes'),s=>{
   const m={};

   s.forEach(d=>{
    const parsed=parseDocKey(d.id);

    if(!parsed)return;

    const v=d.data();
    const author=parsed.name||(validPerson(v.name)?v.name:null);

    m[d.id]={vid:v.vid,variant:v.variant||null,name:author,by:v.by,at:ts(v.at)}});

   const next=mergeChanges(m,s.docChanges());
   const same=stable(PLAN)===stable(next);

   PLAN=next;
   LS('ssbu_plan_cache',JSON.stringify(PLAN));
   good();
   paintSync();

   if(!same)render(true);

   planLoaded=true;
   flush()});

  sub(f.query(f.collection(f.db,'history'),f.orderBy('at','desc'),f.limit(40)),s=>{HIST=[];s.forEach(d=>{const v=d.data();HIST.push({code:v.code,slot:v.slot,from:v.from,to:v.to,from_variant:v.from_variant||null,variant:v.variant||null,name:v.name||null,kind:v.kind,t:ts(v.at)})})})
  unsubs.push(f.onSnapshot(f.collection(f.db,'requests'),s=>readNotes(s),()=>{}))
 }catch(e){if(gen===dbGen)fail('inicio',e)}}
let NOTES=[]
function readNotes(snap){const rows=[];snap.forEach(d=>{const v=d.data()||{};const text=String(v.text||'').trim().slice(0,80);if(!text)return;rows.push({id:d.id,text,done:!!v.done,at:ts(v.at)||0})});rows.sort((a,b)=>(b.at-a.at)||a.text.localeCompare(b.text));NOTES=rows;render(true)}
async function addNote(text){const clean=String(text||'').trim().slice(0,80);if(!clean)return
 if(!FBCFG){NOTES=[{id:'local-'+Date.now(),text:clean,done:false,at:Date.now()},...NOTES];render(true);return}
 try{const f=await fb();await f.setDoc(f.doc(f.collection(f.db,'requests')),{text:clean,done:false,by:f.auth.currentUser.uid,at:f.serverTimestamp()})}
 catch(e){fail('nota',e)}}
async function markNote(id,done){if(!id)return
 if(!FBCFG||String(id).indexOf('local-')===0){NOTES=NOTES.map(n=>n.id===id?{...n,done:!!done}:n);render(true);return}
 try{const f=await fb();await f.updateDoc(f.doc(f.db,'requests',id),{done:!!done})}
 catch(e){fail('nota',e)}}

function bind(hooks) {
  if (hooks.render) render = hooks.render
  if (hooks.noteSaved) noteSaved = hooks.noteSaved
  if (hooks.toast) toast = hooks.toast
  if (hooks.rebuild) rebuild = hooks.rebuild
  if (hooks.paint) paint = hooks.paint
}
const state = {
  get PLAN() { return PLAN },
  set PLAN(v) { PLAN = v },
  get PEND() { return PEND },
  get F() { return F },
  set F(v) { F = v },
  get INV() { return INV },
  set INV(v) { INV = v },
  get HIST() { return HIST },
  set HIST(v) { HIST = v },
  get STATUS() { return STATUS },
  set STATUS(v) { STATUS = v },
  get idx() { return idx },
  get byCode() { return byCode },
  get all() { return all },
  get legacyMap() { return legacyMap },
  get FBCFG() { return FBCFG },
  get syncKind() { return syncKind },
  set syncKind(v) { syncKind = v },
  get dbState() { return dbState },
  set dbState(v) { dbState = v },
  get flushing() { return flushing },
  get planLoaded() { return planLoaded },
  set planLoaded(v) { planLoaded = v },
  get DIAG() { return DIAG },
  get nextTry() { return nextTry },
  set nextTry(v) { nextTry = v },
  get activePerson() { return activePerson },
  get lastAct() { return lastAct },
  set lastAct(v) { lastAct = v },
  get NOTES() { return NOTES },
  get SLOT_PLAN() { return SLOT_PLAN },
  get slotPlanReady() { return slotPlanReady },
}
export { bind, state, buildData, confirmPlan, mergeChanges, planVid, planVariant, planEntries, proposalsAt, ownVid, ownVariant, ownEntries, docKey, parseDocKey, getPerson, setPerson, flush, startDb, paintSync, keyOf, stable, fb, fail, good, enqueue, savePend, classify, syncInfo, addNote, markNote }
