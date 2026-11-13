
/* ════════════════════════════════════════════════════════════
   MOTOR GALAXYPOP (tipo Bubble Bobble) · pantalla lógica 512 x 416, baldosas de 16
   ════════════════════════════════════════════════════════════ */
const T = 16, MW = 32, MH = 26, GW = MW*T, GH = MH*T;
const GRAV = 900, MAXFALL = 170, JUMP = -372, PSPEED = 88;
const BUB_R = 11, BUB_LIFE = 9, TRAP_LIFE = 7.5;
const P_COL = ['#2dff8a', '#2bf0ff'];
const EXT = 'EXTEND';

/* ── PNG propios (opcionales, sin fondo) ── */
const IMG = {};
function loadImg(k, src){ const i = new Image(); i.onload = ()=>{ IMG[k] = i; }; i.src = src + '?v=' + IMGV; }
function loadImages(){
  ['p1','p2','burbuja','boss','fantasma','logo','fondo'].forEach(k=>loadImg(k, 'img/'+k+'.png'));
  for (let i=1;i<=6;i++) loadImg('e'+i, 'img/e'+i+'.png');
  for (let i=1;i<=10;i++) loadImg('i'+i, 'img/i'+i+'.png');
  loadImg('bloque', 'img/bloque.png');
}

/* ── tipos de enemigo ── */
const ETYPES = [
  {k:'walker',  n:'ZÚMBOT',    c:'#ff7a1a', img:'e1'},
  {k:'jumper',  n:'SALTÓN',    c:'#ffc53b', img:'e2'},
  {k:'flyer',   n:'MEDUSA',    c:'#ff2bd6', img:'e3'},
  {k:'shooter', n:'LÁSER-OJO', c:'#ff3355', img:'e4'},
  {k:'roller',  n:'RUEDATRÓN', c:'#a46bff', img:'e5'},
  {k:'ghost',   n:'ESPECTRO',  c:'#eaf6ff', img:'e6'}
];
const ITEMS = [
  {e:'🍬', p:100}, {e:'🍩', p:200}, {e:'🍦', p:300}, {e:'⭐', p:500}, {e:'🌙', p:700},
  {e:'🪐', p:1000}, {e:'💎', p:2000}, {e:'🚀', p:3000}, {e:'🛸', p:5000}, {e:'👑', p:8000}
];

/* ═════════════ 100 NIVELES (siempre iguales, generados a partir del número) ═════════════ */
const LV_PATTERNS = ['shelves','stairs','boxes','islands','zigzag','pillars','cross','tunnel','arena','steps','rings','comb','vee','diamond','maze'];
function levelDef(n){
  const r = RNG(n*977 + 5);
  const g = []; for (let y=0;y<MH;y++){ g.push(new Array(MW).fill(0)); }
  for (let y=0;y<MH;y++){ g[y][0] = g[y][1] = g[y][MW-1] = g[y][MW-2] = 2; }
  const gap = n > 3 && (n % 3 === 0 || n % 7 === 0);
  for (let x=2;x<MW-2;x++){ const inGap = gap && x >= 13 && x <= 18; g[0][x] = inGap ? 0 : 1; g[MH-1][x] = inGap ? 0 : 1; }
  const set = (x, y) => { if (x>=2 && x<MW-2 && y>0 && y<MH-1){ g[y][x] = 1; g[y][MW-1-x] = 1; } };  /* simétrico */
  const seg = (x0, x1, y) => { for (let x=x0;x<=x1;x++) set(x, y); };
  const rows = [21,17,13,9,5];
  const pat = n===100 ? 'boss' : n<=2 ? 'shelves' : LV_PATTERNS[(n*7 + Math.floor(n/10)*3) % LV_PATTERNS.length];
  const ri = (a,b) => a + Math.floor(r()*(b-a+1));
  switch (pat){
    case 'shelves': rows.forEach((y,i)=>{ seg(2, ri(5,8), y); if (i%2===0) seg(ri(11,13), 15, y); }); break;
    case 'stairs': rows.forEach((y,i)=>{ const x = 3 + (i%3)*4; seg(x, x+3, y); seg(x+1, x+2, y+2 > 23 ? y : y+2); }); break;
    case 'boxes': rows.slice(0,4).forEach((y,i)=>{ if (i%2) { seg(5, 10, y); } else { seg(2,4,y); seg(11,15,y); } }); seg(6,9,5); seg(4,4,6); seg(11,11,6); break;
    case 'islands': rows.forEach((y,i)=>{ for (let x = 2 + (i%2)*3; x < 15; x += 6) seg(x, x+2, y); }); break;
    case 'zigzag': rows.forEach((y,i)=>{ if (i%2) seg(2, 11, y); else seg(6, 15, y); }); break;
    case 'pillars': rows.forEach(y=>{ seg(2,4,y); seg(9,11,y); }); for (let y=6;y<24;y+=2) set(7, y); break;
    case 'cross': rows.forEach((y,i)=>{ seg(2, 5, y); if (i===2) seg(8, 15, y); }); for (let y=7;y<21;y+=2) set(14, y); break;
    case 'tunnel': rows.forEach((y,i)=>{ seg(2, 12, y); }); break;
    case 'arena': seg(2,6,21); seg(10,15,17); seg(2,6,13); seg(10,15,9); seg(5,9,5); break;
    case 'steps': for (let i=0;i<5;i++){ seg(2+i*2, 4+i*2, 21-i*4); } seg(13,15,5); break;
    case 'rings': rows.forEach((y,i)=>{ seg(4,7,y); seg(12,15,y); }); seg(9,10,11); break;
    case 'comb': rows.forEach(y=>{ for (let x=2;x<16;x+=3) seg(x, x+1, y); }); break;
    case 'vee': rows.forEach((y,i)=>{ seg(2+i*2, 6+i*2 > 15 ? 15 : 6+i*2, y); }); break;
    case 'diamond': seg(10,15,5); seg(6,11,9); seg(2,7,13); seg(6,11,17); seg(10,15,21); break;
    case 'maze': rows.forEach((y,i)=>{ seg(2, ri(6,9), y); seg(ri(11,12), 15, y - (i%2)*2); }); break;
    case 'boss': seg(2,5,21); seg(2,5,13); seg(9,11,17); seg(9,11,9); break;
  }
  /* zona de salida de los jugadores siempre libre */
  for (let y=21;y<MH-1;y++) for (let x of [2,3,4,27,28,29]) if (y>21) g[y][x] = 0;
  /* enemigos */
  const pool = ['walker']; if (n>=5) pool.push('jumper'); if (n>=12) pool.push('flyer'); if (n>=22) pool.push('shooter'); if (n>=35) pool.push('roller'); if (n>=50) pool.push('ghost');
  const kinds = []; const nk = Math.min(pool.length, 1 + Math.floor(n/18) + (n%2));
  for (let i=0;i<nk;i++) kinds.push(pool[pool.length-1-((n+i*3)%pool.length)]);
  if (!kinds.includes(pool[pool.length-1]) && n % 4 === 0) kinds[0] = pool[pool.length-1];
  const count = n===100 ? 0 : Math.min(9, 3 + Math.floor(n/12) + (n%5===0?1:0));
  const spots = [];
  for (let y=3;y<MH-3;y++) for (let x=3;x<MW-3;x++) if (g[y][x]===1 && g[y-1][x]===0 && g[y-2][x]===0) spots.push([x, y]);
  spots.sort((a,b)=>a[1]-b[1]);
  const top = spots.slice(0, Math.max(count*2, Math.ceil(spots.length*.6)));
  const enemies = [];
  for (let i=0;i<count;i++){
    const s = top.length ? top.splice(Math.floor(r()*top.length),1)[0] : [8+i*2, 4];
    enemies.push({k: kinds[i % kinds.length], x: s[0]*T, y: (s[1]-1)*T});
  }
  const airX = [GW/2, GW*.3, GW*.7][n % 3];
  const sc = sectOf(n);
  return { n, g, enemies, airX, hue: sc.h, col: sc.c, hurry: 32 + Math.min(25, n*.25), pat };
}

