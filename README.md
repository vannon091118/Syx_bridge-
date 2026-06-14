# Syx-Bridge - The Slaver's Translator (DE/EN)

![Banner](Banner.png)

---

## 📢 English

### 📢 Hey Guys
**First of all: I am not a developer, not a genius like most modders, and also... not Russian or Chinese.**

Why am I telling you this? It's simple: most of the mods I like for *Songs of Syx* are originally in Russian or Chinese. While they often have English translations, managing my slave empire in a foreign language makes my head explode. 

So I looked for a solution to translate mods. I found tools from 2020, but they were static, had no ambiance, and were hard to use. So I thought: **I'll do it myself!** As a non-dev, it was a wild ride, and I often had no idea what I was doing... but after a week of "Satury days," here is my **"sweet little tool."**

**DISCLAIMER:** This is a one-man hobby project in Alpha state! It's built on sweat, caffeine, and AI. Use it at your own risk, keep backups, and be kind to the bugs.

---

### 🚀 Features (v0.13.0 "Deep Polish")

**1. 60fps Dashboard**
A smooth web-based GUI (localhost:3000) that shows live CPU/RAM stats, translation progress, and a real-time stream of what the AI is currently thinking.

**2. Argos-Turbo (Local & Fast)**
Integrates *Argos Translate* for free, local pre-translations. The "Turbo" engine bundles texts into Base64 packets, making it up to 10x faster than traditional methods by reducing process overhead.

**3. Deep Polish & DB Auditor**
A smart hierarchy system. After the "Worker" AI (Tier B) finishes, a "Smart" AI (Tier A) audits the database to ensure technical markers like `__VAR0__` aren't damaged. If something looks broken, it fixes it automatically.

**4. Variable Shielding (The Heartbeat)**
Game variables like `{NAME}` or `<tag>` are shielded using temporary tokens `[[0]]` during translation and perfectly restored afterwards. If validation fails, it reverts to the original text rather than breaking your game.

**5. Bridge-Mode (Safe & Clean)**
Instead of overwriting original mod files, the Bridge creates a separate patch mod (e.g., `MyMod_German`) in your `%APPDATA%` folder. Your original mods stay untouched!

---

### 💻 OS Support

- **Windows:** Full support with `start.bat` and automatic `%APPDATA%` detection.
- **Linux / Steam Deck:** Automatic path detection under `~/.local/share/songsofsyx/`. Start via `node index.js`.
- **macOS:** Experimental. Requires manual `.env` configuration.

---

### 🛠️ Setup in 5 Steps

