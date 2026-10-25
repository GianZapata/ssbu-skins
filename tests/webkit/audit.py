#!/usr/bin/env python3
"""Auditoría de dimensiones en WebKit (WebKitGTK 2.4x/2.5x vía WebKitWebDriver): barra inferior, menú, contenido, cabecera y avisos.

Qué es y qué NO es: es el motor WebKit real (el de Safari), pero NO es Safari de iOS: no reproduce la barra de herramientas dinámica,
el teclado de iOS ni las áreas seguras reales. Por eso el navegador se simula así:
  - tamaño visible de Safari = un <iframe> con exactamente ese ancho y alto (barras expandidas/contraídas, horizontal, teclado abierto);
  - áreas seguras = variables --sat/--sab/--sal/--sar fijadas con los valores de un iPhone con muesca;
  - texto grande de iOS = multiplicar el tamaño de fuente calculado de cada elemento (lo que hace -webkit-text-size-adjust).
Para cada pantalla × configuración comprueba que nada queda recortado ni tapado y que las acciones inferiores siguen siendo alcanzables.

Uso: audit.py <url base de index.html> <carpeta de capturas> [--json salida.json]   (con WebKitWebDriver en 127.0.0.1:4444)
"""
import json, os, sys, time
from selenium import webdriver
from selenium.webdriver.common.options import ArgOptions

BASE, OUT = sys.argv[1], sys.argv[2]
JSON_OUT = sys.argv[sys.argv.index('--json') + 1] if '--json' in sys.argv else None
os.makedirs(OUT, exist_ok=True)

