const indicator = document.querySelector('#pull-refresh');
const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
if (indicator && standalone) {
  const ignoredTargets = 'button,input,textarea,select,summary,[contenteditable="true"]';
  let start = null;

  const hideIndicator = () => {
    document.body.classList.remove('is-pulling');
    indicator.setAttribute('aria-hidden', 'true');
  };

  window.addEventListener('touchstart', event => {
    const touch = event.touches[0];
    if (event.touches.length !== 1 || window.scrollY > 0 || event.target.closest(ignoredTargets)) {
      start = null;
      return;
    }
    start = {x: touch.clientX, y: touch.clientY};
  }, {passive: true});

  window.addEventListener('touchmove', event => {
    if (!start || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const distance = touch.clientY - start.y;
    if (Math.abs(touch.clientX - start.x) > 40 || distance <= 0) {
      start = null;
      hideIndicator();
      return;
    }
    if (distance > 12) {
      document.body.classList.add('is-pulling');
      indicator.setAttribute('aria-hidden', 'false');
      indicator.textContent = distance >= 80 ? '놓으면 새로고침' : '아래로 당겨 새로고침';
    }
  }, {passive: true});

  window.addEventListener('touchend', event => {
    if (!start) return;
    const touch = event.changedTouches[0];
    const refresh = touch.clientY - start.y >= 80 && Math.abs(touch.clientX - start.x) < 40 && window.scrollY <= 0;
    start = null;
    hideIndicator();
    if (refresh) {
      indicator.textContent = '새로고침 중…';
      indicator.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-pulling');
      const url = new URL(location.href);
      url.searchParams.set('refresh', String(Date.now()));
      location.replace(url);
    }
  }, {passive: true});

  window.addEventListener('touchcancel', () => {
    start = null;
    hideIndicator();
  }, {passive: true});
}
