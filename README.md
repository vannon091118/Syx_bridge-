**Syx-Bridge v0.13.0a – "The Slaver's Translator"**
*Built by someone who had no idea what they were doing. Somehow works anyway.*

---

### 📢 Hey Guys (Deutsch)

**Hey Guys,**

erstmal vorab: Ich bin kein Entwickler, kein Genie wie die meisten Modder hier und auch kein Russe oder Chinese. Warum ich euch das erzähle? Ganz einfach: Die meisten Mods, die ich feier, sind ursprünglich auf Russisch oder Chinesisch. Die sind zwar oft echt gut ins Englische übersetzt, aber ich sitz dann da und denke mir: *"Mh, Songs of Syx ist so schon anspruchsvoll genug... aber dann auch noch auf Englisch meine Sklaven managen?"* Da raucht mir der Kopf ab.

Also hab ich am Montag meinen Browser aufgemacht und nach einer Lösung gesucht, um Mods (und vielleicht Vanilla) zu übersetzen. Oh boy... was ich gefunden habe, war ein Tool von 2020, was zwar prinzipiell macht, was ich will, aber... nicht gut genug für mich. Die Übersetzungen sind statisch, haben null Ambiente und für mich war das Ding einfach zu hart zu bedienen.

Also dachte ich mir: **Ich mach’s selbst!** 
Als Non-Dev ist das natürlich leicht gesagt, und OH HELL, ich hab phasenweise echt keine Ahnung gehabt, was ich da gerade tue... aber jetzt ist Samstag ("Satury day"!) und ich glaube, ich kann euch mein **"sweet little tool"** präsentieren.

**DISCLAIMER:** Das hier ist ein ONE MAN DEVELOPMENT HOBBY PROJEKT im ALPHA-Status! Ich hab’s jetzt 2 Tage lokal auf meinem PC getestet und meistens läufts echt sauber.

**Der Clou:** Am Montag dachte ich noch, "Bridge Mode" (also die Original-Dateien nicht zu überschreiben) wäre zu hart zu coden, wenn man keine Ahnung von JavaScript hat. Aber Überraschung: **I DID IT!** 
Das Tool hat jetzt einen echten **Bridge-Mode**. Das heißt, eure Original-Mods bleiben unberührt! Die Bridge erstellt einfach Patches und klatscht alles in eine einzige Mod namens `BridgeCore`. Ein Klick im Launcher und alles ist Deutsch (oder was auch immer ihr wollt).

Es ist immer noch Alpha, ich bin immer noch kein Profi, aber es hilft mir ungemein, meine Sklaven-Armee endlich auf Deutsch zu befehligen. Probiert’s aus, seid gnädig mit den Bugs und schickt mir eure Logs!

---

### 📢 Hey Guys (English)

**Hey Guys,**

First of all: I am not a developer, not a genius like most modders, and also... not Russian or Chinese. Why am I telling you this? It's simple: most of the mods I like come in native Russian or Chinese. They are usually well-translated into English, but I sit here and think: *"Mhh, Songs of Syx is... hard... in German, but with English mods, it's just overflowing when I try to manage my slaves."*

So, on Monday, I opened my browser and looked for an option to translate my mods. Oh boy... what I found was a tool from 2020 that did what I wanted but... was not good for me. The translations were static, had no ambiance, and it was a bit too hard for me to manage.

So I thought: **I'll do it myself!** 
As a non-dev, that’s easy to say, but OH HELL, I didn't know what I was doing half the time... but now it's Saturday (or "Satury day" as I like to call it) and I think I can present my **"sweet little tool."**

**DISCLAIMER:** This is a one-man hobby project in Alpha state!! I’ve tested it for 2 days locally on my PC and it works most of the time.

