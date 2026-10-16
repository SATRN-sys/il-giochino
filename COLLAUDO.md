# Collaudo · Il Tavolo

Verifiche del 16 ottobre 2026. Il progetto è pronto per essere pubblicato; nessun repository o sito pubblico è stato creato durante questa conversione.

## Prove automatiche eseguite

Browser reali di test Chromium e WebKit 26.5, controllati con Playwright 1.62.1 su macOS, con emulazione iPhone. Queste prove non equivalgono a un'installazione su un iPhone fisico.

- [x] Manifest JSON leggibile, identità e scope relativi, avvio standalone e presenza delle icone.
- [x] Tutti i 16 asset essenziali memorizzati, inclusi gli otto file font. Nessuna dipendenza da CDN durante l'esecuzione.
- [x] Pubblicazione simulata sia alla radice sia sotto `/il-tavolo/`.
- [x] Limiti da 1 a 8 giocatori, nomi opzionali, caratteri speciali escapati e ripristino della configurazione.
- [x] Pesca delle 54 carte senza duplicati o perdite, conteggi corretti, comportamento a mazzo vuoto e comando da tastiera.
- [x] Assegnazione, trasferimento e scarto dei jolly. I jolly in mano restano esclusi dal rimescolamento.
- [x] Ripristino esatto del mazzo, degli scarti e dei possessori; ripresa della finestra quando un jolly non è ancora stato assegnato.
- [x] Finestra accessibile, focus contenuto, ripristino del focus e controllo tramite tastiera.
- [x] Layout a 320×568, 375×667, 390×844, 393×852 e 430×932, più 844×390 in orizzontale. Nessun overflow orizzontale; controlli visibili di almeno 44 px. Prova aggiuntiva del testo al 200% nel gioco a 320 px.
- [x] Ricaricamento e nuova pagina offline in Chromium, anche aprendo `index.html` con query string; partita e pesca funzionanti.
- [x] WebKit: layout, gioco, salvataggio e riapertura con origine di rete irraggiungibile, usando il service worker e gli asset in cache.
- [x] Un aggiornamento con asset mancante non sostituisce la versione funzionante. Un aggiornamento completo si applica dopo il comando dell'utente e conserva la partita.
- [x] Eliminazione delle vecchie cache dell'app senza toccare una cache appartenente a un altro sito.
- [x] Salvataggio immediato durante il rimescolamento animato, blocco delle pesche concorrenti e ripristino anche ricaricando durante l'animazione.
- [x] Conferma di «Nuova partita», annullamento, ripartenza e recupero controllato da salvataggio corrotto.
- [x] Guida iPhone visibile in Safari simulato, chiusura persistente, riapertura volontaria e soppressione in standalone simulato.
- [x] Gioco utilizzabile con localStorage non disponibile e avviso esplicito sulla mancata persistenza.
- [x] Versione 2: regole modificabili per tutte le 14 voci e persistenti dopo il ricaricamento; titolo della regola nella carta grande corrispondente al valore pescato.
- [x] Versione 2: turno che avanza dopo la pesca, frecce di correzione, posto evidenziato; «Annulla» su pescata normale e su jolly in attesa, anche dopo un ricaricamento.
- [x] Versione 2: un salvataggio della versione 1 si riapre con mazzo, jolly in mano e turno al primo giocatore.
- [x] Versione 2: Re che raddoppia carta e ruota, Donna per un giro, moneta e pari/dispari, annulla che ripristina questi effetti, finestra «Come si gioca», passaggio all'inglese e lingua del dispositivo. Esito complessivo: 21 gruppi superati in Chromium e WebKit.
- [x] Simulatore iOS (iPhone 17 Pro, Safari): semi corretti dopo la correzione delle emoji, regole e pari/dispari nella carta grande, **Aggiungi alla schermata Home** con nome e icona, apertura a schermo intero. Con il server del Mac spento e l'app chiusa del tutto, riapertura dalla Home con la partita ripristinata e pesca funzionante.
- [x] Nessun errore JavaScript durante i percorsi verificati. Controllo sintattico di gioco, `pwa.js` e `sw.js` completato.
- [x] Icone e schermate di gioco, jolly e WebKit ispezionate visivamente.

Le funzioni che costruiscono e mescolano il mazzo, producono il dorso e il fronte delle carte, disegnano le figure e descrivono le carte sono rimaste identiche al sorgente fornito. Il file allegato originale è stato conservato senza modificarlo. SHA-256 dell'originale: `accaa6d8c91ab95ccbdcc0bcd52f32622ef9bf114472d08363fab8e37b3d2941`.

La simulazione `context.setOffline(true)` di WebKit ha restituito un errore interno compatibile con il [problema Playwright documentato #42775](https://github.com/microsoft/playwright/issues/42775). La prova WebKit è stata quindi ripetuta rendendo irraggiungibile il server, e ha verificato il caricamento dalla cache. La modalità aereo su iOS resta parte della checklist fisica qui sotto.

## Da verificare dopo la pubblicazione e su un iPhone reale

- [ ] Aprire l'URL HTTPS di GitHub Pages in Safari e attendere «Disponibile offline».
- [ ] Condividi → Aggiungi alla schermata Home → attivare «Apri come app web», se compare → Aggiungi.
- [ ] Avviare dalla Home online una prima volta, attendere «Disponibile offline» e controllare l'icona.
- [ ] Verificare che la finestra standalone non abbia l'interfaccia di Safari.
- [ ] Controllare che testi e comandi non finiscano sotto Dynamic Island/notch, barra di stato o Home Indicator, sia in verticale sia ruotando il telefono.
- [ ] Provare i campi con tastiera software e i pulsanti con una mano. Verificare zoom a due dita, assenza di zoom involontario da doppio tap sui controlli e VoiceOver sul mazzo e sui jolly.
- [ ] Iniziare una partita, pescare più carte, assegnare un jolly e chiudere l'app. Riaprirla e confrontare esattamente conteggi, carta visibile e possessore del jolly.
- [ ] Ripetere chiudendo l'app con la finestra di assegnazione del jolly ancora aperta.
- [ ] Attivare modalità aereo, disattivare anche il Wi-Fi, chiudere l'app dal selettore applicazioni e riaprirla dalla Home. Provare pesca, scarto e rimescolamento.
- [ ] Durante una partita lasciare il telefono fermo oltre il tempo di blocco automatico: lo schermo deve restare acceso e il piè di pagina deve indicare «Schermo sempre acceso durante la partita». Tornando alla schermata iniziale lo schermo deve potersi spegnere di nuovo.
- [ ] Pescare, leggere la regola nella carta grande, usare «Annulla» e controllare che il turno torni indietro.
- [ ] Chiudere la guida, poi riaprire Safari: non deve comparire automaticamente di nuovo.
- [ ] Pubblicare una nuova versione con `VERSION` incrementata. Tornare online, riaprire l'app o riportarla in primo piano, poi usare «Aggiorna l'app». La partita deve continuare dalla stessa situazione.
- [ ] Riattivare modalità aereo e riaprire per verificare che sia disponibile la nuova versione.

I dati sono locali: cancellazione dei dati del sito, disinstallazione o rimozione dei dati da parte di iOS possono richiedere un nuovo caricamento online. La verifica dell'URL pubblico e il collaudo su iPhone non sono stati eseguiti in questa sessione.
