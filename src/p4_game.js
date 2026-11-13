
/* ════════════════════════════════════════════════════════════
   PARTIDA: 1 jugador · 2 en el mismo dispositivo · 2 online (QR)
   En online el móvil del anfitrión mueve el mundo y manda la pantalla al invitado ~30 veces por segundo;
   el invitado solo manda sus botones. Así los dos ven exactamente lo mismo a la vez.
   ════════════════════════════════════════════════════════════ */
const cv = $('#cv'), cx = cv.getContext('2d');
let G = null, DPR = 1, VW = 0, VH = 0, rafId = 0, lastT = 0;
const KEYS = {};
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

function resize(){
  DPR = Math.min(2.5, devicePixelRatio||1); VW = innerWidth; VH = innerHeight;
  cv.width = Math.round(VW*DPR); cv.height = Math.round(VH*DPR);
  if (G) layout();
}
addEventListener('resize', resize); resize();
function layout(){
  const land = VW > VH, top = 84, padH = isTouch && !land ? 128 : 10;
  const sideW = isTouch && land ? 0 : 0;
  const s = Math.min((VW - 12 - sideW*2)/GW, (VH - top - padH)/GH);
  G.rect = {x:(VW - GW*s)/2, y: isTouch && !land ? top + Math.min(40, (VH - top - padH - GH*s)*.25) : top + (VH - top - padH - GH*s)/2, s};
}
function showCanvas(on){
  cv.classList.toggle('hidden', !on); $('#hud').classList.toggle('hidden', !on);
  $('#pad').classList.toggle('hidden', !(on && isTouch));
  app.classList.toggle('off', on);
  if (on) app.innerHTML = '';
}

/* ── empezar ── */
function startGame(mode, n, opts){
  opts = opts || {};
  ac(); closeModal(); MUS.sync();
  if (G) stopLoop();
  const nP = mode==='solo' ? 1 : 2;
  G = { mode, n, nP, role: opts.role || null, me: opts.me || 0, names: opts.names || ['JUGADOR 1','JUGADOR 2'], id: Date.now().toString(36)+Math.random().toString(36).slice(2,6),
        runT0: Date.now(), lvT0: Date.now(), lvScore: 0, paused:false, over:false, evq:[], sendT:0, inp:[{l:0,r:0,j:0,b:0},{l:0,r:0,j:0,b:0}], lastSent:'' , startN:n };
  if (mode !== 'guest') G.W = newWorld(n, nP, opts.keep);
  BG.setHue(sectOf(n).h);
  showCanvas(true); layout(); buildPad(); hud(true); startLoop();
  LS.set('last', n);
}
function startLoop(){ cancelAnimationFrame(rafId); lastT = performance.now(); rafId = requestAnimationFrame(loop); }
function stopLoop(){ cancelAnimationFrame(rafId); rafId = 0; }
function exitGame(){ stopLoop(); G = null; showCanvas(false); BG.setHue(200); }

let acc = 0, hudT = 0;
function loop(ts){
  if (!G) return;
  const dt = Math.min(.05, (ts - lastT)/1000); lastT = ts;
  readInputs();
  if (G.mode==='guest'){
    if (G.W){ smooth(G.W, dt); fxStep(G.W, dt); checkGuestEnd(); }
    sendGuestInput();
  } else if (!G.paused && G.W){
    acc += dt; const h = 1/120;
    while (acc >= h){ acc -= h; stepFrame(h); }
  }
  render();
  hudT += dt; if (hudT > .2){ hudT = 0; hud(); }
  if (G && G.mode==='host'){ G.sendT += dt; if (G.sendT >= 1/30){ G.sendT = 0; const s = snapshot(G.W); s.ev = G.evq; G.evq = []; Net.send(Object.assign({t:'s'}, s)); } }
  if (G) rafId = requestAnimationFrame(loop);
}
function stepFrame(h){
  const W = G.W;
  W.players.forEach((p, i)=>{ p.inp = G.mode==='host' && i===1 ? (G.remote || {l:0,r:0,j:0,b:0}) : G.inp[i]; });
  step(W, h);
  if (W.ev.length){ W.ev.forEach(e=>fxEvent(W, e)); if (G.mode==='host') G.evq.push(...W.ev); W.ev = []; }
  if (W.state==='done' && !G.over) levelDone();
  if (W.state==='over' && !G.over) gameOver();
}
function render(){
  const g = cx; g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,cv.width,cv.height);
  if (!G.W){ return; }
  const r = G.rect, col = G.W.def.col;
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  g.save(); g.shadowColor = col; g.shadowBlur = 22; g.strokeStyle = col; g.lineWidth = 2; g.strokeRect(r.x-3, r.y-3, GW*r.s+6, GH*r.s+6); g.restore();
  g.setTransform(DPR*r.s, 0, 0, DPR*r.s, DPR*r.x, DPR*r.y);
  g.save(); g.beginPath(); g.rect(0, 0, GW, GH); g.clip(); drawWorld(g, G.W, DPR*r.s); g.restore();
}

