// app-productos.js
// =======================================================
// VĀLI | Carrito solo para productos (+ catálogo opcional)
// Mantiene lógica de carrito y agrega: fetch de JSON embebido,
// render del catálogo si hay contenedor, y filtros si existen inputs.
// =======================================================

(() => {
  'use strict';

  // -------------------- Config general --------------------
  const currency = new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency: 'UYU',
    maximumFractionDigits: 0
  });

  const STORAGE_KEY = 'vali.cart.productos';
  const STORAGE_VERSION = 1;

  // Selectores (agrego grid/filtros q estan en productos.html)
  const SEL = {
    badge: '#badge',
    btnCarrito: '#btnCarrito',
    panelCarrito: '#carrito',
    cerrarCarrito: '#cerrarCarrito',
    tbody: '#carritoBody',
    total: '#total',
    btnVaciar: '#vaciar',
    btnComprar: '#comprar',
    addBtn: '.add-btn',

    // opcionales (solo se usan si existen en el HTML)
    grid: '#gridProductos',
    busqueda: '#busqueda',
    filtroCat: '#filtroCat',
    orden: '#orden'
  };

  // -------------------- Estado --------------------
  // Cada item: { id, nombre, precio, img, cat, cantidad }
  let carrito = [];
  let totalItemsCalculado = 0; // (de prueba, lo dejo)

  // Catálogo (opcional)
  let productos = [];     // datos crudos
  let vista = [];         // lo que se muestra
  let categorias = new Set();

  // -------------------- Helpers --------------------
  const $ = (sel) => document.querySelector(sel);
  const money = (n) => currency.format(Number(n) || 0);
  const contar = (items) => items.reduce((acc, it) => acc + it.cantidad, 0);
  const totalizar = (items) => items.reduce((acc, it) => acc + (it.precio * it.cantidad), 0);
  const safeParseJSON = (txt, fallback) => { try { return JSON.parse(txt); } catch { return fallback; } };

  function upsertItem(lista, nuevo) {
    const i = lista.findIndex(x => x.id === nuevo.id);
    if (i > -1) {
      const copia = lista.map(x => ({ ...x }));
      copia[i].cantidad += nuevo.cantidad;
      return copia;
    }
    return [...lista, { ...nuevo }];
  }

  function changeQty(lista, id, delta) {
    const copia = lista.map(x => x.id === id ? { ...x, cantidad: x.cantidad + delta } : x);
    return copia.filter(x => x.cantidad > 0);
  }

  const deleteById = (lista, id) => lista.filter(x => x.id !== id);

  // -------------------- Storage --------------------
  function loadCart() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = safeParseJSON(raw, null);
    if (!data || typeof data !== 'object') return [];
    if (data.version !== STORAGE_VERSION || !Array.isArray(data.items)) return [];
    return data.items.map(it => ({
      id: String(it.id || ''),
      nombre: String(it.nombre || ''),
      precio: Number(it.precio || 0),
      img: String(it.img || ''),
      cat: String(it.cat || ''),
      cantidad: Math.max(1, Number(it.cantidad || 1))
    })).filter(it => it.id);
  }

  function saveCart(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: STORAGE_VERSION,
      items
    }));
  }

  // -------------------- Cache de nodos --------------------
  const badgeEl = $(SEL.badge);
  const btnCarritoEl = $(SEL.btnCarrito);
  const panelEl = $(SEL.panelCarrito);
  const cerrarEl = $(SEL.cerrarCarrito);
  const tbodyEl = $(SEL.tbody);
  const totalEl = $(SEL.total);
  const btnVaciarEl = $(SEL.btnVaciar);
  const btnComprarEl = $(SEL.btnComprar);

  // opcionales (solo en productos.html)
  const gridEl = $(SEL.grid);
  const busquedaEl = $(SEL.busqueda);
  const filtroCatEl = $(SEL.filtroCat);
  const ordenEl = $(SEL.orden);

  // Accesibilidad básica
  badgeEl && badgeEl.setAttribute('aria-live', 'polite');

  // Toasts con SweetAlert2
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 1500,
    timerProgressBar: true
  });

  // -------------------- Render Carrito --------------------
  function renderCarrito() {
    if (!badgeEl || !tbodyEl || !totalEl) return;

    const cant = contar(carrito);
    badgeEl.textContent = String(cant);
    totalItemsCalculado = cant;

    if (!carrito.length) {
      tbodyEl.innerHTML = `<tr><td colspan="3"><em>Tu carrito está vacío.</em></td></tr>`;
    } else {
      tbodyEl.innerHTML = carrito.map(p => `
        <tr>
          <td>
            <div style="display:flex; gap:.5rem; align-items:center;">
              <img src="${p.img}" alt="${p.nombre}" width="44" height="44"
                   style="width:44px;height:44px;object-fit:cover;border-radius:6px;border:1px solid #eee;">
              <div style="display:flex; flex-direction:column;">
                <strong>${p.nombre}</strong>
                <small style="opacity:.7">${p.cat}</small>
              </div>
            </div>
          </td>
          <td class="acciones">
            <button class="btn-min" data-act="menos" data-id="${p.id}" aria-label="Quitar uno">−</button>
            <span aria-live="polite">${p.cantidad}</span>
            <button class="btn-min" data-act="mas" data-id="${p.id}" aria-label="Agregar uno">+</button>
            <button class="btn-min" data-act="del" data-id="${p.id}" title="Eliminar" aria-label="Eliminar del carrito">🗑️</button>
          </td>
          <td>${money(p.precio * p.cantidad)}</td>
        </tr>
      `).join('');
    }

    totalEl.textContent = money(totalizar(carrito));
  }

  // -------------------- Acciones principales --------------------
  function agregar(prod) {
    const base = {
      id: String(prod && prod.id || ''),          // si no hay id, no agrego
      nombre: String(prod && prod.nombre || ''),
      precio: Number(prod && prod.precio || 0),
      img: String(prod && prod.img || ''),
      cat: String(prod && prod.cat || ''),
      cantidad: Number(prod && prod.cantidad || 1)
    };
    if (!base.id) return; // sin id no me la juego
    carrito = upsertItem(carrito, base);
    saveCart(carrito);
    renderCarrito();
    Toast.fire({ icon: 'success', title: 'Agregado al carrito' });
  }

  function qty(id, delta) {
    carrito = changeQty(carrito, id, delta);
    saveCart(carrito);
    renderCarrito();
  }

  function eliminar(id) {
    carrito = deleteById(carrito, id);
    saveCart(carrito);
    renderCarrito();
  }

  async function vaciar() {
    if (!carrito.length) return;
    const res = await Swal.fire({
      title: 'Vaciar carrito',
      text: '¿Seguro que querés borrar todo?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, vaciar',
      cancelButtonText: 'Cancelar'
    });
    if (res.isConfirmed) {
      carrito = [];
      saveCart(carrito);
      renderCarrito();
      Toast.fire({ icon: 'success', title: 'Carrito vacío' });
    }
  }

  async function comprar() {
    if (!carrito.length) {
      Toast.fire({ icon: 'info', title: 'El carrito está vacío' });
      return;
    }

    const { value: formValues } = await Swal.fire({
      title: 'Finalizar compra',
      html: `
        <input id="swal-nombre" class="swal2-input" placeholder="Nombre y apellido" value="Alejandro">
        <input id="swal-email" class="swal2-input" placeholder="Email" value="alejandro@example.com">
        <input id="swal-dir" class="swal2-input" placeholder="Dirección (opcional)">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const nombre = document.getElementById('swal-nombre')?.value.trim();
        const email  = document.getElementById('swal-email')?.value.trim();
        const dir    = document.getElementById('swal-dir')?.value.trim();
        if (!nombre || !email) {
          Swal.showValidationMessage('Completá nombre y email');
          return false;
        }
        return { nombre, email, dir };
      }

      
    });

    if (!formValues) return;

    await Swal.fire({
      icon: 'success',
      title: 'Compra realizada',
      text: `¡Gracias, ${formValues.nombre}! Te enviamos el detalle a ${formValues.email}.`
    });

    carrito = [];
    saveCart(carrito);
    renderCarrito();
  }

  // -------------------- Catálogo (opcional): datos + render --------------------
  // JSON embebido para cumplir “fetch de datos remotos” sin crear archivos.
 
  const DATA_EMBEBIDA = {
    "version": 1,
    "moneda": "UYU",
    "productos": [
      { "id":"cam-01","nombre":"Camisa Clásica","precio":1890,"img":"../images/Productos/vali-productos-camisas.jpg","cat":"Camisas","descripcion":"Camisa de algodón fit regular.","stock":15,"destacado":true },
      { "id":"cam-02","nombre":"Camisa Lino","precio":2290,"img":"../images/Productos/vali-productos-camisas.jpg","cat":"Camisas","descripcion":"Lino liviano, ideal verano.","stock":12,"destacado":false },
      { "id":"sob-01","nombre":"Sobrecamisa Oversize","precio":2490,"img":"../images/Productos/vali-productos-sobrecamisas.jpg","cat":"Sobrecamisas","descripcion":"Corte amplio, textura suave.","stock":10,"destacado":true },
      { "id":"sob-02","nombre":"Sobrecamisa Utility","precio":2690,"img":"../images/Productos/vali-productos-sobrecamisas.jpg","cat":"Sobrecamisas","descripcion":"Bolsillos frontales y canvas.","stock":8,"destacado":false },
      { "id":"ves-01","nombre":"Vestido Midi","precio":3290,"img":"../images/Productos/vali-productos-vestidos.jpg","cat":"Vestidos","descripcion":"Corte midi, sutil vuelo.","stock":9,"destacado":true },
      { "id":"ves-02","nombre":"Vestido Slip","precio":2990,"img":"../images/Productos/vali-productos-vestidos.jpg","cat":"Vestidos","descripcion":"Breteles finos, satinado.","stock":7,"destacado":false },
      { "id":"cha-01","nombre":"Saco Knit","precio":2790,"img":"../images/Productos/vali-productos-chalecosycamisas.jpg","cat":"Chalecos y Sacos","descripcion":"Punto grueso, abrigado.","stock":11,"destacado":true },
      { "id":"cha-02","nombre":"Chaleco Soft","precio":1990,"img":"../images/Productos/vali-productos-chalecosycamisas.jpg","cat":"Chalecos y Sacos","descripcion":"Tejido suave, corte recto.","stock":14,"destacado":false }
    ]
  };
  const DATA_URL = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(DATA_EMBEBIDA));

  async function cargarProductos() {
    if (!gridEl) return;
    try {
      const res = await fetch(DATA_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data || !Array.isArray(data.productos)) throw new Error('JSON inesperado');

      productos = data.productos.map(p => ({
        id: String(p.id || ''),
        nombre: String(p.nombre || ''),
        precio: Number(p.precio || 0),
        img: String(p.img || ''),
        cat: String(p.cat || ''),
        descripcion: String(p.descripcion || ''),
        stock: Number(p.stock || 0),
        destacado: Boolean(p.destacado)
      })).filter(p => p.id);

      
const IMG_OVERRIDE = {
  // Camisas / Sobrecamisas (Colecciones)
  'cam-01': '../images/Colecciones/vali-colecciones-moonlight.jpg',
  'cam-02': '../images/Colecciones/vali-colecciones-ilikeyou.jpg',
  'sob-01': '../images/Colecciones/vali-colecciones-monaco.jpg',
  'sob-02': '../images/Colecciones/vali-colecciones-revasser.jpg',

  // Vestidos y Chalecos/Sacos usando fotos de la portada de INICIO
  'ves-01': '../images/Inicio/vali-inicio-primer-foto.jpg',
  'ves-02': '../images/Inicio/vali-inicio-segunda-foto.jpg',
  'cha-01': '../images/Inicio/vali-inicio-tercer-foto.jpg',
  'cha-02': '../images/Inicio/vali-inicio-cuarta-foto.jpg'
};
productos = productos.map(p => ({
  ...p,
  img: IMG_OVERRIDE[p.id] || p.img
}));


      categorias = new Set(productos.map(p => p.cat).filter(Boolean));
      vista = [...productos];

    } catch (err) {
      console.error('Error cargando productos:', err);
      await Swal.fire({
        icon: 'error',
        title: 'No pudimos cargar los productos',
        text: 'Revisá las rutas de imágenes o el JSON embebido en app-productos.js.'
      });
      productos = [];
      vista = [];
    }
  }

  function cardProducto(p) {
    return `
      <div class="col-12 col-sm-6 col-md-4 col-lg-3 mb-4">
        <div class="card h-100 shadow-sm">
          <img src="${p.img}" class="card-img-top" alt="${p.nombre}" loading="lazy">
          <div class="card-body d-flex flex-column">
            <h6 class="mb-1">${p.nombre}</h6>
            <small class="text-muted mb-2">${p.cat || ''}</small>
            <p class="mb-2">${money(p.precio)}</p>
            <button class="btn btn-primary mt-auto add-btn"
              data-id="${p.id}"
              data-nombre="${p.nombre}"
              data-precio="${p.precio}"
              data-img="${p.img}"
              data-cat="${p.cat}"
            >+</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderFiltros() {
    if (!filtroCatEl) return;
    const opciones = ['<option value="">Todas</option>']
      .concat([...categorias].sort().map(cat => `<option value="${cat}">${cat}</option>`));
    filtroCatEl.innerHTML = opciones.join('');
  }

  function renderGrid(lista) 
  
  {
    if (!gridEl) return;
    gridEl.innerHTML = !lista.length
      ? `<div class="col-12"><em>No hay productos para mostrar.</em></div>`
      : lista.map(cardProducto).join('');

    // 👇 Fix: marcar imágenes lazy como cargadas para que aparezcan
    gridEl.querySelectorAll('img[loading="lazy"]').forEach(img => {
      const listo = () => img.classList.add('loaded');
      if (img.complete) {
        listo();
      } else {
        img.addEventListener('load', listo, { once: true });
        img.addEventListener('error', () => img.classList.add('loaded'), { once: true });
      }
    });

    // --- Lazy global para cualquier página (colecciones, etc.) ---
function activarLazyEn(root = document) {
  root.querySelectorAll('img[loading="lazy"]:not(.loaded)').forEach(img => {
    const listo = () => img.classList.add('loaded');
    if (img.complete) listo();
    else {
      img.addEventListener('load', listo, { once: true });
      img.addEventListener('error', listo, { once: true });
    }
  });
}
document.addEventListener('DOMContentLoaded', () => activarLazyEn(document));


// Llamada global al inicio y cada vez que el DOM esté listo
document.addEventListener('DOMContentLoaded', () => activarLazyEn(document));

  }

  function aplicarFiltros()
   {
    if (!gridEl) return;
    const q = (busquedaEl?.value || '').toLowerCase().trim();
    const cat = (filtroCatEl?.value || '').trim();
    const ord = (ordenEl?.value || '').trim();

    let base = [...productos];

    if (q) base = base.filter(p => p.nombre.toLowerCase().includes(q) || (p.descripcion || '').toLowerCase().includes(q));
    if (cat) base = base.filter(p => p.cat === cat);
    if (ord === 'precio-asc')  base.sort((a, b) => a.precio - b.precio);
    if (ord === 'precio-desc') base.sort((a, b) => b.precio - a.precio);
    if (ord === 'nombre-asc')  base.sort((a, b) => a.nombre.localeCompare(b.nombre));
    if (ord === 'nombre-desc') base.sort((a, b) => b.nombre.localeCompare(a.nombre));

    vista = base;
    renderGrid(vista);

    
  }

  // -------------------- Eventos --------------------
  // Abrir/Cerrar panel
  $(SEL.btnCarrito)?.addEventListener('click', () => {
    $(SEL.panelCarrito)?.classList.add('abierto');
    $(SEL.panelCarrito)?.setAttribute('aria-hidden', 'false');
  });
  $(SEL.cerrarCarrito)?.addEventListener('click', () => {
    $(SEL.panelCarrito)?.classList.remove('abierto');
    $(SEL.panelCarrito)?.setAttribute('aria-hidden', 'true');
  });

  // Delegación global (+ y acciones del carrito)
  document.addEventListener('click', (ev) => {
    const t = ev.target;

    const addBtn = t.closest && t.closest(SEL.addBtn);
    if (addBtn) {
      const { id, nombre, precio, img, cat } = addBtn.dataset || {};
      agregar({ id, nombre, precio: Number(precio), img, cat, cantidad: 1 });
      return;
    }

    const actionBtn = t.closest && t.closest('button[data-act][data-id]');
    const tbody = $(SEL.tbody);
    if (actionBtn && tbody && tbody.contains(actionBtn)) {
      const { act, id } = actionBtn.dataset;
      if (act === 'mas')   qty(id, +1);
      if (act === 'menos') qty(id, -1);
      if (act === 'del')   eliminar(id);
    }
  }, { passive: true });

  // Vaciar / Comprar
  $(SEL.btnVaciar)?.addEventListener('click', () => { void vaciar(); });
  $(SEL.btnComprar)?.addEventListener('click', () => { void comprar(); });

  // Filtros (si existen)
  busquedaEl?.addEventListener('input', aplicarFiltros);
  filtroCatEl?.addEventListener('change', aplicarFiltros);
  ordenEl?.addEventListener('change', aplicarFiltros);

  // -------------------- Inicio --------------------
  carrito = loadCart();
  renderCarrito();

  // Si la página tiene catálogo, lo cargo y lo muestro
  (async () => {
    await cargarProductos();   // fetch a data:URL
    renderFiltros();           // llena <select> categorías si existe
    aplicarFiltros();          // pinta el grid si existe
  })();

  // Para resetear manual:
  // localStorage.removeItem(STORAGE_KEY);

})();
