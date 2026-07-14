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

// --- ROUTER SPA BÁSICO ---
function navigateTo(hash) {
  const targetId = hash.replace('#', '');
  if(!targetId) return;
  
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
if(window.location.hash) {
  navigateTo(window.location.hash);
}

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
    if(window.innerWidth < 768) closeSidebar();
  });
});

// --- RENDERIZADO DE VISTAS ---

function renderDashboard(data) {
  const ventasHoy = data.pedidos.reduce((acc, p) => acc + (parseFloat(p.total) || 0), 0);
  const mesasOcupadas = data.mesas.filter(m => m.estado !== "Libre").length;
  const pedidosActivos = data.pedidos.length;

  document.getElementById('kpi-ventas').textContent = formatCurrency(ventasHoy);
  document.getElementById('kpi-mesas').textContent = mesasOcupadas;
  document.getElementById('kpi-pedidos').textContent = pedidosActivos;

  const activityList = document.getElementById('recent-activity-list');
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
  `).join('') || `<div class="text-sm text-slate-500 text-center">No hay pedidos</div>`;
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
  `).join('') || `<tr><td colspan="5" class="px-5 py-4 text-center text-slate-400">No hay pedidos</td></tr>`;
}

function renderMesas(data) {
  const container = document.getElementById('mesas-grid');
  container.innerHTML = data.mesas.map(m => {
    let borderColor = 'border-success';
    let bgColor = 'bg-white';
    let icon = 'restaurant';
    
    if (m.estado === 'Ocupada') { borderColor = 'border-danger'; bgColor = 'bg-red-50'; }
    if (m.estado === 'Esperando') { borderColor = 'border-warning'; bgColor = 'bg-amber-50'; icon = 'timer'; }

    return `
    <div class="rounded-xl border-2 ${borderColor} ${bgColor} p-4 flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow h-32 relative group">
      <span class="absolute top-2 right-2 text-xs font-semibold text-slate-500">${m.tiempo}</span>
      <span class="material-symbols-outlined text-3xl mb-1 ${m.estado === 'Libre' ? 'text-success' : (m.estado === 'Ocupada' ? 'text-danger' : 'text-warning')}">${icon}</span>
      <h4 class="font-bold text-lg text-textMain">Mesa ${m.numero}</h4>
      <span class="text-xs font-medium text-slate-600">${m.estado} ${m.total > 0 ? '• ' + formatCurrency(m.total) : ''}</span>
      ${m.estado === 'Libre' ? `
        <button onclick="window.abrirFormularioPedido(${m.numero})" class="absolute bottom-2 hidden group-hover:block bg-primary text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700 transition-colors">
          + Pedido
        </button>
      ` : ''}
    </div>
    `;
  }).join('') || `<div class="col-span-full text-center text-slate-400 py-10">No hay mesas</div>`;
}

function renderCocina(data) {
  const pendientes = data.pedidos.filter(p => p.estado.toLowerCase() === 'pendiente');
  
  document.getElementById('count-pendiente').textContent = pendientes.length;
  document.getElementById('count-preparando').textContent = 0;

  const cardTemplate = (p) => `
    <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
      <div class="flex justify-between items-center mb-2">
        <h4 class="font-bold text-lg text-textMain">Mesa ${p.mesa}</h4>
        <span class="text-xs font-medium text-warning flex items-center">
          <span class="material-symbols-outlined text-[14px] mr-1">schedule</span>
          ${calculateTimeElapsed(p.fecha)}
        </span>
      </div>
      <p class="text-sm text-slate-600 mb-4 whitespace-pre-wrap">${p.detalles}</p>
      <button onclick="window.marcarListo('${p.id}')" class="w-full py-2 rounded-lg text-sm font-medium transition-colors bg-success text-white hover:bg-green-600">
        Marcar como Listo
      </button>
    </div>
  `;

  document.getElementById('kanban-pendiente').innerHTML = pendientes.map(p => cardTemplate(p)).join('') || `<div class="text-sm text-slate-400 p-4">No hay pedidos pendientes</div>`;
  document.getElementById('kanban-preparando').innerHTML = `<div class="text-sm text-slate-400 p-4">Vacío</div>`;
}

function renderCaja(data) {
  const pendientes = data.pedidos;
  const container = document.getElementById('caja-grid');
  
  if (pendientes.length === 0) {
    container.innerHTML = `<div class="col-span-full py-10 text-center text-slate-400">No hay pedidos para cobrar.</div>`;
    return;
  }

  container.innerHTML = pendientes.map(p => `
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
      <button onclick="window.pagarYLiberarMesa('${p.id}', ${p.mesa})" class="w-full bg-slate-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
        💳 Cobrar y Liberar
      </button>
    </div>
  `).join('');
}

// --- FUNCIONES GLOBALES PARA LOS BOTONES ---

/**
 * Abre un diálogo para crear un nuevo pedido
 */
window.abrirFormularioPedido = (mesaNumero) => {
  const detalle = prompt(`Ingresa detalles del pedido para Mesa ${mesaNumero}:`);
  if (!detalle) return;
  
  const total = prompt(`Ingresa el total del pedido:`);
  if (!total || isNaN(total)) {
    alert('Total inválido');
    return;
  }

  store.crearPedido(mesaNumero, detalle, parseFloat(total)).then(result => {
    if (result.exito) {
      alert(`✅ Pedido creado: ${result.idPedido}`);
    } else {
      alert(`❌ Error: ${result.mensaje}`);
    }
  });
};

/**
 * Marca un pedido como listo en la cocina
 */
window.marcarListo = (id) => {
  alert(`✅ Pedido ${id} marcado como listo (funcionalidad en desarrollo)`);
};

/**
 * Paga un pedido y libera la mesa
 */
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

// --- INIT CHART.JS ---
function initChart() {
  const ctx = document.getElementById('ventasChart');
  if(!ctx) return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
      datasets: [{
        label: 'Ventas (S/)',
        data: [120, 190, 150, 250, 320, 410, 380],
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

// --- SUSCRIPCIÓN AL STORE ---
store.subscribe((data) => {
  renderDashboard(data);
  renderPedidos(data);
  renderMesas(data);
  renderCocina(data);
  renderCaja(data);
});

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Iniciando aplicación...');
  
  initChart();
  
  // Cargar datos iniciales desde Google Sheets
  const loaded = await store.loadData();
  
  if (loaded) {
    console.log('✅ Datos cargados correctamente');
    // Auto-refresh cada 10 segundos
    store.startAutoRefresh(10000);
  } else {
    console.warn('⚠️ No se pudieron cargar datos iniciales, usando datos de prueba');
    store.data = {
      pedidos: [
        { id: "P-101", mesa: 2, cliente: "Mesa 2", detalles: "2x Ceviche, 1x Chicha", total: 65.00, estado: "Pendiente", fecha: new Date().toISOString() },
      ],
      mesas: [
        { numero: 1, estado: "Libre", tiempo: "-", total: 0 },
        { numero: 2, estado: "Ocupada", tiempo: "12 min", total: 65.00 },
        { numero: 3, estado: "Libre", tiempo: "-", total: 0 },
        { numero: 4, estado: "Libre", tiempo: "-", total: 0 },
        { numero: 5, estado: "Libre", tiempo: "-", total: 0 },
      ]
    };
    store.notify();
  }
});