/* ── HUD ── */
function hud(full){
  if (!G) return;
  const W = G.W, el = $('#hud');
  const pl = i => { const p = W && W.players[i]; if (!p) return '<div></div>';
    const ext = EXT.split('').map((ch, k)=>k < (p.ext||'').length ? `<i>${ch}</i>` : ch).join('');
    return `<div class="pl" style="${i?'align-items:flex-end':''}"><small style="color:${P_COL[i]}">${esc(G.names[i]||'J'+(i+1))}</small><b>${fmt(p.score)}</b><small>${p.out ? '💀' : '❤'.repeat(Math.max(0, Math.min(p.lives, 6)))}</small><span class="ext">${ext}</span></div>`; };
  const hi = Math.max((USER && USER.user.record) || 0, LS.get('hi', 0));
  el.innerHTML = `${pl(0)}<div class="mid"><small>NIVEL</small><b style="color:${W?W.def.col:'#fff'}">${W?W.n:G.n}</b><small>RÉCORD ${fmt(hi)}</small></div>${G.nP>1 ? pl(1) : ''}<button class="hIco" id="hP">⏸</button>`;
  $('#hP').onclick = ()=>pause();
}

/* ── fin de nivel ── */
function levelDone(){
  const W = G.W, n = W.n, seg = Math.round((Date.now() - G.lvT0)/1000);
  const stars = seg <= 30 && !W.deaths ? 3 : seg <= 60 ? 2 : 1;
  const total = W.players.reduce((a,p)=>a+p.score, 0), pts = Math.max(0, total - G.lvScore);
  const pg = LS.get('prog', {}), old = pg[n] || [0,0];
  pg[n] = [Math.max(old[0], stars), Math.max(old[1], pts)]; LS.set('prog', pg);
  if (USER) call('nivel', {ses:USER.ses, nivel:n, estrellas:stars, puntos:pts, disparos:0, seg:Math.max(2,seg), id:G.id+'_'+n})
    .then(r=>{ if (r.user){ USER.user = r.user; LS.set('user', USER); } }).catch(()=>{});
  if (n >= NIV){ G.over = true; return victory(); }
  /* siguiente nivel sin cortar la partida, como en el original */
  const keep = W.players.map(p=>({lives:p.lives, score:p.score, ext:p.ext, out:p.out}));
  const W2 = newWorld(n+1, G.nP, keep);
  text(W2, GW/2, GH/2 + 52, '★'.repeat(stars) + '☆'.repeat(3-stars) + '   NIVEL ' + n + ' EN ' + seg + ' s', '#ffd23f', 15, true);
  G.W = W2; G.n = n+1; G.lvT0 = Date.now(); G.lvScore = total;
  BG.setHue(sectOf(n+1).h); LS.set('last', n+1);
  if (G.mode==='host') G.evq.push(['clear']);
}
function runScore(){ return G.W.players.reduce((a,p)=>Math.max(a, p.score), 0); }
function saveRun(){
  const sc = runScore(), hi = LS.get('hi', 0); if (sc > hi) LS.set('hi', sc);
  if (USER && G.mode !== 'guest') return call('partida', {ses:USER.ses, puntos:sc, nivel:G.W.n, seg:Math.round((Date.now()-G.runT0)/1000), id:G.id})
    .then(r=>{ if (r.user){ USER.user = r.user; LS.set('user', USER); } return r; }).catch(()=>null);
  return Promise.resolve(null);
}
function gameOver(){
  G.over = true; SFX.lose();
  const n = G.W.n, sc = runScore(), hiAntes = Math.max((USER && USER.user.record) || 0, LS.get('hi', 0));
  setTimeout(()=>{
    if (!G) return;
    saveRun();
    const host = G.mode !== 'guest';
    modal(`<h2 class="t" style="color:#ff3355">💥 FIN DE LA PARTIDA</h2>
      <div class="ptxt">Has llegado al nivel <b style="color:#fff">${n}</b></div>
      <div class="bigNum">${fmt(sc)}</div>
      ${sc > hiAntes && sc > 0 ? '<div class="banner">🏆 ¡NUEVO RÉCORD!</div>' : ''}
      ${host ? `<button class="btn huge cy pulse" id="gC">↻ CONTINUAR DESDE EL NIVEL ${n}</button>` : '<div class="ptxt">Esperando a que el anfitrión decida…</div>'}
      <button class="btn ghost" id="gM">🏠 Menú</button>`);
    if ($('#gC')) $('#gC').onclick = ()=>{ SFX.click(); continueGame(n); };
    $('#gM').onclick = ()=>{ SFX.click(); Net.close(true); exitGame(); showMenu(); };
  }, 1200);
}
function continueGame(n){
  if (G.mode==='host'){ const names = G.names; startGame('host', n, {role:'host', names}); Net.send({t:'start', n, names}); }
  else startGame(G.mode, n);
}
function victory(){
  SFX.win(); confetti(); saveRun();
  const sc = runScore();
  setTimeout(()=>{ if (!G) return; confetti();
    modal(`<h2 class="t" style="color:#ffd23f">🏆 ¡GALAXIA SALVADA!</h2>
      <div class="ptxt">Habéis derrotado al jefe final y superado los <b>100 niveles</b>. ¡Increíble!</div>
      <div style="text-align:center;font-size:56px">🤖🫧👑</div>
      <div class="bigNum">${fmt(sc)}</div>
      <button class="btn huge cy" id="vM">🏠 MENÚ</button>`);
    $('#vM').onclick = ()=>{ Net.close(true); exitGame(); showMenu(); };
  }, 2500);
}
function checkGuestEnd(){
  const W = G.W; if (!W || G.over) return;
  if (W.state==='over'){ G.over = true; gameOver(); G.over = true; }
  if (W.n===100 && W.boss && W.boss.dead && W.state==='done'){ G.over = true; victory(); }
}

