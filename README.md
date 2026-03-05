# 💰 Finanze Famigliari — Emanuele & Elena

🚀 **Live Demo:** [https://finanze-famiglia.vercel.app/](https://finanze-famiglia.vercel.app/)

Una web app per la gestione delle finanze di coppia (mutuo, bollette, finanziamenti, entrate e spese). Disegnata per essere semplice, intuitiva e accessibile da qualsiasi dispositivo con sincronizzazione in tempo reale.

## ✨ Funzionalità Principali

*   **🏠 Dashboard Mensile:** Panoramica dei conti, bilancio mensile previsionale (entrate vs uscite fisse), rate attive, spese del mese e saldo netto. Include grafici (Chart.js) per la distribuzione delle spese e lo storico degli ultimi 6 mesi.
*   **💳 Costi Fissi:** Gestione delle spese ricorrenti (mutuo, bollette, abbonamenti) con calcolo automatico del totale mensile.
*   **📊 Finanziamenti:** Monitoraggio di mutui e prestiti in corso, con avanzamento delle rate pagate, rate rimanenti, capitale residuo e stima della data di fine.
*   **💼 Entrate:** Registrazione degli stipendi e altri redditi, con possibilità di assegnazione a persona (Emanuele, Elena o in Comune).
*   **📋 Transazioni:** Storico dettagliato di tutte le spese extra e delle entrate non fisse. Possibilità di filtrare, ricercare, esportare in CSV e importare da Excel (tramite SheetJS). Grafici per l'analisi e raggruppamento per categorie.
*   **⚙️ Impostazioni & Sincronizzazione:** 
    *   Personalizzazione utenti e valuta.
    *   Sincronizzazione in tempo reale tramite **Firebase Realtime Database**.
    *   Backup manuale: possibilità di esportare e importare l'intero database in formato JSON.
*   **🔒 Protezione Accesso:** Applicazione protetta da password all'avvio per mantenere la privacy dei dati sensibili.

## 🛠️ Tecnologie Utilizzate

*   **Frontend:** HTML5, CSS3 (Vanilla), JavaScript (Vanilla)
*   **Database:** Firebase Realtime Database (via Firebase SDK)
*   **Librerie Esterne:**
    *   [Chart.js](https://www.chartjs.org/) per la visualizzazione dei dati e i grafici.
    *   [SheetJS (xlsx)](https://sheetjs.com/) per l'importazione dei dati da file Excel.

## 🚀 Installazione e Avvio Rapido

Questo progetto non richiede un processo di build o un server Node.js complesso; è basato su tecnologie web standard pronte all'uso.

1.  **Clona il repository:**
    ```bash
    git clone https://github.com/TUO_NOME_UTENTE/finanze-famigliari.git
    cd finanze-famigliari
    ```

2.  **Apri l'app:**
    Puoi semplicemente aprire il file `index.html` all'interno del tuo browser preferito.
    Oppure, per un'esperienza migliore (evitando possibili blocchi CORS se importi file locali), usa un server locale. Se hai Python installato, puoi eseguire:
    ```bash
    python -m http.server 8000
    # Apri http://localhost:8000 nel tuo browser
    ```
    (In alternativa, usa estensioni come "Live Server" per VS Code).

3.  **Configurazione Firebase:**
    L'app è predisposta per l'uso di Firebase. Assicurati che il file `js/app.js` (o dove inizializzi Firebase) contenga le configurazioni corrette del tuo progetto Firebase per abilitare la sincronizzazione cloud (il database predefinito sembra essere `finanze-web-default-rtdb`).

4.  **Accesso:**
    All'avvio potrebbe esserti richiesta una password (da codice: `Bilancio_2026!`).

## 📁 Struttura del Progetto

```
/
├── index.html        # Struttura principale, interfaccia utente e modali
├── netlify.toml      # Configurazione per il deploy su Netlify
├── css/
│   └── style.css     # Stili e layout dell'applicazione 
└── js/
    ├── app.js        # Logica principale: UI, init Firebase, gestione eventi
    ├── data.js       # Logica dei dati, CRUD per i vari moduli e sync
    └── charts.js     # Configurazione e rendering dei grafici Chart.js
```

## 🌐 Deploy

Il progetto include un file `netlify.toml`, quindi è perfettamente predisposto per essere deployato gratuitamente su [Netlify](https://www.netlify.com/). Collegando la tua repository GitHub, ogni push avvierà automaticamente un nuovo deploy.

## 👥 Autori

*   App sviluppata per la gestione finanziaria di **Emanuele & Elena**.

---
*Progetto nato per semplificare e rendere collaborativa la gestione quotidiana del bilancio familiare.*
