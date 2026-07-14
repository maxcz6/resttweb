const API_URL = "https://script.google.com/macros/s/AKfycbxGUjJSkS0U7LUmkF50ckzkXsjV0a-4Z_tAp_xrSE9Z95QgM-1D2GH0bl1irWJdv-QU/exec";

/**
 * Obtiene datos reales de Google Sheets: mesas, comandas pendientes y menú
 * Usa fetch simple sin headers para evitar CORS preflight
 */
export async function fetchGet() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("❌ Error fetching data:", error.message);
    return { exito: false, mensaje: error.message, mesas: [], comandas: [], platos: [] };
  }
}

/**
 * Envía datos a Google Sheets: nuevo pedido o liberación de mesa
 * @param {Object} payload - {accion, mesa, detalle, total} para nuevo_pedido
 *                         o {accion, mesa} para liberar_mesa
 */
export async function fetchPost(payload) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log("✅ Response from Apps Script:", result);
    return result;
  } catch (error) {
    console.error("❌ Error posting data:", error.message);
    return { exito: false, mensaje: error.message };
  }
}
