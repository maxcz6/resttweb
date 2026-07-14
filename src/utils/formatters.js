export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
}

export function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function calculateTimeElapsed(isoString) {
  if (!isoString) return '0 min';
  const start = new Date(isoString);
  const now = new Date();
  const diffMs = now - start;
  const diffMins = Math.floor(diffMs / 60000);
  return `${diffMins} min`;
}

export function getStatusColor(status) {
  const s = status.toLowerCase();
  if (s.includes('pendiente')) return 'text-warning bg-amber-50';
  if (s.includes('preparando')) return 'text-primary bg-blue-50';
  if (s.includes('listo')) return 'text-success bg-green-50';
  if (s.includes('entregado')) return 'text-slate-500 bg-slate-50';
  if (s.includes('cobrado')) return 'text-slate-400 bg-slate-100';
  return 'text-slate-500 bg-slate-100';
}
