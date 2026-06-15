/**
 * seedDistricts.js — Seeds all 38 Tamil Nadu districts on first run
 */
const District = require('../models/District');

const TN_DISTRICTS = [
  { name: 'Chennai',        code: 'TN-CH',  headquarters: 'Chennai',        area_sqkm: 426,   bbox: [[79.98, 12.89], [80.32, 13.23]] },
  { name: 'Coimbatore',     code: 'TN-CO',  headquarters: 'Coimbatore',     area_sqkm: 7469,  bbox: [[76.67, 10.26], [77.52, 11.49]] },
  { name: 'Cuddalore',      code: 'TN-CU',  headquarters: 'Cuddalore',      area_sqkm: 3703,  bbox: [[79.22, 11.28], [79.83, 11.96]] },
  { name: 'Dharmapuri',     code: 'TN-DP',  headquarters: 'Dharmapuri',     area_sqkm: 4498,  bbox: [[77.74, 11.87], [78.34, 12.52]] },
  { name: 'Dindigul',       code: 'TN-DD',  headquarters: 'Dindigul',       area_sqkm: 6266,  bbox: [[77.29, 10.02], [78.19, 10.62]] },
  { name: 'Erode',          code: 'TN-ER',  headquarters: 'Erode',          area_sqkm: 5714,  bbox: [[77.06, 10.94], [77.82, 11.72]] },
  { name: 'Kallakurichi',   code: 'TN-KA',  headquarters: 'Kallakurichi',   area_sqkm: 3526,  bbox: [[78.62, 11.55], [79.18, 12.05]] },
  { name: 'Kancheepuram',   code: 'TN-KN',  headquarters: 'Kancheepuram',   area_sqkm: 4437,  bbox: [[79.69, 12.43], [80.21, 12.98]] },
  { name: 'Kanyakumari',    code: 'TN-KK',  headquarters: 'Nagercoil',      area_sqkm: 1684,  bbox: [[77.14, 8.04],  [77.62, 8.53]]  },
  { name: 'Karur',          code: 'TN-KR',  headquarters: 'Karur',          area_sqkm: 2895,  bbox: [[77.79, 10.62], [78.22, 11.23]] },
  { name: 'Krishnagiri',    code: 'TN-KG',  headquarters: 'Krishnagiri',    area_sqkm: 5143,  bbox: [[77.72, 12.28], [78.38, 12.85]] },
  { name: 'Madurai',        code: 'TN-MD',  headquarters: 'Madurai',        area_sqkm: 3741,  bbox: [[77.74, 9.73],  [78.51, 10.27]] },
  { name: 'Mayiladuthurai', code: 'TN-MY',  headquarters: 'Mayiladuthurai', area_sqkm: 1556,  bbox: [[79.49, 10.85], [79.92, 11.38]] },
  { name: 'Nagapattinam',   code: 'TN-NP',  headquarters: 'Nagapattinam',   area_sqkm: 2716,  bbox: [[79.57, 10.48], [80.03, 11.18]] },
  { name: 'Namakkal',       code: 'TN-NK',  headquarters: 'Namakkal',       area_sqkm: 3363,  bbox: [[77.78, 11.09], [78.39, 11.82]] },
  { name: 'Nilgiris',       code: 'TN-NL',  headquarters: 'Udhagamandalam', area_sqkm: 2550,  bbox: [[76.44, 11.18], [77.04, 11.68]] },
  { name: 'Perambalur',     code: 'TN-PB',  headquarters: 'Perambalur',     area_sqkm: 1752,  bbox: [[78.56, 11.06], [79.12, 11.45]] },
  { name: 'Pudukkottai',    code: 'TN-PK',  headquarters: 'Pudukkottai',    area_sqkm: 4663,  bbox: [[78.57, 9.92],  [79.27, 10.73]] },
  { name: 'Ramanathapuram', code: 'TN-RN',  headquarters: 'Ramanathapuram', area_sqkm: 4175,  bbox: [[78.52, 9.13],  [79.49, 9.78]]  },
  { name: 'Ranipet',        code: 'TN-RP',  headquarters: 'Ranipet',        area_sqkm: 2367,  bbox: [[79.23, 12.73], [79.87, 13.22]] },
  { name: 'Salem',          code: 'TN-SL',  headquarters: 'Salem',          area_sqkm: 5246,  bbox: [[77.75, 11.37], [78.47, 11.97]] },
  { name: 'Sivaganga',      code: 'TN-SG',  headquarters: 'Sivaganga',      area_sqkm: 4189,  bbox: [[78.27, 9.68],  [79.04, 10.32]] },
  { name: 'Tenkasi',        code: 'TN-TK',  headquarters: 'Tenkasi',        area_sqkm: 3073,  bbox: [[77.22, 8.67],  [77.93, 9.24]]  },
  { name: 'Thanjavur',      code: 'TN-TJ',  headquarters: 'Thanjavur',      area_sqkm: 3396,  bbox: [[79.01, 10.51], [79.77, 10.98]] },
  { name: 'Theni',          code: 'TN-TN',  headquarters: 'Theni',          area_sqkm: 3242,  bbox: [[77.15, 9.85],  [77.76, 10.23]] },
  { name: 'Thoothukudi',    code: 'TN-TT',  headquarters: 'Thoothukudi',    area_sqkm: 4621,  bbox: [[77.49, 8.64],  [78.24, 9.11]]  },
  { name: 'Tiruchirappalli',code: 'TN-TR',  headquarters: 'Tiruchirappalli',area_sqkm: 4404,  bbox: [[78.24, 10.57], [79.06, 11.18]] },
  { name: 'Tirunelveli',    code: 'TN-TV',  headquarters: 'Tirunelveli',    area_sqkm: 6823,  bbox: [[77.36, 8.64],  [78.12, 9.18]]  },
  { name: 'Tirupathur',     code: 'TN-TP',  headquarters: 'Tirupathur',     area_sqkm: 2183,  bbox: [[78.38, 12.42], [78.85, 12.92]] },
  { name: 'Tiruppur',       code: 'TN-TU',  headquarters: 'Tiruppur',       area_sqkm: 5189,  bbox: [[76.82, 10.82], [77.58, 11.37]] },
  { name: 'Tiruvallur',     code: 'TN-TL',  headquarters: 'Tiruvallur',     area_sqkm: 3424,  bbox: [[79.62, 13.01], [80.27, 13.48]] },
  { name: 'Tiruvannamalai', code: 'TN-TA',  headquarters: 'Tiruvannamalai', area_sqkm: 6191,  bbox: [[78.72, 11.87], [79.43, 12.46]] },
  { name: 'Tiruvarur',      code: 'TN-TVR', headquarters: 'Tiruvarur',      area_sqkm: 2162,  bbox: [[79.47, 10.58], [79.94, 11.07]] },
  { name: 'Vellore',        code: 'TN-VL',  headquarters: 'Vellore',        area_sqkm: 2789,  bbox: [[79.02, 12.68], [79.65, 13.12]] },
  { name: 'Viluppuram',     code: 'TN-VP',  headquarters: 'Viluppuram',     area_sqkm: 7194,  bbox: [[79.07, 11.74], [79.73, 12.47]] },
  { name: 'Virudhunagar',   code: 'TN-VR',  headquarters: 'Virudhunagar',   area_sqkm: 4283,  bbox: [[77.63, 9.32],  [78.28, 9.83]]  },
  { name: 'Chengalpattu',   code: 'TN-CP',  headquarters: 'Chengalpattu',   area_sqkm: 2944,  bbox: [[79.82, 12.43], [80.22, 12.88]] },
  { name: 'Tirupattur',     code: 'TN-TPR', headquarters: 'Tirupattur',     area_sqkm: 2183,  bbox: [[78.38, 12.42], [78.88, 12.96]] },
];

function bboxToPolygon([minLng, minLat], [maxLng, maxLat]) {
  return {
    type: 'Polygon',
    coordinates: [[
      [minLng, minLat],
      [maxLng, minLat],
      [maxLng, maxLat],
      [minLng, maxLat],
      [minLng, minLat],
    ]],
  };
}

async function seedDistricts() {
  try {
    const count = await District.countDocuments();
    if (count >= TN_DISTRICTS.length) {
      console.log('[Seed] Districts already seeded:', count);
      return;
    }
    let added = 0;
    for (const d of TN_DISTRICTS) {
      const existing = await District.findOne({ code: d.code });
      if (!existing) {
        await District.create({
          name: d.name,
          code: d.code,
          headquarters: d.headquarters,
          area_sqkm: d.area_sqkm,
          boundary: bboxToPolygon(d.bbox[0], d.bbox[1]),
        });
        added++;
      }
    }
    console.log(`[Seed] Added ${added} Tamil Nadu districts`);
  } catch (err) {
    console.error('[Seed] Error seeding districts:', err.message);
  }
}

module.exports = { seedDistricts };
