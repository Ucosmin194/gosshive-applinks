/* The warm-up deck on the home page: drag a card (or use the buttons or arrow keys)
   to vote red flag or green flag. The bee, the hexagon and the headline react. */
(function () {
  'use strict';

  var deck = document.getElementById('deck');
  if (!deck) return;

  var hero = document.getElementById('top');
  var cards = Array.prototype.slice.call(deck.querySelectorAll('.card:not(.card--result)'));
  var result = document.getElementById('result');
  var stack = cards.concat([result]);
  var votesBar = document.getElementById('votes');
  var live = document.getElementById('deckLive');
  var bee = document.getElementById('bee');
  var resultTitle = document.getElementById('resultTitle');
  var resultTally = document.getElementById('resultTally');
  var resultBar = document.getElementById('resultBar');
  var resultGet = document.getElementById('resultGet');
  var again = document.getElementById('again');

  var index = 0;
  var votes = [];
  var drag = null;
  var gazeTimer = null;
  var touched = false;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  /* ---- Stack layout ---- */

  function layout() {
    stack.forEach(function (card, i) {
      var depth = i - index;
      if (depth < 0) {
        card.dataset.pos = 'gone';
      } else {
        card.dataset.pos = depth > 2 ? 'deep' : String(depth);
        card.style.transform = '';
        card.style.removeProperty('--p');
      }
      card.setAttribute('aria-hidden', String(depth !== 0));
    });
    result.inert = index < cards.length;
  }

  /* ---- The stage leans with the card: -1 is full red, 1 is full green ---- */

  function setLean(p) {
    hero.style.setProperty('--rp', Math.max(0, -p).toFixed(3));
    hero.style.setProperty('--gp', Math.max(0, p).toFixed(3));
  }

  /* ---- The bee watches ---- */

  function lookAt(x, y) {
    if (!bee) return;
    var box = bee.getBoundingClientRect();
    var dx = x - (box.left + box.width * 0.5);
    var dy = y - (box.top + box.height * 0.43);
    var dist = Math.hypot(dx, dy) || 1;
    var reach = bee.offsetWidth * 0.0236 * Math.min(1, dist / 140);
    var sx = (dx / dist) * reach;
    var sy = (dy / dist) * reach;
    /* The bee sits at 9 degrees, so turn the gaze back into its own frame. */
    var a = (-9 * Math.PI) / 180;
    bee.style.setProperty('--ex', (sx * Math.cos(a) - sy * Math.sin(a)).toFixed(2) + 'px');
    bee.style.setProperty('--ey', (sx * Math.sin(a) + sy * Math.cos(a)).toFixed(2) + 'px');
  }

  function lookAtDeck() {
    var box = deck.getBoundingClientRect();
    lookAt(box.left + box.width * 0.45, box.top + box.height * 0.55);
  }

  function react(dir) {
    if (!bee) return;
    bee.classList.remove('is-yes', 'is-no');
    void bee.offsetWidth;
    bee.classList.add(dir === 'green' ? 'is-yes' : 'is-no');
  }

  if (bee) {
    bee.addEventListener('animationend', function () {
      bee.classList.remove('is-yes', 'is-no');
    });
  }

  var pending = null;
  hero.addEventListener('pointermove', function (event) {
    if (event.pointerType === 'touch' || drag) return;
    pending = { x: event.clientX, y: event.clientY };
    requestAnimationFrame(function () {
      if (!pending) return;
      lookAt(pending.x, pending.y);
      pending = null;
    });
  });
  hero.addEventListener('pointerleave', lookAtDeck);

  /* ---- Voting ---- */

  function announce(text) {
    if (live) live.textContent = text;
  }

  function vote(dir) {
    if (index >= cards.length) return;
    var card = cards[index];
    stopNudge();
    var sign = dir === 'green' ? 1 : -1;
    var box = deck.getBoundingClientRect();

    votes.push(dir);
    card.classList.remove('is-dragging');
    hero.classList.remove('is-dragging');
    card.style.setProperty('--p', String(sign));
    card.style.transform = 'translate(' + sign * 150 + '%, -6%) rotate(' + sign * 24 + 'deg)';

    /* Flash the stage in the vote's colour, then let it settle. */
    setLean(sign);
    setTimeout(function () { setLean(0); }, 280);

    react(dir);
    lookAt(box.left + box.width / 2 + sign * 420, box.top + box.height * 0.4);
    clearTimeout(gazeTimer);
    gazeTimer = setTimeout(lookAtDeck, 620);

    index += 1;
    layout();
    card.dataset.pos = 'gone';

    var said = dir === 'green' ? 'Green flag.' : 'Red flag.';
    if (index < cards.length) {
      var next = cards[index].querySelector('.card-text');
      announce(said + ' Card ' + (index + 1) + ' of ' + cards.length + ': ' + next.textContent);
    } else {
      showResult(said);
    }
  }

  function plural(n, word) {
    return n + ' ' + word + (n === 1 ? '' : 's');
  }

  function showResult(said) {
    var reds = votes.filter(function (v) { return v === 'red'; }).length;
    var greens = votes.length - reds;
    var title;
    if (greens === 0) title = 'Brutal.';
    else if (reds === 0) title = 'Too kind.';
    else if (reds - greens >= 3) title = 'Tough judge.';
    else if (greens - reds >= 3) title = 'Soft touch.';
    else title = 'Split decision.';

    var tally = 'You raised ' + plural(reds, 'red flag') + ' and ' + plural(greens, 'green flag') + '.';
    resultTitle.textContent = title;
    resultTally.textContent = tally;
    resultBar.setAttribute('aria-label', tally);

    var site = window.GossHive;
    if (site && site.platform !== 'other') resultGet.href = site.storeUrl[site.platform];

    var hadFocus = votesBar.contains(document.activeElement) || document.activeElement === deck;
    votesBar.classList.add('is-off');
    votesBar.inert = true;

    /* Start from an even split so the bar slides to the result. */
    resultBar.style.setProperty('--red', '50%');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        resultBar.style.setProperty('--red', clamp((reds / votes.length) * 100, 6, 94) + '%');
      });
    });

    announce(said + ' ' + title + ' ' + tally);
    if (hadFocus) again.focus({ preventScroll: true });
  }

  function restart() {
    index = 0;
    votes = [];
    stack.forEach(function (card) {
      card.style.transform = '';
      card.style.removeProperty('--p');
    });
    votesBar.classList.remove('is-off');
    votesBar.inert = false;
    layout();
    lookAtDeck();
    announce('Card 1 of ' + cards.length + ': ' + cards[0].querySelector('.card-text').textContent);
    deck.focus({ preventScroll: true });
  }

  votesBar.addEventListener('click', function (event) {
    var button = event.target.closest('[data-vote]');
    if (button) vote(button.dataset.vote);
  });

  again.addEventListener('click', restart);

  deck.addEventListener('keydown', function (event) {
    if (event.target !== deck) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); vote('red'); }
    if (event.key === 'ArrowRight') { event.preventDefault(); vote('green'); }
  });

  /* ---- Dragging ---- */

  function release(commit) {
    if (!drag) return;
    var d = drag;
    drag = null;
    d.card.classList.remove('is-dragging');
    hero.classList.remove('is-dragging');
    var fast = Math.abs(d.vx) > 0.55 && Math.abs(d.dx) > 28;
    if (commit && (Math.abs(d.dx) > 92 || fast)) {
      vote(d.dx > 0 ? 'green' : 'red');
    } else {
      d.card.style.transform = '';
      d.card.style.setProperty('--p', '0');
      setLean(0);
      lookAtDeck();
    }
  }

  deck.addEventListener('pointerdown', function (event) {
    if (index >= cards.length) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (!event.target.closest('.card')) return;
    stopNudge();
    drag = {
      id: event.pointerId,
      card: cards[index],
      x: event.clientX,
      y: event.clientY,
      dx: 0,
      vx: 0,
      t: performance.now()
    };
    try { deck.setPointerCapture(event.pointerId); } catch (e) {}
    drag.card.classList.add('is-dragging');
    hero.classList.add('is-dragging');
  });

  deck.addEventListener('pointermove', function (event) {
    if (!drag || event.pointerId !== drag.id) return;
    var now = performance.now();
    var dx = event.clientX - drag.x;
    var dy = event.clientY - drag.y;
    drag.vx = (dx - drag.dx) / Math.max(1, now - drag.t);
    drag.dx = dx;
    drag.t = now;

    var p = clamp(dx / 120, -1, 1);
    drag.card.style.transform = 'translate(' + dx.toFixed(1) + 'px, ' + (dy * 0.3).toFixed(1) + 'px) rotate(' + (dx * 0.05).toFixed(2) + 'deg)';
    drag.card.style.setProperty('--p', p.toFixed(3));
    setLean(p);

    var box = deck.getBoundingClientRect();
    lookAt(box.left + box.width / 2 + dx * 1.6, box.top + box.height * 0.5 + dy * 0.3);
  });

  deck.addEventListener('pointerup', function (event) {
    if (drag && event.pointerId === drag.id) release(true);
  });
  deck.addEventListener('pointercancel', function (event) {
    if (drag && event.pointerId === drag.id) release(false);
  });

  /* ---- A one-time hint: if the deck is on screen and untouched, the top card leans both ways ---- */

  function stopNudge() {
    touched = true;
    cards.forEach(function (card) { card.classList.remove('is-nudging'); });
  }

  cards[0].addEventListener('animationend', function () {
    cards[0].classList.remove('is-nudging');
  });

  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    var nudgeTimer = null;
    var watcher = new IntersectionObserver(function (entries) {
      var visible = entries[0].isIntersecting;
      clearTimeout(nudgeTimer);
      if (!visible || touched) return;
      nudgeTimer = setTimeout(function () {
        if (touched || index !== 0 || drag) return;
        touched = true;
        cards[0].classList.add('is-nudging');
        watcher.disconnect();
      }, 2600);
    }, { threshold: 0.7 });
    watcher.observe(deck);
  }

  /* ---- Start ---- */

  layout();
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      deck.classList.add('is-ready');
      lookAtDeck();
    });
  });
  window.addEventListener('resize', lookAtDeck);
})();
