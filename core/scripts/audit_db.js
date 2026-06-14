const dbManager = require('../src/db');
const path = require('path');

async function audit() {
  try {
    await dbManager.init();
    const db = dbManager.db();
        
    const query = `
            SELECT source_text, translation, provider 
            FROM translations 
            WHERE source_text = translation 
            AND provider NOT IN ('native_proper_noun', 'native_non_translatable', 'path_proper_noun', 'non_translatable', 'native_runtime') 
            LIMIT 50
        `;
        
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Audit failed:', err.message);
        process.exit(1);
      }
            
      if (!rows || rows.length === 0) {
        console.log('No suspicious entries found.');
      } else {
        console.log('Found suspicious source=translation entries:');
        rows.forEach(row => {
          console.log(`[${row.provider}] "${row.source_text}"`);
        });
      }
      process.exit(0);
    });
  } catch (e) {
    console.error('Initialization failed:', e.message);
    process.exit(1);
  }
}

audit();
