(function () {
  'use strict';

  var status = document.getElementById('offline-status');
  var updateButton = document.getElementById('update-app');
  var guide = document.getElementById('install-guide');
  var guideButton = document.getElementById('show-install');
  var displayMode = window.matchMedia('(display-mode: standalone)');
  var installed = function () { return displayMode.matches || navigator.standalone === true; };
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isSafari = /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
  var dismissalKey = 'il-tavolo:install-dismissed:' + new URL('./', document.baseURI).pathname;
  var dismissed = false;
  var statusKey = 'offlinePreparing';
  // Texts live in index.html, whose script runs before this deferred one.
  function text(key) { return window.IlTavolo ? window.IlTavolo.t(key) : key; }
  function setStatus(key) { statusKey = key; status.textContent = text(key); }
  setStatus(statusKey);
  window.addEventListener('app:language', function () {
    status.textContent = text(statusKey);
    if (updateButton.disabled) updateButton.textContent = text('updating');
  });
  try { dismissed = localStorage.getItem(dismissalKey) === 'yes'; } catch (error) { /* Session only if storage is unavailable. */ }

  function refreshInstallGuide() {
    document.documentElement.dataset.displayMode = installed() ? 'standalone' : 'browser';
    guideButton.hidden = !isIOS || installed();
    guide.hidden = !isIOS || !isSafari || installed() || dismissed;
  }
  guideButton.addEventListener('click', function () {
    guide.hidden = !guide.hidden;
    if (!guide.hidden) guide.scrollIntoView({block: 'nearest'});
  });
  document.getElementById('dismiss-install').addEventListener('click', function () {
    dismissed = true;
    guide.hidden = true;
    try { localStorage.setItem(dismissalKey, 'yes'); } catch (error) { /* Keep this session's dismissal. */ }
  });
  if (displayMode.addEventListener) displayMode.addEventListener('change', refreshInstallGuide);
  window.addEventListener('appinstalled', refreshInstallGuide);
  refreshInstallGuide();

  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    setStatus('offlineNeedsHttps');
    return;
  }

  var registration;
  var ready = false;
  var reloading = false;
  var hadController = !!navigator.serviceWorker.controller;
  var lastCheck = 0;

  function offlineStatus() {
    if (ready) setStatus(navigator.onLine ? 'offlineReady' : 'offlineNow');
  }
  function offerUpdate() {
    updateButton.hidden = !(registration && registration.waiting);
  }
  function watch(worker) {
    if (!worker) return;
    worker.addEventListener('statechange', function () {
      if (worker.state === 'installed') offerUpdate();
      if (worker.state === 'redundant' && !ready) {
        setStatus('offlineRetryReopen');
      }
    });
  }
  function checkForUpdate() {
    if (registration && navigator.onLine && Date.now() - lastCheck > 60000) {
      lastCheck = Date.now();
      registration.update().catch(function () { /* Keep the cached release if the network fails. */ });
    }
  }

  updateButton.addEventListener('click', function () {
    if (!registration || !registration.waiting) return;
    if (!window.dispatchEvent(new Event('app:before-update', {cancelable: true}))) return;
    updateButton.disabled = true;
    updateButton.textContent = text('updating');
    registration.waiting.postMessage({type: 'SKIP_WAITING'});
  });
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    // Initial caching must not interrupt setup. Later activation loads a consistent release.
    if (hadController && !reloading) {
      if (!window.dispatchEvent(new Event('app:before-update', {cancelable: true}))) return;
      reloading = true;
      window.location.reload();
    }
    hadController = true;
  });
  navigator.serviceWorker.register('./sw.js', {scope: './', updateViaCache: 'none'})
    .then(function (reg) {
      registration = reg;
      offerUpdate();
      watch(reg.installing);
      reg.addEventListener('updatefound', function () { watch(reg.installing); });
      checkForUpdate();
      return navigator.serviceWorker.ready;
    })
    .then(function () { ready = true; offlineStatus(); })
    .catch(function () {
      setStatus('offlineRetryReload');
    });
  window.addEventListener('online', function () { offlineStatus(); checkForUpdate(); });
  window.addEventListener('offline', offlineStatus);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { offlineStatus(); checkForUpdate(); }
  });
})();
