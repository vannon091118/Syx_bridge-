const { spawn } = require('child_process');
const inquirer = require('inquirer');
const axios = require('axios');

async function checkOllama() {
  try {
    // Use a more generic endpoint check
    await axios.get('http://localhost:11434/', { timeout: 2000 });
    return true;
  } catch (e) {
    return false;
  }
}

async function startOllama() {
  console.log('[INFO] Suche Ollama...');
  const isRunning = await checkOllama();
  if (isRunning) {
    console.log('[OK] Ollama laeuft bereits.');
    return true;
  }

  const { start } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'start',
      message: 'Ollama ist nicht erreichbar. Soll es gestartet werden?',
      default: true
    }
  ]);

  if (start) {
    console.log('[INFO] Starte Ollama...');
    // Use spawn for detached process to ensure it stays running
    const subprocess = spawn('ollama', ['serve'], {
      detached: true,
      stdio: 'ignore'
    });
    subprocess.unref();
        
    // Kurzes Warten zum Hochfahren
    console.log('[INFO] Warte auf Ollama-Initialisierung...');
    await new Promise(resolve => setTimeout(resolve, 5000));
        
    const nowRunning = await checkOllama();
    if (nowRunning) {
      console.log('[OK] Ollama erfolgreich gestartet.');
      return true;
    } else {
      console.log('[WARN] Ollama konnte nicht erreicht werden. (Stelle sicher, dass es installiert ist.)');
      return false;
    }
  }
  return false;
}

module.exports = { checkOllama, startOllama };
