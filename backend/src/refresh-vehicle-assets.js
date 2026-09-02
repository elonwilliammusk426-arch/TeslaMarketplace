const { query } = require('./db');

// Variant-specific Tesla-hosted assets discovered from Tesla's public digital asset URLs.
// These are used only as catalog references; they are not claims that Tesla endorses TeslaMarketplace.
const ASSETS = {
  model3: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-3.png',
  model3Performance: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-3-Performance-LHD.png',
  modely: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-Y-2-v2.png',
  modelyPerformance: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Model-Y-Performance-Hero-Desktop-LHD.jpg',
  models: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-S.png',
  modelsPerformance: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Model-S-Performance-Desktop.jpg',
  modelx: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-X.png',
  cybertruck: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Cybertruck-PLL-Pack-Desktop.png',
  cybertruckAdventure: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Cybertruck-Keep-The-Adventure-Going-Carousel-Slide-4-Range-Extender-Tablet.png'
};

async function refreshVehicleAssets() {
  // Gallery order intentionally accounts for the current card renderer's index-based selection,
  // so performance/Cyberbeast listings receive their distinctive first-card image as well.
  const updates = [
    ['tm-001', ASSETS.model3, [ASSETS.model3, ASSETS.model3Performance], 'Long Range AWD'],
    ['tm-002', ASSETS.model3Performance, [ASSETS.model3, ASSETS.model3Performance], 'Performance'],
    ['tm-003', ASSETS.modely, [ASSETS.modely, ASSETS.modelyPerformance], 'Long Range AWD'],
    ['tm-004', ASSETS.modelyPerformance, [ASSETS.modely, ASSETS.modelyPerformance], 'Performance'],
    ['tm-005', ASSETS.models, [ASSETS.models, ASSETS.modelsPerformance], 'Dual Motor'],
    ['tm-006', ASSETS.modelx, [ASSETS.modelx], 'Dual Motor'],
    ['tm-007', ASSETS.cybertruck, [ASSETS.cybertruck, ASSETS.cybertruckAdventure], 'AWD'],
    ['tm-008', ASSETS.cybertruckAdventure, [ASSETS.cybertruck, ASSETS.cybertruckAdventure], 'Cyberbeast'],
    ['tm-010', ASSETS.models, [ASSETS.models], 'Previous Generation / Used'],
    ['tm-011', ASSETS.modelx, [ASSETS.modelx], 'Previous Generation / Used']
  ];

  for (const [id, imageUrl, gallery, trim] of updates) {
    await query(`
      UPDATE vehicles
      SET image_url=$2,
          metadata=jsonb_set(
            jsonb_set(COALESCE(metadata,'{}'::jsonb), '{gallery}', $3::jsonb),
            '{configuration}', to_jsonb($4::text)
          ),
          updated_at=NOW()
      WHERE id=$1
    `, [id, imageUrl, JSON.stringify(gallery), trim]);
  }
}

module.exports = { refreshVehicleAssets };