/* ═════════════ MUNDO ═════════════ */
let UID = 1;
function newWorld(n, nPlayers, keep){
  const def = levelDef(n);
  const W = { def, n, t:0, clearT:0, ev:[], parts:[], texts:[], bubbles:[], items:[], proj:[], corpses:[], enemies:[], players:[], skel:null, boss:null,
              hurry:false, extT: 9 + Math.random()*6, state:'intro', introT:1.6, combos:0, deaths:0 };
  for (let i=0;i<nPlayers;i++){
    const old = keep && keep[i];
    W.players.push({ id:i, x: i ? (MW-5)*T : 3*T, y:(MH-2)*T, w:14, h:16, vx:0, vy:0, face: i ? -1 : 1, onGround:false,
      lives: old ? old.lives : 3, score: old ? old.score : 0, ext: old ? old.ext : '', inv: 2, dead:0, out: old ? old.out : false, cd:0, blow:0, anim:0,
      inp:{l:0,r:0,j:0,b:0}, pj:0, pb:0 });
  }
  W.players.forEach(p=>{ if (p.out){ p.dead = 0; } });
  def.enemies.forEach((e,i)=>W.enemies.push(mkEnemy(e.k, e.x, e.y, i)));
  if (n===100) W.boss = { x: GW/2-32, y: 60, w:64, h:64, vx:70, vy:55, hp:36, max:36, flash:0, t:0, shootT:3, dead:0 };
  return W;
}
function mkEnemy(k, x, y, i){
  return { id: UID++, k, x, y, w:14, h:16, vx:0, vy:0, dir: i%2 ? -1 : 1, angry:false, trapped:null, t: Math.random()*2, jumpT: 1 + Math.random()*2, shotT: 2 + Math.random()*2,
           enter: 1.2, ty: y, onGround:false, anim:0 };
}
const solidAt = (W, tx, ty) => { if (ty < 0 || ty >= MH) return 0; if (tx < 0 || tx >= MW) return 2; return W.def.g[ty][tx]; };

/* cuerpo con gravedad que aterriza sobre plataformas (se atraviesan desde abajo, como en el original) */
function moveBody(W, e, dt, noGrav){
  if (!noGrav) e.vy = Math.min(e.vy + GRAV*dt, MAXFALL);
  e.x += e.vx*dt;
  let hit = 0;
  if (e.x < 2*T){ e.x = 2*T; hit = -1; } else if (e.x + e.w > GW - 2*T){ e.x = GW - 2*T - e.w; hit = 1; }
  const prevB = e.y + e.h;
  e.y += e.vy*dt; e.onGround = false;
  if (e.vy >= 0){
    const b = e.y + e.h, row = Math.floor(b / T);
    if (row >= 0 && row < MH && prevB <= row*T + 2){
      const x0 = Math.floor((e.x+2)/T), x1 = Math.floor((e.x+e.w-2)/T);
      for (let x=x0;x<=x1;x++) if (solidAt(W, x, row)){ e.y = row*T - e.h; e.vy = 0; e.onGround = true; break; }
    }
  } else if (e.y < T){
    const x0 = Math.floor((e.x+2)/T), x1 = Math.floor((e.x+e.w-2)/T); let c = false;
    for (let x=x0;x<=x1;x++) if (solidAt(W, x, 0)) c = true;
    if (c){ e.y = T; e.vy = 0; }
  }
  if (e.y > GH) e.y = -e.h;            /* cae por el hueco de abajo y sale por arriba */
  if (e.y < -e.h*2) e.y = GH - e.h;
  return hit;
}
const overlap = (a, b, m) => { m = m||0; return a.x+m < b.x+b.w && a.x+a.w-m > b.x && a.y+m < b.y+b.h && a.y+a.h-m > b.y; };
const groundAhead = (W, e, dir) => { const fx = Math.floor((dir > 0 ? e.x + e.w + 1 : e.x - 1)/T), fy = Math.floor((e.y + e.h + 2)/T); return solidAt(W, fx, fy); };
function ev(W, ...a){ W.ev.push(a); }
function nearestP(W, e){ let best = null, bd = 1e9; for (const p of W.players){ if (p.dead || p.out) continue; const d = Math.abs(p.x-e.x) + Math.abs(p.y-e.y); if (d < bd){ bd = d; best = p; } } return best; }