function pause(){
  if (!G || G.over) return;
  const online = G.mode==='host' || G.mode==='guest';
  if (!online) G.paused = true;
  SFX.click();
  modal(`<h2 class="t">⏸ PAUSA</h2>
    ${online ? '<div class="ptxt" style="font-size:14px">A dobles online la partida sigue corriendo.</div>' : ''}
    <button class="btn huge cy" id="pC">▶ CONTINUAR</button>
    <div class="row"><button class="btn ghost" id="pS">${AU.on?'🔊':'🔇'} Sonido</button><button class="btn ghost" id="pM">${AU.mus?'🎵':'🚫'} Música</button></div>
    <button class="btn ghost" id="pH">❓ Controles</button>
    <button class="btn ghost" id="pX">🚪 Salir al menú</button>`, resume);
  $('#pC').onclick = resume;
  $('#pS').onclick = ()=>{ setSound(!AU.on); MUS.sync(); $('#pS').textContent = (AU.on?'🔊':'🔇')+' Sonido'; };
  $('#pM').onclick = ()=>{ setMusic(!AU.mus); $('#pM').textContent = (AU.mus?'🎵':'🚫')+' Música'; };
  $('#pH').onclick = ()=>howTo(true);
  $('#pX').onclick = ()=>{ if (G.mode !== 'guest' && G.W) saveRun(); Net.close(true); closeModal(); exitGame(); showMenu(); };
}
function resume(){ closeModal(); if (G){ G.paused = false; lastT = performance.now(); } }
document.addEventListener('visibilitychange', ()=>{ if (document.hidden && G && !G.over && !G.paused && (G.mode==='solo' || G.mode==='local2')) pause(); });

