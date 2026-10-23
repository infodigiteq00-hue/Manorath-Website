/* Manorath Enterprises: contact details, the full-screen menu, the enquiry list,
   the catalogue (tabs and search) and the enquiry form. */
(function () {
  'use strict';

  /* ── fill these in: they appear in the menu, the enquiry section, the form and the WhatsApp button ── */
  var CONTACT = {
    phone: '',      // e.g. '+91 98765 43210'
    email: '',      // where the enquiry form sends to
    whatsapp: '',   // number with country code, digits only, e.g. '919876543210'
    address: ''     // office address
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (v) { return String(v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  window.ME = window.ME || {};

  // contact lines: show what is filled in, hide the rest (and the whole list if nothing is)
  $$('[data-contact]').forEach(function (dd) {
    var key = dd.dataset.contact, v = CONTACT[key];
    if (!v) { dd.parentNode.hidden = true; return; }
    if (key === 'phone') dd.innerHTML = '<a href="tel:' + v.replace(/[^\d+]/g, '') + '">' + esc(v) + '</a>';
    else if (key === 'email') dd.innerHTML = '<a href="mailto:' + esc(v) + '">' + esc(v) + '</a>';
    else dd.textContent = v;
  });
  $$('.menu__lines, .enq__lines').forEach(function (dl) { if (!$('div:not([hidden])', dl)) dl.hidden = true; });
  var wa = $('[data-whatsapp]');
  if (wa && CONTACT.whatsapp) { wa.href = 'https://wa.me/' + CONTACT.whatsapp; wa.target = '_blank'; wa.rel = 'noopener'; wa.hidden = false; }

  var header = $('[data-header]');
  var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 30); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ── full-screen menu ── */
  var menuBtn = $('[data-menu]'), menu = $('[data-menu-panel]'), menuLabel = $('[data-menu-label]');
  var photos = $$('.menu__photos i');
  function setMenu(on) {
    if (on === (menuBtn.getAttribute('aria-expanded') === 'true')) return;
    menuBtn.setAttribute('aria-expanded', String(on)); menuLabel.textContent = on ? 'Close' : 'Menu';
    document.documentElement.classList.toggle('menu-open', on);
    if (on) { menu.hidden = false; void menu.offsetWidth; menu.classList.add('is-open'); photos[0].classList.add('is-on'); }
    else { menu.classList.remove('is-open'); setTimeout(function () { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 700); }
  }
  menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
  $$('.menu__links a').forEach(function (a) {
    a.addEventListener('mouseenter', function () { photos.forEach(function (p, i) { p.classList.toggle('is-on', i === +a.dataset.photo); }); });
    a.addEventListener('click', function () { setMenu(false); });
  });

  /* ── the enquiry list: catalogue items picked with "Add to list", kept in this browser ── */
  var KEY = 'me-list', list = [];
  try { list = JSON.parse(localStorage.getItem(KEY) || '[]'); if (!Array.isArray(list)) list = []; } catch (e) { list = []; }
  var save = function () { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} render(); };
  var has = function (id) { return list.some(function (x) { return x.id === id; }); };
  var form = $('[data-quote]'), note = $('[data-note]', form);
  var drawer = $('[data-drawer]'), itemsEl = $('[data-list-items]'), listBtn = $('.hd__list'), toast = $('[data-toast]'), toastTimer, lastFocus;

  function render() {
    $$('[data-list-count]').forEach(function (b) { b.textContent = list.length; });
    listBtn.classList.toggle('has-items', list.length > 0);
    $$('[data-add]').forEach(function (b) {
      var on = has(b.dataset.add);
      b.classList.toggle('is-added', on); b.setAttribute('aria-pressed', String(on));
      $('span', b).textContent = on ? 'In your list' : 'Add to list';
      b.closest('.pc').classList.toggle('is-picked', on);
    });
    // drawer rows are rebuilt only when the set of items changes, so typing isn't interrupted
    var ids = list.map(function (x) { return x.id; }).join(',');
    if (itemsEl.dataset.ids !== ids) {
      itemsEl.dataset.ids = ids;
      itemsEl.innerHTML = list.map(function (x) {
        return '<li data-id="' + esc(x.id) + '"><span><b>' + esc(x.name) + '</b></span><button type="button" aria-label="Remove ' + esc(x.name) + '">×</button>' +
          '<input type="text" value="' + esc(x.note || '') + '" placeholder="Size, grade, quantity (optional)" aria-label="Details for ' + esc(x.name) + '"></li>';
      }).join('');
    }
    $('[data-list-empty]').hidden = list.length > 0;
    $('[data-list-foot]').hidden = list.length === 0;
    var box = $('[data-form-list]', form);
    box.hidden = list.length === 0;
    $('[data-form-items]', box).innerHTML = list.map(function (x) { return '<li>' + esc(x.name) + (x.note ? ' <span>· ' + esc(x.note) + '</span>' : '') + '</li>'; }).join('');
    form.elements.message.required = list.length === 0;   // with a list, the requirement box is optional
    $('[data-req]', form).hidden = list.length > 0;
  }
  function showToast(name) {
    toast.innerHTML = '<span><b>' + esc(name) + '</b> added to your list</span><button type="button" data-list-open>View list</button>';
    toast.classList.add('is-on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 3200);
  }
  function openDrawer() {
    lastFocus = document.activeElement; setMenu(false);
    drawer.hidden = false; void drawer.offsetWidth; drawer.classList.add('is-open');
    document.documentElement.classList.add('drawer-open');
    toast.classList.remove('is-on');
    setTimeout(function () { ($('input', itemsEl) || $('.drawer__x', drawer)).focus({ preventScroll: true }); }, 350);
  }
  function closeDrawer() {
    if (drawer.hidden) return;
    drawer.classList.remove('is-open'); document.documentElement.classList.remove('drawer-open');
    setTimeout(function () { drawer.hidden = true; }, 450);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  document.addEventListener('click', function (e) {
    var add = e.target.closest('[data-add]');
    if (add) {
      var id = add.dataset.add;
      if (has(id)) list = list.filter(function (x) { return x.id !== id; });
      else {
        list.push({ id: id, name: add.dataset.name, note: '' });
        showToast(add.dataset.name);
        listBtn.classList.remove('is-bump'); void listBtn.offsetWidth; listBtn.classList.add('is-bump');
        if (ME.burst) { var r = add.getBoundingClientRect(); ME.burst(r.left + r.width / 2, r.top + r.height / 2, 46); }
      }
      save(); return;
    }
    if (e.target.closest('[data-list-open]')) { e.preventDefault(); openDrawer(); return; }
    if (e.target.closest('[data-list-close]')) { closeDrawer(); return; }
    if (e.target.closest('[data-list-clear]')) { list = []; save(); return; }
    var rm = e.target.closest('[data-list-items] button');
    if (rm) { var rid = rm.closest('li').dataset.id; list = list.filter(function (x) { return x.id !== rid; }); save(); }
  });
  itemsEl.addEventListener('input', function (e) {
    var li = e.target.closest('li'); if (!li) return;
    list.forEach(function (x) { if (x.id === li.dataset.id) x.note = e.target.value; });
    save();
  });
  // "Send this list" closes the drawer and takes you to the form
  $('[data-list-send]').addEventListener('click', function (e) {
    e.preventDefault(); closeDrawer();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function () { form.elements.name.focus({ preventScroll: true }); }, 700);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeDrawer(); setMenu(false); } });
  render();

  /* ── catalogue: tabs per product line, and search ── */
  var cat = $('[data-catalogue]');
  var cards = $$('.pc', cat), tabs = $$('[data-filter]', cat), search = $('[data-search]', cat), none = $('[data-none]', cat), filter = 'all';
  function apply() {
    var q = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean), shown = 0;
    cards.forEach(function (c) {
      var ok = (filter === 'all' || c.dataset.cat === filter) && q.every(function (w) { return c.dataset.text.indexOf(w) > -1; });
      if (ok) { c.style.setProperty('--i', shown); shown++; }
      if (ok && c.hidden) { c.hidden = false; c.classList.remove('is-entering'); void c.offsetWidth; c.classList.add('is-entering'); }
      else if (!ok) c.hidden = true;
    });
    none.hidden = shown > 0;
  }
  function setFilter(k) {
    filter = k;
    tabs.forEach(function (o) { o.setAttribute('aria-selected', String(o.dataset.filter === k)); });
    apply();
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { setFilter(t.dataset.filter); }); });
  search.addEventListener('input', apply);
  // "See the items in the catalogue" from a product line opens the catalogue on that line
  $$('[data-cat-jump]').forEach(function (a) { a.addEventListener('click', function () { search.value = ''; setFilter(a.dataset.catJump); }); });

  /* ── the enquiry form: opens the visitor's email app (or WhatsApp if no email is set) ── */
  if (!CONTACT.email && CONTACT.whatsapp) note.textContent = 'Sending opens WhatsApp with this filled in.';
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = true;
    $$('[required]', form).forEach(function (i) {
      var bad = !i.value.trim(); i.closest('.field').classList.toggle('is-invalid', bad); if (bad) ok = false;
    });
    if (!ok) { note.textContent = 'Please fill in the fields marked *.'; return; }
    var f = form.elements;
    var items = list.map(function (x, i) { return (i + 1) + '. ' + x.name + (x.note ? ' · ' + x.note : ''); });
    var body = ['Name: ' + f.name.value, f.company.value && 'Company: ' + f.company.value, 'Phone: ' + f.phone.value,
      f.email.value && 'Email: ' + f.email.value, f.product.value && 'Product line: ' + f.product.value,
      f.location.value && 'Delivery location: ' + f.location.value]
      .filter(Boolean)
      .concat(items.length ? ['', 'Items:'].concat(items) : [], f.message.value ? ['', f.message.value] : [])
      .join('\n');
    if (CONTACT.email) {
      location.href = 'mailto:' + CONTACT.email + '?subject=' + encodeURIComponent('Enquiry · ' + (f.company.value || f.name.value)) + '&body=' + encodeURIComponent(body);
      note.textContent = 'Your email app should open with this filled in.';
    } else if (CONTACT.whatsapp) {
      window.open('https://wa.me/' + CONTACT.whatsapp + '?text=' + encodeURIComponent('Enquiry\n' + body), '_blank', 'noopener');
    } else {
      note.textContent = 'Our contact details are being added. Please check back soon.';
    }
  });
  form.addEventListener('input', function (e) { var fl = e.target.closest('.field'); if (fl) fl.classList.remove('is-invalid'); });

  $$('[data-year]').forEach(function (y) { y.textContent = new Date().getFullYear(); });
})();
