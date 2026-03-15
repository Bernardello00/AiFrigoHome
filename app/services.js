window.AppServices = {
  async searchLiveSupermarkets(address, radiusKm) {
    const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
    const geoJson = await geoRes.json();
    if (!geoJson?.length) throw new Error('Indirizzo non trovato');

    const lat = Number(geoJson[0].lat);
    const lon = Number(geoJson[0].lon);
    const radiusM = Math.floor(Number(radiusKm || 2) * 1000);

    const query = `[out:json][timeout:25];(node["shop"="supermarket"](around:${radiusM},${lat},${lon});way["shop"="supermarket"](around:${radiusM},${lat},${lon}););out center tags;`;

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`
    });

    const data = await res.json();
    return (data.elements || [])
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
      .filter(Boolean)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 20);
  },

  async fetchOffersOnline(market, address) {
    const query = encodeURIComponent(`${market.chain} offerte volantino ${address}`);
    const proxyUrl = `https://r.jina.ai/http://news.google.com/rss/search?q=${query}&hl=it&gl=IT&ceid=IT:it`;
    try {
      const res = await fetch(proxyUrl, { headers: { Accept: 'text/plain' } });
      if (!res.ok) throw new Error('Feed non disponibile');
      const text = await res.text();
      const lines = text.split('\n').filter((line) => line.includes('<title>') && !line.includes('Google News'));
      const offers = lines.map((line) => line.replace(/<[^>]+>/g, '').trim()).filter(Boolean).slice(0, 3);
      return offers.length ? offers : ['Nessuna offerta rilevata online'];
    } catch {
      return ['Fonte offerte online temporaneamente non raggiungibile'];
    }
  }
};
