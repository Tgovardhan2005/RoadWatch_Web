/**
 * geoUtils.js — Point-in-polygon check for Tamil Nadu district detection
 */
const { booleanPointInPolygon } = require('@turf/boolean-point-in-polygon');
const { point, polygon, multiPolygon } = require('@turf/helpers');

function findDistrictByCoords(lat, lng, districts) {
  if (!lat || !lng || !districts || !districts.length) return null;
  const pt = point([lng, lat]);

  for (const district of districts) {
    if (!district.boundary) continue;
    try {
      let geom;
      const geo = district.boundary;
      if (geo.type === 'Polygon') {
        geom = polygon(geo.coordinates);
      } else if (geo.type === 'MultiPolygon') {
        geom = multiPolygon(geo.coordinates);
      } else if (geo.type === 'Feature') {
        const g = geo.geometry;
        if (g.type === 'Polygon') geom = polygon(g.coordinates);
        else if (g.type === 'MultiPolygon') geom = multiPolygon(g.coordinates);
      }
      if (geom && booleanPointInPolygon(pt, geom)) return district;
    } catch {
      // skip malformed boundary
    }
  }
  return null;
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = { findDistrictByCoords, haversineDistance };