/* ═════════════ PASO DE SIMULACIÓN (lo ejecuta solo el anfitrión) ═════════════ */
function step(W, dt){
  W.t += dt;
  if (W.state==='intro'){ W.introT -= dt; if (W.introT <= 0) W.state = 'play'; }
  const play = W.state==='play' || W.state==='clear';
  /* jugadores */
  for (const p of W.players){
    if (p.out) continue;
    p.cd = Math.max(0, p.cd - dt); p.inv = Math.max(0, p.inv - dt); p.blow = Math.max(0, p.blow - dt);
    if (p.dead){ p.dead -= dt; if (p.dead <= 0){ if (p.lives <= 0){ p.out = true; ev(W,'out',p.id); } else { p.x = p.id ? (MW-5)*T : 3*T; p.y = (MH-2)*T; p.vx = p.vy = 0; p.inv = 2.5; } } continue; }
    const I = p.inp;
    p.vx = (I.r - I.l) * PSPEED; if (p.vx) p.face = Math.sign(p.vx);
    if (I.j && !p.pj && p.onGround){ p.vy = JUMP; ev(W,'jump'); }
    if (I.b && !p.pb && p.cd <= 0 && play){ p.cd = .32; p.blow = .2; shoot(W, p); }
    p.pj = I.j; p.pb = I.b;
    moveBody(W, p, dt);
    p.anim += dt * (p.vx ? 10 : 2);
  }
  if (!play) { fxStep(W, dt); return; }
  /* prisa */
  if (!W.hurry && W.t > W.def.hurry && W.enemies.length){ W.hurry = true; W.enemies.forEach(e=>e.angry = true); ev(W,'hurry'); }
  if (W.hurry && !W.skel && W.t > W.def.hurry + 18 && W.enemies.length){ W.skel = {x: GW/2-12, y: -30, w:24, h:24, sp:30}; ev(W,'skel'); }
  /* enemigos */
  for (const e of W.enemies){
    if (e.trapped) continue;
    if (e.enter > 0){ e.enter -= dt; e.y = e.ty - Math.max(0, e.enter)*180; continue; }
    e.t += dt; e.anim += dt*8;
    enemyAI(W, e, dt);
  }
  /* jefe final */
  if (W.boss && !W.boss.dead) bossStep(W, dt);
  if (W.skel){ const s = W.skel, p = nearestP(W, s); s.sp = Math.min(90, s.sp + dt*2.5);
    if (p){ const dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy) || 1; s.x += dx/d*s.sp*dt; s.y += dy/d*s.sp*dt; } }
  /* burbujas */
  for (const b of W.bubbles) bubbleStep(W, b, dt);
  W.bubbles = W.bubbles.filter(b=>!b.gone);
  /* cuerpos que vuelan y se convierten en premio */
  for (const c of W.corpses){ c.t += dt; c.rot += dt*12; c.vy = Math.min(c.vy + GRAV*dt, 400); c.x += c.vx*dt; c.y += c.vy*dt;
    if (c.x < 2*T || c.x > GW-2*T-14){ c.vx = -c.vx; c.x = clamp(c.x, 2*T, GW-2*T-14); }
    if (c.y > GH) c.y = -16;
    if (c.t > .9 && c.vy > 0){ const row = Math.floor((c.y+16)/T), tx = Math.floor((c.x+7)/T); if (solidAt(W, tx, row) && c.y+16 - row*T < 10){ c.done = true;
      W.items.push({id:UID++, x:c.x, y: row*T-16, kind:c.kind, t:0}); } } }
  W.corpses = W.corpses.filter(c=>!c.done);
  /* premios */
  for (const it of W.items){ it.t += dt; for (const p of W.players){ if (!p.dead && !p.out && it.t > .3 && overlap(p, {x:it.x, y:it.y, w:16, h:16})){ it.got = true; const pts = ITEMS[it.kind].p; p.score += pts; ev(W,'item', it.x+8, it.y, pts, p.id); } } if (it.t > 9) it.got = true; }
  W.items = W.items.filter(i=>!i.got);
  /* disparos enemigos */
  for (const pr of W.proj){ pr.x += pr.vx*dt; pr.y += (pr.vy||0)*dt; pr.t += dt; if (pr.x < 2*T || pr.x > GW-2*T || pr.y < 0 || pr.y > GH || pr.t > 4) pr.gone = true; }
  W.proj = W.proj.filter(p=>!p.gone);
  /* letras EXTEND */
  W.extT -= dt;
  if (W.extT <= 0 && W.enemies.length){ W.extT = 14 + Math.random()*10; const p = W.players.find(q=>!q.out) || W.players[0], need = EXT[p.ext.length] || 'E';
    W.bubbles.push({id:UID++, x: W.def.airX, y: GH-2*T, vx:0, vy:-40, r:BUB_R+2, phase:'float', t:0, life: 12, owner:-1, letter: need, enemy:null}); }
  /* choques mortales */
  for (const p of W.players){
    if (p.dead || p.out || p.inv > 0) continue;
    let die = false;
    for (const e of W.enemies) if (!e.trapped && e.enter <= 0 && overlap(p, e, 3)) die = true;
    for (const pr of W.proj) if (overlap(p, {x:pr.x-4, y:pr.y-3, w:8, h:6})) die = true;
    if (W.skel && overlap(p, W.skel, 4)) die = true;
    if (W.boss && !W.boss.dead && overlap(p, W.boss, 8)) die = true;
    if (die){ p.dead = 1.6; p.lives--; W.deaths++; ev(W,'die', p.x+7, p.y+8, p.id); }
  }
  /* ¿nivel superado? */
  const alive = W.enemies.length + W.corpses.length + (W.boss && !W.boss.dead ? 1 : 0);
  if (W.state==='play' && alive === 0){ W.state = 'clear'; W.clearT = W.n===100 ? 5 : 3.2; W.skel = null; W.proj = []; ev(W,'clear'); }
  if (W.state==='clear'){ W.clearT -= dt; if (W.clearT <= 0) W.state = 'done'; }
  if (W.players.every(p=>p.out) && W.state !== 'over'){ W.state = 'over'; ev(W,'over'); }
  fxStep(W, dt);
}

