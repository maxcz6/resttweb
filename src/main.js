import Chart from 'chart.js/auto';
import { store } from './services/store.js';
import { formatCurrency, formatTime, calculateTimeElapsed, getStatusColor } from './utils/formatters.js';

// --- ELEMENTOS DEL DOM ---
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const openSidebarBtn = document.getElementById('open-sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar');
const navLinks = document.querySelectorAll('.nav-link');
const viewSections = document.querySelectorAll('.view-section');
const pageTitle = document.getElementById('page-title');
const mesasGrid = document.getElementById('mesas-grid');
const cajaGrid = document.getElementById('caja-grid');
const cocinaPending = document.getElementById('kanban-pendiente');
const cocinaPreparing = document.getElementById('kanban-preparando');
const cocinaReady = document.getElementById('kanban-listo');
const productosGrid = document.getElementById('productos-grid');
const orderModal = document.getElementById('order-modal');
const liveStatus = document.getElementById('live-status');
const lastUpdated = document.getElementById('last-updated');
const kitchenStatsPending = document.getElementById('kitchen-stats-pending');
const kitchenStatsPreparing = document.getElementById('kitchen-stats-preparando');
const kitchenStatsReady = document.getElementById('kitchen-stats-listo');

const orderModalClose = document.getElementById('order-modal-close');
const orderMenuList = document.getElementById('order-menu-list');
const orderSummaryList = document.getElementById('order-summary-list');
const orderTotal = document.getElementById('order-total');
const orderMesaSelect = document.getElementById('order-mesa');
const orderNoteInput = document.getElementById('order-note');
const orderSubmitBtn = document.getElementById('order-submit');

let currentOrderDraft = [];
let currentOrderMesa = null;
const kitchenStageMap = new Map();

// --- ROUTER SPA BÁSICO ---
function navigateTo(hash) {
  const targetId = hash.replace('#', '');
  if (!targetId) return;

  viewSections.forEach(section => {
    if (section.id === `view-${targetId}`) {
      section.classList.add('active');
    } else {
      section.classList.remove('active');
    }
  });

  navLinks.forEach(link => {
    if (link.getAttribute('href') === hash) {
      link.classList.add('bg-slate-800', 'text-white');
      pageTitle.textContent = link.textContent.trim();
    } else {
      link.classList.remove('bg-slate-800', 'text-white');
    }
  });
}

window.addEventListener('hashchange', () => navigateTo(window.location.hash));
const initialHash = window.location.hash || '#cocina';
window.history.replaceState(null, '', initialHash);
navigateTo(initialHash);

// --- MANEJO DEL SIDEBAR (MÓVIL) ---
openSidebarBtn.addEventListener('click', () => {
  sidebar.classList.remove('-translate-x-full');
  sidebarOverlay.classList.remove('hidden');
});

function closeSidebar() {
  sidebar.classList.add('-translate-x-full');
  sidebarOverlay.classList.add('hidden');
}

closeSidebarBtn.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);
navLinks.forEach(link => {
  link.addEventListener('click', () => {
    if (window.innerWidth < 768) closeSidebar();
  });
});

function openOrderModal(mesaNumero) {
  currentOrderMesa = mesaNumero ?? null;
  currentOrderDraft = [];
  orderNoteInput.value = '';
  renderOrderSummary();
  renderOrderModal(store.data);
  orderModal.classList.remove('hidden');
}

function closeOrderModal() {
  orderModal.classList.add('hidden');
}

