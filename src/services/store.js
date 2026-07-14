import { fetchGet, fetchPost } from './api.js';

class Store {
  constructor() {
    this.data = {
      pedidos: [],
      mesas: [],
      platos: [],
      lastUpdated: null
    };
    this.listeners = [];
    this.autoRefreshInterval = null;
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach(listener => listener(this.data));
  }

  /**
   * Carga datos desde Google Sheets
   * Mapea la estructura del Apps Script a la estructura del dashboard
   */
  async loadData() {
    try {
      const response = await fetchGet();

      if (response && response.exito) {
        this.data.mesas = (response.mesas || []).map(m => ({
          numero: isNaN(m.mesa) ? m.mesa : parseInt(m.mesa),
          estado: m.estado || 'Libre',
          tiempo: '-',
          total: 0
        }));

        this.data.pedidos = (response.comandas || []).map(c => ({
          id: c.idPedido,
          mesa: isNaN(c.mesa) ? c.mesa : parseInt(c.mesa),
          fecha: c.fecha,
          detalles: c.detalle,
          total: parseFloat(c.total) || 0,
          estado: 'Pendiente',
          cliente: `Mesa ${c.mesa}`
        }));

        this.data.platos = (response.platos || []).map(p => ({
          categoria: p.categoria,
          nombre: p.nombre,
          precio: parseFloat(p.precio) || 0,
          disponible: true
        }));

        this.data.lastUpdated = new Date().toISOString();

        console.log('✅ Datos cargados desde Google Sheets:', {
          mesas: this.data.mesas,
          pedidos: this.data.pedidos,
          platos: this.data.platos
        });

        this.notify();
        return true;
      } else {
        console.error('❌ Error al cargar datos:', response?.mensaje);
        return false;
      }
    } catch (error) {
      console.error('❌ Error en loadData:', error);
      return false;
    }
  }

  /**
   * Crea un nuevo pedido en Google Sheets
   */
  async crearPedido(mesa, detalle, total) {
    const payload = {
      accion: 'nuevo_pedido',
      mesa: mesa.toString(),
      detalle: detalle,
      total: parseFloat(total)
    };

    try {
      const result = await fetchPost(payload);
      if (result.exito) {
        console.log('✅ Pedido creado:', result);
        await this.loadData();
        return result;
      } else {
        console.error('❌ Error al crear pedido:', result.mensaje);
        return result;
      }
    } catch (error) {
      console.error('❌ Error en crearPedido:', error);
      return { exito: false, mensaje: error.message };
    }
  }

  /**
   * Libera una mesa y marca el pedido como cobrado
   */
  async liberarMesa(mesa) {
    const payload = {
      accion: 'liberar_mesa',
      mesa: mesa.toString()
    };

    try {
      const result = await fetchPost(payload);
      if (result.exito) {
        console.log('✅ Mesa liberada:', result);
        await this.loadData();
        return result;
      } else {
        console.error('❌ Error al liberar mesa:', result.mensaje);
        return result;
      }
    } catch (error) {
      console.error('❌ Error en liberarMesa:', error);
      return { exito: false, mensaje: error.message };
    }
  }

  /**
   * Inicia auto-refresh cada X segundos
   */
  startAutoRefresh(intervalMs = 5000) {
    if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);

    this.autoRefreshInterval = setInterval(() => {
      this.loadData();
    }, intervalMs);

    console.log(`🔄 Auto-refresh iniciado cada ${intervalMs}ms`);
  }

  /**
   * Detiene auto-refresh
   */
  stopAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
      console.log('⏹️ Auto-refresh detenido');
    }
  }
}

export const store = new Store();
