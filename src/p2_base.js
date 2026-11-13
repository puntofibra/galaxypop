'use strict';
/* ═════════════ CONFIG ═════════════ */
const CFG = {
  API: 'https://script.google.com/macros/s/AKfycbzFv--1K4tpd4sIigxw3-dJA19w0OoJZkDw6paDO8mvlPr1VTSuvTHf79gtk6RfxrkP/exec',
  GOOGLE: '454055120059-nuhaop4r62urc3u036cc3grpqo71ulg7.apps.googleusercontent.com'
};
const BASE = 'https://puntofibra.github.io/galaxypop/';
const APP_V = '2';   // ¡tiene que coincidir SIEMPRE con version.json!
const NIV = 100;
let PUB = {}, IMGV = '1';

/* ═════════════ UTIL ═════════════ */
const $ = s => document.querySelector(s);
const app = $('#app');
const esc = s => String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt = n => Math.round(n).toLocaleString('es-ES');
const clamp = (v,a,b) => v<a?a:v>b?b:v;
const rnd = (a,b) => a + Math.random()*(b-a);
let toastT;
function toast(m, err){
  const t=$('#toast'); t.textContent = m;
  t.className=''; void t.offsetWidth; t.className=(err?'err ':'')+'on';
  if (err) vib(30);
  clearTimeout(toastT); toastT=setTimeout(()=>t.className=(err?'err':''), Math.min(6000, 2400 + m.length*35));
}
function api(accion, d, ms){
  if (/PON_AQUI/.test(CFG.API)) return Promise.resolve({ok:false, error:'El servidor aún no está configurado'});
  const ctl = window.AbortController ? new AbortController() : null;
  const tm = setTimeout(()=>{ try{ ctl && ctl.abort(); }catch(e){} }, ms || 25000);
  return fetch(CFG.API, {method:'POST', body: JSON.stringify(Object.assign({accion}, d||{})), signal: ctl ? ctl.signal : undefined})
    .then(r=>r.json()).catch(()=>({ok:false, error:'Sin conexión. Inténtalo otra vez.'}))
    .finally(()=>clearTimeout(tm));
}
async function call(accion, d){
  const r = await api(accion, d);
  if (!r.ok){ if (r.error==='SESION'){ logout(true); throw new Error('Tu sesión ha caducado. Vuelve a entrar.'); } throw new Error(r.error||'Error'); }
  return r;
}
const errMsg = e => (e && e.message ? e.message : String(e)).replace(/^Error:\s*/,'');
function vib(p){ try{ navigator.vibrate && navigator.vibrate(p); }catch(e){} }
const LS = {
  get(k, d){ try{ const v=localStorage.getItem('gp_'+k); return v==null?d:JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem('gp_'+k, JSON.stringify(v)); }catch(e){} },
  del(k){ try{ localStorage.removeItem('gp_'+k); }catch(e){} }
};
/* generador aleatorio con semilla (los niveles y las partidas a dobles salen iguales en los dos móviles) */
function RNG(seed){ let s = (seed>>>0) || 1; return ()=>{ s ^= s<<13; s>>>=0; s ^= s>>17; s ^= s<<5; s>>>=0; return s/4294967296; }; }

/* ═════════════ COLORES DE LAS BURBUJAS ═════════════ */
/* cada color lleva su símbolo para distinguirlos aunque no se vean bien los colores */
const COL = [
  {n:'Cian',     c:'#2bf0ff', d:'#006b8f', s:'ring'},
  {n:'Magenta',  c:'#ff2bd6', d:'#7a0068', s:'tri'},
  {n:'Ámbar',    c:'#ffc53b', d:'#8a5200', s:'sq'},
  {n:'Verde',    c:'#2dff8a', d:'#007a3a', s:'dia'},
  {n:'Rojo',     c:'#ff3355', d:'#7a0018', s:'star'},
  {n:'Violeta',  c:'#a46bff', d:'#3b1491', s:'hex'},
  {n:'Hielo',    c:'#eaf6ff', d:'#5c7894', s:'plus'},
  {n:'Naranja',  c:'#ff7a1a', d:'#7a2a00', s:'moon'}
];

/* ═════════════ SECTORES (10 sectores de 10 niveles) ═════════════ */
const SECT = [
  {n:'ÓRBITA TERRESTRE',        c:'#2bf0ff', h:200},
  {n:'CINTURÓN DE ASTEROIDES',  c:'#ffc53b', h:35},
  {n:'NEBULOSA CARMESÍ',        c:'#ff3355', h:350},
  {n:'LUNAS DE CRISTAL',        c:'#a46bff', h:265},
  {n:'TORMENTA SOLAR',          c:'#ff7a1a', h:20},
  {n:'BOSQUE DE QUÁSARES',      c:'#2dff8a', h:145},
  {n:'AGUJERO DE GUSANO',       c:'#ff2bd6', h:310},
  {n:'GALAXIA ESPEJO',          c:'#eaf6ff', h:220},
  {n:'HORIZONTE DE SUCESOS',    c:'#7b5cff', h:250},
  {n:'NÚCLEO GALAXYPOP',          c:'#ffd23f', h:50}
];
const sectOf = n => SECT[Math.floor((n-1)/10)] || SECT[0];

