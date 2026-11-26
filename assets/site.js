/* GossHive site behaviour shared by every page:
   the hive switch (Gut Check / After Dark), the After Dark clock, and store links. */
(function () {
  'use strict';

  var root = document.documentElement;
  var OPEN_HOUR = 21;   // After Dark opens at 21:00 local time
  var CLOSE_HOUR = 4;   // and closes at 04:00, as in the app
  var THEME_COLOR = { gut: '#ffbd59', dark: '#0a0a12' };

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function isAfterDarkOpen(now) {
    var h = now.getHours();
    return h >= OPEN_HOUR || h < CLOSE_HOUR;
  }

  function savedHive() {
    try {
      var v = sessionStorage.getItem('gh-hive');
      return v === 'gut' || v === 'dark' ? v : null;
    } catch (e) {
      return null;
    }
  }

  function currentHive() {
    return root.dataset.hive === 'dark' ? 'dark' : 'gut';
  }

  function syncControls() {
    var hive = currentHive();
    document.querySelectorAll('[data-set-hive]').forEach(function (el) {
      el.setAttribute('aria-pressed', String(el.dataset.setHive === hive));
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLOR[hive]);
  }

  /* Six points of a flat-top hexagon, as a clip-path polygon. */
  function hexagonAt(x, y, r) {
    var pts = [];
    for (var i = 0; i < 6; i++) {
      var a = (Math.PI / 3) * i;
      pts.push((x + r * Math.cos(a)).toFixed(1) + 'px ' + (y + r * Math.sin(a)).toFixed(1) + 'px');
    }
    return 'polygon(' + pts.join(', ') + ')';
  }

  function setHive(next, origin) {
    if (next === currentHive()) return;
    var apply = function () {
      root.classList.add('hive-switching');
      root.dataset.hive = next;
      syncControls();
    };
    var settle = function () {
      root.classList.remove('hive-switching');
    };

    if (!document.startViewTransition || reducedMotion.matches) {
      apply();
      requestAnimationFrame(function () { requestAnimationFrame(settle); });
      return;
    }

    /* The new hive opens out of a hexagon centred on whatever was pressed. */
    var x = origin ? origin.x : window.innerWidth / 2;
    var y = origin ? origin.y : window.innerHeight / 2;
    var reach = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    var transition = document.startViewTransition(apply);
    transition.ready.then(function () {
      root.animate(
        { clipPath: [hexagonAt(x, y, 0), hexagonAt(x, y, reach / 0.86)] },
        { duration: 620, easing: 'cubic-bezier(0.3, 0.6, 0.2, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(function () {});
    transition.finished.then(settle, settle);
  }

  document.addEventListener('click', function (event) {
    var control = event.target.closest('[data-set-hive]');
    if (!control) return;
    var next = control.dataset.setHive;
    try { sessionStorage.setItem('gh-hive', next); } catch (e) {}
    var box = control.getBoundingClientRect();
    var fromKeyboard = event.clientX === 0 && event.clientY === 0;
    setHive(next, {
      x: fromKeyboard ? box.left + box.width / 2 : event.clientX,
      y: fromKeyboard ? box.top + box.height / 2 : event.clientY
    });
  });

  /* ---- After Dark clock ---- */

  var clockFormat;
  try {
    clockFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch (e) {
    clockFormat = null;
  }

  function clock(hour) {
    if (!clockFormat) return (hour < 10 ? '0' : '') + hour + ':00';
    return clockFormat.format(new Date(2000, 0, 1, hour, 0));
  }

  function untilOpen(now) {
    var open = new Date(now);
    open.setHours(OPEN_HOUR, 0, 0, 0);
    var minutes = Math.max(1, Math.ceil((open - now) / 60000));
    var h = Math.floor(minutes / 60);
    var m = minutes % 60;
    if (h === 0) return m + ' min';
    return m === 0 ? h + ' h' : h + ' h ' + m + ' min';
  }

  function tick() {
    var now = new Date();
    var open = isAfterDarkOpen(now);

    document.querySelectorAll('[data-dark-status]').forEach(function (el) {
      el.dataset.open = String(open);
      el.textContent = open
        ? 'Open now, until ' + clock(CLOSE_HOUR)
        : 'Opens in ' + untilOpen(now);
    });

    /* Follow the clock unless the visitor picked a hive themselves. */
    if (!savedHive()) {
      var auto = open ? 'dark' : 'gut';
      if (auto !== currentHive()) setHive(auto, null);
    }
  }

  document.querySelectorAll('[data-clock]').forEach(function (el) {
    el.textContent = clock(Number(el.dataset.clock));
  });

  /* ---- Store links: show the one that fits the device ---- */

  var ua = navigator.userAgent || '';
  var isIOS = /iPad|iPhone|iPod/.test(ua);
  var isAndroid = /android/i.test(ua);
  if (isIOS || isAndroid) {
    document.querySelectorAll('[data-store]').forEach(function (el) {
      el.hidden = el.dataset.store !== (isIOS ? 'ios' : 'android');
    });
  }
  window.GossHive = {
    platform: isIOS ? 'ios' : isAndroid ? 'android' : 'other',
    storeUrl: {
      ios: 'https://apps.apple.com/app/gosshive/id6757358951',
      /* The referrer tells Play (and the app's install attribution) the install came from the site,
         the same way the post page marks its own installs. */
      android: 'https://play.google.com/store/apps/details?id=app.gosshive&referrer=utm_source%3Dwebsite%26utm_medium%3Dweb%26utm_campaign%3Dlanding'
    }
  };

  syncControls();
  tick();
  setInterval(tick, 30000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) tick();
  });
})();
