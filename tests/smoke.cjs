/* Optional development check. No dependencies are loaded by the app itself. */
const { chromium, webkit, devices } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
const root = path.resolve(__dirname, '..');
const artifactDir = process.env.TEST_ARTIFACTS || fs.mkdtempSync(path.join(os.tmpdir(), 'il-tavolo-qa-'));
fs.mkdirSync(artifactDir, {recursive:true});
const manifest = JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
assert.equal(manifest.display,'standalone');
assert.equal(manifest.start_url,'./');
assert.equal(manifest.scope,'./');
assert.equal(manifest.id,'./');
for (const icon of manifest.icons) assert(fs.existsSync(path.join(root,icon.src)));
const sw = fs.readFileSync(path.join(root,'sw.js'),'utf8');
const assets = [...sw.matchAll(/'\.\/([^']+)'/g)].map(m => m[1]);
for (const file of assets) assert(fs.existsSync(path.join(root,file)),file);
const referencedFonts = [...fs.readFileSync(path.join(root,'fonts.css'),'utf8').matchAll(/url\(\.\/([^\)]+)\)/g)].map(m=>m[1]);
for (const font of referencedFonts) assert(assets.includes(font),`Font must be precached: ${font}`);
const BASE = sw.match(/const VERSION = '([^']+)'/)[1];
const NEXT = BASE + '-next';
let release = BASE;
let breakInstall = false;
let originUnavailable = false;
const server = http.createServer((req,res) => {
  if(originUnavailable){req.socket.destroy();return;}
  const url = new URL(req.url,'http://localhost');
  const mount = url.pathname.startsWith('/il-tavolo/') ? '/il-tavolo/' : url.pathname.startsWith('/altro/') ? '/altro/' : '/';
  let file = decodeURIComponent(url.pathname.slice(mount.length)) || 'index.html';
  const target = path.resolve(root,file);
  if (!target.startsWith(root+path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile() || (breakInstall && file==='icons/icon-192.png')) {
    res.writeHead(404);res.end();return;
  }
  let body = fs.readFileSync(target);
  if (file==='sw.js') body=Buffer.from(body.toString().replace(`const VERSION = '${BASE}'`,`const VERSION = '${release}'`));
  if (file==='index.html' && release!==BASE) body=Buffer.from(body.toString().replace('<head>',`<head><meta name="test-release" content="${release}">`));
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png','.woff2':'font/woff2'};
  res.writeHead(200,{'Content-Type':types[path.extname(target)]||'text/plain','Cache-Control':'no-store'});res.end(body);
});
const IT={locale:'it-IT'};
const errors=[];
let passed=0;
function pass(label){ passed++;console.log(`PASS ${label}`); }
async function visible(page,selector){return page.locator(selector).isVisible();}
async function saved(page){return page.evaluate(()=>JSON.parse(localStorage.getItem('il-tavolo:game:'+new URL('./',document.baseURI).pathname)));}
async function closeReveal(page){if(await visible(page,'#card-reveal'))await page.locator('#reveal-close').click();}
async function ready(page){await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.includes('Disponibile offline'));}
async function invariant(page){
  const s=(await saved(page)).game;
  const ids=[...s.deck,...s.discard,...s.players.flatMap(p=>p.jokers),...(s.pendingJokerAssignment?[s.pendingJokerAssignment]:[])];
  assert.equal(ids.length,54);assert.equal(new Set(ids).size,54);
}
async function noOverflow(page){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Horizontal overflow at ${await page.evaluate(()=>innerWidth)}`);}
async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true});
 try {
  const context=await browser.newContext({...devices['iPhone 13'],...IT,reducedMotion:'reduce'});
  context.setDefaultTimeout(10000);
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',msg=>{if(msg.type()==='error') errors.push(msg.text());});
  const external=[];page.on('request',r=>{if(!r.url().startsWith(origin))external.push(r.url());});
  await page.goto(origin+'/il-tavolo/');await ready(page);
  const cache=await page.evaluate(async()=>{const keys=await caches.keys();return {keys,urls:(await (await caches.open(keys[0])).keys()).map(r=>r.url)};});
  assert.equal(cache.urls.length,new Set(assets).size);assert.equal(external.length,0);
  pass('Manifest, all essential assets cached, no CDN requests, repository subpath');
  for(let i=0;i<3;i++)await page.locator('#count-minus').click();
  assert.equal(await page.locator('#count-display').textContent(),'1');assert(await page.locator('#count-minus').isDisabled());
  for(let i=0;i<7;i++)await page.locator('#count-plus').click();
  assert.equal(await page.locator('#count-display').textContent(),'8');assert(await page.locator('#count-plus').isDisabled());
  await page.locator('#name-0').fill('<Lapo & amici>');
  await page.reload();assert.equal(await page.locator('#name-0').inputValue(),'<Lapo & amici>');
  await page.locator('#btn-start').click();
  assert.equal(await page.locator('.player-seat').count(),8);
  assert.equal(await page.locator('.seat-name').first().textContent(),'<Lapo & amici>');
  await invariant(page);pass('1–8 players, draft persistence, safe rendering of player names');
  await page.locator('#deck-pile').press('Enter');
  const initial=await saved(page);await page.reload();assert.deepEqual(await saved(page),initial);
  pass('Keyboard draw and exact game restore after reload');
  // Start fresh through the real UI: pagehide intentionally saves the current game.
  if(await visible(page,'#joker-modal'))await page.locator('#modal-skip').click();
  page.once('dialog',dialog=>dialog.accept());await page.locator('#btn-new-game').click();
  for(let i=0;i<4;i++)await page.locator('#count-minus').click();
  await page.locator('#name-0').fill('A'.repeat(20));await page.locator('#name-1').fill('Bea');
  // Custom rules: every rank gets a recognisable title, persisted with the setup.
  await page.locator('#rules-editor summary').click();
  const ruleKeys=['A','2','3','4','5','6','7','8','9','10','J','Q','K','JOLLY'];
  for(const key of ruleKeys) await page.locator(`#rule-title-${key}`).fill(`Regola ${key}`);
  await page.reload();assert.equal(await page.locator('#rule-title-K').inputValue(),'Regola K');
  assert.equal((await saved(page)).rules.items.it['7'].title,'Regola 7');
  pass('Editable rules for every card persist across reloads');
  await page.locator('#btn-start').click();
  assert.equal(await page.locator('#turn-name').textContent(),'A'.repeat(20));
  await page.locator('#deck-pile').click();
  if(await visible(page,'#joker-modal')){
    assert.equal((await saved(page)).game.turn,1);
    await page.locator('#modal-undo').click();assert(!(await visible(page,'#joker-modal')));
  } else {
    const drawn=await saved(page);const top=drawn.game.discard.at(-1);
    const rank=['A','2','3','4','5','6','7','8','9','10','J','Q','K'][Number(top.slice(1))%13];
    assert(await visible(page,'#card-reveal'));
    assert.equal(await page.locator('#reveal-title').textContent(),`Regola ${rank}`);
    assert((await page.locator('#reveal-name').textContent()).startsWith('A'.repeat(20)));
    assert.equal(await page.locator('#turn-name').textContent(),'Bea');
    await page.locator('#reveal-undo').click();assert(!(await visible(page,'#card-reveal')));
  }
  assert.equal(await page.locator('#deck-count').textContent(),'54 carte');
  assert.equal(await page.locator('#turn-name').textContent(),'A'.repeat(20));
  assert(await page.locator('#btn-undo').isDisabled());
  await page.locator('#turn-next').click();assert.equal(await page.locator('#turn-name').textContent(),'Bea');
  assert.equal(await page.locator('.player-seat.is-turn .seat-name').textContent(),'Bea');
  await page.locator('#turn-prev').click();assert.equal(await page.locator('#turn-name').textContent(),'A'.repeat(20));
  await page.locator('#deck-pile').click();
  if(await visible(page,'#joker-modal'))await page.locator('#modal-skip').click();else await closeReveal(page);
  await page.reload();await page.locator('#btn-undo').click();
  assert.equal(await page.locator('#deck-count').textContent(),'54 carte');await invariant(page);
  pass('Turns advance and can be moved; undo restores draws, also after a reload; big card shows the rule');
  let jokers=0;
  for(let draw=0;draw<54;draw++){
    await page.locator('#deck-pile').click();
    if(await visible(page,'#joker-modal')){
      jokers++;
      const pending=await saved(page);await invariant(page);await page.reload();assert.deepEqual(await saved(page),pending);
      assert(await visible(page,'#joker-modal'));await noOverflow(page);
      assert.equal(await page.locator('#app').evaluate(e=>e.inert),true);
      await page.locator('#modal-skip').press('Tab');assert.equal(await page.locator('#modal-players button').first().evaluate(e=>e===document.activeElement),true);
      await page.screenshot({path:path.join(artifactDir,'joker-390.png'),fullPage:true});
      if(jokers===1) await page.locator('#modal-players button').first().click();
      else await page.locator('#modal-skip').press('Escape');
    }
    await closeReveal(page);
    await invariant(page);
  }
  assert.equal(jokers,2);assert.equal(await page.locator('#deck-count').textContent(),'0 carte');
  const empty=await saved(page);await page.locator('#deck-pile').press('Space');assert.deepEqual(await saved(page),empty);
  assert.equal(empty.game.players[0].jokers.length,1);assert.equal(empty.game.discard.length,53);
  pass('54 unique cards, empty deck, pending joker restore, modal focus, assign and skip');
  await page.locator('#jokers-panel summary').click();
  await page.locator('.joker-select').selectOption('p1');
  let snapshot=await saved(page);assert.equal(snapshot.game.players[1].jokers.length,1);
  await page.reload();assert.deepEqual(await saved(page),snapshot);
  await page.locator('#btn-reshuffle').click();snapshot=await saved(page);
  assert.equal(snapshot.game.deck.length,53);assert.equal(snapshot.game.discard.length,0);assert.equal(snapshot.game.players[1].jokers.length,1);
  await page.locator('.chip-discard').click();await invariant(page);
  assert.equal((await saved(page)).game.discard.length,1);
  pass('Joker transfer, held jokers survive reshuffle, joker discard and persistence');
  for(const [width,height] of [[320,568],[375,667],[390,844],[393,852],[430,932],[844,390]]){
    await page.setViewportSize({width,height});await noOverflow(page);
    const tooSmall=await page.locator('button:visible, input:visible, select:visible, summary:visible').evaluateAll(nodes=>nodes.filter(e=>{const b=e.getBoundingClientRect();return b.width<43||b.height<43}).map(e=>e.id||e.className));
    assert.deepEqual(tooSmall,[]);
    await page.screenshot({path:path.join(artifactDir,`game-${width}.png`),fullPage:true});
  }
  await page.setViewportSize({width:320,height:568});
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');await noOverflow(page);
  await page.evaluate(()=>document.documentElement.style.fontSize='');
  pass('320–430 px iPhone and landscape layouts, 44 px controls, 200% text without overflow');
  await context.setOffline(true);snapshot=await saved(page);
  await page.reload();assert.deepEqual(await saved(page),snapshot);
  await page.locator('#deck-pile').click();if(await visible(page,'#joker-modal'))await page.locator('#modal-skip').click();
  await invariant(page);
  const reopen=await saved(page);await page.close();
  const reopened=await context.newPage();await reopened.goto(origin+'/il-tavolo/index.html?offline=1');
  assert.deepEqual(await saved(reopened),reopen);await invariant(reopened);
  pass('Offline reload, new page startup, query URL and gameplay');
  await context.setOffline(false);await reopened.reload();await ready(reopened);
  const updateSnapshot=await saved(reopened);
  // Simulate an incomplete update. The old release must remain usable.
  release='v-broken';breakInstall=true;
  await reopened.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
  await reopened.waitForFunction(async()=>!(await navigator.serviceWorker.getRegistration()).installing);
  assert.equal(await reopened.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting),false);
  await context.setOffline(true);await reopened.reload();assert.deepEqual(await saved(reopened),updateSnapshot);
  await context.setOffline(false);breakInstall=false;release=NEXT;
  await reopened.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
  await reopened.locator('#update-app').waitFor({state:'visible'});
  assert.equal(await reopened.locator('meta[name="test-release"]').count(),0);
  // Another repository's cache must survive this app's update.
  await reopened.evaluate(async()=>{await caches.open('other-app:keep');});
  await reopened.locator('#update-app').click();
  await reopened.waitForFunction(next=>document.querySelector('meta[name="test-release"]')?.content===next,NEXT);
  assert.deepEqual(await saved(reopened),updateSnapshot);
  const keys=await reopened.evaluate(()=>caches.keys());
  assert(keys.includes('other-app:keep'));assert(!keys.some(k=>k.endsWith(':'+BASE)));assert(keys.some(k=>k.endsWith(':'+NEXT)));
  await context.setOffline(true);await reopened.reload();assert.equal(await reopened.locator('meta[name="test-release"]').getAttribute('content'),NEXT);
  pass('Failed update rollback, explicit update, saved game, old cache cleanup, unrelated cache preserved');
  await context.setOffline(false);
  reopened.once('dialog',dialog=>dialog.dismiss());await reopened.locator('#btn-new-game').click();assert(await visible(reopened,'#screen-game'));
  reopened.once('dialog',dialog=>dialog.accept());await reopened.locator('#btn-new-game').click();await reopened.reload();assert(await visible(reopened,'#screen-setup'));
  await reopened.addInitScript(()=>localStorage.setItem('il-tavolo:game:/il-tavolo/','{broken'));
  await reopened.reload();assert(await visible(reopened,'#screen-setup'));assert(await visible(reopened,'#storage-notice'));
  pass('New-game confirmation, cleared session and corrupt-save recovery');
  // Standalone media emulation tests detection only, not a real iOS installation.
  const standalone=await browser.newContext({...devices['iPhone 13'],...IT});
  await standalone.addInitScript(()=>{const original=window.matchMedia.bind(window);window.matchMedia=q=>q==='(display-mode: standalone)'?{matches:true,addEventListener(){}}:original(q);});
  const home=await standalone.newPage();await home.goto(origin+'/altro/');
  assert.equal(await home.locator('html').getAttribute('data-display-mode'),'standalone');assert(!(await visible(home,'#install-guide')));
  await standalone.close();pass('Standalone detection and suppressed installation guide (emulated)');
  release=BASE;
  const ios=await browser.newContext({...devices['iPhone 13'],...IT});const safari=await ios.newPage();await safari.goto(origin+'/');await ready(safari);
  assert(await visible(safari,'#install-guide'));await safari.locator('#dismiss-install').click();await safari.reload();assert(!(await visible(safari,'#install-guide')));
  await safari.locator('#show-install').click();assert(await visible(safari,'#install-guide'));
  await ios.close();pass('Root deployment, iOS guide, durable dismissal and deliberate reopening');
  const blocked=await browser.newContext({...IT});await blocked.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Blocked','QuotaExceededError')};});
  const limited=await blocked.newPage();await limited.goto(origin+'/');await limited.locator('#btn-start').click();await limited.locator('#deck-pile').click();
  assert(await visible(limited,'#storage-notice'));assert(await visible(limited,'#screen-game'));await blocked.close();pass('Unavailable storage warns without blocking gameplay');
  const animated=await browser.newContext({...devices['iPhone 13'],...IT,reducedMotion:'no-preference'});
  const motion=await animated.newPage();await motion.goto(origin+'/');await motion.locator('#btn-start').click();await motion.locator('#deck-pile').click();
  if(await visible(motion,'#joker-modal'))await motion.locator('#modal-skip').click();
  await closeReveal(motion);
  const shuffleData=await motion.evaluate(()=>{
    document.querySelector('#btn-reshuffle').click();
    document.querySelector('#deck-pile').click();
    return {disabled:document.querySelector('#btn-reshuffle').disabled,save:JSON.parse(localStorage.getItem('il-tavolo:game:/'))};
  });
  assert(shuffleData.disabled);assert.equal(shuffleData.save.game.deck.length,54);
  await motion.reload();assert.deepEqual(await saved(motion),shuffleData.save);
  await animated.close();pass('Animated reshuffle saves immediately, blocks concurrent draw and survives reload');
  const fx=await browser.newContext({...devices['iPhone 13'],...IT,reducedMotion:'reduce'});
  const table=await fx.newPage();table.on('pageerror',e=>errors.push(e.message));
  const top=['c8','c6','c11','c4','c12'];
  const rest=[...Array(52).keys()].map(i=>'c'+i).concat(['j-rosso','j-nero']).filter(id=>!top.includes(id));
  // Without saved rules the app uses its default ones.
  const crafted={version:3,lang:'it',screen:'game',playerCount:2,names:['Ada','Bo'],
    game:{players:[{id:'p0',name:'Ada',jokers:[]},{id:'p1',name:'Bo',jokers:[]}],deck:rest.concat(top),discard:[],jokerHolders:{},
      pendingJokerAssignment:null,turn:0,lastDrawer:null,double:1,queen:null,undo:[]}};
  await table.addInitScript(s=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('il-tavolo:game:/',s);sessionStorage.setItem('seeded','1');}},JSON.stringify(crafted));
  await table.goto(origin+'/');
  assert.equal(await table.locator('#deck-count').textContent(),'54 carte');
  await table.locator('#deck-pile').click();
  assert.equal(await table.locator('#reveal-title').textContent(),'Re');
  await table.locator('#reveal-close').click();
  assert.equal(await table.locator('#effects').textContent(),'♚ Prossima carta ×2');
  await table.locator('#deck-pile').click();
  assert((await table.locator('#reveal-badges').textContent()).includes('×2'));
  for(let spin=1;spin<=4;spin++){
    assert.equal(await table.locator('#reveal-tool').textContent(),`Gira la ruota · ${spin} di 4`);
    await table.locator('#reveal-tool').click();
    await table.locator('#reveal-result').waitFor({state:'visible'});
    await table.waitForFunction(n=>!document.querySelector('#reveal-tool').disabled||document.querySelector('#reveal-tool').hidden,spin);
  }
  assert(!(await visible(table,'#reveal-tool')));
  const tally=await table.locator('#wheel-tally').textContent();
  const total=[...tally.matchAll(/×(\d+)/g)].reduce((sum,m)=>sum+Number(m[1]),0);assert.equal(total,4);
  await table.locator('#reveal-close').click();assert(!(await visible(table,'#effects')));
  await table.locator('#deck-pile').click();await table.locator('#reveal-close').click();
  assert.equal(await table.locator('#effects').textContent(),'♛ Donna: chi guarda Ada beve · ancora 1 pescata');
  await table.locator('#deck-pile').click();
  assert(!(await visible(table,'#effects')));
  await table.locator('#reveal-tool').click();
  await table.locator('#reveal-result').waitFor({state:'visible'});
  assert(['Testa!','Croce!'].includes(await table.locator('#reveal-result').textContent()));
  await table.locator('#reveal-close').click();
  await table.locator('#deck-pile').click();await table.locator('#reveal-tool').click();
  await table.locator('#reveal-result').waitFor({state:'visible'});
  assert(['Pari!','Dispari!'].includes(await table.locator('#reveal-result').textContent()));
  await table.locator('#reveal-undo').click();await table.locator('#btn-undo').click();
  assert.equal(await table.locator('#effects').textContent(),'♛ Donna: chi guarda Ada beve · ancora 1 pescata');
  pass('King doubles the next card and the wheel, Queen lasts one round, coin and odds/evens, undo restores effects');
  await table.locator('#btn-help').click();assert.equal(await table.locator('.help-cards li').count(),14);
  await table.locator('#help-close').click();
  await table.locator('footer [data-lang="en"]').click();
  assert.equal(await table.locator('html').getAttribute('lang'),'en');
  assert.equal(await table.locator('#deck-count').textContent(),'51 cards');
  assert.equal(await table.locator('#btn-reshuffle').textContent(),'⟲ Shuffle');
  assert.equal(await table.locator('#effects').textContent(),'♛ Queen: whoever looks at Ada drinks · 1 more draw');
  await table.reload();assert.equal(await table.locator('.turn-now .eyebrow').textContent(),'Now playing');
  await table.locator('#deck-pile').click();
  assert.equal(await table.locator('#reveal-name').textContent(),'Bo · 7 of Spades');
  assert.equal(await table.locator('#reveal-title').textContent(),'Heads or tails');
  await fx.close();
  pass('How-to-play sheet, English switch, translated game state and persisted language');
  const fresh=await browser.newContext({...devices['iPhone 13'],locale:'en-GB'});const en=await fresh.newPage();
  await en.goto(origin+'/');assert.equal(await en.locator('.setup-title').textContent(),'Who’s at the table?');
  await en.locator('#btn-start').click();assert.equal(await en.locator('#turn-name').textContent(),'Player 1');
  await en.locator('[data-lang="it"]').last().click();assert.equal(await en.locator('#turn-name').textContent(),'Giocatore 1');
  await fresh.close();pass('Device language picks English; unnamed players follow the language switch');
  await context.close();
  assert.deepEqual(errors,[],'Runtime/console errors');pass('No JavaScript runtime or console errors');
 } finally {await browser.close();}
 if(process.env.TEST_WEBKIT==='1'){
  const safariBrowser=await webkit.launch({headless:true});
  try {
   const ctx=await safariBrowser.newContext({...devices['iPhone 13'],...IT});const page=await ctx.newPage();const runtime=[];page.on('pageerror',e=>runtime.push(e.message));
   await page.goto(origin+'/il-tavolo/');await page.locator('#btn-start').click();await page.locator('#deck-pile').click();
   if(await visible(page,'#joker-modal'))await page.locator('#modal-skip').click();
   await invariant(page);const data=await saved(page);await page.reload();assert.deepEqual(await saved(page),data);await noOverflow(page);
   await page.screenshot({path:path.join(artifactDir,'webkit-390.png'),fullPage:true});assert.deepEqual(runtime,[]);
   pass('WebKit iPhone emulation: gameplay, persistence, layout and no runtime errors');
   // Disable the origin rather than WebKit's protocol-level offline toggle.
   await ready(page);assert(await page.evaluate(()=>!!navigator.serviceWorker.controller));
   originUnavailable=true;await page.reload();assert.deepEqual(await saved(page),data);
   await page.locator('#deck-pile').click();if(await visible(page,'#joker-modal'))await page.locator('#modal-skip').click();await invariant(page);
   pass('WebKit cached startup and gameplay while the origin is unreachable');originUnavailable=false;await ctx.close();
  }finally{await safariBrowser.close();}
 }
 console.log(`${passed} checks passed. Screenshots: ${artifactDir}`);
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