/* ═════════════ AUDIO (sintetizado, sin MP3: va en cualquier TV o móvil) ═════════════ */
const AU = { ctx:null, on: LS.get('snd', true), mus: LS.get('mus', true), master:null, musG:null };
function ac(){
  if (!AU.ctx){
    try{
      AU.ctx = new (window.AudioContext||window.webkitAudioContext)();
      AU.master = AU.ctx.createGain(); AU.master.gain.value = .55; AU.master.connect(AU.ctx.destination);
      AU.musG = AU.ctx.createGain(); AU.musG.gain.value = .0; AU.musG.connect(AU.master);
    }catch(e){ return null; }
  }
  if (AU.ctx.state === 'suspended') AU.ctx.resume();
  return AU.ctx;
}
function tone(f, d, type, v, slide, when, dest){
  const c = AU.ctx; if (!c || (!AU.on && !dest)) return;
  const t = (when||c.currentTime), o = c.createOscillator(), g = c.createGain();
  o.type = type||'sine'; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t+d);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v||.2, t+.008); g.gain.exponentialRampToValueAtTime(0.0001, t+d);
  o.connect(g); g.connect(dest||AU.master); o.start(t); o.stop(t+d+.05);
}
function noise(d, v, fr, when){
  const c = AU.ctx; if (!c || !AU.on) return;
  const t = when||c.currentTime, n = Math.floor(c.sampleRate*d), b = c.createBuffer(1, n, c.sampleRate), a = b.getChannelData(0);
  for (let i=0;i<n;i++) a[i] = (Math.random()*2-1)*(1-i/n);
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = b; f.type='lowpass'; f.frequency.value = fr||2000; g.gain.value = v||.2;
  s.connect(f); f.connect(g); g.connect(AU.master); s.start(t);
}
const PENTA = [0,2,4,7,9,12,14,16,19,21,24,26,28];
const SFX = {
  click(){ tone(900,.06,'square',.06,1400); },
  jump(){ tone(300,.14,'square',.07,700); },
  blow(){ tone(520,.09,'triangle',.08,900); noise(.06,.05,5000); },
  boing(){ tone(200,.18,'sine',.14,500); },
  trap(){ tone(700,.12,'sine',.12,1200); tone(1000,.1,'triangle',.06); },
  pop(i){ const f = 520*Math.pow(2, PENTA[Math.min(i||0, PENTA.length-1)]/12); tone(f,.1,'triangle',.12,f*1.6); noise(.04,.06,6000); },
  kill(){ const c=AU.ctx; if(!c) return; [784,988,1318].forEach((f,i)=>tone(f,.12,'square',.07,null,c.currentTime+i*.05)); },
  combo(){ const c=AU.ctx; if(!c) return; [523,659,784,1046,1318,1568].forEach((f,i)=>tone(f,.14,'triangle',.1,null,c.currentTime+i*.05)); },
  item(){ tone(1318,.08,'square',.06); tone(1760,.12,'square',.05,null,AU.ctx&&AU.ctx.currentTime+.06); },
  free(){ tone(400,.2,'sawtooth',.08,200); },
  die(){ const c=AU.ctx; if(!c) return; [660,520,400,300,200].forEach((f,i)=>tone(f,.16,'square',.09,f*.8,c.currentTime+i*.09)); },
  hurry(){ const c=AU.ctx; if(!c) return; for(let i=0;i<4;i++) tone(i%2?660:880,.12,'square',.08,null,c.currentTime+i*.14); },
  skel(){ tone(90,1,'sawtooth',.18,40); noise(.8,.15,400); },
  power(){ const c=AU.ctx; if(!c) return; [523,659,784,1046].forEach((f,i)=>tone(f,.15,'triangle',.1,null,c.currentTime+i*.05)); },
  zap(){ tone(1600,.18,'sawtooth',.06,300); },
  bosshit(){ tone(150,.15,'square',.12,80); noise(.1,.1,1500); },
  boom(){ tone(120,.8,'sawtooth',.25,30); noise(.9,.35,1200); },
  clear(){ const c=AU.ctx; if(!c) return; [523,659,784,1046,784,1046,1318].forEach((f,i)=>tone(f,.22,'triangle',.11,null,c.currentTime+i*.09)); },
  win(){ const c=AU.ctx; if(!c) return; [523,659,784,1046,1318,1568,2093].forEach((f,i)=>tone(f,.28,'triangle',.12,null,c.currentTime+i*.1)); },
  lose(){ const c=AU.ctx; if(!c) return; [392,330,262,196].forEach((f,i)=>tone(f,.35,'sawtooth',.1,f*.9,c.currentTime+i*.16)); },
  star(i){ tone(880*Math.pow(1.26,i),.3,'triangle',.14); tone(1760*Math.pow(1.26,i),.2,'sine',.06); }
};
function setSound(v){ AU.on = v; LS.set('snd', v); }
/* música: secuenciador espacial muy ligero */
const MUS = (()=>{
  let t = 0, step = 0, timer = 0, playing = false;
  const BPM = 132, S = 60/BPM/4;
  const prog = [[60,64,67],[57,60,64],[53,57,60],[55,59,62]];   // C Am F G
  const mtf = m => 440*Math.pow(2,(m-69)/12);
  function tick(){
    const c = AU.ctx; if (!c || !playing) return;
    while (t < c.currentTime + .25){
      const ch = prog[Math.floor(step/16)%4], s = step%16;
      if (s%4===0) tone(mtf(ch[0]-24), S*3.5, 'sawtooth', .07, null, t, AU.musG);
      if (s%2===0) tone(mtf(ch[(s/2)%3]+12), S*1.6, 'triangle', .045, null, t, AU.musG);
      if (s===6 || s===14) tone(mtf(ch[2]+24), S*2.5, 'sine', .03, null, t, AU.musG);
      t += S; step++;
    }
  }
  return {
    start(){ const c = ac(); if (!c || playing) return; playing = true; t = c.currentTime + .1; AU.musG.gain.setTargetAtTime(.5, c.currentTime, .5); timer = setInterval(tick, 80); },
    stop(){ playing = false; clearInterval(timer); if (AU.musG) AU.musG.gain.value = 0; },
    sync(){ (AU.mus && AU.on) ? this.start() : this.stop(); }
  };
})();
function setMusic(v){ AU.mus = v; LS.set('mus', v); MUS.sync(); }