**The big thing:** On Monday, I said "Bridge Mode" (not overwriting original files) is too hard to code if you don't know how JS works. Well... **I DID IT ANYWAY!** 
The actual build features a full **Bridge Mode**. That means you don't have to overwrite your original mod data. The tool creates patches and bundles them into one single `BridgeCore` mod. One click in the launcher and you're good to go.

It’s still an Alpha, and I’m still not a pro, but it helps me a lot to manage my slave empire in my native language. Give it a try, be kind to the bugs, and send me your logs if it explodes!

---

**🚀 Was Syx-Bridge anders macht (Features)**

**1. Low-Cost Philosophie & Intelligentes Routing**
KI kostet normalerweise Geld. Meine Bridge ist auf Sparkurs getrimmt. Sie nutzt einen **Dispatcher**, der intelligent entscheidet: Was kann das kostenlose *Argos* (lokal) machen? Was braucht die Power von *Gemini* (Cloud)? Und wenn Gemini, dann nimmt er die günstigen "Flash"-Modelle für die Masse und spart sich die teuren "Pro"-Modelle nur für die Korrekturdurchläufe auf.

**2. Variable Shielding (Der Herzschlag)**
Spielvariablen wie `__VAR0__`, `<gameTag>` oder `{placeholder}` werden vor der Übersetzung in neutrale Token wie `[[0]]` verwandelt, durch die KI geschickt, und danach exakt wiederhergestellt und validiert. Wenn die Wiederherstellung fehlschlägt, wird der Originaltext verwendet statt eine kaputte Übersetzung zu schreiben.

**3. Deep Polish Routine (KI-Hierarchie)**
*   **Tier B (Die Arbeiter):** Übersetzen 90% der Texte schnell und günstig.
*   **Tier A (Der Auditor):** Ein "schlaueres" Modell prüft danach, ob Variablen überlebt haben und ob die Übersetzung wie eine Sprache klingt die Menschen tatsächlich sprechen.

**4. BridgeCore Patch-System**
Schreibt keine Original-Mod-Dateien an. Die Bridge erstellt einen separaten Patch-Mod namens `BridgeCore`, der im Launcher aktiviert wird. So bleiben eure Original-Mods sauber und sicher.

**5. Live-Dashboard**
Läuft im Browser auf `localhost:3000` und zeigt Pipeline-Status, Provider-Stats, System-Auslastung und den Translation-Stream in Echtzeit.

---

**💻 OS-Support**

- **Windows:** Voller Support mit `start.bat`, automatische Pfaderkennung via `%APPDATA%`.
- **Linux / Steam Deck:** Automatische Pfaderkennung unter `~/.local/share/songsofsyx/`. Starten via `node index.js --gui`.
- **macOS:** Nicht getestet. Könnte funktionieren. Manuelle Konfiguration via `.env` erforderlich.

---

**🛠️ Setup in 5 Schritten**

1. Install [Node.js](https://nodejs.org/) (v18 or higher).
2. Ordner entpacken, `npm install` im Terminal ausführen.
3. `.env.example` zu `.env` umbenennen.
4. API-Key eintragen — Gemini ist am stabilsten und kostenlos bei [aistudio.google.com](https://aistudio.google.com).
5. `start.bat` doppelklicken. Dashboard öffnet sich automatisch auf `http://localhost:3000`.

---

**📋 Changelog Highlight (v0.13.0a)**

- **Mi5:** `ensureDir` schluckt keine Fehler mehr.
- **Mi7:** OS-Warnungen und Linux-Pfaderkennung integriert.
- **M5:** Gemini Schema-Enforcement für perfekte JSON-Antworten.
- **C2/C3/C4:** Dashboard stabilisiert, tote Menüpunkte entfernt, Race-Conditions beim Beenden behoben.

---

**💬 Support**

Bugs, Logs, Kritik, Fragen: **vannon858@gmail.com** — am liebsten mit der `log.txt` dabei.

*Alpha-State. Backups machen. Viel Spaß beim Sklavenmanagen auf Deutsch.*
