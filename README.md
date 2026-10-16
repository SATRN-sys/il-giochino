# Il Giochino · PWA

Conversione del gioco HTML originale in una piccola app installabile. HTML, CSS e logica del gioco restano in `index.html`; nessun framework, account, backend, analitica o dipendenza JavaScript di produzione.

Sono conservati i contenuti, le illustrazioni delle carte, i colori, i caratteri e le meccaniche originali (ora da 1 a 10 giocatori), 52 carte e due jolly, pesca, scarti, assegnazione e trasferimento dei jolly, rimescolamento che esclude i jolly ancora in mano.

## Cosa cambia

- Manifest con avvio standalone e percorsi relativi, icone PNG 192/512 px, icona maskable 512 px e Apple touch icon 180 px.
- Cache dell'intera applicazione e dei font originali, ora locali. Nessuna richiesta a Google Fonts durante l'uso.
- Salvataggio locale automatico dopo ogni azione: nomi, numero di giocatori, ordine del mazzo, scarti, possessori dei jolly e jolly ancora da assegnare. Riaprendo la pagina si riprende la partita. «Nuova partita» mantiene la conferma originale prima di abbandonarla.
- Controlli di almeno 44 px, campi a 16 px per evitare lo zoom automatico all'ingresso, safe area su tutti i lati, layout per schermi piccoli, contrasto migliorato nei testi secondari e supporto al movimento ridotto.
- Finestra dei jolly accessibile con focus contenuto e ritorno al mazzo. Testo del pulsante di scarto reso leggibile sullo sfondo chiaro della finestra.
- Durante il rimescolamento la modifica viene salvata subito; l'animazione non rimanda il salvataggio. Le pressioni concorrenti durante l'animazione vengono ignorate.
- Guida iPhone non bloccante, con chiusura ricordata. Il collegamento «Installazione iPhone» permette di riaprirla volontariamente.

## Novità della versione 2

- **Regole del gioco.** Ogni carta mostra il suo effetto quando viene pescata: Asso bevono tutti, 2 salvo, 3 bevi te («Ti tocca bere»), 4 scegli chi beve, 5 due ruote, 6 cinque ruote, 7 testa o croce, 8 tu e chi hai davanti, 9 pari o dispari (si fa a mano), 10 bevi due volte, Fante tu e i vicini, Donna chi ti guarda beve, Re raddoppia la carta successiva, Jolly da tenere per passare la carta a un altro. La finestra **Come si gioca** riassume le regole e si apre dal setup o con «? Regole».
- **Effetti gestiti dall'app.** Con il 5 e il 6 gira una ruota con i nomi dei giocatori (2 o 5 giri, tutti con la stessa probabilità a ogni giro). Con il 7 lancia una moneta d'oro animata (Testa con la corona, Croce con la croce) che atterra sulla faccia estratta. Il pari o dispari del 9 si gioca a mano. Dopo un Re la carta successiva è segnata «×2» e anche i giri della ruota raddoppiano; due Re di fila danno ×4. La Donna resta attiva per un giro completo, o finché non esce un'altra Donna, e un'etichetta mostra a chi appartiene.
- **Italiano e inglese.** Interruttore IT/EN nella schermata iniziale e in fondo alla pagina; al primo avvio la lingua segue quella del telefono. Le regole modificabili sono separate per lingua.
- **Turni e annulla.** La barra «Tocca a» indica chi pesca e passa da sola al successivo; «↶ Annulla» ripristina fino a 30 azioni, anche dopo la chiusura dell'app, compresi gli effetti di Re e Donna.
- **Carta grande** al centro dello schermo, **schermo sempre acceso** durante la partita dove il browser supporta la Screen Wake Lock API.
- **Un colore per giocatore** (fino a 10, tutti con il nome in bianco): numero del posto, barra del turno, spicchi della ruota, risultato e scelta del jolly. Mentre la ruota gira, sotto il puntatore compare il nome dello spicchio su cui sta passando. Quando si ferma, gli altri spicchi si oscurano e resta acceso solo quello estratto; al giro successivo tornano tutti normali.
- **Design rifinito.** Icone SVG coerenti al posto dei simboli ↺ ↶ ⟲; Annulla e Rimescola sotto il mazzo; giocatori in una griglia compatta; tutte le finestre in verde scuro con filo d'oro; grana di feltro leggera, ombre tinte di verde, numeri tabulari e titoli bilanciati. La moneta del 7 è disegnata su canvas con spessore, prospettiva e rilievo, senza dipendere dal 3D del browser.
- Corretti la raggiera del jolly e i semi ♥ ♦ che Safari su iOS mostrava come emoji rosse.

Le partite salvate con la versione precedente si riaprono con le nuove regole, dal turno del primo giocatore. Le regole sono pensate per adulti: la finestra «Come si gioca» invita a bere responsabilmente.

## Avvio locale

Da questa cartella:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Apri `http://localhost:8080/`. I browser consentono i service worker su localhost per lo sviluppo. Un file aperto con `file://` non installa la PWA. Per un iPhone usa l'URL HTTPS pubblicato: un semplice indirizzo HTTP del Mac sulla rete Wi-Fi non è sufficiente per il service worker.

## Pubblicare gratis su GitHub Pages