# (nombre, ancho, alto, insets {t,b,l,r}, escala de texto, comentario)
CONFIGS = [
    ('iphone-barras-expandidas', 390, 664, dict(t=47, b=0, l=0, r=0), 1.0, 'Safari vertical con barra superior e inferior visibles'),
    ('iphone-barras-contraidas', 390, 750, dict(t=47, b=34, l=0, r=0), 1.0, 'Safari vertical con las barras contraídas (indicador de inicio)'),
    ('iphone-se-pequeno', 320, 480, dict(t=20, b=0, l=0, r=0), 1.0, 'pantalla pequeña (iPhone SE 1.ª gen., barras expandidas)'),
    ('iphone-horizontal', 844, 340, dict(t=0, b=21, l=47, r=47), 1.0, 'horizontal con muesca: áreas seguras laterales'),
    ('iphone-texto-130', 390, 664, dict(t=47, b=0, l=0, r=0), 1.3, 'texto grande 130 %'),
    ('iphone-texto-170', 390, 750, dict(t=47, b=34, l=0, r=0), 1.7, 'texto muy grande 170 % (accesibilidad)'),
    ('iphone-teclado', 390, 330, dict(t=47, b=0, l=0, r=0), 1.0, 'teclado abierto (queda ~330 px visibles)'),
    ('ipad-vertical', 768, 900, dict(t=24, b=20, l=0, r=0), 1.0, 'tableta'),
]
# (nombre, hash, preparación JS opcional)
SCREENS = [
    ('luchadores', '#/luchadores'), ('luchador', '#/luchador/01'), ('traje', '#/luchador/01/2'), ('catalogo', '#/catalogo'),
    ('ficha', '#/apariencia/01%3A174057'), ('cambios', '#/cambios'),
]
PROBE = r"""
const [W,H,ins,scale,hash,state]=arguments;const done=arguments[arguments.length-1];
(async()=>{
 const fr=document.getElementById('fr'),w=fr.contentWindow,d=w.document,R=e=>e&&e.getBoundingClientRect();
 const de=d.documentElement;de.style.setProperty('--sat',ins.t+'px');de.style.setProperty('--sab',ins.b+'px');de.style.setProperty('--sal',ins.l+'px');de.style.setProperty('--sar',ins.r+'px');
 if(scale!==1){const els=[...d.querySelectorAll('body *')],sz=els.map(e=>parseFloat(w.getComputedStyle(e).fontSize));els.forEach((e,i)=>{if(sz[i])e.style.fontSize=(sz[i]*scale)+'px'})}   // se leen todos los tamaños antes de cambiar ninguno (si no, los hijos se escalarían dos veces)
 await new Promise(r=>setTimeout(r,350));
 const IH=w.innerHeight,IW=w.innerWidth,out={IH,IW,issues:[]};const bad=(k,m)=>out.issues.push(k+': '+m);
 // un elemento dentro de una tira que se desliza en horizontal (galería, filtros) puede salirse del ancho: es lo esperado
 const inH=e=>{for(let a=e.parentElement;a&&a!==d.body;a=a.parentElement){const o=w.getComputedStyle(a).overflowX;if((o==='auto'||o==='scroll')&&a.scrollWidth>a.clientWidth+1)return true}return false};
 if(hash.startsWith('#/catalogo')&&w.S&&w.catGrid){w.S.cat.f='01';w.catGrid(null)}   // lista corta: la prueba no depende de la paginación infinita
 await new Promise(r=>setTimeout(r,200));
 const nav=d.querySelector('nav.tabs'),navR=R(nav),visibleNav=nav.offsetHeight>0;
 const typing=state==='typing';
 if(typing){const i=d.querySelector('input[type=search]');if(i){i.focus();await new Promise(r=>setTimeout(r,250));const ir=R(i);out.inputTop=ir.top;if(ir.bottom>IH||ir.top<0)bad('teclado','el buscador queda fuera de la zona visible')}}
 // cabecera
 const top=d.querySelector('.top'),h1=d.getElementById('ttl'),sy=d.getElementById('sync'),btns=[...d.querySelectorAll('.top button')].filter(b=>b.offsetParent);
 [h1,sy,...btns].forEach(e=>{const r=R(e);if(r.right>IW+0.5||r.left<-0.5)bad('cabecera','«'+(e.id||e.getAttribute('aria-label'))+'» se sale del ancho')});
 {const a=R(h1),c=R(sy);if(a.right>c.left+1&&a.bottom>c.top+1&&c.bottom>a.top+1)bad('cabecera','el título se solapa con el estado')}
 if(top&&R(top).top<-0.5)bad('cabecera','la cabecera sale por arriba');
 // barra inferior
 if(visibleNav&&!typing){
  if(Math.abs(navR.bottom-IH)>1.5)bad('barra inferior','no está pegada al borde inferior visible (bottom '+navR.bottom.toFixed(0)+' vs '+IH+')');
  if(navR.left<-0.5||navR.right>IW+0.5)bad('barra inferior','se sale del ancho');
  nav.querySelectorAll('a').forEach(a=>{const r=R(a),t=a.querySelector('.t')||a;const tr=R(t);
   if(tr.right>r.right+0.5||tr.left<r.left-0.5)bad('barra inferior','la etiqueta «'+t.textContent.trim()+'» desborda su botón');
   if(t.scrollWidth>t.clientWidth+1)bad('barra inferior','la etiqueta «'+t.textContent.trim()+'» está recortada');
   if(r.height<44)bad('barra inferior','el botón «'+t.textContent.trim()+'» mide '+r.height.toFixed(0)+' px (<44)');
   if(r.left<ins.l-0.5||r.right>IW-ins.r+0.5)bad('barra inferior','el botón «'+t.textContent.trim()+'» invade el área segura lateral')});
 }
 // contenido: al llegar al final nada queda bajo la barra
 for(let i=0;i<4;i++){w.scrollTo(0,d.documentElement.scrollHeight);await new Promise(r=>setTimeout(r,200))}
 const main=d.getElementById('main');let last=null;[...main.querySelectorAll('*')].forEach(e=>{const r=R(e);if(r.height>2&&r.width>0&&!inH(e)&&!(e.closest('details:not([open])')&&e.tagName!=='SUMMARY'&&!e.closest('summary'))&&(!last||r.bottom>R(last).bottom))last=e});
 if(last&&visibleNav&&!typing){const lb=R(last).bottom,nt=navR.top;out.lastBottom=lb;out.navTop=nt;if(lb>nt+1)bad('contenido','lo último ('+(last.className||last.tagName)+') queda '+(lb-nt).toFixed(0)+' px debajo de la barra inferior')}
 if(main.scrollWidth>IW+1||de.scrollWidth>IW+1)bad('contenido','desplazamiento horizontal ('+de.scrollWidth+' > '+IW+')');
 [...main.querySelectorAll('button,a,input,select')].filter(e=>e.offsetParent&&!inH(e)).forEach(e=>{const r=R(e);if(r.right>IW-ins.r+1||r.left<ins.l-1)bad('contenido','«'+(e.getAttribute('aria-label')||e.textContent.trim().slice(0,24))+'» invade el área segura lateral o se sale')});
 w.scrollTo(0,0);
 // menú
 if(state==='menu'){w.showMenu();await new Promise(r=>setTimeout(r,300));
  const box=d.querySelector('#dlg .box'),br=R(box),bd=d.getElementById('dlgB');out.box=[br.top,br.bottom,br.left,br.right];
  if(br.top<ins.t-0.5)bad('menú','la hoja invade la zona superior segura/ barra ('+br.top.toFixed(0)+')');
  if(br.bottom>IH+0.5)bad('menú','la hoja sale por debajo de lo visible ('+br.bottom.toFixed(0)+' > '+IH+')');
  if(br.left<-0.5||br.right>IW+0.5)bad('menú','la hoja se sale del ancho');
  const x=R(d.getElementById('dlgX'));if(x.top<0||x.bottom>IH||x.right>IW)bad('menú','el botón «Cerrar» no es alcanzable');
  bd.scrollTop=bd.scrollHeight;await new Promise(r=>setTimeout(r,150));
  const items=[...bd.querySelectorAll('button')];const lastIt=items[items.length-1];if(lastIt){const lr=R(lastIt);if(lr.bottom>br.bottom+0.5||lr.bottom>IH+0.5)bad('menú','la última opción («'+lastIt.textContent.trim()+'») no se puede alcanzar al desplazar');}
  items.forEach(b=>{const r=R(b);if(r.height<44)bad('menú','opción «'+b.textContent.trim()+'» mide '+r.height.toFixed(0)+' px')});
  out.menuScrollable=bd.scrollHeight>bd.clientHeight}
 // aviso
 if(state==='toast'){w.toast('Traje 1 · Mario: ejemplo largo de aviso para comprobar el ajuste',{label:'Deshacer',fn(){}});await new Promise(r=>setTimeout(r,200));
  const t=R(d.getElementById('toast'));if(visibleNav&&t.bottom>navR.top+1)bad('aviso','el aviso queda tapado por la barra inferior');if(t.bottom>IH||t.right>IW||t.left<0)bad('aviso','el aviso se sale de lo visible')}
 out.state=state;done(out)})();
"""

