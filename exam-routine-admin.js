/* =====================================================================
   exam-routine-admin.js — পরীক্ষার রুটিন তৈরি ও প্রকাশ (Admin Panel)
   নতুন ফিচার। পুরোনো কোনো ডেটা/ফিচারে হাত দেয় না।

   Firebase নতুন দুটি পাথ ব্যবহার করে (পুরোনো পাথ অপরিবর্তিত):
     examRoutineDrafts/{id}   — খসড়া রুটিন (শুধু অ্যাডমিন)
     publicExamRoutine        — পাবলিক পেজে দেখানো বর্তমান রুটিন (সবাই পড়তে পারবে)
   ===================================================================== */
(function () {
  'use strict';

  var DRAFTS = 'examRoutineDrafts';
  var PUBLIC = 'publicExamRoutine';

  var CLASSES = [
    { key: 'c0', name: 'শিশু শ্রেণি' },
    { key: 'c1', name: 'প্রথম শ্রেণি' },
    { key: 'c2', name: 'দ্বিতীয় শ্রেণি' },
    { key: 'c3', name: 'তৃতীয় শ্রেণি' }
  ];
  var SUBJECTS = {
    c0: ['বাংলা', 'ইংরেজি', 'গণিত', 'আরবি লিখা', 'ইসলাম শিক্ষা'],
    c1: ['বাংলা', 'ইংরেজি', 'গণিত', 'আরবি লিখা', 'ইসলাম শিক্ষা', 'কায়দা'],
    c2: ['বাংলা', 'ইংরেজি', 'গণিত', 'আরবি লিখা', 'ইসলাম শিক্ষা', 'কুরআন মাজীদ', 'উর্দু ও সাধারণ জ্ঞান'],
    c3: ['বাংলা', 'ইংরেজি', 'গণিত', 'আরবি লিখা ও শিক্ষা', 'ইসলাম শিক্ষা', 'কুরআন মাজীদ ও তাজবীদ', 'উর্দু ও সাধারণ জ্ঞান']
  };
  var DAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
  var MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

  var editingId = null;
  var $ = function (id) { return document.getElementById(id); };
  var bn = function (n) { return String(n == null ? '' : n).replace(/[0-9]/g, function (d) { return '০১২৩৪৫৬৭৮৯'[d]; }); };

  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  }
  function toIso(d) {
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function dateLabel(s) {
    var d = parseDate(s);
    return d ? DAYS[d.getDay()] + ', ' + bn(d.getDate()) + ' ' + MONTHS[d.getMonth()] + ' ' + bn(d.getFullYear()) : '';
  }
  function dayName(s) { var d = parseDate(s); return d ? DAYS[d.getDay()] : ''; }

  function msg(text, ok) {
    var e = $('routineMsg');
    if (!e) return;
    e.textContent = text || '';
    e.className = 'routine-msg' + (text ? (ok === false ? ' bad' : ' good') : '');
  }

  async function fb() {
    var db = await window.firebaseReady;
    if (!db || !window.firebaseFns) throw new Error('Firebase সংযোগ পাওয়া যায়নি। আবার লগইন করে চেষ্টা করুন।');
    return { db: db, f: window.firebaseFns };
  }
  async function getVal(path) {
    var x = await fb();
    var snap = await x.f.get(x.f.ref(x.db, path));
    return snap.exists() ? snap.val() : null;
  }
  async function setVal(path, value) {
    var x = await fb();
    return x.f.set(x.f.ref(x.db, path), value);
  }
  async function removeVal(path) {
    var x = await fb();
    return x.f.remove(x.f.ref(x.db, path));
  }

  /* ---------------- ফর্মের সারি ---------------- */
  function makeInput(type, cls, ph, list) {
    var i = document.createElement('input');
    i.type = type; i.className = cls;
    if (ph) i.placeholder = ph;
    if (list) i.setAttribute('list', list);
    if (type === 'text') i.maxLength = 80;
    return i;
  }

  function addRow(data) {
    var box = $('routineRows');
    if (!box) return;
    data = data || {};
    var row = document.createElement('div');
    row.className = 'routine-row';

    var top = document.createElement('div');
    top.className = 'routine-row-top';

    var dateWrap = document.createElement('div');
    dateWrap.className = 'routine-cell';
    var dl = document.createElement('label'); dl.textContent = 'তারিখ';
    var date = makeInput('date', 'rt-date');
    date.value = data.date || '';
    var day = document.createElement('span'); day.className = 'rt-day';
    day.textContent = dayName(date.value);
    date.addEventListener('change', function () { day.textContent = dayName(date.value); });
    dateWrap.appendChild(dl); dateWrap.appendChild(date); dateWrap.appendChild(day);

    var timeWrap = document.createElement('div');
    timeWrap.className = 'routine-cell';
    var tl = document.createElement('label'); tl.textContent = 'সময়';
    var time = makeInput('text', 'rt-time', 'যেমন: সকাল ৯:০০');
    time.value = data.time != null ? data.time : ($('routineDefaultTime') ? $('routineDefaultTime').value : '');
    timeWrap.appendChild(tl); timeWrap.appendChild(time);

    var del = document.createElement('button');
    del.type = 'button'; del.className = 'btn btn-danger btn-sm rt-del'; del.textContent = '✕ দিন মুছুন';
    del.addEventListener('click', function () { row.remove(); });

    top.appendChild(dateWrap); top.appendChild(timeWrap); top.appendChild(del);
    row.appendChild(top);

    var grid = document.createElement('div');
    grid.className = 'routine-subjects';
    CLASSES.forEach(function (c) {
      var w = document.createElement('div'); w.className = 'routine-cell';
      var l = document.createElement('label'); l.textContent = c.name;
      var inp = makeInput('text', 'rt-sub', 'বিষয় (না থাকলে ফাঁকা)', 'rt-list-' + c.key);
      inp.dataset.c = c.key;
      inp.value = (data.subjects && data.subjects[c.key]) || '';
      w.appendChild(l); w.appendChild(inp); grid.appendChild(w);
    });
    row.appendChild(grid);
    box.appendChild(row);
  }

  function addNextRow() {
    var dates = Array.prototype.map.call(document.querySelectorAll('#routineRows .rt-date'), function (i) { return i.value; }).filter(Boolean).sort();
    var next = '';
    if (dates.length) {
      var d = parseDate(dates[dates.length - 1]);
      d.setDate(d.getDate() + 1);
      next = toIso(d);
    }
    addRow({ date: next });
  }

  function collect() {
    var year = $('routineYear').value.trim();
    var exam = $('routineExam').value;
    if (!year) throw new Error('পরীক্ষার বছর লিখুন।');
    var rows = [];
    document.querySelectorAll('#routineRows .routine-row').forEach(function (r) {
      var date = r.querySelector('.rt-date').value;
      var time = r.querySelector('.rt-time').value.trim();
      var subjects = {}; var any = false;
      r.querySelectorAll('.rt-sub').forEach(function (i) {
        var v = i.value.trim(); subjects[i.dataset.c] = v; if (v) any = true;
      });
      if (!date && !any) return;                       // সম্পূর্ণ ফাঁকা সারি বাদ
      if (!date) throw new Error('প্রতিটি সারিতে তারিখ দিন।');
      if (!any) throw new Error(dateLabel(date) + ' — অন্তত একটি শ্রেণির বিষয় লিখুন।');
      rows.push({ date: date, time: time, subjects: subjects });
    });
    if (!rows.length) throw new Error('অন্তত একটি পরীক্ষার দিন যোগ করুন।');
    rows.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    var dup = rows.find(function (r, i) { return i && r.date === rows[i - 1].date; });
    if (dup) throw new Error(dateLabel(dup.date) + ' — একই তারিখ দুইবার আছে। এক সারিতে সব শ্রেণির বিষয় লিখুন।');
    var title = $('routineTitle').value.trim() || (bn(year) + ' সালের ' + exam + ' — রুটিন');
    return {
      title: title, examName: exam, year: Number(year),
      note: $('routineNote').value.trim(), rows: rows
    };
  }

  function resetForm() {
    editingId = null;
    $('routineYear').value = new Date().getFullYear();
    $('routineExam').selectedIndex = 0;
    $('routineTitle').value = '';
    $('routineNote').value = '';
    $('routineRows').innerHTML = '';
    addRow({});
    $('routineSaveBtn').textContent = 'রুটিন সংরক্ষণ করুন';
    $('routineEditBanner').style.display = 'none';
  }

  async function save() {
    var btn = $('routineSaveBtn');
    btn.disabled = true;
    try {
      var rec = collect();
      var id = editingId || (String(Date.now()) + '_' + Math.random().toString(36).slice(2, 7));
      var old = editingId ? await getVal(DRAFTS + '/' + id) : null;
      rec.createdAt = (old && old.createdAt) || Date.now();
      rec.updatedAt = Date.now();
      await setVal(DRAFTS + '/' + id, rec);
      msg('✔ রুটিন সংরক্ষিত হয়েছে। পাবলিক পেজে দেখাতে নিচের তালিকা থেকে "পাবলিক করুন" চাপুন।', true);
      resetForm();
      await loadList();
    } catch (e) {
      msg(e.message || 'সংরক্ষণ করা যায়নি।', false);
    } finally {
      btn.disabled = false;
    }
  }

  function edit(id, rec) {
    editingId = id;
    $('routineYear').value = rec.year || '';
    var sel = $('routineExam');
    for (var i = 0; i < sel.options.length; i++) if (sel.options[i].value === rec.examName) sel.selectedIndex = i;
    $('routineTitle').value = rec.title || '';
    $('routineNote').value = rec.note || '';
    $('routineRows').innerHTML = '';
    (rec.rows || []).forEach(addRow);
    if (!(rec.rows || []).length) addRow({});
    $('routineSaveBtn').textContent = 'পরিবর্তন সংরক্ষণ করুন';
    $('routineEditBanner').style.display = 'block';
    msg('');
    $('panel-routine').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------------- তালিকা ও প্রকাশ ---------------- */
  function btn(text, cls, fn) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'btn btn-sm ' + cls; b.textContent = text;
    b.addEventListener('click', fn);
    return b;
  }

  async function loadList() {
    var list = $('routineList'), status = $('routinePublicStatus');
    if (!list) return;
    list.textContent = 'লোড হচ্ছে...';
    try {
      var results = await Promise.all([getVal(DRAFTS), getVal(PUBLIC)]);
      var drafts = results[0] || {}, pub = results[1];

      status.innerHTML = '';
      status.className = 'routine-status ' + (pub ? 'on' : 'off');
      var sTxt = document.createElement('div'); sTxt.className = 'rs-text';
      if (pub) {
        sTxt.textContent = '🟢 পাবলিক পেজে এখন দেখাচ্ছে: ' + (pub.title || '');
        status.appendChild(sTxt);
        status.appendChild(btn('পাবলিক থেকে সরান', 'btn-danger', async function () {
          if (!confirm('পাবলিক পেজ থেকে রুটিন সরানো হবে। (খসড়া মুছবে না) চালিয়ে যাবেন?')) return;
          try { await removeVal(PUBLIC); msg('রুটিন পাবলিক পেজ থেকে সরানো হয়েছে।', true); await loadList(); }
          catch (e) { msg(e.message, false); }
        }));
      } else {
        sTxt.textContent = '⚪ পাবলিক পেজে এখন কোনো রুটিন প্রকাশিত নেই।';
        status.appendChild(sTxt);
      }

      var ids = Object.keys(drafts).sort(function (a, b) { return (drafts[b].updatedAt || 0) - (drafts[a].updatedAt || 0); });
      list.innerHTML = '';
      if (!ids.length) { list.textContent = 'এখনো কোনো রুটিন সংরক্ষণ করা হয়নি।'; return; }

      ids.forEach(function (id) {
        var r = drafts[id];
        var live = pub && pub.sourceId === id;
        var changed = live && (r.updatedAt || 0) > (pub.publishedAt || 0);
        var item = document.createElement('div');
        item.className = 'routine-item' + (live ? ' live' : '');

        var info = document.createElement('div'); info.className = 'ri-info';
        var t = document.createElement('div'); t.className = 'ri-title'; t.textContent = r.title || '(শিরোনামহীন)';
        var m = document.createElement('div'); m.className = 'ri-meta';
        var first = r.rows && r.rows[0], last = r.rows && r.rows[r.rows.length - 1];
        m.textContent = bn((r.rows || []).length) + ' দিন' + (first ? ' • ' + dateLabel(first.date) + (last && last !== first ? ' থেকে ' + dateLabel(last.date) : '') : '');
        info.appendChild(t); info.appendChild(m);
        if (live) {
          var badge = document.createElement('span'); badge.className = 'ri-badge';
          badge.textContent = changed ? '⚠ পরিবর্তিত — আবার পাবলিক করুন' : '🟢 পাবলিকে চালু';
          info.appendChild(badge);
        }

        var acts = document.createElement('div'); acts.className = 'ri-actions';
        acts.appendChild(btn(live ? (changed ? 'আবার পাবলিক করুন' : 'পাবলিকে আছে ✔') : 'পাবলিক করুন', 'btn-gold', async function () {
          if (live && !changed) return;
          var q = pub && !live ? 'বর্তমান পাবলিক রুটিনের জায়গায় এই রুটিন দেখানো হবে। চালিয়ে যাবেন?' : 'এই রুটিন পাবলিক পেজে প্রকাশ করবেন?';
          if (!confirm(q)) return;
          try {
            var copy = { title: r.title, examName: r.examName, year: r.year, note: r.note || '', rows: r.rows, sourceId: id, publishedAt: Date.now() };
            await setVal(PUBLIC, copy);
            msg('✔ রুটিন পাবলিক পেজে প্রকাশিত হয়েছে।', true);
            await loadList();
          } catch (e) { msg(e.message, false); }
        }));
        acts.appendChild(btn('সম্পাদনা', 'btn-ghost', function () { edit(id, r); }));
        acts.appendChild(btn('মুছুন', 'btn-danger', async function () {
          var q = live ? 'এই রুটিন এখন পাবলিক পেজে চালু আছে। খসড়া মুছলেও পাবলিক রুটিন থেকে যাবে (আলাদা সরাতে হবে)। মুছবেন?' : 'এই রুটিন মুছে ফেলবেন?';
          if (!confirm(q)) return;
          try { await removeVal(DRAFTS + '/' + id); if (editingId === id) resetForm(); await loadList(); }
          catch (e) { msg(e.message, false); }
        }));
        item.appendChild(info); item.appendChild(acts);
        list.appendChild(item);
      });
    } catch (e) {
      list.textContent = '';
      msg(e.message || 'তালিকা লোড করা যায়নি।', false);
    }
  }

  /* ---------------- শুরু ---------------- */
  function init() {
    if (!$('panel-routine')) return;
    CLASSES.forEach(function (c) {
      var dl = $('rt-list-' + c.key);
      if (dl) SUBJECTS[c.key].forEach(function (s) { var o = document.createElement('option'); o.value = s; dl.appendChild(o); });
    });
    $('routineAddRow').addEventListener('click', addNextRow);
    $('routineSaveBtn').addEventListener('click', save);
    $('routineResetBtn').addEventListener('click', function () { resetForm(); msg(''); });
    var btnTab = document.querySelector('.tab-btn[data-tab="routine"]');
    if (btnTab) btnTab.addEventListener('click', loadList);
    resetForm();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
