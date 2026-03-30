/* ═══════════════════════════════════════════════════════════
   app.js — ZentelStore
   ═══════════════════════════════════════════════════════════ */

// ── CONFIGURACIÓN ────────────────────────────────────────────
const WA_NUMBER  = '543518046904';   // ← cambiá por tu número (sin + ni espacios)
const HORA_AP    = 10;                // hora apertura (formato 24h)
const HORA_CI    = 22;                // hora cierre
const USD_RATE   = 1500;              // tipo de cambio ARS → USD

const PAGO_TITULAR = 'Ezequiel Fisogni';
const PAGO_ALIAS   = 'zentelstore.nx';
const PAGO_CVU     = '4530000800016377379003';

// ── ESTADO GLOBAL ────────────────────────────────────────────
const S = {
  tab:       'home',
  view:      'grid',
  filtro:    'todos',
  sort:      'default',
  subPS4:    'todos',
  subPS5:    'todos',
  pagPS4:    1,
  pagPS5:    1,
  pagSize:   24,
  usd:       false,
  carrito:   [],
  favoritos: [],
  vistos:    [],
  datos:     { ps4: [], ps5: [], streaming: [], promos: [], productividad: [], psplus: [] }
};

// ── HELPERS ──────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function fmt(n) {
  if (S.usd) return 'USD ' + Math.round(n / USD_RATE);
  return '$' + Number(n).toLocaleString('es-AR');
}

function showToast(msg, duration = 2200) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ── CARGA DE DATOS ───────────────────────────────────────────
async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('No se pudo cargar ' + url);
  return r.json();
}

async function cargarTodo() {
  try {
    const [ps4, ps5, streaming, promos, productividad] = await Promise.all([
      fetchJSON('ps4.json'),
      fetchJSON('ps5.json'),
      fetchJSON('streaming.json'),
      fetchJSON('promos.json'),
      fetchJSON('productividad.json').catch(() => [])
    ]);
    S.datos.ps4           = ps4;
    S.datos.ps5           = ps5;
    S.datos.streaming     = streaming;
    S.datos.promos        = promos;
    S.datos.productividad = productividad;

    actualizarContadoresHome();
    mostrarNovedades(ps4);
  } catch (e) {
    console.error('Error cargando datos:', e);
  }
}