function shoot(W, p){
  const b = {id:UID++, x: p.x + 7 + p.face*10, y: p.y + 8, vx: p.face*330, vy:0, r:BUB_R, phase:'shoot', t:0, life: BUB_LIFE, owner:p.id, enemy:null};
  W.bubbles.push(b); ev(W,'shoot', p.id);
}
function bubbleStep(W, b, dt){
  b.t += dt;
  if (b.phase==='shoot'){
    b.vx *= Math.pow(.004, dt); b.x += b.vx*dt;
    if (b.x < 2*T + b.r){ b.x = 2*T + b.r; b.vx = 0; } if (b.x > GW-2*T-b.r){ b.x = GW-2*T-b.r; b.vx = 0; }
    /* atrapar enemigo */
    for (const e of W.enemies){
      if (e.trapped || e.enter > 0) continue;
      if (Math.hypot(e.x+7-b.x, e.y+8-b.y) < b.r + 8){ e.trapped = b; b.enemy = e; b.phase = 'float'; b.t = 0; b.life = TRAP_LIFE; b.vy = -30; ev(W,'trap', b.x, b.y); break; }
    }
    if (W.boss && !W.boss.dead && Math.hypot(W.boss.x+32-b.x, W.boss.y+32-b.y) < 34 + b.r){ W.boss.hp--; W.boss.flash = .15; b.gone = true; ev(W,'bosshit', b.x, b.y);
      if (W.boss.hp <= 0){ W.boss.dead = 1; ev(W,'bossdie', W.boss.x+32, W.boss.y+32); for (let k=0;k<8;k++) W.corpses.push({x:W.boss.x+24, y:W.boss.y+24, vx:rnd(-160,160), vy:rnd(-420,-200), rot:0, t:0, kind:9-(k%3)}); W.players.forEach(p=>{ if (!p.out) p.score += 50000; }); } }
    if (Math.abs(b.vx) < 40 && !b.gone){ b.phase = 'float'; b.vy = -40; b.t = 0; }
  } else {
    /* flota hacia arriba y luego se va hacia la corriente de aire */
    const topY = 2*T + b.r;
    if (b.y > topY){ b.y -= 40*dt; b.x += Math.sin(W.t*2 + b.id)*8*dt; }
    else { b.y = topY + Math.sin(W.t*3 + b.id)*2; b.x += clamp(W.def.airX - b.x, -1, 1) * 30 * dt; }
    for (const o of W.bubbles){ if (o === b || o.gone) continue; const dx = b.x - o.x, dy = b.y - o.y, d = Math.hypot(dx, dy); if (d < b.r + o.r - 2 && d > .01){ const push = (b.r + o.r - 2 - d)*.5; b.x += dx/d*push; b.y += dy/d*push*.5; } }
    b.x = clamp(b.x, 2*T + b.r, GW - 2*T - b.r);
    if (b.enemy) { b.enemy.x = b.x - 7; b.enemy.y = b.y - 8; }
  }
  /* el jugador toca la burbuja */
  if (b.t > .12 || b.phase==='float'){
    for (const p of W.players){
      if (p.dead || p.out || b.gone) continue;
      const cx = p.x + 7, cy = p.y + 8, d = Math.hypot(cx - b.x, cy - b.y);
      if (d < b.r + 8){
        if (p.vy > 0 && p.y + p.h < b.y - 2 && p.inp.j){ p.vy = JUMP*.82; ev(W,'boing'); continue; }   /* saltar encima de la burbuja */
        popBubble(W, b, p);
      }
    }
  }
  /* se acaba el tiempo */
  b.life -= dt;
  if (b.life <= 0 && !b.gone){
    b.gone = true;
    if (b.enemy){ const e = b.enemy; e.trapped = null; e.angry = true; e.vy = -150; ev(W,'free', b.x, b.y); }
    else ev(W,'fizz', b.x, b.y);
  }
}
function popBubble(W, b, p){
  /* reacción en cadena con las burbujas que se tocan */
  const chain = [b], seen = new Set([b]);
  for (let i=0;i<chain.length;i++){ const a = chain[i]; for (const o of W.bubbles){ if (!seen.has(o) && !o.gone && o.phase==='float' && Math.hypot(a.x-o.x, a.y-o.y) < a.r + o.r + 5){ seen.add(o); chain.push(o); } } }
  let kills = 0;
  chain.forEach((c, i)=>{
    c.gone = true; ev(W,'pop', c.x, c.y, i);
    if (c.letter){ p.ext += (EXT[p.ext.length] === c.letter ? c.letter : ''); ev(W,'letter', c.x, c.y, p.id, c.letter);
      if (p.ext.length >= EXT.length){ p.ext = ''; p.lives++; ev(W,'extend', p.id); } }
    if (c.enemy){ kills++; const e = c.enemy, pts = 1000 * Math.pow(2, kills-1);
      p.score += pts; ev(W,'kill', c.x, c.y, Math.min(pts, 64000));
      W.enemies = W.enemies.filter(x=>x!==e);
      const kind = clamp(Math.floor(Math.random()*3) + Math.min(6, Math.floor(W.n/14)) + (kills-1), 0, 9);
      W.corpses.push({x:e.x, y:e.y, vx: rnd(-140,140), vy: rnd(-380,-220), rot:0, t:0, kind});
    } else p.score += 10;
  });
  if (kills >= 2) ev(W,'combo', b.x, b.y, kills);
}
function enemyAI(W, e, dt){
  const sp = (e.angry ? 1.6 : 1) * ({walker:46, jumper:38, flyer:52, shooter:40, roller:92, ghost:26}[e.k] || 40);
  const p = nearestP(W, e);
  if (e.k==='flyer'){
    if (!e.vx){ e.vx = sp*e.dir; e.vy = sp*.8; }
    e.x += e.vx*dt; e.y += e.vy*dt;
    if (e.x < 2*T){ e.x = 2*T; e.vx = Math.abs(e.vx); } if (e.x > GW-2*T-e.w){ e.x = GW-2*T-e.w; e.vx = -Math.abs(e.vx); }
    if (e.y < T){ e.y = T; e.vy = Math.abs(e.vy); } if (e.y > GH-2*T){ e.y = GH-2*T; e.vy = -Math.abs(e.vy); }
    const m = Math.hypot(e.vx, e.vy) || 1; e.vx = e.vx/m*sp*1.25; e.vy = e.vy/m*sp; e.dir = Math.sign(e.vx);
    return;
  }
  if (e.k==='ghost'){
    if (p){ const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1; e.x += dx/d*sp*dt; e.y += dy/d*sp*dt + Math.sin(e.t*3)*10*dt; e.dir = Math.sign(dx) || e.dir; }
    e.x = clamp(e.x, 2*T, GW-2*T-e.w); e.y = clamp(e.y, T, GH-2*T);
    return;
  }
  e.vx = e.dir * sp;
  const hit = moveBody(W, e, dt);
  if (hit) e.dir = -hit;
  if (e.onGround){
    if (e.k !== 'roller' && !groundAhead(W, e, e.dir) && Math.random() < .6) e.dir = -e.dir;
    e.jumpT -= dt;
    const wantUp = p && p.y < e.y - T*2 && Math.abs(p.x - e.x) < T*6;
    if (e.k==='jumper' && e.jumpT <= 0){ e.vy = JUMP*.95; e.jumpT = .9 + Math.random()*1.2; if (p) e.dir = Math.sign(p.x - e.x) || e.dir; }
    else if (e.k !== 'roller' && wantUp && e.jumpT <= 0){ e.vy = JUMP; e.jumpT = 2 + Math.random()*2; }
    else if (e.jumpT <= 0) e.jumpT = 1 + Math.random()*2;
    if (p && Math.random() < dt*.25) e.dir = Math.sign(p.x - e.x) || e.dir;
  }
  if (e.k==='shooter'){ e.shotT -= dt;
    if (p && e.shotT <= 0 && Math.abs(p.y - e.y) < 10){ e.dir = Math.sign(p.x - e.x) || e.dir; e.shotT = e.angry ? 1.8 : 3; W.proj.push({x: e.x + 7 + e.dir*8, y: e.y + 7, vx: e.dir*170, t:0}); ev(W,'zap'); } }
}
function bossStep(W, dt){
  const b = W.boss; b.t += dt; b.flash = Math.max(0, b.flash - dt);
  const sp = 1 + (1 - b.hp/b.max)*.9;
  b.x += b.vx*sp*dt; b.y += b.vy*sp*dt;
  if (b.x < 2*T){ b.x = 2*T; b.vx = Math.abs(b.vx); } if (b.x > GW-2*T-b.w){ b.x = GW-2*T-b.w; b.vx = -Math.abs(b.vx); }
  if (b.y < T){ b.y = T; b.vy = Math.abs(b.vy); } if (b.y > GH-T-b.h){ b.y = GH-T-b.h; b.vy = -Math.abs(b.vy); }
  b.shootT -= dt;
  if (b.shootT <= 0){ b.shootT = 2.6 - (1 - b.hp/b.max)*1.2; const n = 6;
    for (let i=0;i<n;i++){ const a = i/n*Math.PI*2 + b.t; W.proj.push({x:b.x+32, y:b.y+32, vx:Math.cos(a)*110, vy:Math.sin(a)*110, t:0, big:1}); }
    ev(W,'zap'); }
}