1. Crea un repository **pubblico**, per esempio `il-giochino`. GitHub Pages è disponibile sui repository pubblici con GitHub Free.
2. Carica il contenuto di questa cartella nella radice del repository: `index.html`, `pwa.js`, `sw.js`, `fonts.css`, `manifest.webmanifest`, `.nojekyll`, le cartelle `icons/` e `fonts/`. Mantieni le licenze in `fonts/`. Non è necessaria alcuna build. README e test sono facoltativi per il sito.
3. In **Settings → Pages → Build and deployment**, scegli **Deploy from a branch**, ramo `main`, cartella **/(root)**, quindi **Save**.
4. Attendi il completamento del deployment. L'indirizzo sarà `https://TUO-UTENTE.github.io/il-giochino/` con la barra finale.
5. Verifica che **Enforce HTTPS** sia abilitato, se modificabile. I domini `github.io` supportano HTTPS automaticamente.
6. Apri il sito e attendi **Disponibile offline**. Poi completa la checklist in `COLLAUDO.md`.

Il progetto funziona anche alla radice di un dominio o con un nome di repository diverso: non contiene percorsi assoluti degli asset. Non richiede GitHub Actions né servizi a pagamento.

Riferimenti: [configurare la sorgente di pubblicazione](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [HTTPS e disponibilità nel piano gratuito](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https).

## Installare su iPhone

1. Apri l'URL HTTPS del gioco in **Safari**.
2. Tocca **Condividi**, il quadrato con la freccia verso l'alto. In alcuni layout di Safari si trova prima nel menu della pagina.
3. Scegli **Aggiungi alla schermata Home**.
4. Attiva **Apri come app web**, se compare, e tocca **Aggiungi**.
5. Apri **Il Giochino** dalla Home mentre sei ancora online e attendi **Disponibile offline**. Da quel momento puoi usarlo senza rete.

Il collegamento nell'app apre soltanto le istruzioni: non simula un pulsante di installazione di sistema. In modalità standalone la guida è nascosta. Vedi anche le [istruzioni Apple](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios).

## Aggiornare senza perdere la partita

1. Modifica i file necessari.
2. Cambia sempre `VERSION` in `sw.js`, per esempio da `'v2'` a `'v3'`, anche quando modifichi solo HTML, icone o font. Se aggiungi un asset necessario, inseriscilo in `ASSETS`.
3. Pubblica **tutti i file della nuova versione nello stesso commit** e attendi il deployment completo. Mantieni invariati URL del sito e nome `sw.js`.
4. All'apertura e quando l'app torna in primo piano online viene cercato un aggiornamento; i controlli ravvicinati vengono limitati a uno al minuto.
5. La nuova cache si installa solo se tutti gli asset si scaricano correttamente. Fino a quel momento resta utilizzabile la versione precedente. Dopo il download compare **Aggiorna l'app**: toccalo per salvare la partita e ricaricare la nuova versione. Se il salvataggio fallisce, il ricaricamento viene bloccato e appare un avviso.
6. L'attivazione elimina solo le vecchie cache di questa app e di questo percorso; conserva localStorage e le cache di altri siti o repository sullo stesso dominio. Anche chiudendo tutte le finestre della versione precedente il browser può attivare l'aggiornamento in attesa.

La cache serve una versione coerente dell'intera app, anche per le navigazioni offline; non scarica pezzi nuovi a metà partita. Strategia conforme al [ciclo di vita dei service worker](https://web.dev/articles/service-worker-lifecycle).

## Dati e limiti da conoscere

I nomi e la partita restano nel browser o nell'app di quel dispositivo. Il salvataggio non è una sincronizzazione tra amici, dispositivi, installazioni o schede aperte contemporaneamente. Gioca in una sola finestra alla volta. La cancellazione dei dati del sito, la disinstallazione o una decisione di iOS di liberare spazio possono eliminare salvataggi e cache: in quel caso riapri online. Evita la navigazione privata per una partita da conservare.

L'orientamento verticale è indicato nel manifest; iOS può ignorare il blocco dell'orientamento, quindi il layout resta utilizzabile anche in orizzontale. Pinch-to-zoom resta disponibile; `touch-action: manipulation` sui controlli evita lo zoom involontario da doppio tap senza bloccare lo zoom di accessibilità. Le safe area seguono le [indicazioni WebKit](https://webkit.org/blog/7929/designing-websites-for-iphone-x/).

## Test automatici facoltativi

L'app non richiede Node. Per ripetere i test di sviluppo con Node e Playwright:

```sh
npm install --no-save playwright@1.62.1
npx playwright install chromium webkit
TEST_WEBKIT=1 node tests/smoke.cjs
```

Il test avvia un server solo su `127.0.0.1`, usa profili temporanei, prova sia `/` sia `/il-tavolo/` e simula aggiornamenti completi e interrotti senza cambiare i file del progetto. Le schermate di prova vengono salvate in una cartella temporanea indicata nell'output; usa `TEST_ARTIFACTS=/percorso` per sceglierla. Il collaudo fisico dell'iPhone è descritto separatamente in `COLLAUDO.md`.

## File

| Percorso | Contenuto |
| --- | --- |
| `index.html` | Gioco originale con salvataggio e adattamenti mobile |
| `pwa.js` | Registrazione, stato offline, aggiornamenti e guida iPhone |
| `sw.js` | Cache completa, avvio offline e ciclo di aggiornamento |
| `manifest.webmanifest` | Metadati installabili e icone |
| `fonts.css`, `fonts/` | Font locali e licenze SIL Open Font License |
| `icons/` | Quattro icone PNG opache |
| `.nojekyll` | Pubblicazione statica senza Jekyll |
| `tests/smoke.cjs` | Prove automatiche ripetibili, solo sviluppo |
| `COLLAUDO.md` | Esiti e controlli finali su iPhone |