function actualizarContadoresHome() {
  const ps4disp = S.datos.ps4.filter(j => j.disponible).length;
  const ps5disp = S.datos.ps5.filter(j => j.disponible).length;
  const badges = document.querySelectorAll('.home-card-badge');
  if (badges[1]) badges[1].textContent = ps4disp + ' disponibles';
  if (badges[2]) badges[2].textContent = ps5disp + ' disponibles';
}
// ── TABS ─────────────────────────────────────────────────────
function irTab(tab) {
  S.tab = tab;
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  const panel = $('panel-' + tab);
  if (panel) panel.classList.add('active');
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  const sel = $('tab-select');
  if (sel) sel.value = tab;
  const toolbar = $('toolbar');
  if (toolbar) toolbar.style.display = ['ps4','ps5'].includes(tab) ? 'flex' : 'none';
  const sw = $('search-wrap');
  if (sw) sw.style.display = ['ps4','ps5'].includes(tab) ? 'flex' : 'none';
  switch(tab) {
    case 'home':          renderHome(); break;
    case 'ps4':           renderPS('ps4'); break;
    case 'ps5':           renderPS('ps5'); break;
    case 'steam':         renderSteam(); break;
    case 'promos':        renderPromos(); break;
    case 'psplus':        renderPSPlus(); break;
    case 'streaming':     renderStreaming(); break;
    case 'productividad': renderProductividad(); break;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── HOME ─────────────────────────────────────────────────────
function renderHome() {
  renderVistos();
  renderFavsHome();
}

function mostrarNovedades(datos) {
  if (!datos || !datos.length) return;
  const muestra = [...datos].filter(j => j.disponible).slice(-8).reverse();
  if (!muestra.length) return;
  $('novedades-section').style.display = 'block';
  const grid = $('novedades-grid'); grid.innerHTML = '';
  muestra.forEach((j, i) => {
    const div = document.createElement('div');
    div.className = 'nov-card';
    div.style.animationDelay = `${i * 40}ms`;
    div.innerHTML = `
      ${j.imagen ? `<img class="nov-img" src="${j.imagen}" alt="${j.nombre}" loading="lazy" onerror="this.style.display='none'">` : ''}
      <div class="nov-body">
        <div class="nov-nombre" title="${j.nombre}">${j.nombre}<span class="nov-tag">PS4</span></div>
        <div class="nov-precio">${j.precio ? fmt(j.precio) : 'Consultar'}</div>
      </div>`;
    div.addEventListener('click', () => openModalPS(j, 'ps4'));
    grid.appendChild(div);
  });
}

function agregarVisto(obj) {
  S.vistos = S.vistos.filter(v => v.nombre !== obj.nombre);
  S.vistos.unshift({ nombre: obj.nombre, imagen: obj.imagen || null, precio: obj.precio || obj.primario || null, tag: obj._tag || 'Juego' });
  if (S.vistos.length > 6) S.vistos.pop();
  try { localStorage.setItem('zs_vistos', JSON.stringify(S.vistos)); } catch(e) {}
  if (S.tab === 'home') renderVistos();
}

function renderVistos() {
  const sec = $('vistos-section'), grid = $('vistos-grid');
  if (!S.vistos.length) { sec.style.display = 'none'; return; }
  sec.style.display = 'block'; grid.innerHTML = '';
  S.vistos.forEach((j, i) => {
    const div = document.createElement('div');
    div.className = 'nov-card';
    div.style.animationDelay = `${i * 40}ms`;
    div.innerHTML = `
      ${j.imagen ? `<img class="nov-img" src="${j.imagen}" alt="${j.nombre}" loading="lazy" onerror="this.style.display='none'">` : ''}
      <div class="nov-body">
        <div class="nov-nombre" title="${j.nombre}">${j.nombre}<span class="nov-tag">${j.tag}</span></div>
        <div class="nov-precio">${j.precio ? fmt(j.precio) : 'Consultar'}</div>
      </div>`;
    div.addEventListener('click', () => abrirModalSimple(j));
    grid.appendChild(div);
  });
}

function toggleFavorito(obj, btn) {
  const idx = S.favoritos.findIndex(f => f.nombre === obj.nombre);
  if (idx === -1) {
    S.favoritos.push({ nombre: obj.nombre, imagen: obj.imagen || null, precio: obj.precio || obj.primario || null, tag: obj._tag || 'Juego', obj });
    btn.classList.add('active'); btn.textContent = '❤️';
    showToast('❤️ Guardado en favoritos');
  } else {
    S.favoritos.splice(idx, 1);
    btn.classList.remove('active'); btn.textContent = '🤍';
    showToast('Eliminado de favoritos');
  }
  try { localStorage.setItem('zs_favs', JSON.stringify(S.favoritos)); } catch(e) {}
  if (S.tab === 'home') renderFavsHome();
}

function renderFavsHome() {
  const sec = $('favs-section'), grid = $('favs-grid');
  if (!S.favoritos.length) { sec.style.display = 'none'; return; }
  sec.style.display = 'block'; grid.innerHTML = '';
  S.favoritos.forEach((j, i) => {
    const div = document.createElement('div'); div.className = 'card';
    div.style.animationDelay = `${i * 40}ms`;
    div.innerHTML = `
      ${j.imagen ? `<img class="card-img" src="${j.imagen}" alt="${j.nombre}" loading="lazy" onerror="this.style.display='none'">` : ''}
      <div class="card-body">
        <div class="card-nombre" title="${j.nombre}">${j.nombre}</div>
        <div class="card-footer"><span class="precio-steam">${j.precio ? fmt(j.precio) : 'Consultar'}</span><span class="badge badge-ok">${j.tag || 'Juego'}</span></div>
      </div>`;
    div.addEventListener('click', () => abrirModalSimple(j));
    grid.appendChild(div);
  });
}

// ── PS4 / PS5 ────────────────────────────────────────────────
function getSubcategorias(datos) {
  const cats = new Set(datos.map(j => j.subcategoria).filter(Boolean));
  return ['todos', ...cats];
}

function renderPS(consola) {
  const datos  = S.datos[consola];
  const key    = consola === 'ps4' ? 'subPS4' : 'subPS5';
  const pagKey = consola === 'ps4' ? 'pagPS4' : 'pagPS5';
  const gridId = `grid-${consola}`;

  renderSubcats(consola, datos);

  let filtrados = datos;
  if (S[key] !== 'todos') filtrados = filtrados.filter(j => j.subcategoria === S[key]);
  if (S.filtro === 'disponible')    filtrados = filtrados.filter(j => j.disponible);
  if (S.filtro === 'no-disponible') filtrados = filtrados.filter(j => !j.disponible);
  const q = $('buscador') ? $('buscador').value.trim().toLowerCase() : '';
  if (q) filtrados = filtrados.filter(j => j.nombre.toLowerCase().includes(q));
  if (S.sort === 'precio-asc')  filtrados = [...filtrados].sort((a,b) => (a.precio||0)-(b.precio||0));
  if (S.sort === 'precio-desc') filtrados = [...filtrados].sort((a,b) => (b.precio||0)-(a.precio||0));
  if (S.sort === 'default')     filtrados = [...filtrados].sort((a,b) => a.nombre.localeCompare(b.nombre));

  const statPill = $('stat-pill');
  if (statPill) {
    statPill.style.display = 'flex';
  if ($('stat-total')) $('stat-total').textContent = filtrados.length;
if ($('stat-disp'))  $('stat-disp').textContent  = filtrados.filter(j => j.disponible).length;
  }

  const total     = filtrados.length;
  const totalPags = Math.max(1, Math.ceil(total / S.pagSize));
  if (S[pagKey] > totalPags) S[pagKey] = 1;
  const inicio = (S[pagKey] - 1) * S.pagSize;
  const pagina = filtrados.slice(inicio, inicio + S.pagSize);

  let grid = $(gridId);
  if (!grid) {
    grid = document.createElement('div');
    grid.id = gridId;
    grid.className = 'grid-juegos';
    $('panel-' + consola).appendChild(grid);
  }
  grid.innerHTML = '';
  grid.className = `grid-juegos${S.view === 'lista' ? ' view-lista' : ''}`;

  if (!pagina.length) {
    grid.innerHTML = '<div class="empty">😕 No se encontraron juegos con ese filtro.</div>';
  } else {
    pagina.forEach((j, i) => { j._tag = consola.toUpperCase(); grid.appendChild(crearCardPS(j, i)); });
  }
  renderPaginacion(consola, S[pagKey], totalPags, pagKey, () => renderPS(consola));
}

function renderSubcats(consola, datos) {
  const key  = consola === 'ps4' ? 'subPS4' : 'subPS5';
  const wrId = `subcats-${consola}`;
  const panel = $('panel-' + consola);
  let wr = $(wrId);
  if (!wr) {
    wr = document.createElement('div'); wr.id = wrId;
    wr.style.cssText = 'display:flex;gap:.35rem;flex-wrap:wrap;padding:.5rem 1rem 0;max-width:1300px;margin:0 auto';
    panel.insertBefore(wr, panel.firstChild);
  }
  wr.innerHTML = '';
  getSubcategorias(datos).forEach(c => {
    const btn = document.createElement('button');
    btn.className = `btn-sub${S[key] === c ? ' active' : ''}`;
    btn.textContent = c === 'todos' ? 'Todos' : c;
    btn.onclick = () => { S[key] = c; if (consola==='ps4') S.pagPS4=1; else S.pagPS5=1; renderPS(consola); };
    wr.appendChild(btn);
  });
}

function crearCardPS(j, i) {
  const div = document.createElement('div');
  div.className = 'card';
  div.style.animationDelay = `${Math.min(i, 12) * 30}ms`;
  const esFav = S.favoritos.some(f => f.nombre === j.nombre);
  div.innerHTML = `
    ${j.imagen ? `<img class="card-img" src="${j.imagen}" alt="${j.nombre}" loading="lazy" onerror="this.style.display='none'">` : ''}
    <div class="card-body">
      <div class="card-nombre" title="${j.nombre}">${j.nombre}</div>
      <div class="precios-row">
        <div class="precio-bloque">
          <div class="precio-label">Primaria</div>
          <div class="precio-valor">${j.primario ? fmt(j.primario) : (j.precio ? fmt(j.precio) : '<span class="precio-consultar">Consultar</span>')}</div>
        </div>
        ${j.secundario ? `<div class="precio-bloque"><div class="precio-label">Secundaria</div><div class="precio-valor sec">${fmt(j.secundario)}</div></div>` : ''}
        <span class="badge ${j.disponible ? 'badge-ok' : 'badge-no'}">${j.disponible ? '✅' : '❌'}</span>
      </div>
    </div>
    <div class="card-actions">
      <button class="btn-fav${esFav ? ' active' : ''}">${esFav ? '❤️' : '🤍'}</button>
      ${j.disponible ? `<button class="btn-cart-card">🛒</button>` : ''}
    </div>`;
  div.querySelector('.btn-fav').addEventListener('click', e => { e.stopPropagation(); toggleFavorito(j, e.currentTarget); });
  const btnCart = div.querySelector('.btn-cart-card');
  if (btnCart) btnCart.addEventListener('click', e => { e.stopPropagation(); agregarAlCarrito(j); });
  div.addEventListener('click', () => openModalPS(j, j._tag.toLowerCase()));
  return div;
}

function renderPaginacion(consola, pagActual, totalPags, pagKey, renderFn) {
  const wrId = `pag-${consola}`;
  const panel = $('panel-' + consola);
  let wr = $(wrId);
  if (!wr) { wr = document.createElement('div'); wr.id = wrId; panel.appendChild(wr); }
  wr.innerHTML = '';
  if (totalPags <= 1) return;
  const pag = document.createElement('div'); pag.className = 'paginacion';
  const addBtn = (label, page, active, disabled) => {
    const b = document.createElement('button');
    b.className = `btn-pag${active ? ' active' : ''}`;
    b.textContent = label; b.disabled = disabled;
    b.onclick = () => { S[pagKey] = page; renderFn(); window.scrollTo({top:0,behavior:'smooth'}); };
    pag.appendChild(b);
  };
  addBtn('←', pagActual - 1, false, pagActual === 1);
  for (let p = 1; p <= totalPags; p++) {
    if (p === 1 || p === totalPags || (p >= pagActual - 2 && p <= pagActual + 2)) {
      addBtn(p, p, p === pagActual, false);
    } else if (p === pagActual - 3 || p === pagActual + 3) {
      const sp = document.createElement('span'); sp.className = 'pag-info'; sp.textContent = '…'; pag.appendChild(sp);
    }
  }
  addBtn('→', pagActual + 1, false, pagActual === totalPags);
  wr.appendChild(pag);
}
// ── STEAM ────────────────────────────────────────────────────
function renderSteam() {
  const panel = $('panel-steam');
  panel.innerHTML = `
    <div style="max-width:600px;margin:2rem auto;padding:0 1rem">
      <div style="text-align:center;margin-bottom:1.8rem;animation:fadeUp .4s ease">
        <div style="font-size:3rem;margin-bottom:.6rem">🖥️</div>
        <h2 style="font-family:'Rajdhani',sans-serif;font-size:1.9rem;font-weight:700;margin-bottom:.4rem">Steam / PC</h2>
        <p style="color:var(--muted);font-size:.88rem;line-height:1.6">Más de 47.000 títulos disponibles. Elegís el juego, nosotros lo activamos.</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:.75rem;margin-bottom:1.5rem">
        ${[
          { cant:'1 juego',   ars: 6000,  usd: 4  },
          { cant:'5 juegos',  ars: 12000, usd: 8  },
          { cant:'10 juegos', ars: 20000, usd: 12 }
        ].map((p,i) => `
          <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1rem 1.2rem;display:flex;align-items:center;justify-content:space-between;animation:fadeUp .35s ease ${i*60}ms both;cursor:pointer;transition:border-color .2s,box-shadow .2s"
               onmouseover="this.style.borderColor='var(--accent)';this.style.boxShadow='0 0 18px rgba(0,229,255,.1)'"
               onmouseout="this.style.borderColor='var(--border)';this.style.boxShadow='none'"
               onclick="consultarStreaming('${s.servicio} — ${it.tipo}', ${it.precio})"
            <div>
              <div style="font-family:'Rajdhani',sans-serif;font-size:1.15rem;font-weight:700">${p.cant}</div>
              <div style="font-size:.75rem;color:var(--muted);margin-top:.15rem">Cualquier título disponible</div>
            </div>
            <div style="text-align:right">
              <div style="font-family:'Rajdhani',sans-serif;font-size:1.3rem;font-weight:700;color:var(--accent)">${S.usd ? 'USD ' + p.usd : '$' + p.ars.toLocaleString('es-AR')}</div>
              ${S.usd ? '' : `<div style="font-size:.7rem;color:var(--muted)">≈ USD ${p.usd}</div>`}
            </div>
          </div>`).join('')}
      </div>
      <div style="background:var(--card);border:1px solid rgba(37,211,102,.25);border-radius:12px;padding:1rem 1.2rem;display:flex;align-items:center;gap:.75rem;animation:fadeUp .5s ease .2s both">
        <span style="font-size:1.5rem">💬</span>
        <div>
          <div style="font-size:.88rem;font-weight:600;margin-bottom:.2rem">¿Tenés un juego en mente?</div>
          <div style="font-size:.78rem;color:var(--muted)">Consultanos por WhatsApp la disponibilidad de cualquier título.</div>
        </div>
        <a href="https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hola! Quiero consultar por un juego de Steam 🖥️')}" target="_blank" rel="noopener"
           style="background:#25d366;color:#fff;border:none;border-radius:8px;padding:.5rem .9rem;font-family:'Inter',sans-serif;font-size:.8rem;font-weight:700;text-decoration:none;white-space:nowrap;flex-shrink:0">
          Consultar
        </a>
      </div>
    </div>`;
}

function agregarSteamAlCarrito(cant, precio) {
  agregarAlCarrito({ nombre: `Steam — ${cant}`, precio, _tag: 'Steam', disponible: true });
}

// ── PROMOS ───────────────────────────────────────────────────
function renderPromos() {
  const panel = $('panel-promos');
  const datos = S.datos.promos;
  if (!datos.length) { panel.innerHTML = '<div class="loading-msg"><div class="spinner"></div></div>'; return; }
  panel.innerHTML = `<div class="promos-grid">${datos.map((p, i) => `
    <div class="promo-card" style="animation-delay:${i*80}ms">
      <div class="promo-header">
        <div class="promo-titulo ${p.color}">${p.titulo}</div>
        ${p.subtitulo ? `<div class="promo-subtitulo">${p.subtitulo}</div>` : ''}
        ${p.vigencia  ? `<div class="promo-vigencia">🕐 ${p.vigencia}</div>` : ''}
      </div>
      <div class="promo-lista">
        ${p.juegos.map(j => `
          <div class="promo-item" onclick="consultarPromo('${j.replace(/'/g,"\\'")}','${p.titulo.replace(/'/g,"\\'")}')">
            ${j}
          </div>`).join('')}
      </div>
    </div>`).join('')}</div>`;
}

function consultarPromo(juego, promo) {
  const msg = encodeURIComponent(`Hola! Me interesa la promo "${promo}" y quiero el juego: *${juego}* 🎮`);
  window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
}

// ── PS PLUS ──────────────────────────────────────────────────
function renderPSPlus() {
  const panel = $('panel-psplus');
  panel.innerHTML = `
    <div class="psplus-grid">
      ${[
        { nombre:'PS Plus Essential', emoji:'🏆', items:[
          {nombre:'1 mes',precio:8000},{nombre:'3 meses',precio:20000},{nombre:'12 meses',precio:55000}]},
        { nombre:'PS Plus Extra', emoji:'⭐', items:[
          {nombre:'1 mes',precio:12000},{nombre:'3 meses',precio:30000},{nombre:'12 meses',precio:85000}]},
        { nombre:'PS Plus Premium', emoji:'💎', items:[
          {nombre:'1 mes',precio:15000},{nombre:'3 meses',precio:38000},{nombre:'12 meses',precio:100000}]},
        { nombre:'PSN Wallet', emoji:'💰', items:[
          {nombre:'USD 10',precio:18000},{nombre:'USD 20',precio:32000},{nombre:'USD 50',precio:75000}]},
        { nombre:'Xbox Game Pass', emoji:'🟩', items:[
          {nombre:'1 mes',precio:9000},{nombre:'3 meses',precio:24000}]},
        { nombre:'Robux (Roblox)', emoji:'🟥', items:[
          {nombre:'800 Robux',precio:6000},{nombre:'1700 Robux',precio:12000},{nombre:'4500 Robux',precio:28000}]},
        { nombre:'V-Bucks (Fortnite)', emoji:'🔵', items:[
          {nombre:'1000 V-Bucks',precio:7000},{nombre:'2800 V-Bucks',precio:16000},{nombre:'5000 V-Bucks',precio:26000}]},
        { nombre:'Nintendo eShop', emoji:'🔴', items:[
          {nombre:'USD 10',precio:18000},{nombre:'USD 20',precio:32000},{nombre:'USD 35',precio:52000}]}
      ].map((s,i) => `
        <div class="service-card" style="animation-delay:${i*60}ms">
          <div class="service-header">
            <span class="service-emoji">${s.emoji}</span>
            <span class="service-nombre">${s.nombre}</span>
          </div>
          <div class="service-items">
            ${s.items.map(it => `
              <div class="service-item"onclick="consultarServicio('${it.nombre}','${s.nombre}', ${it.precio})"
                <span class="service-item-nombre">${it.nombre}</span>
                <span class="service-item-precio">${fmt(it.precio)}</span>
              </div>`).join('')}
          </div>
        </div>`).join('')}
    </div>`;
}

function consultarServicio(item, servicio, precio) {
  agregarAlCarrito({ nombre: `${servicio} — ${item}`, precio, _tag: 'PS Plus', disponible: true, emoji: '🏆' });
}

// ── STREAMING ────────────────────────────────────────────────
function renderStreaming() {
  const panel = $('panel-streaming');
  const datos = S.datos.streaming;
  if (!datos.length) { panel.innerHTML = '<div class="loading-msg"><div class="spinner"></div></div>'; return; }
  panel.innerHTML = datos.map(cat => `
    <div class="section-label">${cat.categoria}</div>
    <div class="streaming-grid" style="margin-bottom:1.2rem">
      ${cat.servicios.map((s,i) => `
        <div class="stream-card" style="animation-delay:${i*60}ms"onclick="consultarStreaming('${s.servicio}', ${it.precio})"
          <div class="stream-header">
            <span class="stream-emoji">${s.emoji}</span>
            <span class="stream-nombre">${s.servicio}</span>
          </div>
          <div class="stream-items">
            ${s.items.map(it => `
              <div class="stream-item">
                <span class="stream-tipo">${it.tipo}</span>
                <span class="stream-precio">${fmt(it.precio)}</span>
              </div>`).join('')}
          </div>
        </div>`).join('')}
    </div>`).join('');
}
// ✅ DESPUÉS
function consultarStreaming(servicio, precio) {
  agregarAlCarrito({ nombre: servicio, precio, _tag: 'Streaming', disponible: true, emoji: '📺' });
}

// ── PRODUCTIVIDAD ────────────────────────────────────────────
function renderProductividad() {
  const panel = $('panel-productividad');
const datos = S.datos.productividad || [];
if (!datos.length) { panel.innerHTML = '<div class="loading-msg"><div class="spinner"></div></div>'; return; }
  panel.innerHTML = `<div class="prod-grid">
    ${datos.map((p, i) => `
      <div class="prod-card" style="animation-delay:${i*70}ms">
        <div class="prod-header">
          <div class="prod-header-icon">${p.emoji}</div>
          <div class="prod-header-nombre">${p.nombre}</div>
        </div>
        <div class="prod-body">
          ${p.planes.map(pl => `
            <div class="prod-plan">
              <div class="prod-plan-titulo">${pl.titulo}</div>
              ${pl.desc ? `<div class="prod-plan-desc">${pl.desc}</div>` : ''}
              <div style="display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-top:.4rem">
                <span style="font-family:'Rajdhani',sans-serif;font-size:1.2rem;font-weight:700;color:var(--yellow)">${fmt(pl.precio)}</span>
                <button class="btn-add-cart activo" onclick="agregarProductividadAlCarrito('${p.nombre} — ${pl.titulo}', ${pl.precio})">
                  🛒 Agregar
                </button>
              </div>
            </div>`).join('')}
        </div>
      </div>`).join('')}
  </div>`;
}

function agregarProductividadAlCarrito(nombre, precio) {
  agregarAlCarrito({ nombre, precio, _tag: 'Productividad', disponible: true });
}

// ── BUSCADOR ─────────────────────────────────────────────────
function initBuscador() {
  const inp = $('buscador');
  if (!inp) return;
  inp.addEventListener('input', () => {
    if (S.tab === 'ps4') { S.pagPS4 = 1; renderPS('ps4'); }
    if (S.tab === 'ps5') { S.pagPS5 = 1; renderPS('ps5'); }
  });
}

function initHomeBuscador() {
  const inp = $('home-buscador');
  const res = $('home-search-results');
  if (!inp || !res) return;
  inp.addEventListener('input', () => {
    const q = inp.value.trim().toLowerCase();
    if (!q) { res.classList.remove('show'); res.innerHTML = ''; return; }
    const todo = [
      ...S.datos.ps4.map(j => ({...j, _tag:'PS4'})),
      ...S.datos.ps5.map(j => ({...j, _tag:'PS5'}))
    ].filter(j => j.nombre.toLowerCase().includes(q)).slice(0, 10);
    if (!todo.length) {
      res.innerHTML = '<div class="hsr-empty">Sin resultados</div>';
    } else {
      res.innerHTML = todo.map(j => `
        <div class="hsr-item" data-nombre="${j.nombre}" data-tag="${j._tag}">
          <span class="hsr-nombre">${j.nombre}</span>
          <span class="hsr-tag">${j._tag}</span>
          <span class="hsr-precio">${j.primario ? fmt(j.primario) : (j.precio ? fmt(j.precio) : 'Consultar')}</span>
        </div>`).join('');
      res.querySelectorAll('.hsr-item').forEach(el => {
        el.addEventListener('click', () => {
          const nombre = el.dataset.nombre;
          const tag    = el.dataset.tag.toLowerCase();
          const obj    = S.datos[tag].find(j => j.nombre === nombre);
          if (obj) { obj._tag = tag.toUpperCase(); openModalPS(obj, tag); }
          res.classList.remove('show');
          inp.value = '';
        });
      });
    }
    res.classList.add('show');
  });
  document.addEventListener('click', e => {
    if (!inp.contains(e.target) && !res.contains(e.target)) res.classList.remove('show');
  });
}

// ── MODAL ────────────────────────────────────────────────────
let modalObj = null;

function openModalPS(j, consola) {
  modalObj = j;
  agregarVisto(j);
  const imgWrap = $('modal-img-wrap');
  imgWrap.innerHTML = j.imagen
    ? `<img class="modal-img" src="${j.imagen}" alt="${j.nombre}" onerror="this.parentElement.innerHTML='<div class=modal-img-placeholder>🎮</div>'">`
    : '<div class="modal-img-placeholder">🎮</div>';
  $('modal-nombre').textContent = j.nombre;
  $('modal-desc').textContent   = j.disponible ? `✅ Disponible · ${j._tag || consola.toUpperCase()}` : '❌ Sin stock actualmente';
  const prec = $('modal-precios'); prec.innerHTML = '';
  if (j.primario) {
    prec.innerHTML += `<div class="modal-precio-bloque"><div class="modal-precio-label">Primaria</div><div class="modal-precio-valor">${fmt(j.primario)}</div></div>`;
  } else if (j.precio) {
    prec.innerHTML += `<div class="modal-precio-bloque"><div class="modal-precio-label">Precio</div><div class="modal-precio-valor">${fmt(j.precio)}</div></div>`;
  } else {
    prec.innerHTML += `<div class="modal-precio-bloque"><div class="modal-precio-label">Precio</div><div class="modal-precio-valor consultar">Consultar</div></div>`;
  }
  if (j.secundario) {
    prec.innerHTML += `<div class="modal-precio-bloque"><div class="modal-precio-label">Secundaria</div><div class="modal-precio-valor sec">${fmt(j.secundario)}</div></div>`;
  }
  const precio = j.primario ? fmt(j.primario) : (j.precio ? fmt(j.precio) : '');
  const waMsg  = `Hola! Quiero consultar por *${j.nombre}* (${j._tag || consola.toUpperCase()}) ${precio ? '— ' + precio : ''} 🎮`;
  $('modal-wa').href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waMsg)}`;
  $('modal-avisame').style.display = j.disponible ? 'none' : 'block';
  $('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function abrirModalSimple(j) {
  if (j._tag === 'PS4' || j._tag === 'ps4') openModalPS({...j, _tag:'PS4'}, 'ps4');
  else if (j._tag === 'PS5' || j._tag === 'ps5') openModalPS({...j, _tag:'PS5'}, 'ps5');
  else openModalPS({...j}, '');
}

function closeModal(e) {
  if (e && e.target !== $('modal-overlay')) return;
  $('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
  modalObj = null;
}

function agregarDesdeModal() {
  if (!modalObj) return;
  if (!modalObj.disponible) { showToast('❌ Este juego no está disponible'); return; }
  agregarAlCarrito(modalObj);
  $('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function compartirJuego() {
  if (!modalObj) return;
  const url = window.location.href.split('?')[0] + '?q=' + encodeURIComponent(modalObj.nombre);
  navigator.clipboard.writeText(url).then(() => showToast('🔗 Link copiado'));
}

function avisameDisponible() {
  if (!modalObj) return;
  const msg = encodeURIComponent(`Hola! Quiero que me avisen cuando esté disponible: *${modalObj.nombre}* 🔔`);
  window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
}
// ── CARRITO ──────────────────────────────────────────────────
function agregarAlCarrito(obj) {
  const precio = obj.primario || obj.precio || 0;
  S.carrito.push({ nombre: obj.nombre, precio, tag: obj._tag || 'Juego', emoji: obj.emoji || '🎮' });
  actualizarCarritoUI();
  showToast(`🛒 ${obj.nombre} agregado al carrito`);
}

function eliminarDelCarrito(idx) {
  S.carrito.splice(idx, 1);
  actualizarCarritoUI();
}

function vaciarCarrito() {
  S.carrito = [];
  actualizarCarritoUI();
}

function actualizarCarritoUI() {
  const items = S.carrito;
  const count = items.length;
  const badge = $('carrito-badge');

  badge.textContent = count;
  badge.classList.toggle('show', count > 0);

  $('cart-section-items').style.display = count ? 'block' : 'none';
  $('carrito-empty').style.display      = count ? 'none'  : 'block';
  $('cart-section-total').style.display = count ? 'block' : 'none';
  $('cart-section-pago').style.display  = count ? 'block' : 'none';
  $('cart-section-btn').style.display   = count ? 'block' : 'none';

  const cont = $('carrito-items'); cont.innerHTML = '';
  items.forEach((it, i) => {
    const div = document.createElement('div'); div.className = 'carrito-item';
    div.innerHTML = `
      <span class="ci-emoji">${it.emoji}</span>
      <div class="ci-info">
        <div class="ci-nombre">${it.nombre}</div>
        <div class="ci-tipo">${it.tag}</div>
      </div>
      <span class="ci-precio">${it.precio ? fmt(it.precio) : 'Consultar'}</span>
      <button class="btn-rm" title="Eliminar">✕</button>`;
    div.querySelector('.btn-rm').addEventListener('click', () => eliminarDelCarrito(i));
    cont.appendChild(div);
  });

  const subtotal = items.reduce((a, b) => a + (b.precio || 0), 0);
  $('cart-subtotal').textContent    = fmt(subtotal);
  $('cart-total-final').textContent = fmt(subtotal);

  const aliasEl = $('pago-alias'), cvuEl = $('pago-cvu');
  if (aliasEl) aliasEl.textContent = PAGO_ALIAS;
  if (cvuEl)   cvuEl.textContent   = PAGO_CVU;
}

function toggleCarrito() {
  $('carrito-overlay').classList.toggle('open');
  actualizarHorarioCarrito();
  document.body.style.overflow = $('carrito-overlay').classList.contains('open') ? 'hidden' : '';
}

function cerrarCarrito(e) {
  if (e.target === $('carrito-overlay')) toggleCarrito();
}

function actualizarHorarioCarrito() {
  const ahora = new Date();
  const h = ahora.getHours(), m = ahora.getMinutes(), s = ahora.getSeconds();
  const abierto  = h >= HORA_AP && h < HORA_CI;
  const badge    = $('cart-badge-horario');
  const countdown = $('cart-countdown');
  const msg      = $('cart-horario-msg');
  const horaEl   = $('cart-hora-arg');
  if (horaEl) horaEl.textContent = `Hora Argentina: ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  if (abierto) {
    if (badge)    { badge.className = 'cart-badge-abierto'; badge.textContent = 'ABIERTO AHORA'; }
    const restH = HORA_CI - h - 1, restM = 59 - m, restS = 59 - s;
    if (countdown) countdown.innerHTML = `Cerramos en: <strong>${restH}h ${restM}m ${restS}s</strong>`;
    if (msg)      msg.textContent = `Hoy atendemos hasta las ${HORA_CI}:00 hs.`;
  } else {
    if (badge)    { badge.className = 'cart-badge-cerrado'; badge.textContent = 'CERRADO AHORA'; }
    if (countdown) countdown.innerHTML = '';
    if (msg)      msg.textContent = `Abrimos a las ${HORA_AP}:00 hs. Podés dejarnos tu pedido igual.`;
  }
}
setInterval(() => {
  if ($('carrito-overlay').classList.contains('open')) actualizarHorarioCarrito();
}, 1000);

