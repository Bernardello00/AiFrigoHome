window.AppUtils = {
  normalize(value) {
    return String(value || '').trim().toLowerCase();
  },

  detectChain(name) {
    const n = this.normalize(name);
    if (n.includes('esselunga')) return 'Esselunga';
    if (n.includes('coop')) return 'Coop';
    if (n.includes('conad')) return 'Conad';
    if (n.includes('carrefour')) return 'Carrefour';
    if (n.includes('lidl')) return 'Lidl';
    return 'Supermercato';
  },

  haversine(lat1, lon1, lat2, lon2) {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
};