def driver():
    o = ArgOptions(); o.set_capability('browserName', 'MiniBrowser')
    o.set_capability('webkitgtk:browserOptions', {'binary': '/usr/lib/x86_64-linux-gnu/webkit2gtk-4.1/MiniBrowser', 'args': ['--automation']})
    d = webdriver.Remote('http://127.0.0.1:4444', options=o); d.set_window_size(1280, 1000); d.set_script_timeout(30); return d

def main():
    d = driver(); results = []; total = 0
    try:
        ua = None
        for cname, W, H, ins, scale, note in CONFIGS:
            for sname, h in SCREENS + [('menu', '#/luchadores'), ('toast', '#/luchadores')]:
                state = sname if sname in ('menu', 'toast') else ('typing' if cname == 'iphone-teclado' and sname in ('luchadores', 'catalogo') else '')
                # plan de ejemplo para que Cambios no esté vacío
                seed = "localStorage.setItem('ssbu_pend3',JSON.stringify([{code:'01',slot:2,to:'01:174057',exp:null,kind:'set'},{code:'82',slot:0,to:'82:384079',exp:null,kind:'set'}]));"
                d.get(BASE.split('#')[0].rsplit('/', 1)[0] + '/harness.html'); 
                d.execute_script("document.body.innerHTML='';" + seed + "var f=document.createElement('iframe');f.id='fr';f.style.cssText='position:fixed;left:20px;top:20px;border:0;width:%dpx;height:%dpx;background:#000';f.src=arguments[0];document.body.appendChild(f);" % (W, H), BASE.split('#')[0] + h)
                time.sleep(2.2)
                r = d.execute_async_script(PROBE, W, H, ins, scale, h, state)
                ua = ua or d.execute_script('return navigator.userAgent')
                r.update(config=cname, screen=sname, W=W, H=H); results.append(r); total += len(r['issues'])
                if sname in ('luchadores', 'traje', 'menu', 'cambios') and cname in ('iphone-barras-expandidas', 'iphone-texto-170', 'iphone-horizontal', 'iphone-teclado'):
                    d.save_screenshot(os.path.join(OUT, f'{cname}_{sname}.png'))
                print(('FALLO ' if r['issues'] else 'ok    ') + f'{cname:26s} {sname:11s}', '; '.join(r['issues'])[:300])
        print(f'\nWebKit ({ua}): {len(results)} comprobaciones, {total} problemas')
    finally:
        d.quit()
    if JSON_OUT: json.dump({'ua': ua, 'results': results, 'problems': total}, open(JSON_OUT, 'w'), ensure_ascii=False, indent=1)
    sys.exit(1 if total else 0)
main()