function finalizarPedido() {
  if (!S.carrito.length) { showToast('El carrito está vacío'); return; }
  const lineas   = S.carrito.map(it => `• ${it.nombre} — ${it.precio ? fmt(it.precio) : 'Consultar'}`).join('\n');
  const subtotal = S.carrito.reduce((a, b) => a + (b.precio || 0), 0);
  const msg = `Hola! Quiero hacer el siguiente pedido:\n\n${lineas}\n\n*Total: ${fmt(subtotal)}*\n\nYa hice la transferencia. 💳`;
  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

function copiarDato(id) {
  const val = $(id)?.textContent;
  if (!val) return;
  navigator.clipboard.writeText(val).then(() => showToast('📋 Copiado: ' + val));
}

// ── USD TOGGLE ───────────────────────────────────────────────
function toggleUSD() {
  S.usd = !S.usd;
  const btn   = $('usd-btn');
  const label = $('usd-label');
  btn.classList.toggle('on', S.usd);
  label.textContent = S.usd ? '🇺🇸 USD' : '🇦🇷 ARS';
  if (['ps4','ps5','steam','streaming','psplus','productividad'].includes(S.tab)) irTab(S.tab);
}

// ── FILTROS / SORT / VISTA ────────────────────────────────────
function initFiltros() {
  document.querySelectorAll('.btn-filtro').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-filtro').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.filtro = btn.dataset.filtro;
      S.pagPS4 = 1; S.pagPS5 = 1;
      if (S.tab === 'ps4') renderPS('ps4');
      if (S.tab === 'ps5') renderPS('ps5');
    });
  });
}

