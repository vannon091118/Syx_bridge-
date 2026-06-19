const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const os = require('os');

const UPLOADER_ROOT = process.platform === 'win32'
  ? path.join(process.env.APPDATA || '', 'songsofsyx', 'mods-uploader', 'WorkshopContent')
  : path.join(os.homedir(), '.local', 'share', 'songsofsyx', 'mods-uploader', 'WorkshopContent');

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) await fsp.mkdir(dir, { recursive: true });
}

async function copyRecursive(src, dest) {
  const stats = await fsp.stat(src);
  if (stats.isDirectory()) {
    await ensureDir(dest);
    const entries = await fsp.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      await copyRecursive(path.join(src, entry.name), path.join(dest, entry.name));
    }
  } else {
    await fsp.copyFile(src, dest);
  }
}

async function exportToWorkshop() {
  console.log('========================================');
  console.log('   WORKSHOP UPLOADER EXPORT');
  console.log('========================================');

  const corePath = path.join(process.env.APPDATA || '', 'songsofsyx', 'mods', 'BridgeCore');
  const _patchesPath = path.join(__dirname, '..', 'patches');
  
  if (!fs.existsSync(corePath)) {
    console.error('[ERROR] BridgeCore nicht gefunden. Bitte starte die Brücke zuerst.');
    if (require.main === module) process.exit(1);
    else throw new Error('BridgeCore nicht gefunden.');
  }

  // Use AI Bridge Core as the name in uploader
  const targetDir = path.join(UPLOADER_ROOT, 'AI_Bridge_Core');
  
  try {
    await ensureDir(UPLOADER_ROOT);
    
    if (fs.existsSync(targetDir)) {
      console.log(`[INFO] Bereinige alten Export: ${targetDir}`);
      await fsp.rm(targetDir, { recursive: true, force: true });
    }

    console.log(`[INFO] Kopiere BridgeCore nach: ${targetDir}`);
    await copyRecursive(corePath, targetDir);
    
    console.log('\n[ERFOLG] Export abgeschlossen!');
    console.log('Du kannst nun den Steam Workshop Manager öffnen und den Ordner \'AI_Bridge_Core\' hochladen.');
  } catch (e) {
    console.error(`[!] Export fehlgeschlagen: ${e.message}`);
    if (require.main === module) process.exit(1);
    else throw e;
  }
}

if (require.main === module) {
  exportToWorkshop();
}

module.exports = exportToWorkshop;
