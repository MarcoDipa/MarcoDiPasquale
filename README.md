# BigQuery Release Pulse

Un'applicazione web ad alte prestazioni sviluppata in **Python (Flask)** per il backend e **HTML/JS/CSS nativi** per il frontend. L'applicazione scarica, analizza e mostra in tempo reale le note di rilascio ufficiali di Google Cloud BigQuery organizzandole in una timeline interattiva e categorizzata.

---

## 🚀 Funzionalità Principali

- **Timeline Dinamica**: Invece di mostrare paragrafi di testo unificati, il frontend suddivide le note giornaliere per intestazione (`<h3>`), separando le novità in schede dedicate (Feature, Change, Fix, Deprecation, Note).
- **Filtri e Ricerca**: Filtri immediati per tipo di rilascio e barra di ricerca testuale per trovare rapidamente aggiornamenti legati a parole chiave (es. "ODBC", "SQL", "Partition").
- **Condivisione su X (Twitter)**: Condividi un singolo aggiornamento con un click tramite Web Intent ufficiale (con testo preformattato e ottimizzazione dei caratteri).
- **Copia negli Appunti**: Copia i dettagli testuali formattati di una singola scheda con feedback visivo.
- **Statistiche in Tempo Reale**: Pannello superiore con contatori dinamici dei rilasci suddivisi per tipologia.
- **Cache di 5 Minuti**: Il backend memorizza temporaneamente le risposte di Google Cloud per ridurre la latenza e non sovraccaricare il server sorgente. È possibile forzare l'aggiornamento con il pulsante "Refresh".
- **Design Premium**: Supporto nativo alle modalità Chiara/Scura (con salvataggio automatico delle preferenze dell'utente), sfondi dinamici con sfumature animate ed effetti di glassmorphism.

---

## 📂 Struttura del Progetto

```text
bq-releases-notes/
│
├── .venv/                  # Ambiente virtuale Python (escluso da Git)
├── templates/
│   └── index.html          # Struttura HTML semantica della pagina
│
├── static/
│   ├── css/
│   │   └── style.css       # Fogli di stile (variabili, griglie, animazioni)
│   └── js/
│       └── app.js          # Controller JS per il parsing XML e UI
│
├── app.py                  # Server Flask per il fetch, caching ed API
├── requirements.txt        # Dipendenze Python necessarie
├── .gitignore              # Configurazione dei file da escludere in Git
└── README.md               # Questo file di documentazione
```

---

## 🛠️ Requisiti e Installazione

Assicurati di avere **Python 3.x** installato sul tuo sistema.

1. **Clona o scarica la cartella del progetto**:
   ```bash
   git clone https://github.com/MarcoDipa/MarcoDiPasquale.git
   cd bq-releases-notes
   ```

2. **Crea un ambiente virtuale ed installa le dipendenze**:
   ```bash
   # Creazione ambiente virtuale
   python -m venv .venv

   # Attivazione (Windows PowerShell)
   .\.venv\Scripts\Activate.ps1

   # Installazione pacchetti
   pip install -r requirements.txt
   ```

---

## 🏃 Avvio dell'Applicazione

Una volta completata l'installazione delle dipendenze, avvia il server locale eseguendo:

```bash
python app.py
```

L'applicazione sarà disponibile nel browser all'indirizzo:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**