function sortChanged() {
  S.sort = $('sort-select').value;
  S.pagPS4 = 1; S.pagPS5 = 1;
  if (S.tab === 'ps4') renderPS('ps4');
  if (S.tab === 'ps5') renderPS('ps5');
}

function setView(v) {
  S.view = v;
  $('btn-grid').classList.toggle('active', v === 'grid');
  $('btn-lista').classList.toggle('active', v === 'lista');
  if (S.tab === 'ps4') renderPS('ps4');
  if (S.tab === 'ps5') renderPS('ps5');
}

// ── TABS LISTENERS ───────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => irTab(t.dataset.tab));
  });
}

// ── HORARIO BANNER ───────────────────────────────────────────
function actualizarHorarioBanner() {
  const h      = new Date().getHours();
  const abierto = h >= HORA_AP && h < HORA_CI;
  const banner  = $('horario-banner');
  const texto   = $('horario-texto');
  banner.classList.toggle('cerrado', !abierto);
  texto.textContent = abierto
    ? `Atendiendo ahora · Cerramos a las ${HORA_CI}:00 hs`
    : `Cerrado · Abrimos a las ${HORA_AP}:00 hs`;
}
setInterval(actualizarHorarioBanner, 60000);

// ── BANNER ANUNCIO ───────────────────────────────────────────
function cerrarBanner() {
  $('banner-anuncio').classList.remove('show');
  try { sessionStorage.setItem('zs_banner', '1'); } catch(e) {}
}

