const API_URL = "https://script.google.com/macros/s/AKfycbwfYIZTbk-iBEpFaxhqWv-2yANWGv62hfRZVEUaztk1A49cQwjlg_yozMvbdwztrSft/exec";

/**
 * Realiza una petición GET a la API
 */
export async function fetchGet() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Error en la red");
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    return null;
  }
}

/**
 * Realiza una petición POST a la API (usando text/plain para evitar CORS preflight según la arquitectura actual)
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
    return result;
  } catch (error) {
    console.error("Error posting data:", error);
    return { success: false, error: error.message };
  }
}
