import { fetchGet, fetchPost } from './api.js';

class Store {
  constructor() {
    this.data = {
      pedidos: [],
      mesas: []
    };
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach(listener => listener(this.data));
  }

  async loadData() {
    const response = await fetchGet();
    if (response && response.success) {
      this.data.pedidos = response.data.pedidos || [];
      this.data.mesas = response.data.mesas || [];
      this.notify();
    }
  }

  async updateEstadoPedido(id, nuevoEstado) {
    // Optimistic UI Update
    const pedidoIndex = this.data.pedidos.findIndex(p => p.id === id);
    let oldEstado = null;
    if (pedidoIndex !== -1) {
      oldEstado = this.data.pedidos[pedidoIndex].estado;
      this.data.pedidos[pedidoIndex].estado = nuevoEstado;
      this.notify();
    }

    const payload = {
      accion: "actualizar_estado",
      datos: { id: id, estado: nuevoEstado }
    };
    
    const result = await fetchPost(payload);
    if (!result || !result.success) {
      console.error("Error al actualizar pedido", result);
      // Rollback
      if (pedidoIndex !== -1 && oldEstado) {
        this.data.pedidos[pedidoIndex].estado = oldEstado;
        this.notify();
      }
    } else {
      // Refresh to ensure sync
      await this.loadData();
    }
  }

  async cobrarPedido(id, mesa) {
    const payload = {
      accion: "cobrar_pedido",
      datos: { id: id, mesa: mesa }
    };
    
    // Removemos temporalmente en UI
    this.data.pedidos = this.data.pedidos.filter(p => p.id !== id);
    const mesaIdx = this.data.mesas.findIndex(m => m.numero == mesa);
    if(mesaIdx !== -1) this.data.mesas[mesaIdx].estado = "Libre";
    this.notify();

    const result = await fetchPost(payload);
    await this.loadData();
  }
}

export const store = new Store();
