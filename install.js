'use strict';
// iOS installation is a Safari action, not an automatic installation prompt.
const installedMode = window.matchMedia('(display-mode: standalone)');
function updateInstallGuide() {
  document.querySelector('#installGuide').hidden = installedMode.matches || navigator.standalone === true;
  document.querySelector('#localInstallNote').hidden = location.protocol !== 'file:';
}
updateInstallGuide();
installedMode.addEventListener?.('change', updateInstallGuide);
