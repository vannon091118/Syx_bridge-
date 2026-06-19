# 🛠️ SyxBridge — Update v0.19.05c

**Another Day, Another Patch**

---

### 🐛 What We Fixed (a.k.a. "Why Does This Even Happen?")

**Windows — Because Quoting is Hard**
Turns out `execSync` and Windows shell have a... *complicated relationship*. Python subprocess calls broke when they encountered JSON with quotes. Now we use `spawnSync` and feed the script via stdin instead of hoping the Windows command line can handle a few innocent little quotation marks. Radical concept: just don't use the shell at all. All 3 Argos Python call sites affected.

**Argos Names Were Having an Identity Crisis**
"Ragnar" was being translated to "Ritter" and "Kolbeinn" became "In den Warenkorb". Apparently Argos thought Norse vikings were grocery items. Names are now left alone. They've suffered enough.

**Google Free Was Overachieving**
Every single Google Free translation was flagged as `free_machine_translation` — even the 567 ones that were perfectly fine. Fixed the scoring so it actually checks quality instead of panicking.

**Numeric Garbage Walked Right Through**
The LLM once returned "14" and "22" as translations. The quality gate said "seems legit." It no longer does.

**German → German Feedback Loop**
Argos received already-translated German text and helpfully "re-translated" it. "Menge der Kupplungen" became "Anzahl der Kupplungen". We now detect this and politely decline.

---

### ⚡ Performance (a.k.a. "We Made It Faster by Loading Less")

**Dashboard No Longer Phones Home on Startup**
The Settings panel was making 3 heavy API calls on page load — including 2 Python subprocesses. Now it only asks when you actually open the dropdown. Revolutionary UX: don't fetch what nobody's looking at.

**DB Search Got a Speed Limit**
Default limit of 50 rows. The database has 8,000+ entries. Nobody needs all of them at once.

---

### 🔒 Security

**npm audit:** A `form-data` CRLF injection vulnerability was patched. Because apparently someone in 2024 thought semicolons in HTTP headers were "fine."

---

### 📊 Quality of Life

- Revisions actually track the *active* translation now (was always 0 before)
- Grammar check defaults to ON (was OFF — 46% of entries were never audited)
- Scoring went from binary (20 or 90) to a proper 0-95 scale
- 42/42 syntax checks pass ✅

---

*"We don't just translate your mods. We translate them, QA them, argue with ourselves about the quality, and then translate them again when Argos decides 'Ragnar' means 'shopping cart'. You're welcome."* — SyxBridge, probably
