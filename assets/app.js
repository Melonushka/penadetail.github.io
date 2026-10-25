/* =============================================================================
   PENA DETAIL — логика сайта. Без зависимостей и сборки.
   ========================================================================== */
(() => {
  'use strict';

  const SITE = window.PENA || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const rub = new Intl.NumberFormat('ru-RU');
  const html = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const plural = (n, one, few, many) => {
    const n10 = n % 10;
    const n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
    return many;
  };

  const money = (v) => `${rub.format(v)} ₽`;
  const roundTo = SITE.roundTo > 0 ? SITE.roundTo : 100;

  const state = { klass: 'sedan', chosen: new Map(), step: 1 };

  const priceFor = (base) => {
    const m = (SITE.multipliers && SITE.multipliers[state.klass]) || 1;
    return Math.round((base * m) / roundTo) * roundTo;
  };

  /* ---------- Контактные данные из конфига ---------- */
  try {
    const cfg = SITE;
    const phone = (cfg.phone || '').trim();
    const phoneText = (cfg.phoneDisplay || cfg.phone || '').trim();

    if (phone) {
      $$('[data-cfg-phone-link]').forEach((el) => {
        el.href = `tel:${phone.replace(/[^\d+]/g, '')}`;
        el.hidden = false;
        const slot = $('[data-cfg-phone]', el);
        if (slot && slot !== el) slot.textContent = phoneText;
        else el.textContent = phoneText;
      });
    }

    if (cfg.hours) {
      $$('[data-cfg-hours]').forEach((el) => {
        el.textContent = cfg.hours;
        el.hidden = false;
      });
    }

    Object.entries({ telegram: cfg.telegram, whatsapp: cfg.whatsapp, email: cfg.email }).forEach(([key, url]) => {
      if (!url) return;
      $$(`[data-cfg="${key}"]`).forEach((a) => {
        a.href = key === 'email' ? `mailto:${url}` : url;
        if (key === 'email') a.textContent = url;
        a.hidden = false;
      });
    });
    if (cfg.telegram || cfg.whatsapp) {
      $$('[data-cfg-messengers]').forEach((el) => { el.hidden = false; });
    }

    const area = cfg.city
      ? `${cfg.city} и область${cfg.radiusKm ? `, до ${cfg.radiusKm} км от МКАД` : ''}`
      : '';
    if (area) $$('[data-cfg-area]').forEach((el) => { el.textContent = area; });

    const L = cfg.legal || {};
    const parts = [L.status, L.name, L.inn ? `ИНН ${L.inn}` : '', L.ogrnip ? `ОГРНИП ${L.ogrnip}` : '']
      .filter(Boolean);
    if (parts.length > 1) {
      $$('[data-cfg-legal]').forEach((el) => { el.textContent = parts.join(' · '); });
    }

    const hasDirect = Boolean(phone || cfg.telegram || cfg.whatsapp || cfg.email);
    $$('[data-cfg-fallback]').forEach((el) => { el.hidden = !hasDirect; });

    /* Пока телефон не указан — вместо пустоты в карточке контактов */
    $$('[data-cfg-no-phone]').forEach((el) => { el.hidden = Boolean(phone); });

    $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });
  } catch (err) {
    console.error('config', err);
  }

  /* ---------- Тема: авто / светлая / тёмная ---------- */
  const themeMeta = $('[data-theme-color]');
  const sysDark = window.matchMedia('(prefers-color-scheme: dark)');

  const applyTheme = () => {
    const pref = html.dataset.pref || 'auto';
    const dark = pref === 'dark' || (pref === 'auto' && sysDark.matches);
    html.dataset.theme = dark ? 'dark' : 'light';
    if (themeMeta) themeMeta.setAttribute('content', dark ? '#07080a' : '#f4f3ef');
    $$('[data-theme-set]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.themeSet === pref));
    });
  };

  const setTheme = (pref) => {
    html.dataset.pref = pref;
    try { localStorage.setItem('pena-theme', pref); } catch (e) {}
    applyTheme();
  };

  try {
    applyTheme();
    $$('[data-theme-set]').forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.themeSet)));
    sysDark.addEventListener('change', () => {
      if ((html.dataset.pref || 'auto') === 'auto') applyTheme();
    });
  } catch (err) {
    console.error('theme', err);
  }

  /* ---------- «Отмывание» ---------- */
  const shineEl = $('.shine');

  const setClean = (level) => {
    const next = Math.max(0, Math.min(4, level));
    const cur = Number(html.dataset.clean || 0);
    if (next <= cur) return;
    html.dataset.clean = String(next);
    try {
      localStorage.setItem('pena-clean', String(next));
      localStorage.setItem('pena-clean-at', String(Date.now()));
    } catch (e) {}

    if (next >= 4 && shineEl && !reduceMotion) {
      shineEl.classList.remove('is-on');
      void shineEl.offsetWidth;
      shineEl.classList.add('is-on');
      window.setTimeout(() => shineEl.classList.remove('is-on'), 1400);
    }
  };

  try {
    const days = Number(SITE.dirtReturnDays || 0);
    if (SITE.dirtEnabled === false) {
      html.dataset.clean = '4';
    } else if (days > 0) {
      const at = Number(localStorage.getItem('pena-clean-at') || 0);
      if (at && Date.now() - at > days * 864e5) {
        html.dataset.clean = '0';
        localStorage.setItem('pena-clean', '0');
      }
    }
  } catch (err) {
    console.error('dirt', err);
  }

  /* ---------- Параллакс машины ---------- */
  try {
    const car = $('.car');
    if (car && !reduceMotion && window.matchMedia('(min-width: 861px)').matches) {
      let raf = 0;
      window.addEventListener(
        'scroll',
        () => {
          if (raf) return;
          raf = window.requestAnimationFrame(() => {
            raf = 0;
            car.style.transform = `translate3d(0, ${Math.round(window.scrollY * -0.045)}px, 0)`;
          });
        },
        { passive: true }
      );
    }
  } catch (err) {
    console.error('parallax', err);
  }

  /* ---------- Цены и класс авто ---------- */
  const cards = $$('[data-item]');
  const classLabel = $('[data-class-label]');
  const classNote = $('[data-class-note]');
  const complexOut = $('[data-complex-price]');
  const complexFrom = $('[data-complex-from]');
  const klassGenitive = { sedan: 'седана', crossover: 'кроссовера', suv: 'внедорожника' };

  const renderPrices = () => {
    cards.forEach((card) => {
      const out = $('[data-price-out]', card);
      if (!out) return;
      const from = card.dataset.from === '1';
      const value = priceFor(Number(card.dataset.price));
      out.innerHTML = `${from ? '<i>от</i> ' : ''}${rub.format(value)}&nbsp;₽`;
    });
    if (complexOut) complexOut.innerHTML = `от ${rub.format(priceFor(35000))}&nbsp;₽`;
    if (complexFrom) complexFrom.textContent = rub.format(priceFor(35000));
    if (classLabel) classLabel.textContent = klassGenitive[state.klass] || 'автомобиля';

    if (classNote) {
      const m = (SITE.multipliers && SITE.multipliers[state.klass]) || 1;
      const name = (SITE.classNames && SITE.classNames[state.klass]) || '';
      classNote.textContent = m === 1
        ? `Цены для ${name.toLowerCase()}`
        : `${name}: +${Math.round((m - 1) * 100)}% к цене`;
    }

    $$('[data-class-set]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.classSet === state.klass));
    });
  };

  const renderPick = () => {
    const pickList = $('[data-pick-list]');
    if (!pickList) return;
    pickList.textContent = '';
    const groups = new Map();
    cards.forEach((card) => {
      const g = card.dataset.group;
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(card);
    });

    const names = {
      body: 'Кузов и полировка',
      protect: 'Защита ЛКП',
      salon: 'Салон',
      glass: 'Стёкла и колёса',
      engine: 'Двигатель и арки',
      complex: 'Комплекс',
    };

    groups.forEach((items, key) => {
      const wrap = document.createElement('div');
      wrap.className = 'pick__group';
      const title = document.createElement('p');
      title.className = 'pick__cat';
      title.textContent = names[key] || key;
      wrap.append(title);

      items.forEach((card) => {
        const row = document.createElement('label');
        row.className = 'pick__row';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = card.dataset.id;
        input.checked = state.chosen.has(card.dataset.id);
        const name = document.createElement('span');
        name.className = 'pick__name';
        name.textContent = card.dataset.name;
        const price = document.createElement('span');
        price.className = 'pick__price';
        price.textContent = `${card.dataset.from === '1' ? 'от ' : ''}${money(priceFor(Number(card.dataset.price)))}`;
        row.append(input, name, price);
        wrap.append(row);
      });
      pickList.append(wrap);
    });
  };

  const syncBox = (id, checked) => {
    const card = cards.find((c) => c.dataset.id === id);
    const box = card?.querySelector('.svc__in');
    if (!box || box.checked === checked) return;
    box.checked = checked;
    box.dispatchEvent(new Event('change', { bubbles: true }));
  };

  cards.forEach((card) => {
    const box = card.querySelector('.svc__in');
    if (!box) return;
    box.addEventListener('change', () => {
      const id = box.value;
      card.classList.toggle('is-on', box.checked);
      if (box.checked) {
        state.chosen.set(id, {
          name: card.dataset.name,
          base: Number(card.dataset.price),
          from: card.dataset.from === '1',
        });
      } else {
        state.chosen.delete(id);
      }
      const row = $(`[data-pick-list] input[value="${id}"]`);
      if (row) row.checked = box.checked;
      renderEstimate();
      renderReview();
    });
  });

  $('[data-pick-list]')?.addEventListener('change', (e) => {
    const input = e.target.closest('input[type="checkbox"]');
    if (!input) return;
    syncBox(input.value, input.checked);
  });

  $('[data-est-clear]')?.addEventListener('click', () => {
    Array.from(state.chosen.keys()).forEach((id) => syncBox(id, false));
  });

  $$('[data-pick]').forEach((btn) => {
    btn.addEventListener('click', () => syncBox(btn.dataset.pick, true));
  });

  const estimate = () => {
    let sum = 0;
    let hasFrom = false;
    state.chosen.forEach((item) => {
      sum += priceFor(item.base);
      if (item.from) hasFrom = true;
    });
    return { sum, hasFrom, n: state.chosen.size };
  };

  const renderEstimate = () => {
    const { sum, hasFrom, n } = estimate();
    const est = $('[data-est]');
    const totalEl = $('[data-est-total]');
    const countEl = $('[data-est-count]');
    const stepSum = $('[data-step-sum]');

    if (totalEl) totalEl.textContent = n ? `${hasFrom ? 'от ' : ''}${money(sum)}` : '0 ₽';
    if (countEl) countEl.textContent = n ? `${n} ${plural(n, 'услуга', 'услуги', 'услуг')}` : '';
    if (stepSum) stepSum.textContent = n ? `${hasFrom ? 'от ' : ''}${money(sum)}` : 'ничего не выбрано';
    if (est) {
      est.classList.toggle('is-on', n > 0);
      est.inert = n === 0;
    }
  };

  const setClass = (klass) => {
    if (!klass || !(SITE.multipliers && SITE.multipliers[klass])) return;
    state.klass = klass;
    try { localStorage.setItem('pena-class', klass); } catch (e) {}
    renderPrices();
    renderPick();
    renderEstimate();
    renderReview();
    const totalEl = $('[data-est-total]');
    const { sum, hasFrom, n } = estimate();
    if (totalEl && n) totalEl.textContent = `${hasFrom ? 'от ' : ''}${money(sum)}`;
  };

  try {
    const saved = localStorage.getItem('pena-class');
    if (saved && SITE.multipliers && SITE.multipliers[saved]) state.klass = saved;
  } catch (e) {}

  $$('[data-class-set]').forEach((b) => {
    b.addEventListener('click', () => {
      setClass(b.dataset.classSet);
      const radio = $(`[name="carClass"][value="${b.dataset.classSet}"]`);
      if (radio) radio.checked = true;
    });
  });

  /* ---------- Шаги заявки ---------- */
  const flow = $('[data-flow]');
  const form = $('[data-form]');
  const steps = $$('[data-step]');
  const dots = $$('[data-dot]');
  const done = $('[data-done]');
  const status = $('[data-status]');
  const review = $('[data-review]');

  const showStep = (n, opts = {}) => {
    state.step = Math.max(1, Math.min(4, n));
    steps.forEach((s) => {
      const on = Number(s.dataset.step) === state.step;
      s.hidden = !on;
      s.classList.toggle('is-on', on);
    });
    dots.forEach((d) => {
      const i = Number(d.dataset.dot);
      d.classList.toggle('is-on', i === state.step);
      d.classList.toggle('is-done', i < state.step);
    });
    if (!opts.silent && flow) {
      const rect = flow.getBoundingClientRect();
      if (rect.top < 60 || rect.top > window.innerHeight * 0.7) {
        window.scrollTo({ top: rect.top + window.scrollY - 80, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    }
    if (state.step === 4) renderReview();
  };

  const setError = (field, message) => {
    const wrap = field.closest('.fld');
    if (wrap) {
      const slot = wrap.querySelector('[data-err]');
      wrap.classList.toggle('is-bad', Boolean(message));
      if (slot) slot.textContent = message || '';
    }
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
  };

  const validateStep = (n) => {
    if (n !== 3 || !form) return [];
    const errors = [];
    const name = form.querySelector('[name="name"]');
    const phone = form.querySelector('[name="phone"]');
    const address = form.querySelector('[name="address"]');
    const date = form.querySelector('[name="date"]');

    const nameOk = name.value.trim().length >= 2;
    setError(name, nameOk ? '' : 'Как к вам обращаться?');
    if (!nameOk) errors.push(name);

    const digits = phone.value.replace(/\D/g, '');
    const phoneOk = digits.length >= 10 && digits.length <= 15;
    setError(phone, phoneOk ? '' : 'Нужен номер из 10–15 цифр');
    if (!phoneOk) errors.push(phone);

    const addrOk = address.value.trim().length >= 5;
    setError(address, addrOk ? '' : 'Улица, дом или хотя бы район');
    if (!addrOk) errors.push(address);

    const dateOk = Boolean(date.value);
    setError(date, dateOk ? '' : 'Выберите дату');
    if (!dateOk) errors.push(date);

    if (errors.length) {
      errors[0].focus({ preventScroll: false });
      if (status) status.textContent = 'Проверьте выделенные поля.';
    }
    return errors;
  };

  const goNext = () => {
    if (state.step === 2 && state.chosen.size === 0) {
      if (status) status.textContent = 'Выберите хотя бы одну услугу — или вернитесь и напишите нам.';
      return;
    }
    if (validateStep(state.step).length) return;
    if (status) status.textContent = '';

    if (state.step === 1) {
      const cls = form.querySelector('input[name="carClass"]:checked');
      if (cls) setClass(cls.value);
      setClean(1);
    }
    if (state.step === 2) setClean(2);
    if (state.step === 3) setClean(3);
    showStep(state.step + 1);
  };

  $$('[data-next]').forEach((b) => b.addEventListener('click', goNext));
  $$('[data-prev]').forEach((b) => b.addEventListener('click', () => showStep(state.step - 1)));

  form?.addEventListener('change', (e) => {
    if (e.target.name === 'carClass') setClass(e.target.value);
  });

  form?.addEventListener('input', (e) => {
    if (e.target.matches('input, select, textarea')) {
      const wrap = e.target.closest('.fld');
      if (wrap?.classList.contains('is-bad')) setError(e.target, '');
    }
  });

  /* ---------- Данные заявки ---------- */
  const utm = () => {
    try { return JSON.parse(sessionStorage.getItem('pena-utm') || '{}'); } catch (e) { return {}; }
  };

  function leadData() {
    const fd = form ? new FormData(form) : new FormData();
    const { sum, hasFrom } = estimate();
    return {
      klass: state.klass,
      klassName: (SITE.classNames && SITE.classNames[state.klass]) || state.klass,
      car: String(fd.get('car') || '').trim(),
      name: String(fd.get('name') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      address: String(fd.get('address') || '').trim(),
      date: String(fd.get('date') || ''),
      time: String(fd.get('time') || ''),
      note: String(fd.get('note') || '').trim(),
      services: Array.from(state.chosen.values()).map((s) => s.name),
      total: sum,
      totalFrom: hasFrom,
      agree: fd.get('agree') === 'on',
      company: String(fd.get('company') || ''),
      utm: utm(),
    };
  }

  function renderReview() {
    if (!review) return;
    const d = leadData();
    const rows = [
      ['Автомобиль', `${d.klassName}${d.car ? ` · ${d.car}` : ''}`],
      ['Услуги', d.services.length ? d.services.join(', ') : 'подберём по телефону'],
      ['Когда', `${d.date || '—'}${d.time ? `, ${d.time}` : ''}`],
      ['Адрес', d.address || '—'],
      ['Итого', d.services.length ? `${d.totalFrom ? 'от ' : ''}${money(d.total)}` : '—'],
    ];
    review.textContent = '';
    rows.forEach(([k, v], i) => {
      const row = document.createElement('div');
      row.className = 'review__row' + (i === rows.length - 1 ? ' review__row--sum' : '');
      const key = document.createElement('span');
      key.className = 'review__k';
      key.textContent = k;
      const val = document.createElement('span');
      val.className = 'review__v';
      val.textContent = v;
      row.append(key, val);
      review.append(row);
    });
  }

  /* ---------- Отправка ---------- */
  const leadText = (d) => [
    'Заявка на выездной детейлинг PENA DETAIL',
    '',
    `Автомобиль: ${d.klassName}${d.car ? ` · ${d.car}` : ''}`,
    d.services.length ? `Услуги: ${d.services.join(', ')}` : 'Услуги: подобрать по телефону',
    d.services.length ? `Смета: ${d.totalFrom ? 'от ' : ''}${money(d.total)}` : '',
    `Имя: ${d.name}`,
    `Телефон: ${d.phone}`,
    `Адрес: ${d.address}`,
    `Когда: ${d.date}${d.time ? `, ${d.time}` : ''}`,
    d.note ? `Комментарий: ${d.note}` : '',
  ].filter(Boolean).join('\n');

  async function sendLead(d) {
    if (d.company) return { channel: 'silent' };

    if (SITE.leadEndpoint) {
      const r = await fetch(SITE.leadEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d),
      });
      if (!r.ok) throw new Error(`endpoint ${r.status}`);
      return { channel: 'endpoint' };
    }

    if (SITE.bitrixWebhook) {
      const body = {
        fields: {
          TITLE: `Сайт: ${d.klassName}${d.car ? ` ${d.car}` : ''}`,
          NAME: d.name,
          PHONE: [{ VALUE: d.phone, VALUE_TYPE: 'WORK' }],
          ADDRESS: d.address,
          COMMENTS: [
            `Класс: ${d.klassName}`,
            d.car ? `Авто: ${d.car}` : '',
            d.services.length ? `Услуги: ${d.services.join(', ')}` : 'Услуги: подобрать',
            d.services.length ? `Смета: ${d.totalFrom ? 'от ' : ''}${money(d.total)}` : '',
            `Когда: ${d.date}${d.time ? `, ${d.time}` : ''}`,
            d.note ? `Комментарий: ${d.note}` : '',
            d.utm && Object.keys(d.utm).length ? `UTM: ${JSON.stringify(d.utm)}` : '',
          ].filter(Boolean).join('\n'),
          SOURCE_ID: 'WEB',
          UTM_SOURCE: d.utm.utm_source || '',
          UTM_MEDIUM: d.utm.utm_medium || '',
          UTM_CAMPAIGN: d.utm.utm_campaign || '',
        },
        params: { REGISTER_SONET_EVENT: 'Y' },
      };
      const r = await fetch(`${SITE.bitrixWebhook}crm.lead.add.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error_description || `bitrix ${r.status}`);
      return { channel: 'bitrix' };
    }

    return { channel: 'fallback' };
  }

  const copyButton = (text) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn--primary';
    b.textContent = 'Скопировать заявку';
    b.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(text);
        b.textContent = 'Скопировано';
      } catch (e) {
        b.textContent = 'Не удалось скопировать';
      }
    });
    return b;
  };

  const succeeded = (d) => {
    setClean(4);
    if (form) form.hidden = true;
    if (done) {
      done.hidden = false;
      const sum = $('[data-done-sum]');
      if (sum) sum.textContent = leadText(d);
      done.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    const box = $('[data-done-actions]');
    if (box) {
      box.textContent = '';
      const text = leadText(d);
      if (SITE.whatsapp) {
        const a = document.createElement('a');
        a.className = 'btn btn--primary';
        a.target = '_blank';
        a.rel = 'noopener';
        a.href = `${SITE.whatsapp}${SITE.whatsapp.includes('?') ? '&' : '?'}text=${encodeURIComponent(text)}`;
        a.textContent = 'Отправить в WhatsApp';
        box.append(a);
      }
      if (SITE.telegram) {
        const t = document.createElement('a');
        t.className = 'btn btn--ghost';
        t.target = '_blank';
        t.rel = 'noopener';
        t.href = SITE.telegram;
        t.textContent = 'Написать в Telegram';
        box.append(t);
      }
      box.append(copyButton(text));
    }

    try {
      if (window.ym && SITE.metrikaId) window.ym(SITE.metrikaId, 'reachGoal', 'lead');
    } catch (e) {}
  };

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (status) status.textContent = '';

    if (validateStep(3).length) {
      showStep(3);
      return;
    }
    const agree = form.querySelector('[name="agree"]');
    if (agree && !agree.checked) {
      agree.setAttribute('aria-invalid', 'true');
      if (status) status.textContent = 'Нужно согласие на обработку данных.';
      agree.focus();
      return;
    }

    const d = leadData();
    const submit = $('[data-submit]');
    const label = submit ? submit.innerHTML : '';
    if (submit) {
      submit.disabled = true;
      submit.textContent = 'Отправляем…';
    }

    try {
      await sendLead(d);
      succeeded(d);
    } catch (err) {
      console.error('lead', err);
      if (status) {
        status.textContent = 'Не удалось отправить автоматически. Скопируйте заявку или напишите нам — ответим сразу.';
      }
      const box = $('[data-done-actions]');
      if (box) {
        box.textContent = '';
        box.append(copyButton(leadText(d)));
      }
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.innerHTML = label;
      }
    }
  });

  $('[data-done-back]')?.addEventListener('click', () => {
    if (done) done.hidden = true;
    if (form) form.hidden = false;
    showStep(1, { silent: true });
    form.querySelector('[name="name"]')?.focus();
  });

  /* ---------- Телефон и дата ---------- */
  const phoneInput = form?.querySelector('[name="phone"]');
  phoneInput?.addEventListener('blur', () => {
    const digits = phoneInput.value.replace(/\D/g, '');
    if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) {
      const d = digits[0] === '8' ? `7${digits.slice(1)}` : digits;
      phoneInput.value = `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
    }
  });

  const dateInput = form?.querySelector('[name="date"]');
  if (dateInput) {
    const now = new Date();
    const iso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    dateInput.min = iso;
    dateInput.value = iso;
  }

  /* ---------- UTM ---------- */
  try {
    const params = new URLSearchParams(location.search);
    const found = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((k) => {
      const v = params.get(k);
      if (v) found[k] = v;
    });
    if (Object.keys(found).length) sessionStorage.setItem('pena-utm', JSON.stringify(found));
  } catch (e) {}

  /* ---------- Галерея ---------- */
  try {
    const photos = Array.isArray(SITE.photos) ? SITE.photos : [];
    const section = $('[data-works]');
    const grid = $('[data-works-grid]');
    if (section && grid && photos.length) {
      section.hidden = false;
      photos.forEach((p) => {
        const fig = document.createElement('figure');
        fig.className = 'work';
        const img = document.createElement('img');
        img.src = p.src;
        img.alt = p.title || 'Работа PENA DETAIL';
        img.loading = 'lazy';
        fig.append(img);
        if (p.title || p.car) {
          const cap = document.createElement('figcaption');
          cap.className = 'work__cap';
          cap.textContent = [p.title, p.car].filter(Boolean).join(' · ');
          fig.append(cap);
        }
        grid.append(fig);
      });
    }
  } catch (err) {
    console.error('works', err);
  }

  /* ---------- Шапка и меню ---------- */
  try {
    const hdr = $('[data-hdr]');
    const menu = $('[data-menu]');
    const toggle = $('[data-menu-toggle]');
    let isOpen = false;
    let lastFocus = null;

    const onScroll = () => hdr.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const setOpen = (open) => {
      isOpen = open;
      hdr.classList.toggle('is-open', open);
      menu.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      menu.inert = !open;
      document.documentElement.style.overflow = open ? 'hidden' : '';
      if (open) {
        lastFocus = document.activeElement;
        $('a', menu)?.focus({ preventScroll: true });
      } else if (lastFocus?.focus) {
        lastFocus.focus({ preventScroll: true });
      }
    };

    toggle.addEventListener('click', () => setOpen(!isOpen));
    $$('[data-menu-link]').forEach((a) => a.addEventListener('click', () => setOpen(false)));

    document.addEventListener('keydown', (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const items = $$('a[href], button:not([disabled])', menu).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 860 && isOpen) setOpen(false);
    });
  } catch (err) {
    console.error('menu', err);
  }

  /* ---------- Активный пункт меню ---------- */
  try {
    const links = $$('.nav a');
    const targets = links.map((a) => ({ a, el: $(a.getAttribute('href')) })).filter((x) => x.el);
    if (targets.length && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            targets.forEach(({ a, el }) => a.setAttribute('aria-current', String(el === entry.target)));
          });
        },
        { rootMargin: '-45% 0px -50% 0px' }
      );
      targets.forEach(({ el }) => io.observe(el));
    }
  } catch (err) {
    console.error('nav', err);
  }

  /* ---------- Появление при скролле ---------- */
  try {
    const items = $$('[data-reveal]');
    ['.cards', '.flow', '.checks'].forEach((sel) => {
      $$(sel).forEach((group) => {
        $$('[data-reveal]', group).forEach((el, i) => {
          el.style.setProperty('--rd', `${Math.min(i, 5) * 70}ms`);
        });
      });
    });

    if (!('IntersectionObserver' in window) || reduceMotion) {
      items.forEach((el) => el.classList.add('is-in'));
    } else {
      const io = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-in');
            obs.unobserve(entry.target);
          });
        },
        { rootMargin: '0px 0px -6% 0px', threshold: 0.08 }
      );
      items.forEach((el) => io.observe(el));
      window.setTimeout(() => {
        items.forEach((el) => {
          if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-in');
        });
      }, 2500);
    }
  } catch (err) {
    console.error('reveal', err);
    $$('[data-reveal]').forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Фильтр услуг ---------- */
  try {
    const tabs = $$('[data-filter]');
    const apply = (filter) => {
      cards.forEach((card) => {
        card.hidden = !(filter === 'all' || card.dataset.group === filter);
      });
      tabs.forEach((t) => {
        const on = t.dataset.filter === filter;
        t.classList.toggle('is-on', on);
        t.setAttribute('aria-pressed', String(on));
      });
    };
    tabs.forEach((tab) => tab.addEventListener('click', () => apply(tab.dataset.filter)));
  } catch (err) {
    console.error('filter', err);
  }

  /* ---------- Яндекс.Метрика ---------- */
  try {
    if (SITE.metrikaId) {
      const s = document.createElement('script');
      s.textContent = `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');ym(${Number(SITE.metrikaId)},'init',{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});`;
      document.head.append(s);
    }
  } catch (err) {
    console.error('metrika', err);
  }

  /* ---------- Старт ---------- */
  renderPrices();
  renderPick();
  renderEstimate();
  showStep(1, { silent: true });
})();