function confetti(){
  const c = document.createElement('canvas'); c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:30;pointer-events:none';
  document.body.appendChild(c); const g = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight;
  const P = []; for (let i=0;i<160;i++) P.push({x:innerWidth/2 + rnd(-60,60), y:innerHeight*.45, vx:rnd(-520,520), vy:rnd(-900,-250), r:rnd(0,6), vr:rnd(-10,10), c:COL[Math.floor(Math.random()*6)].c, w:rnd(5,10), h:rnd(8,16)});
  const t0 = performance.now();
  const f = ts=>{ const dt = .016, el = (ts-t0)/1000; g.clearRect(0,0,c.width,c.height);
    for (const p of P){ p.vy += 900*dt; p.vx *= .99; p.x += p.vx*dt; p.y += p.vy*dt; p.r += p.vr*dt; g.save(); g.translate(p.x,p.y); g.rotate(p.r); g.fillStyle = p.c; g.globalAlpha = Math.max(0, 1-el/3); g.fillRect(-p.w/2,-p.h/2,p.w,p.h); g.restore(); }
    if (el < 3) requestAnimationFrame(f); else c.remove(); };
  requestAnimationFrame(f);
}

/* ═════════════ CONTROLES ═════════════ */
/* mando táctil */
const TOUCH = {l:0, r:0, j:0, b:0};
function buildPad(){
  const p = $('#pad'); if (!isTouch){ p.innerHTML = ''; return; }
  p.innerHTML = `<div class="grp"><button data-k="l">◀</button><button data-k="r">▶</button></div>
    <div class="grp"><button class="bub" data-k="b">🫧</button><button class="jmp" data-k="j">SALTO</button></div>`;
  p.querySelectorAll('button').forEach(b=>{
    const k = b.dataset.k;
    const on = e=>{ e.preventDefault(); ac(); TOUCH[k] = 1; b.classList.add('on'); vib(8); };
    const off = e=>{ e.preventDefault(); TOUCH[k] = 0; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
    b.addEventListener('contextmenu', e=>e.preventDefault());
  });
}
addEventListener('keydown', e=>{
  if (!G) return;
  if (e.code==='Escape' || e.code==='KeyP'){ if ($('#modal')) resume(); else pause(); return; }
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code) && !$('#modal')) e.preventDefault();
  KEYS[e.code] = true;
});
addEventListener('keyup', e=>{ KEYS[e.code] = false; });
addEventListener('blur', ()=>{ for (const k in KEYS) KEYS[k] = false; });
function padState(i){
  const gp = navigator.getGamepads ? navigator.getGamepads()[i] : null; if (!gp) return null;
  const ax = gp.axes[0] || 0, B = k => gp.buttons[k] && gp.buttons[k].pressed ? 1 : 0;
  return {l: ax < -.4 || B(14) ? 1 : 0, r: ax > .4 || B(15) ? 1 : 0, j: B(0) || B(12) ? 1 : 0, b: B(2) || B(1) || B(3) ? 1 : 0};
}
function readInputs(){
  if (!G) return;
  const K = c => KEYS[c] ? 1 : 0, or = (...a) => a.reduce((x,y)=>x||y, 0) ? 1 : 0;
  const two = G.mode==='local2';
  const kb1 = two
    ? {l:K('KeyA'), r:K('KeyD'), j:K('KeyW'), b:or(K('KeyF'), K('Space'))}
    : {l:or(K('ArrowLeft'), K('KeyA')), r:or(K('ArrowRight'), K('KeyD')), j:or(K('ArrowUp'), K('KeyW'), K('KeyX'), K('KeyK')), b:or(K('Space'), K('KeyZ'), K('KeyJ'), K('KeyF'))};
  const g0 = padState(0) || {}, g1 = padState(1) || {};
  const mine = {l:or(kb1.l, TOUCH.l, g0.l), r:or(kb1.r, TOUCH.r, g0.r), j:or(kb1.j, TOUCH.j, g0.j), b:or(kb1.b, TOUCH.b, g0.b)};
  if (G.mode==='guest'){ G.inp[1] = mine; return; }
  G.inp[0] = mine;
  if (two) G.inp[1] = {l:or(K('ArrowLeft'), g1.l), r:or(K('ArrowRight'), g1.r), j:or(K('ArrowUp'), g1.j), b:or(K('Enter'), K('KeyL'), K('Numpad0'), g1.b)};
}
let inpT = 0;
function sendGuestInput(){
  const i = G.inp[1], s = '' + i.l + i.r + i.j + i.b, now = performance.now();
  if (s !== G.lastSent || now - inpT > 250){ G.lastSent = s; inpT = now; Net.send({t:'in', k:s}); }
}