/* ═════════════ FONDO: estrellas, nebulosa y estrellas fugaces ═════════════ */
const BG = (()=>{
  const cv = $('#bg'), cx = cv.getContext('2d');
  let W=0, H=0, stars=[], shoot=null, hue=200, targetHue=200, dpr=1;
  function size(){
    dpr = Math.min(2, devicePixelRatio||1); W = innerWidth; H = innerHeight;
    cv.width = W*dpr; cv.height = H*dpr; cx.setTransform(dpr,0,0,dpr,0,0);
    stars = []; const n = Math.round(W*H/2600);
    for (let i=0;i<n;i++) stars.push({x:Math.random()*W, y:Math.random()*H, z:Math.random()*.9+.1, tw:Math.random()*6.28});
  }
  addEventListener('resize', size); size();
  let last = 0;
  function frame(ts){
    const dt = Math.min(.05, (ts-last)/1000||0); last = ts;
    hue += (targetHue-hue)*Math.min(1, dt*2);
    cx.fillStyle = '#04050d'; cx.fillRect(0,0,W,H);
    const g1 = cx.createRadialGradient(W*.2,H*.15,0,W*.2,H*.15,Math.max(W,H)*.7);
    g1.addColorStop(0,`hsla(${hue},90%,45%,.28)`); g1.addColorStop(1,'transparent');
    cx.fillStyle = g1; cx.fillRect(0,0,W,H);
    const g2 = cx.createRadialGradient(W*.85,H*.85,0,W*.85,H*.85,Math.max(W,H)*.6);
    g2.addColorStop(0,`hsla(${(hue+120)%360},90%,45%,.22)`); g2.addColorStop(1,'transparent');
    cx.fillStyle = g2; cx.fillRect(0,0,W,H);
    for (const s of stars){
      s.y += s.z*s.z*14*dt; if (s.y > H) { s.y = 0; s.x = Math.random()*W; }
      s.tw += dt*2*s.z;
      const a = .35 + .65*Math.abs(Math.sin(s.tw));
      cx.fillStyle = `rgba(220,240,255,${a*s.z})`;
      const r = s.z*1.6; cx.fillRect(s.x, s.y, r, r);
    }
    if (!shoot && Math.random() < dt*.25) shoot = {x:Math.random()*W, y:Math.random()*H*.5, vx:-500-Math.random()*400, vy:250+Math.random()*200, l:1};
    if (shoot){
      shoot.x += shoot.vx*dt; shoot.y += shoot.vy*dt; shoot.l -= dt*1.2;
      const g = cx.createLinearGradient(shoot.x, shoot.y, shoot.x-shoot.vx*.15, shoot.y-shoot.vy*.15);
      g.addColorStop(0, `rgba(255,255,255,${Math.max(0,shoot.l)})`); g.addColorStop(1,'transparent');
      cx.strokeStyle = g; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(shoot.x, shoot.y); cx.lineTo(shoot.x-shoot.vx*.15, shoot.y-shoot.vy*.15); cx.stroke();
      if (shoot.l <= 0) shoot = null;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { setHue(h){ targetHue = h; } };
})();