1. Install [Node.js](https://nodejs.org/) (v18 or higher).
2. Extract the folder and run `npm install` in your terminal.
3. Rename `.env.example` to `.env`.
4. Add your API Key — Gemini is recommended (free at [aistudio.google.com](https://aistudio.google.com)).
5. Double-click `start.bat`. The dashboard opens automatically.

---

### 📋 Changelog Highlights (v0.13.0a)
- **60fps UI:** Completely refactored dashboard for fluid performance.
- **Native vs. Patch:** Defaulted to "Bridge Mode" for maximum safety.
- **Argos-Turbo:** Massively improved local translation speed.
- **Auto-Browser:** Now opens the GUI automatically on startup.

---

### 💬 Support
Bugs, logs, or just a "thanks": **vannon858@gmail.com** — please include your `stdout.log` and `stderr.log` if things explode.

---

## 📢 Deutsch

### 📢 Hey Guys
**Erstmal vorab: Ich bin kein Entwickler, kein Genie wie die meisten Modder hier und auch kein Russe oder Chinese.**

Warum ich euch das erzähle? Ganz einfach: Die meisten Mods, die ich feier, sind ursprünglich auf Russisch oder Chinesisch. Die sind zwar oft echt gut ins Englische übersetzt, aber ich sitz dann da und denke mir: *"Mh, Songs of Syx ist so schon anspruchsvoll genug... aber dann auch noch auf Englisch meine Sklaven managen?"* Da raucht mir der Kopf ab.

Also hab ich mich nach einer Lösung umgesehen, um Mods zu übersetzen. Die Tools, die ich fand, waren alt, statisch und unhandlich. Also dachte ich mir: **Ich mach’s selbst!** Als Non-Dev war das ein echtes Abenteuer (ich hatte phasenweise keine Ahnung, was ich da tue), aber nach einer Woche voller "Satury-Days" präsentiere ich euch mein **"sweet little tool."**

**DISCLAIMER:** Das hier ist ein Ein-Mann-Hobbyprojekt im Alpha-Status! Es basiert auf Schweiß, Kaffee und KI. Nutzung auf eigene Gefahr, macht Backups und seid gnädig mit den Bugs.

---

### 🚀 Features (v0.13.0 "Deep Polish")

**1. 60fps Dashboard**
Eine flüssige Web-Oberfläche (localhost:3000), die CPU/RAM-Last, den Fortschritt und den Live-Stream der KI-Übersetzungen in Echtzeit anzeigt.

**2. Argos-Turbo (Lokal & Schnell)**
Integriert *Argos Translate* für kostenlose, lokale Vor-Übersetzungen. Der "Turbo"-Modus bündelt Texte in Base64-Pakete und ist dadurch bis zu 10x schneller als herkömmliche Methoden.

**3. Deep Polish & DB Auditor**
Ein intelligentes Hierarchie-System. Nachdem die "Arbeiter-KI" (Tier B) fertig ist, prüft eine "Elite-KI" (Tier A) die Datenbank auf beschädigte Platzhalter wie `__VAR0__` und repariert diese automatisch.

**4. Variable Shielding (Der Herzschlag)**
Spiel-Variablen wie `{NAME}` oder `<tag>` werden während der Übersetzung durch neutrale Token `[[0]]` geschützt und danach exakt wiederhergestellt. Schlägt die Validierung fehl, wird das Original verwendet, statt das Spiel zu crashen.

**5. Bridge-Mode (Sicher & Sauber)**
Anstatt Original-Dateien zu überschreiben, erstellt die Bridge eine Kopie deiner Mods (z.B. `MeinMod_German`) unter `%APPDATA%`. Deine Original-Dateien bleiben unangetastet!

---

### 💻 OS-Support

- **Windows:** Voller Support mit `start.bat` und automatischer Pfaderkennung.
- **Linux / Steam Deck:** Automatische Pfaderkennung unter `~/.local/share/songsofsyx/`. Start via `node index.js`.
- **macOS:** Experimentell. Erfordert manuelle Konfiguration in der `.env`.

---

### 🛠️ Setup in 5 Schritten

1. [Node.js](https://nodejs.org/) installieren (v18 oder höher).
2. Ordner entpacken und `npm install` im Terminal ausführen.
3. `.env.example` in `.env` umbenennen.
4. API-Key eintragen — Gemini wird empfohlen (kostenlos unter [aistudio.google.com](https://aistudio.google.com)).
5. `start.bat` doppelklicken. Das Dashboard öffnet sich automatisch.

---

### 📋 Changelog Highlights (v0.13.0a)
- **60fps UI:** Komplett überarbeitetes Dashboard für flüssige Bedienung.
- **Native vs. Patch:** Bridge-Mode ist jetzt Standard für maximale Sicherheit.
- **Argos-Turbo:** Massive Geschwindigkeitsvorteile bei lokaler Übersetzung.
- **Auto-Browser:** Die GUI öffnet sich jetzt direkt beim Start.

---

### 💬 Support
Bugs, Logs oder einfach nur Feedback: **vannon858@gmail.com** — am besten direkt die `stdout.log` und `stderr.log` mitschicken.

*Viel Spaß beim Sklavenmanagen auf Deutsch!*