/* ═════════════ EFECTOS (se ejecutan en los dos móviles a partir de los eventos) ═════════════ */
function fxEvent(W, e, local){
  const [k, a, b, c, d] = e;
  if (k==='jump') SFX.jump();
  else if (k==='shoot') SFX.blow();
  else if (k==='boing') SFX.boing();
  else if (k==='trap'){ SFX.trap(); burst(W, a, b, '#9ff8ff', 8, 120); }
  else if (k==='pop'){ SFX.pop(c||0); burst(W, a, b, '#bff', 10, 160); ring(W, a, b, '#9ff8ff'); }
  else if (k==='kill'){ SFX.kill(); burst(W, a, b, '#ffd23f', 18, 260); text(W, a, b-10, fmt(c), '#ffd23f', 14); W.shake = Math.max(W.shake||0, .15); }
  else if (k==='combo'){ text(W, a, b-30, '¡COMBO x'+c+'!', '#ff2bd6', 20, true); SFX.combo(); }
  else if (k==='item'){ SFX.item(); text(W, a, b, '+'+fmt(c), '#fff', 12); burst(W, a, b, '#fff', 6, 100); }
  else if (k==='free'){ SFX.free(); burst(W, a, b, '#ff3355', 8, 140); }
  else if (k==='fizz'){ burst(W, a, b, '#9ff8ff', 5, 60); }
  else if (k==='die'){ SFX.die(); burst(W, a, b, P_COL[c], 30, 260); W.shake = .5; vib(80); }
  else if (k==='hurry'){ SFX.hurry(); text(W, GW/2, GH/2, '¡DATE PRISA!', '#ff3355', 34, true); }
  else if (k==='skel'){ SFX.skel(); text(W, GW/2, GH/2, '⚠ ¡AGUJERO NEGRO!', '#a46bff', 26, true); }
  else if (k==='letter'){ SFX.power(); text(W, a, b-14, d, '#ffd23f', 22, true); }
  else if (k==='extend'){ SFX.win(); text(W, GW/2, GH/2-20, '¡EXTEND! +1 VIDA', '#ffd23f', 30, true); }
  else if (k==='zap') SFX.zap();
  else if (k==='bosshit'){ SFX.bosshit(); burst(W, a, b, '#ff3355', 10, 200); }
  else if (k==='bossdie'){ SFX.boom(); for (let i=0;i<5;i++) ring(W, a, b, ['#ffd23f','#ff2bd6','#2bf0ff'][i%3], 300+i*80); burst(W, a, b, '#ffd23f', 80, 420); W.shake = 1.2; }
  else if (k==='clear'){ SFX.clear(); }
  else if (k==='out'){ text(W, GW/2, GH/2+30, 'JUGADOR '+(a+1)+' SIN VIDAS', P_COL[a], 18, true); }
}
function burst(W, x, y, c, n, sp){ for (let i=0;i<n;i++){ const a = Math.random()*6.283, v = sp*(.3+Math.random()*.8); W.parts.push({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, life:.35+Math.random()*.45, max:.8, c: Math.random()<.3?'#fff':c, s:1+Math.random()*2.5}); } }
function ring(W, x, y, c, sp){ W.parts.push({x, y, ring:1, r:4, sp: sp||160, life:.35, max:.35, c}); }
function text(W, x, y, s, c, size, big){ W.texts.push({x, y, s, c, size, big, life: big?1.6:1, max: big?1.6:1}); }
function fxStep(W, dt){
  W.shake = Math.max(0, (W.shake||0) - dt*2);
  for (const p of W.parts){ p.life -= dt; if (p.ring){ p.r += p.sp*dt; continue; } p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 300*dt; p.vx *= (1-dt*2); }
  W.parts = W.parts.filter(p=>p.life > 0);
  for (const t of W.texts){ t.life -= dt; if (!t.big) t.y -= 30*dt; }
  W.texts = W.texts.filter(t=>t.life > 0);
}

