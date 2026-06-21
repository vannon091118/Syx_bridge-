const fs = require('fs');
const path = require('path');

const poolPath = path.join(__dirname, 'sidejoke_pool.json');
if (!fs.existsSync(poolPath)) {
    console.error("Fehler: sidejoke_pool.json nicht gefunden.");
    process.exit(1);
}

const pool = JSON.parse(fs.readFileSync(poolPath, 'utf8'));
const randomJoke = pool[Math.floor(Math.random() * pool.length)];

console.log("--- SIDEJOKE TEMPLATE ---");
console.log(randomJoke);
console.log("-------------------------");
console.log("Nutze dieses Template und passe es auf die aktuellen Commits/Fehler an, OHNE den Pool zu erwähnen.");
