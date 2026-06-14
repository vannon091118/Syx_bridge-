const { execSync } = require('child_process');

function cleanup() {
  console.log('[CLEANUP] Suche nach hängenden Syx-Bridge Instanzen...');
  const isWin = process.platform === 'win32';
  
  try {
    if (isWin) {
      // Use PowerShell as it's more modern than wmic
      const psCmd = 'powershell "Get-CimInstance Win32_Process -Filter \\"name=\'node.exe\'\\" | Select-Object CommandLine, ProcessId | ConvertTo-Json"';
      const output = execSync(psCmd).toString();
      if (!output || output.trim() === '') {
        console.log('[INFO] Keine alten Instanzen gefunden.');
        return;
      }

      const processes = JSON.parse(output);
      const procList = Array.isArray(processes) ? processes : [processes];
      let killed = 0;
      
      procList.forEach(p => {
        const cmdLine = p.CommandLine || '';
        const pid = p.ProcessId;
        if ((cmdLine.includes('core/index.js') || cmdLine.includes('core\\index.js')) && pid !== process.pid) {
          try {
            execSync(`taskkill /F /PID ${pid}`);
            killed++;
          } catch (e) {}
        }
      });
      if (killed > 0) console.log(`[OK] ${killed} alte Instanz(en) beendet.`);
      else console.log('[INFO] Keine relevanten Instanzen gefunden.');
    } else {
      // Linux/SteamDeck cleanup
      try {
        execSync('pkill -f "core/index.js"');
        console.log('[OK] Alte Instanzen beendet.');
      } catch (e) {}
    }
  } catch (e) {
    // If JSON.parse fails, it's likely no processes found or malformed output
    if (e.message.includes('Unexpected token')) {
        console.log('[INFO] Keine alten Instanzen gefunden.');
    } else {
        console.error('[ERROR] Cleanup fehlgeschlagen:', e.message);
    }
  }
}

if (require.main === module) {
  cleanup();
}

module.exports = cleanup;