/* ═════════════ DIBUJO ═════════════ */
const TileCache = {};
function tileLayer(def){
  const key = def.n; if (TileCache.key === key) return TileCache.cv;
  const S = 2, c = document.createElement('canvas'); c.width = GW*S; c.height = GH*S; const g = c.getContext('2d'); g.scale(S, S);
  const h = def.hue, col = def.col;
  for (let y=0;y<MH;y++) for (let x=0;x<MW;x++){
    const v = def.g[y][x]; if (!v) continue;
    const px = x*T, py = y*T;
    if (IMG.bloque && v===1){ g.drawImage(IMG.bloque, px, py, T, T); continue; }
    if (v===2){
      const gr = g.createLinearGradient(px, 0, px+T, 0); gr.addColorStop(0, `hsl(${h},35%,14%)`); gr.addColorStop(.5, `hsl(${h},45%,26%)`); gr.addColorStop(1, `hsl(${h},35%,12%)`);
      g.fillStyle = gr; g.fillRect(px, py, T, T);
      g.fillStyle = `hsla(${h},90%,60%,.5)`; if (y%3===0) g.fillRect(px+3, py+7, T-6, 2);
      continue;
    }
    const gr = g.createLinearGradient(0, py, 0, py+T); gr.addColorStop(0, `hsl(${h},90%,62%)`); gr.addColorStop(.25, `hsl(${h},70%,38%)`); gr.addColorStop(1, `hsl(${h},70%,16%)`);
    g.fillStyle = gr; g.fillRect(px+.5, py+.5, T-1, T-1);
    g.fillStyle = `hsla(${(h+40)%360},100%,85%,.55)`; g.fillRect(px+2, py+2, T-4, 2);
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1; g.strokeRect(px+.5, py+.5, T-1, T-1);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(px+T/2, py+T/2+2, 2.2, 0, 7); g.fill();
  }
  /* brillo de neón en los bordes superiores de las plataformas */
  g.globalCompositeOperation = 'lighter'; g.shadowColor = col; g.shadowBlur = 8; g.fillStyle = col; g.globalAlpha = .55;
  for (let y=1;y<MH;y++) for (let x=2;x<MW-2;x++) if (def.g[y][x]===1 && def.g[y-1][x]===0) g.fillRect(x*T, y*T, T, 1.5);
  TileCache.key = key; TileCache.cv = c;
  return c;
}
function drawWorld(g, W, k){
  const sh = W.shake||0; g.save(); if (sh) g.translate((Math.random()-.5)*sh*10, (Math.random()-.5)*sh*10);
  /* fondo del escenario */
  g.fillStyle = 'rgba(3,5,16,.78)'; g.fillRect(0, 0, GW, GH);
  if (IMG.fondo){ g.globalAlpha = .5; g.drawImage(IMG.fondo, 0, 0, GW, GH); g.globalAlpha = 1; }
  g.drawImage(tileLayer(W.def), 0, 0, GW, GH);
  for (const it of W.items){ const blink = it.t > 7 && Math.floor(it.t*8)%2; if (!blink) drawItem(g, it.kind, it.x, it.y + Math.sin(it.t*4)*1.5); }
  for (const c of W.corpses) drawEnemyBody(g, {k:'walker', x:c.x, y:c.y, dir:1, anim:0, angry:true}, W.t, c.rot, true);
  for (const e of W.enemies) if (!e.trapped) drawEnemyBody(g, e, W.t);
  if (W.boss && !W.boss.dead) drawBoss(g, W.boss, W.t);
  for (const p of W.players) drawPlayer(g, p, W.t);
  for (const b of W.bubbles) drawBubble(g, b, W.t);
  for (const pr of W.proj){ g.save(); g.shadowColor = '#ff3355'; g.shadowBlur = 10; g.fillStyle = pr.big ? '#ff2bd6' : '#ff3355';
    if (pr.big){ g.beginPath(); g.arc(pr.x, pr.y, 5, 0, 7); g.fill(); } else { g.fillRect(pr.x-6, pr.y-1.5, 12, 3); g.fillStyle = '#fff'; g.fillRect(pr.x-3, pr.y-.5, 6, 1); } g.restore(); }
  if (W.skel) drawSkel(g, W.skel, W.t);
  /* partículas */
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const p of W.parts){ g.globalAlpha = Math.min(1, p.life/p.max*1.5); if (p.ring){ g.strokeStyle = p.c; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.stroke(); } else { g.fillStyle = p.c; g.fillRect(p.x-p.s/2, p.y-p.s/2, p.s, p.s); } }
  g.restore();
  for (const t of W.texts){
    const a = Math.min(1, t.life/t.max*2.2), sc = t.big ? 1 + Math.max(0, (t.life - t.max + .25)*4)*.6 : 1;
    g.save(); g.globalAlpha = a; g.translate(t.x, t.y); g.scale(sc, sc); g.font = `900 ${t.size}px Orbitron`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.8)'; g.strokeText(t.s, 0, 0); g.shadowColor = t.c; g.shadowBlur = 12; g.fillStyle = t.c; g.fillText(t.s, 0, 0); g.restore();
  }
  if (W.state==='intro'){
    g.save(); g.globalAlpha = Math.min(1, W.introT*1.5); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 40px Orbitron'; g.shadowColor = W.def.col; g.shadowBlur = 20; g.fillStyle = '#fff'; g.fillText(W.n===100 ? '¡JEFE FINAL!' : 'NIVEL '+W.n, GW/2, GH/2-14);
    g.font = '700 14px Orbitron'; g.fillStyle = W.def.col; g.fillText(sectOf(W.n).n, GW/2, GH/2+20); g.restore();
  }
  if (W.boss && !W.boss.dead){ g.save(); g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(GW/2-100, 4, 200, 8); g.fillStyle = '#ff2bd6'; g.shadowColor = '#ff2bd6'; g.shadowBlur = 8; g.fillRect(GW/2-100, 4, 200*W.boss.hp/W.boss.max, 8); g.restore(); }
  g.restore();
}
function drawItem(g, kind, x, y){
  const im = IMG['i'+(kind+1)];
  if (im){ g.drawImage(im, x-1, y-1, 18, 18); return; }
  g.save(); g.font = '15px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#fff'; g.shadowBlur = 6; g.fillText(ITEMS[kind].e, x+8, y+9); g.restore();
}
function drawPlayer(g, p, t){
  if (p.out) return;
  if (p.dead){ if (p.dead > 1.1){ g.save(); g.translate(p.x+7, p.y+8); g.rotate((1.6-p.dead)*20); g.globalAlpha = .8; robotShape(g, P_COL[p.id], 1, 0, 0, true); g.restore(); } return; }
  if (p.inv > 0 && Math.floor(p.inv*12)%2) return;
  g.save(); g.translate(p.x+7, p.y+8); g.scale(p.face, 1);
  const im = IMG['p'+(p.id+1)];
  if (im){ const h = 22, w = h*im.width/im.height; g.drawImage(im, -w/2, 8-h, w, h); }
  else robotShape(g, P_COL[p.id], p.anim, p.blow, p.vx);
  g.restore();
}
/* robot provisional del jugador (se cambia por img/p1.png y img/p2.png) */
function robotShape(g, c, anim, blow, moving, dead){
  const bob = moving ? Math.abs(Math.sin(anim))*1.2 : Math.sin(anim)*.5;
  g.translate(0, -bob);
  /* piernas */
  g.fillStyle = '#5d6b92'; const l = moving ? Math.sin(anim)*2.5 : 0;
  g.fillRect(-5+l, 4, 3, 4); g.fillRect(2-l, 4, 3, 4);
  /* cuerpo */
  const gr = g.createLinearGradient(-8, -10, 8, 6); gr.addColorStop(0, '#f2f6ff'); gr.addColorStop(1, '#8a99c4');
  g.fillStyle = gr; rr(g, -8, -10, 16, 15, 6); g.fill();
  /* visor */
  g.fillStyle = '#060a18'; rr(g, -5, -7, 12, 7, 3); g.fill();
  g.fillStyle = c; g.shadowColor = c; g.shadowBlur = 6;
  if (dead){ g.fillRect(-2,-5,2,2); g.fillRect(3,-5,2,2); }
  else { g.fillRect(0, -5, 2, 3); g.fillRect(4, -5, 2, 3); }
  g.shadowBlur = 0;
  /* antena */
  g.strokeStyle = '#8a99c4'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -10); g.lineTo(-2, -14); g.stroke();
  g.fillStyle = c; g.beginPath(); g.arc(-2, -14.5, 1.8, 0, 7); g.fill();
  /* boquilla de burbujas */
  g.fillStyle = c; g.fillRect(7, -3 - (blow?1:0), blow ? 5 : 3, blow ? 4 : 3);
  /* pecho */
  g.beginPath(); g.arc(-1, 2, 1.6, 0, 7); g.fill();
}
function drawEnemyBody(g, e, t, rot, dead){
  const ty = ETYPES.find(x=>x.k===e.k) || ETYPES[0], c = e.angry ? '#ff3355' : ty.c;
  g.save(); g.translate(e.x+7, e.y+8); if (rot) g.rotate(rot); g.scale(e.dir < 0 ? -1 : 1, 1);
  if (dead) g.globalAlpha = .85;
  const im = IMG[ty.img];
  if (im){ const h = 18, w = h*im.width/im.height; if (e.angry) g.filter = 'hue-rotate(-40deg) saturate(1.6)'; g.drawImage(im, -w/2, 8-h, w, h); g.restore(); return; }
  const a = e.anim || 0;
  g.shadowColor = c; g.shadowBlur = 6;
  if (e.k==='flyer'){ /* medusa */
    g.fillStyle = c; g.beginPath(); g.arc(0, -2, 7, Math.PI, 0); g.lineTo(7, 2); g.lineTo(-7, 2); g.fill(); g.shadowBlur = 0;
    g.strokeStyle = c; g.lineWidth = 1.5; for (let i=-1;i<=1;i++){ g.beginPath(); g.moveTo(i*4, 2); g.quadraticCurveTo(i*4 + Math.sin(a+i)*3, 6, i*4, 9); g.stroke(); }
  } else if (e.k==='ghost'){
    g.fillStyle = 'rgba(234,246,255,.85)'; g.beginPath(); g.arc(0, -2, 7, Math.PI, 0); g.lineTo(7, 7); for (let i=0;i<4;i++) g.lineTo(7 - (i+.5)*3.5, i%2 ? 7 : 4); g.lineTo(-7, 7); g.fill(); g.shadowBlur = 0;
  } else if (e.k==='roller'){
    g.fillStyle = c; g.beginPath(); g.arc(0, 1, 7, 0, 7); g.fill(); g.shadowBlur = 0; g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1.5;
    g.save(); g.rotate(a); g.beginPath(); g.moveTo(-6, 1); g.lineTo(6, 1); g.moveTo(0, -5); g.lineTo(0, 7); g.stroke(); g.restore();
  } else { /* walker, jumper, shooter: alien con patas */
    const sq = e.k==='jumper' && e.onGround ? 1 : 0;
    g.fillStyle = c; rr(g, -7, -7 + sq, 14, 12 - sq, 5); g.fill(); g.shadowBlur = 0;
    g.fillStyle = 'rgba(0,0,0,.35)'; const l = Math.sin(a)*2; g.fillRect(-6+l, 4, 3, 4); g.fillRect(3-l, 4, 3, 4);
    if (e.k==='shooter'){ g.fillStyle = '#222'; g.fillRect(5, -2, 5, 3); }
    if (e.k==='jumper'){ g.fillStyle = c; g.fillRect(-5, -10, 2, 4); g.fillRect(3, -10, 2, 4); }
  }
  /* ojos */
  const ey = e.k==='flyer' || e.k==='ghost' ? -3 : -2;
  g.fillStyle = '#fff'; g.beginPath(); g.arc(-1, ey, 2.6, 0, 7); g.arc(4, ey, 2.6, 0, 7); g.fill();
  g.fillStyle = e.angry ? '#ff0' : '#000'; g.fillRect(0, ey-1, 1.6, 2); g.fillRect(5, ey-1, 1.6, 2);
  if (e.angry){ g.strokeStyle = '#000'; g.lineWidth = 1; g.beginPath(); g.moveTo(-3, ey-4); g.lineTo(1, ey-2.5); g.moveTo(7, ey-4); g.lineTo(3, ey-2.5); g.stroke(); }
  g.restore();
}
function drawBubble(g, b, t){
  const warn = b.life < 2 && Math.floor(b.life*8)%2;
  const col = b.letter ? '#ffd23f' : b.owner === 1 ? '#2bf0ff' : '#2dff8a';
  const wob = 1 + Math.sin(t*6 + b.id)*.04;
  if (b.enemy){ g.save(); g.translate(b.x, b.y); g.scale(.85, .85); g.translate(-b.x, -b.y); drawEnemyBody(g, {k:b.enemy.k, x:b.x-7, y:b.y-8 + Math.sin(t*10)*1, dir:b.enemy.dir, anim: t*20, angry: b.life < 2.5}, t); g.restore(); }
  g.save(); g.translate(b.x, b.y); g.scale(wob, 2 - wob);
  if (IMG.burbuja){ const r = b.r*1.15; g.globalAlpha = .9; g.drawImage(IMG.burbuja, -r, -r, r*2, r*2); }
  else {
    const gr = g.createRadialGradient(-b.r*.35, -b.r*.4, 1, 0, 0, b.r);
    gr.addColorStop(0, 'rgba(255,255,255,.7)'); gr.addColorStop(.6, warn ? 'rgba(255,51,85,.25)' : 'rgba(160,255,235,.22)'); gr.addColorStop(1, warn ? 'rgba(255,51,85,.6)' : col+'aa');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, b.r, 0, 7); g.fill();
    g.strokeStyle = warn ? '#ff3355' : col; g.lineWidth = 1.4; g.shadowColor = col; g.shadowBlur = 6; g.stroke(); g.shadowBlur = 0;
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(-b.r*.4, -b.r*.45, b.r*.28, b.r*.15, -.7, 0, 7); g.fill();
  }
  if (b.letter){ g.font = '900 13px Orbitron'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffd23f'; g.shadowColor = '#ffd23f'; g.shadowBlur = 8; g.fillText(b.letter, 0, 1); }
  g.restore();
}
function drawBoss(g, b, t){
  g.save(); g.translate(b.x+32, b.y+32);
  if (IMG.boss){ g.drawImage(IMG.boss, -36, -36, 72, 72); }
  else {
    const c = b.flash ? '#fff' : '#ff2bd6';
    g.shadowColor = c; g.shadowBlur = 24;
    const gr = g.createRadialGradient(-10, -12, 4, 0, 0, 32); gr.addColorStop(0, '#ffb3ef'); gr.addColorStop(.5, c); gr.addColorStop(1, '#4a0040');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 30, 0, 7); g.fill(); g.shadowBlur = 0;
    for (let i=0;i<8;i++){ const a = i/8*6.283 + t; g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(Math.cos(a)*34, Math.sin(a)*34, 3, 0, 7); g.fill(); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(0, -4, 12, 0, 7); g.fill();
    g.fillStyle = '#000'; g.beginPath(); g.arc(Math.sin(t*2)*4, -4, 5, 0, 7); g.fill();
    g.fillStyle = '#300'; g.beginPath(); g.arc(0, 14, 8, 0, Math.PI); g.fill();
  }
  if (b.flash){ g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.arc(0,0,32,0,7); g.fill(); }
  g.restore();
}
function drawSkel(g, s, t){
  g.save(); g.translate(s.x+12, s.y+12);
  if (IMG.fantasma){ g.drawImage(IMG.fantasma, -14, -14, 28, 28); g.restore(); return; }
  g.rotate(t*3);
  const gr = g.createRadialGradient(0, 0, 2, 0, 0, 16); gr.addColorStop(0, '#000'); gr.addColorStop(.55, '#1a0033'); gr.addColorStop(1, 'rgba(164,107,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 16, 0, 7); g.fill();
  g.strokeStyle = '#a46bff'; g.lineWidth = 2; g.shadowColor = '#a46bff'; g.shadowBlur = 12;
  for (let i=0;i<3;i++){ g.beginPath(); g.arc(0, 0, 8 + i*3, i*2, i*2 + 3.5); g.stroke(); }
  g.restore();
}
function rr(g, x, y, w, h, r){ g.beginPath(); g.moveTo(x+r, y); g.arcTo(x+w, y, x+w, y+h, r); g.arcTo(x+w, y+h, x, y+h, r); g.arcTo(x, y+h, x, y, r); g.arcTo(x, y, x+w, y, r); g.closePath(); }

/* ═════════════ ESTADO COMPACTO PARA EL OTRO MÓVIL (dobles online) ═════════════ */
const R1 = v => Math.round(v*10)/10;
function snapshot(W){
  return {
    n: W.n, st: W.state, it: W.introT, hz: W.hurry?1:0, t: R1(W.t),
    p: W.players.map(p=>[R1(p.x), R1(p.y), p.face, p.dead?R1(p.dead):0, p.inv>0?R1(p.inv):0, p.lives, p.score, p.ext, p.out?1:0, R1(p.anim), p.blow>0?1:0, p.vx?1:0]),
    e: W.enemies.map(e=>[e.id, ETYPES.findIndex(x=>x.k===e.k), R1(e.x), R1(e.y), e.dir, e.angry?1:0, e.trapped?1:0]),
    b: W.bubbles.map(b=>[b.id, R1(b.x), R1(b.y), b.owner, b.enemy ? ETYPES.findIndex(x=>x.k===b.enemy.k) : -1, R1(b.life), b.letter||'', b.r]),
    c: W.corpses.map(c=>[R1(c.x), R1(c.y), R1(c.rot)]),
    i: W.items.map(i=>[i.id, R1(i.x), R1(i.y), i.kind, R1(i.t)]),
    pr: W.proj.map(p=>[R1(p.x), R1(p.y), p.big?1:0]),
    sk: W.skel ? [R1(W.skel.x), R1(W.skel.y)] : 0,
    bs: W.boss ? [R1(W.boss.x), R1(W.boss.y), W.boss.hp, W.boss.max, W.boss.flash>0?1:0, W.boss.dead?1:0] : 0,
    ev: W.ev
  };
}
/* el invitado reconstruye el mundo con suavizado */
function applySnap(W, s){
  if (!W || W.n !== s.n){ W = newWorld(s.n, s.p.length); W.guest = true; W.enemies = []; }
  W.state = s.st; W.introT = s.it; W.hurry = !!s.hz; W.t = s.t;
  const lerp = (o, k, v) => { o['_'+k] = v; if (o[k] == null || Math.abs(o[k]-v) > 60) o[k] = v; };
  s.p.forEach((a, i)=>{ const p = W.players[i] || (W.players[i] = {id:i, w:14, h:16}); lerp(p,'x',a[0]); lerp(p,'y',a[1]); p.face = a[2]; p.dead = a[3]; p.inv = a[4]; p.lives = a[5]; p.score = a[6]; p.ext = a[7]; p.out = !!a[8]; p.anim = a[9]; p.blow = a[10]; p.vx = a[11]; });
  const em = new Map(W.enemies.map(e=>[e.id, e]));
  W.enemies = s.e.map(a=>{ const e = em.get(a[0]) || {id:a[0], w:14, h:16, anim:0}; e.k = ETYPES[a[1]].k; lerp(e,'x',a[2]); lerp(e,'y',a[3]); e.dir = a[4]; e.angry = !!a[5]; e.trapped = a[6]; e.enter = 0; return e; });
  const bm = new Map(W.bubbles.map(b=>[b.id, b]));
  W.bubbles = s.b.map(a=>{ const b = bm.get(a[0]) || {id:a[0]}; lerp(b,'x',a[1]); lerp(b,'y',a[2]); b.owner = a[3]; b.enemy = a[4] >= 0 ? {k: ETYPES[a[4]].k, dir:1} : null; b.life = a[5]; b.letter = a[6]; b.r = a[7]; return b; });
  W.corpses = s.c.map(a=>({x:a[0], y:a[1], rot:a[2]}));
  W.items = s.i.map(a=>({id:a[0], x:a[1], y:a[2], kind:a[3], t:a[4]}));
  W.proj = s.pr.map(a=>({x:a[0], y:a[1], big:a[2]}));
  W.skel = s.sk ? {x:s.sk[0], y:s.sk[1], w:24, h:24} : null;
  W.boss = s.bs ? {x:s.bs[0], y:s.bs[1], hp:s.bs[2], max:s.bs[3], flash:s.bs[4], dead:s.bs[5], w:64, h:64} : null;
  (s.ev||[]).forEach(e=>fxEvent(W, e));
  return W;
}
function smooth(W, dt){
  const f = Math.min(1, dt*18);
  const sm = o => { for (const k of ['x','y']) if (o['_'+k] != null) o[k] += (o['_'+k] - o[k])*f; };
  W.players.forEach(sm); W.enemies.forEach(e=>{ sm(e); e.anim = (e.anim||0) + dt*8; }); W.bubbles.forEach(sm);
}
