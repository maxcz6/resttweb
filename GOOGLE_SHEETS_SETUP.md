# 🔗 Integración Google Sheets - Dashboard RestaurantePOS

Tu dashboard está ahora conectado a Google Sheets. Aquí se explica cómo funciona.

## ✅ Lo que se implementó

### 1. **Conexión en Tiempo Real con Google Sheets**
- El dashboard carga automáticamente los datos de mesas y pedidos
- Auto-refresh cada 10 segundos (puedes cambiar este intervalo en `main.js`)
- Sincronización bidireccional: lee y escribe datos

### 2. **Funcionalidades Principales**

#### 📊 **Dashboard** (Principal)
- Muestra KPIs en tiempo real: ventas del día, mesas ocupadas, pedidos activos
- Actividad reciente con último estado de pedidos
- Gráfico de ventas (últimos 7 días)

#### 📋 **Pedidos** (Vista de Tabla)
- Lista completa de todos los pedidos
- Información: ID, Mesa, Hora, Total, Estado

#### 🚪 **Mesas** (Mapa del Local)
- Visualización del estado de cada mesa
- Verde: Libre
- Rojo: Ocupada
- Naranja: Esperando

**Crear nuevo pedido:**
1. Haz hover sobre una mesa LIBRE
2. Click en botón "+ Pedido"
3. Ingresa detalles y total en los diálogos
4. ✅ Se crea automáticamente en Google Sheets

#### 👨‍🍳 **Cocina** (Kanban)
- Muestra pedidos PENDIENTES que llegan de las mesas
- Click en "Marcar como Listo" cuando termines de preparar
- Orden FIFO (primero en llegar, primero en servir)

#### 💰 **Caja** (Cobro)
- Muestra todos los pedidos pendientes
- Información del pedido y total a pagar
- Click en "💳 Cobrar y Liberar" para:
  - Registrar pago
  - Marcar pedido como "Cobrado"
  - Liberar la mesa (vuelve a estado "Libre")

---

## 🛠️ Cómo Funciona Técnicamente

### Arquitectura

```
Dashboard (Vite) 
    ↓
services/api.js (Fetch a Google Apps Script)
    ↓
Google Apps Script 
    ↓
Google Sheets
```

### Flujo de Datos

**GET /exec** (Lectura)
```javascript
// Devuelve:
{
  exito: true,
  mesas: [
    { mesa: "1", estado: "Libre" },
    { mesa: "2", estado: "Ocupada" }
  ],
  comandas: [
    {
      idPedido: "uuid-1234",
      fecha: "2024-01-14T10:30:00Z",
      mesa: "2",
      detalle: "2x Ceviche, 1x Chicha",
      total: 65.00
    }
  ]
}
```

**POST /exec** (Escritura)
```javascript
// Crear pedido:
{
  accion: "nuevo_pedido",
  mesa: "2",
  detalle: "2x Ceviche, 1x Chicha",
  total: 65.00
}

// Liberar mesa:
{
  accion: "liberar_mesa",
  mesa: "2"
}
```

---

## 📁 Estructura de Archivos

```
src/
├── main.js                    # Lógica principal y renderizado
├── services/
│   ├── api.js                # Conexión con Google Apps Script
│   └── store.js              # Gestión de estado (datos y sincronización)
└── utils/
    └── formatters.js         # Funciones de formato (moneda, hora, etc)
```

### `api.js`
- `fetchGet()` - Obtiene mesas y comandas desde Google Sheets
- `fetchPost(payload)` - Envía nuevos pedidos o libera mesas

### `store.js`
- `loadData()` - Carga datos y mapea estructura del Apps Script
- `crearPedido(mesa, detalle, total)` - Crea nuevo pedido
- `liberarMesa(mesa)` - Libera mesa y marca como cobrado
- `startAutoRefresh(ms)` - Inicia auto-sync cada N ms

### `main.js`
- Renderizado de todas las vistas (Dashboard, Pedidos, Mesas, Cocina, Caja)
- Event listeners y navegación SPA
- Inicialización y carga de datos

---

## 🔧 Configuración de Google Sheets

### Requisitos:
1. Google Sheets con dos hojas (pestañas):
   - **"Pedidos"**: Encabezados = [ID, Fecha, Mesa, Detalle, Total, Estado, Hora de Cobro]
   - **"Mesas"**: Encabezados = [Mesa, Estado]

2. Google Apps Script deployado como "Web App"
   - URL pública: La que está en `api.js`

### Cambiar intervalo de Auto-refresh:
En `main.js`, línea ~420:
```javascript
store.startAutoRefresh(10000); // Cambiar 10000 a ms deseados
```

### Desactivar Auto-refresh:
```javascript
store.stopAutoRefresh();
```

---

## 🐛 Troubleshooting

**¿No cargan los datos?**
- Abre la consola (F12) y busca mensajes de error
- Verifica que la URL del Apps Script sea correcta
- Asegúrate de que las hojas de Google Sheets existan

**¿No aparecen los pedidos?**
- Verifica que en Google Sheets haya datos en la hoja "Pedidos"
- El Apps Script debe tener permiso para leer la hoja

**¿Error CORS?**
- El Google Apps Script usa `Content-Type: text/plain` para evitar preflight
- Esto es una limitación de seguridad del navegador

---

## 📱 Próximas Mejoras

- [ ] Modal mejorado para crear pedidos
- [ ] Estados intermedios (Preparando, Listo, etc)
- [ ] Historial completo de pedidos
- [ ] Reportes de ventas por rango de fecha
- [ ] Notificaciones en tiempo real (push notifications)
- [ ] Autenticación de usuarios

---

## 💡 Notas Importantes

1. **Sincronización**: El dashboard se sincroniza automáticamente. Si cambias algo en Google Sheets, aparecerá en el dashboard en menos de 10 segundos.

2. **Nuevos Pedidos**: Cuando creas un pedido desde el dashboard:
   - Se envía a Google Sheets
   - La mesa se marca como "Ocupada"
   - Se añade a la cola de cocina

3. **Liberar Mesa**: Cuando cobras un pedido:
   - El pedido se marca como "Cobrado"
   - La mesa vuelve a estado "Libre"
   - Se registra la hora de cobro

4. **ID Único**: Cada pedido tiene un UUID único para evitar confusiones

---

**¡Listo! Tu dashboard está funcionando. Abre http://localhost:5173 (o tu URL local) y prueba crear un pedido.** 🚀