function initBanner() {
  try { if (sessionStorage.getItem('zs_banner')) return; } catch(e) {}
  setTimeout(() => $('banner-anuncio').classList.add('show'), 1500);
}

// ── FAQ ──────────────────────────────────────────────────────
function initFAQ() {
  document.querySelectorAll('.faq-q').forEach(q => {
    q.addEventListener('click', () => {
      const a      = q.nextElementSibling;
      const isOpen = q.classList.contains('open');
      document.querySelectorAll('.faq-q.open').forEach(oq => {
        oq.classList.remove('open');
        oq.nextElementSibling.classList.remove('open');
      });
      if (!isOpen) { q.classList.add('open'); a.classList.add('open'); }
    });
  });
}

// ── FORMULARIO CONTACTO ──────────────────────────────────────
function initContacto() {
  const form = $('form-contacto');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const nombre  = form.querySelector('[name=nombre]')?.value  || '';
    const asunto  = form.querySelector('[name=asunto]')?.value  || '';
    const mensaje = form.querySelector('[name=mensaje]')?.value || '';
    const msg = `Hola! Soy *${nombre}*.\n\nAsunto: *${asunto}*\n\n${mensaje}`;
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
  });
}

// ── LOCALSTORAGE ─────────────────────────────────────────────
function cargarStorage() {
  try { S.favoritos = JSON.parse(localStorage.getItem('zs_favs')   || '[]'); } catch(e) { S.favoritos = []; }
  try { S.vistos    = JSON.parse(localStorage.getItem('zs_vistos') || '[]'); } catch(e) { S.vistos    = []; }
}

// ── DEEPLINK ─────────────────────────────────────────────────
function resolverDeeplink() {
  const params = new URLSearchParams(window.location.search);
  const q      = params.get('q');
  const tab    = params.get('tab');
  if (tab) irTab(tab);
  if (q) {
    const todo = [...S.datos.ps4, ...S.datos.ps5];
    const obj  = todo.find(j => j.nombre.toLowerCase().includes(q.toLowerCase()));
    if (obj) setTimeout(() => openModalPS(obj, obj._tag?.toLowerCase() || 'ps4'), 300);
  }
}

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  cargarStorage();
  actualizarHorarioBanner();
  initBanner();
  initTabs();
  initFiltros();
  initBuscador();
  initHomeBuscador();
  initFAQ();
  initContacto();
  irTab('home');
  await cargarTodo();
  resolverDeeplink();
});
