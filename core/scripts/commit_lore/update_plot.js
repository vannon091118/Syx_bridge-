const fs = require('fs');
const path = require('path');

const plotPath = path.join(__dirname, '../../archive/docs/PLOT_LORE.md');
const dialogue = process.argv[2];

if (!dialogue) {
    console.error("Bitte einen Dialog-String als Argument übergeben.");
    process.exit(1);
}

if (!fs.existsSync(plotPath)) {
    const header = `# 📜 SYSTEM PLOT LORE

Dieses Dokument ist ein vollständig persistenter, externer Dokumentations-Layer. 
Es enthält fortlaufende Dialoge und Meta-Gespräche zwischen den Agenten (Buffy, basher, User), 
die parallel zur echten Commit-History geschrieben werden. Jeder Commit erweitert den Plot.

---
`;
    fs.writeFileSync(plotPath, header, 'utf8');
}

const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
fs.appendFileSync(plotPath, `\n### [${timestamp}]\n${dialogue}\n`, 'utf8');
console.log(`Plot aktualisiert in ${plotPath}`);
