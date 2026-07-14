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

// --- ESTADOS Y DATOS FAKE INICIALES PARA DESARROLLO (MIENTRAS CARGA API) ---
store.data = {
  pedidos: [
    { id: "P-101", mesa: 2, cliente: "Juan P.", detalles: "2x Ceviche, 1x Chicha", total: 65.00, estado: "Pendiente", fecha: new Date().toISOString() },
    { id: "P-102", mesa: 5, cliente: "Maria G.", detalles: "1x Lomo Saltado", total: 35.00, estado: "Preparando", fecha: new Date(Date.now() - 10*60000).toISOString() },
    { id: "P-103", mesa: 1, cliente: "Mesa 1", detalles: "4x Pisco Sour", total: 80.00, estado: "Listo", fecha: new Date(Date.now() - 25*60000).toISOString() }
  ],
  mesas: [
    { numero: 1, estado: "Ocupada", tiempo: "45 min", total: 80.00 },
    { numero: 2, estado: "Esperando", tiempo: "12 min", total: 65.00 },
    { numero: 3, estado: "Libre", tiempo: "-", total: 0 },
    { numero: 4, estado: "Libre", tiempo: "-", total: 0 },
    { numero: 5, estado: "Ocupada", tiempo: "30 min", total: 35.00 },
  ]
};

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
  const pedidosActivos = data.pedidos.filter(p => p.estado !== "Cobrado").length;

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
  `).join('');
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
  `).join('');
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
    <div class="rounded-xl border-2 ${borderColor} ${bgColor} p-4 flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow h-32 relative">
      <span class="absolute top-2 right-2 text-xs font-semibold text-slate-500">${m.tiempo}</span>
      <span class="material-symbols-outlined text-3xl mb-1 ${m.estado === 'Libre' ? 'text-success' : (m.estado === 'Ocupada' ? 'text-danger' : 'text-warning')}">${icon}</span>
      <h4 class="font-bold text-lg text-textMain">Mesa ${m.numero}</h4>
      <span class="text-xs font-medium text-slate-600">${m.estado} ${m.total > 0 ? '• ' + formatCurrency(m.total) : ''}</span>
    </div>
    `;
  }).join('');
}

function renderCocina(data) {
  const pendientes = data.pedidos.filter(p => p.estado.toLowerCase() === 'pendiente');
  const preparando = data.pedidos.filter(p => p.estado.toLowerCase() === 'preparando');
  
  document.getElementById('count-pendiente').textContent = pendientes.length;
  document.getElementById('count-preparando').textContent = preparando.length;

  const cardTemplate = (p, isPendiente) => `
    <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
      <div class="flex justify-between items-center mb-2">
        <h4 class="font-bold text-lg text-textMain">Mesa ${p.mesa}</h4>
        <span class="text-xs font-medium ${isPendiente ? 'text-warning' : 'text-primary'} flex items-center">
          <span class="material-symbols-outlined text-[14px] mr-1">schedule</span>
          ${calculateTimeElapsed(p.fecha)}
        </span>
      </div>
      <p class="text-sm text-slate-600 mb-4 whitespace-pre-wrap">${p.detalles}</p>
      <button onclick="window.cambiarEstado('${p.id}', '${isPendiente ? 'Preparando' : 'Listo'}')" class="w-full py-2 rounded-lg text-sm font-medium transition-colors ${isPendiente ? 'bg-primary text-white hover:bg-blue-700' : 'bg-success text-white hover:bg-green-600'}">
        ${isPendiente ? 'Empezar a Preparar' : 'Marcar como Listo'}
      </button>
    </div>
  `;

  document.getElementById('kanban-pendiente').innerHTML = pendientes.map(p => cardTemplate(p, true)).join('');
  document.getElementById('kanban-preparando').innerHTML = preparando.map(p => cardTemplate(p, false)).join('');
}

function renderCaja(data) {
  const listos = data.pedidos.filter(p => p.estado.toLowerCase() === 'listo');
  const container = document.getElementById('caja-grid');
  
  if (listos.length === 0) {
    container.innerHTML = `<div class="col-span-full py-10 text-center text-slate-400">No hay pedidos listos para cobrar.</div>`;
    return;
  }

  container.innerHTML = listos.map(p => `
    <div class="bg-cards rounded-xl p-5 shadow-sm border border-slate-100">
      <div class="flex justify-between items-start mb-4">
        <div>
          <h3 class="text-xl font-bold text-textMain">Mesa ${p.mesa}</h3>
          <p class="text-sm text-slate-500">ID: ${p.id}</p>
        </div>
        <span class="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Listo</span>
      </div>
      <div class="border-t border-b border-slate-100 py-3 mb-4 space-y-2">
         <p class="text-sm text-slate-600 whitespace-pre-wrap">${p.detalles}</p>
      </div>
      <div class="flex justify-between items-center mb-4">
        <span class="text-slate-500 font-medium">Total a Pagar</span>
        <span class="text-2xl font-bold text-textMain">${formatCurrency(p.total)}</span>
      </div>
      <div class="flex gap-2">
        <button onclick="window.cobrarPedido('${p.id}', ${p.mesa})" class="flex-1 bg-slate-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
          Cobrar Efectivo
        </button>
      </div>
    </div>
  `).join('');
}

// --- GLOBAL FUNCTIONS PARA LOS BOTONES EN HTML STRING ---
window.cambiarEstado = (id, nuevoEstado) => store.updateEstadoPedido(id, nuevoEstado);
window.cobrarPedido = (id, mesa) => store.cobrarPedido(id, mesa);

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

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  initChart();
  store.notify(); // Render initial fake data
  // Cargar desde API real (descomentar cuando el backend esté listo)
  // store.loadData();
  
  // Polling cada 15 segundos para simular tiempo real
  // setInterval(() => store.loadData(), 15000);
});