function renderOrderModal(data) {
  const mesas = data.mesas || [];
  const selectedValue = currentOrderMesa ?? (mesas[0]?.numero ?? '');

  orderMesaSelect.innerHTML = mesas.length
    ? mesas.map(m => `<option value="${m.numero}" ${selectedValue === m.numero ? 'selected' : ''}>${m.numero}</option>`).join('')
    : '<option value="">Sin mesas</option>';

  if (selectedValue) {
    orderMesaSelect.value = selectedValue;
  }

  const platos = data.platos || [];
  const grouped = platos.reduce((acc, plato) => {
    if (!acc[plato.categoria]) acc[plato.categoria] = [];
    acc[plato.categoria].push(plato);
    return acc;
  }, {});

  orderMenuList.innerHTML = Object.entries(grouped).length
    ? Object.entries(grouped).map(([categoria, items]) => `
      <div class="space-y-2">
        <h4 class="text-sm font-semibold text-slate-600 uppercase tracking-wide">${categoria}</h4>
        <div class="grid gap-2">
          ${items.map(item => `
            <button type="button" data-add-item="${item.nombre}" data-price="${item.precio}" class="w-full flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:border-primary hover:shadow-sm transition-all">
              <span>
                <span class="block font-medium text-slate-700">${item.nombre}</span>
                <span class="text-xs text-slate-400">${item.categoria}</span>
              </span>
              <span class="text-sm font-semibold text-primary">${formatCurrency(item.precio)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `).join('')
    : '<div class="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-400">No hay platos disponibles en este momento.</div>';
}

function renderOrderSummary() {
  const total = currentOrderDraft.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  orderTotal.textContent = formatCurrency(total);
  orderSubmitBtn.disabled = currentOrderDraft.length === 0;

  if (currentOrderDraft.length === 0) {
    orderSummaryList.innerHTML = '<div class="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-400">Aún no has agregado productos.</div>';
    return;
  }

  orderSummaryList.innerHTML = currentOrderDraft.map(item => `
    <div class="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div>
        <p class="text-sm font-medium text-slate-700">${item.cantidad}x ${item.nombre}</p>
        <p class="text-xs text-slate-400">${formatCurrency(item.precio)} c/u</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-slate-700">${formatCurrency(item.precio * item.cantidad)}</span>
        <button type="button" data-remove-item="${item.nombre}" class="rounded-full bg-white p-1 text-slate-400 hover:bg-slate-200 hover:text-danger">
          <span class="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
    </div>
  `).join('');
}

function addItemToOrder(nombre, precio) {
  const existing = currentOrderDraft.find(item => item.nombre === nombre);
  if (existing) {
    existing.cantidad += 1;
  } else {
    currentOrderDraft.push({ nombre, precio, cantidad: 1 });
  }
  renderOrderSummary();
}

function removeItemFromOrder(nombre) {
  currentOrderDraft = currentOrderDraft.filter(item => item.nombre !== nombre);
  renderOrderSummary();
}

// --- RENDERIZADO DE VISTAS ---
function renderDashboard(data) {
  const ventasHoy = data.pedidos.reduce((acc, p) => acc + (parseFloat(p.total) || 0), 0);
  const mesasOcupadas = data.mesas.filter(m => m.estado !== 'Libre').length;
  const pedidosActivos = data.pedidos.length;

  document.getElementById('kpi-ventas').textContent = formatCurrency(ventasHoy);
  document.getElementById('kpi-mesas').textContent = mesasOcupadas;
  document.getElementById('kpi-pedidos').textContent = pedidosActivos;

  const activityList = document.getElementById('recent-activity-list');

  if (data.pedidos.length === 0) {
    activityList.innerHTML = '<div class="text-sm text-slate-500 text-center py-8">📭 No hay pedidos en este momento</div>';
  } else {
    activityList.innerHTML = data.pedidos.slice(0, 5).map(p => `
      <div class="flex items-start">
        <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mr-3 mt-1">
          <span class="material-symbols-outlined text-slate-500 text-sm">receipt</span>
        </div>
        <div>
          <p class="text-sm font-medium text-textMain">Pedido ${p.id} - Mesa ${p.mesa}</p>
          <p class="text-xs text-slate-500">${p.detalles} • <span class="font-medium ${getStatusColor(p.estado)} px-1.5 py-0.5 rounded">${p.estado}</span></p>
        </div>
        <span class="ml-auto text-xs text-slate-400">${calculateTimeElapsed(p.fecha)}</span>
      </div>
    `).join('');
  }
}

function renderPedidos(data) {
  const tbody = document.getElementById('tabla-pedidos');
  tbody.innerHTML = data.pedidos.map(p => `
    <tr class="hover:bg-slate-50 transition-colors">
      <td class="px-5 py-4 font-medium">${p.id}</td>
      <td class="px-5 py-4">Mesa ${p.mesa}</td>
      <td class="px-5 py-4 text-slate-500">${formatTime(p.fecha)}</td>
      <td class="px-5 py-4 font-medium">${formatCurrency(p.total)}</td>
      <td class="px-5 py-4">
        <span class="px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(p.estado)}">
          ${p.estado}
        </span>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5" class="px-5 py-4 text-center text-slate-400">No hay pedidos</td></tr>';
}

function renderMesas(data) {
  if (!mesasGrid) return;

  if (data.mesas.length === 0) {
    mesasGrid.innerHTML = `
      <div class="col-span-full py-20 text-center">
        <p class="text-slate-400 mb-2">🪑 No hay mesas configuradas</p>
        <p class="text-sm text-slate-500">Verifica que la hoja "Mesas" en Google Sheets tenga datos</p>
      </div>
    `;
    return;
  }

  mesasGrid.innerHTML = data.mesas.map(m => {
    let borderColor = 'border-success';
    let bgColor = 'bg-white';
    let icon = 'restaurant';

    if (m.estado === 'Ocupada') {
      borderColor = 'border-danger';
      bgColor = 'bg-red-50';
    } else if (m.estado === 'Esperando') {
      borderColor = 'border-warning';
      bgColor = 'bg-amber-50';
      icon = 'timer';
    }

    return `
    <div class="rounded-xl border-2 ${borderColor} ${bgColor} p-4 flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow h-32 relative group">
      <span class="absolute top-2 right-2 text-xs font-semibold text-slate-500">${m.tiempo}</span>
      <span class="material-symbols-outlined text-3xl mb-1 ${m.estado === 'Libre' ? 'text-success' : (m.estado === 'Ocupada' ? 'text-danger' : 'text-warning')}">${icon}</span>
      <h4 class="font-bold text-lg text-textMain">Mesa ${m.numero}</h4>
      <span class="text-xs font-medium text-slate-600">${m.estado} ${m.total > 0 ? '• ' + formatCurrency(m.total) : ''}</span>
      ${m.estado === 'Libre' ? `
        <button type="button" data-open-order="${m.numero}" class="absolute bottom-2 hidden group-hover:block bg-primary text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700 transition-colors">
          + Pedido
        </button>
      ` : ''}
    </div>
    `;
  }).join('');
}

function renderProductos(data) {
  if (!productosGrid) return;

  const platos = data.platos || [];
  const grouped = platos.reduce((acc, plato) => {
    if (!acc[plato.categoria]) acc[plato.categoria] = [];
    acc[plato.categoria].push(plato);
    return acc;
  }, {});

  if (!platos.length) {
    productosGrid.innerHTML = '<div class="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">No hay productos disponibles todavía.</div>';
    return;
  }

  productosGrid.innerHTML = Object.entries(grouped).map(([categoria, items]) => `
    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-textMain">${categoria}</h3>
        <span class="text-xs text-slate-400">${items.length} opciones</span>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        ${items.map(item => `
          <div class="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div class="flex justify-between items-start gap-2">
              <div>
                <p class="font-medium text-slate-700">${item.nombre}</p>
                <p class="text-xs text-slate-400">Disponible</p>
              </div>
              <span class="text-sm font-semibold text-primary">${formatCurrency(item.precio)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function getPedidoStage(pedido) {
  if (kitchenStageMap.has(pedido.id)) {
    return kitchenStageMap.get(pedido.id);
  }
  return pedido.estado?.toLowerCase() === 'listo' ? 'listo' : 'pendiente';
}

function setPedidoStage(pedidoId, stage) {
  kitchenStageMap.set(pedidoId, stage);
}

function renderCocina(data) {
  const pending = data.pedidos.filter(p => getPedidoStage(p) === 'pendiente');
  const preparing = data.pedidos.filter(p => getPedidoStage(p) === 'preparando');
  const ready = data.pedidos.filter(p => getPedidoStage(p) === 'listo');

  if (kitchenStatsPending) kitchenStatsPending.textContent = pending.length;
  if (kitchenStatsPreparing) kitchenStatsPreparing.textContent = preparing.length;
  if (kitchenStatsReady) kitchenStatsReady.textContent = ready.length;

  const cardTemplate = (p, stage) => {
    const actionLabel = stage === 'pendiente'
      ? 'Pasar a preparando'
      : stage === 'preparando'
        ? 'Marcar como listo'
        : 'Listo';

    const accentClass = stage === 'pendiente'
      ? 'border-amber-200 bg-amber-50/80'
      : stage === 'preparando'
        ? 'border-blue-200 bg-blue-50/80'
        : 'border-emerald-200 bg-emerald-50/80';

    return `
      <div class="rounded-2xl border ${accentClass} p-4 shadow-sm">
        <div class="flex items-start justify-between gap-2">
          <div>
            <h4 class="font-semibold text-textMain">Mesa ${p.mesa}</h4>
            <p class="text-xs text-slate-500">${p.id}</p>
          </div>
          <span class="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            ${stage === 'pendiente' ? 'Pendiente' : stage === 'preparando' ? 'Preparando' : 'Listo'}
          </span>
        </div>
        <p class="mt-3 text-sm text-slate-600 whitespace-pre-wrap">${p.detalles}</p>
        <div class="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>${formatCurrency(p.total)}</span>
          <span>${calculateTimeElapsed(p.fecha)}</span>
        </div>
        ${stage !== 'listo' ? `<button type="button" data-kitchen-action="${p.id}" class="mt-4 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors">${actionLabel}</button>` : '<div class="mt-4 rounded-lg border border-emerald-200 bg-emerald-100 px-3 py-2 text-center text-sm font-medium text-emerald-700">Entregado a cocina</div>'}
      </div>
    `;
  };

  if (cocinaPending) cocinaPending.innerHTML = pending.map(p => cardTemplate(p, 'pendiente')).join('') || '<div class="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-400">Sin pedidos</div>';
  if (cocinaPreparing) cocinaPreparing.innerHTML = preparing.map(p => cardTemplate(p, 'preparando')).join('') || '<div class="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-400">Vacío</div>';
  if (cocinaReady) cocinaReady.innerHTML = ready.map(p => cardTemplate(p, 'listo')).join('') || '<div class="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-400">Aún no hay platos listos</div>';
}

function renderCaja(data) {
  const pendientes = data.pedidos;

  if (pendientes.length === 0) {
    cajaGrid.innerHTML = '<div class="col-span-full py-10 text-center text-slate-400">No hay pedidos para cobrar.</div>';
    return;
  }

  cajaGrid.innerHTML = pendientes.map(p => `
    <div class="bg-cards rounded-xl p-5 shadow-sm border border-slate-100">
      <div class="flex justify-between items-start mb-4">
        <div>
          <h3 class="text-xl font-bold text-textMain">Mesa ${p.mesa}</h3>
          <p class="text-sm text-slate-500">ID: ${p.id}</p>
        </div>
        <span class="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Pendiente</span>
      </div>
      <div class="border-t border-b border-slate-100 py-3 mb-4 space-y-2">
         <p class="text-sm text-slate-600 whitespace-pre-wrap">${p.detalles}</p>
      </div>
      <div class="flex justify-between items-center mb-4">
        <span class="text-slate-500 font-medium">Total a Pagar</span>
        <span class="text-2xl font-bold text-textMain">${formatCurrency(p.total)}</span>
      </div>
      <button type="button" data-pay-order="${p.id}" data-mesa="${p.mesa}" class="w-full bg-slate-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
        💳 Cobrar y Liberar
      </button>
    </div>
  `).join('');
}

// --- EVENTOS DE UI ---
mesasGrid?.addEventListener('click', event => {
  const button = event.target.closest('[data-open-order]');
  if (button) {
    openOrderModal(button.getAttribute('data-open-order'));
  }
});

cajaGrid?.addEventListener('click', event => {
  const button = event.target.closest('[data-pay-order]');
  if (!button) return;
  const mesa = button.getAttribute('data-mesa');
  if (confirm(`¿Cobrar pedido y liberar Mesa ${mesa}?`)) {
    store.liberarMesa(mesa).then(result => {
      if (result.exito) {
        alert(`✅ ${result.mensaje}`);
      } else {
        alert(`❌ Error: ${result.mensaje}`);
      }
    });
  }
});

document.querySelectorAll('[id^="kanban-"]').forEach(container => {
  container.addEventListener('click', event => {
    const button = event.target.closest('[data-kitchen-action]');
    if (!button) return;
    const id = button.getAttribute('data-kitchen-action');
    const pedido = store.data.pedidos.find(p => p.id === id);
    if (!pedido) return;

    const currentStage = getPedidoStage(pedido);
    const nextStage = currentStage === 'pendiente' ? 'preparando' : 'listo';
    setPedidoStage(id, nextStage);
    renderCocina(store.data);
  });
});

orderModalClose?.addEventListener('click', closeOrderModal);
orderModal?.addEventListener('click', event => {
  if (event.target.id === 'order-modal') closeOrderModal();
});

orderMenuList?.addEventListener('click', event => {
  const button = event.target.closest('[data-add-item]');
  if (!button) return;
  const nombre = button.getAttribute('data-add-item');
  const precio = parseFloat(button.getAttribute('data-price')) || 0;
  addItemToOrder(nombre, precio);
});

orderSummaryList?.addEventListener('click', event => {
  const button = event.target.closest('[data-remove-item]');
  if (!button) return;
  removeItemFromOrder(button.getAttribute('data-remove-item'));
});

orderMesaSelect?.addEventListener('change', event => {
  currentOrderMesa = event.target.value;
});

orderSubmitBtn?.addEventListener('click', async () => {
  const mesa = orderMesaSelect.value;
  const detalle = currentOrderDraft.map(item => `${item.cantidad}x ${item.nombre}`).join(', ');
  const nota = orderNoteInput.value.trim();
  const detalleCompleto = nota ? `${detalle} • ${nota}` : detalle;
  const total = currentOrderDraft.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

  if (!mesa || currentOrderDraft.length === 0) {
    alert('Selecciona una mesa y al menos un producto.');
    return;
  }

  orderSubmitBtn.disabled = true;
  orderSubmitBtn.textContent = 'Enviando...';

  const result = await store.crearPedido(mesa, detalleCompleto, total);
  if (result.exito) {
    alert(`✅ Pedido creado: ${result.idPedido}`);
    closeOrderModal();
  } else {
    alert(`❌ Error: ${result.mensaje}`);
  }

  orderSubmitBtn.disabled = false;
  orderSubmitBtn.textContent = 'Crear Pedido';
});

// --- FUNCIONES GLOBALES PARA LOS BOTONES ---
window.abrirFormularioPedido = (mesaNumero) => {
  openOrderModal(mesaNumero);
};

window.marcarListo = (id) => {
  const pedido = store.data.pedidos.find(p => p.id === id);
  if (pedido) {
    pedido.estado = 'Listo';
    store.notify();
    alert(`✅ Pedido ${id} marcado como listo en la vista de cocina.`);
  }
};

window.pagarYLiberarMesa = (id, mesa) => {
  if (confirm(`¿Cobrar pedido y liberar Mesa ${mesa}?`)) {
    store.liberarMesa(mesa).then(result => {
      if (result.exito) {
        alert(`✅ ${result.mensaje}`);
      } else {
        alert(`❌ Error: ${result.mensaje}`);
      }
    });
  }
};

// --- VARIABLE GLOBAL PARA EL CHART ---
let ventasChart = null;

// --- INIT CHART.JS ---
function initChart() {
  const ctx = document.getElementById('ventasChart');
  if (!ctx) return;

  ventasChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
      datasets: [{
        label: 'Ventas (S/)',
        data: [0, 0, 0, 0, 0, 0, 0],
        backgroundColor: '#2563EB',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { borderDash: [2, 4], color: '#f1f5f9' } },
        x: { grid: { display: false } }
      }
    }
  });
}

/**
 * Calcula ventas de los últimos 7 días desde los pedidos
 */
function calcularVentasPor7Dias(pedidos) {
  const ventas = [0, 0, 0, 0, 0, 0, 0];

  pedidos.forEach(pedido => {
    const fecha = new Date(pedido.fecha);
    const dia = fecha.getDay();
    const indice = dia === 0 ? 6 : dia - 1;
    ventas[indice] += parseFloat(pedido.total) || 0;
  });

  return ventas;
}

/**
 * Actualiza el gráfico de ventas con datos reales
 */
function actualizarGraficoVentas(data) {
  if (!ventasChart) return;

  const ventasPor7Dias = calcularVentasPor7Dias(data.pedidos);
  ventasChart.data.datasets[0].data = ventasPor7Dias;
  ventasChart.update();
}

function actualizarEstadoEnTiempoReal(data) {
  if (liveStatus) {
    liveStatus.textContent = data.lastUpdated ? 'En tiempo real' : 'Sincronizando';
  }

  if (lastUpdated && data.lastUpdated) {
    const hora = new Date(data.lastUpdated).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
    lastUpdated.textContent = `Últ. actualización ${hora}`;
  }
}

// --- SUSCRIPCIÓN AL STORE ---
store.subscribe((data) => {
  renderDashboard(data);
  renderPedidos(data);
  renderMesas(data);
  renderProductos(data);
  renderCocina(data);
  renderCaja(data);
  actualizarGraficoVentas(data);
  actualizarEstadoEnTiempoReal(data);

  if (orderModal && !orderModal.classList.contains('hidden')) {
    renderOrderModal(data);
  }
});

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Iniciando aplicación - Cargando datos de Google Sheets...');

  initChart();

  store.data = {
    pedidos: [],
    mesas: [],
    platos: []
  };

  let intentos = 0;
  const maxIntentos = 5;

  while (intentos < maxIntentos) {
    const loaded = await store.loadData();

    if (loaded) {
      console.log('✅ Datos cargados correctamente desde Google Sheets');
      console.log('📊 Pedidos:', store.data.pedidos.length);
      console.log('🪑 Mesas:', store.data.mesas.length);
      console.log('🍽️ Platos:', store.data.platos.length);
      store.startAutoRefresh(10000);
      break;
    } else {
      intentos++;
      console.warn(`⚠️ Intento ${intentos}/${maxIntentos} fallido. Reintentando en 2 segundos...`);

      if (intentos < maxIntentos) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  if (intentos === maxIntentos) {
    console.error('❌ No se pudieron cargar datos de Google Sheets después de varios intentos');
    console.error('Verifica que:');
    console.error('1. La URL del Apps Script sea correcta');
    console.error('2. El Apps Script esté deployado');
    console.error('3. Las hojas "Pedidos" y "Mesas" existan en Google Sheets');
  }

  store.notify();
});
