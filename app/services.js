window.AppServices = {
  async geocodeAddress(address) {
    const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
    const geoJson = await geoRes.json();
    if (!geoJson?.length) throw new Error('Indirizzo non trovato');
    return {
      lat: Number(geoJson[0].lat),
      lon: Number(geoJson[0].lon)
    };
  },

  async searchLiveSupermarkets(address, radiusKm) {
    const { lat, lon } = await this.geocodeAddress(address);
    const radiusM = Math.floor(Number(radiusKm || 2) * 1000);

    const query = `[out:json][timeout:25];(node["shop"="supermarket"](around:${radiusM},${lat},${lon});way["shop"="supermarket"](around:${radiusM},${lat},${lon}););out center tags;`;

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`
    });

    const data = await res.json();
    const mapped = (data.elements || [])
      .map((el) => {
        const mLat = el.lat ?? el.center?.lat;
        const mLon = el.lon ?? el.center?.lon;
        if (!mLat || !mLon) return null;
        const name = el.tags?.name || 'Supermercato';
        return {
          id: `osm-${el.type}-${el.id}`,
          name,
          chain: window.AppUtils.detectChain(name),
          distanceKm: window.AppUtils.haversine(lat, lon, mLat, mLon),
          address: [el.tags?.['addr:street'], el.tags?.['addr:housenumber'], el.tags?.['addr:city']].filter(Boolean).join(' ')
        };
      })
      .filter(Boolean);

    return window.AppUtils
      .uniqueBy(mapped, (store) => `${window.AppUtils.normalizeSearchText(store.name)}|${store.address || ''}`)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 30);
  }
};
