/* DETAILING — взаимодействия. Без зависимостей, без сборки. */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const rub = new Intl.NumberFormat('ru-RU');

  const plural = (n, one, few, many) => {
    const n10 = n % 10;
    const n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
    return many;
  };

  /* ---------- Header + mobile menu ---------- */
  try {
    const hdr = $('[data-hdr]');
    const menu = $('[data-menu]');
    const toggle = $('[data-menu-toggle]');
    let isOpen = false;
    let lastFocus = null;

    const onScroll = () => {
      hdr.classList.toggle('is-scrolled', window.scrollY > 8);
    };
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
        const first = $('a', menu);
        if (first) first.focus({ preventScroll: true });
      } else if (lastFocus && lastFocus.focus) {
        lastFocus.focus({ preventScroll: true });
      }
    };

    toggle.addEventListener('click', () => setOpen(!isOpen));

    $$('[data-menu-link]').forEach((a) => {
      a.addEventListener('click', () => setOpen(false));
    });

    document.addEventListener('keydown', (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;

      const items = $$('a[href], button:not([disabled])', menu).filter(
        (el) => el.offsetParent !== null
      );
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

  /* ---------- Active nav link ---------- */
  try {
    const links = $$('.nav a');
    const targets = links
      .map((a) => ({ a, el: $(a.getAttribute('href')) }))
      .filter((x) => x.el);

    if (targets.length && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            targets.forEach(({ a, el }) => {
              a.setAttribute('aria-current', el === entry.target ? 'true' : 'false');
            });
          });
        },
        { rootMargin: '-45% 0px -50% 0px' }
      );
      targets.forEach(({ el }) => io.observe(el));
    }
  } catch (err) {
    console.error('nav', err);
  }

  /* ---------- Scroll reveal ---------- */
  try {
    const groups = ['.cards', '.flow', '.checks', '.grid', '.faq__list'];
    const items = $$('[data-reveal]');

    groups.forEach((sel) => {
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

      // Страховка: если что-то пошло не так — контент не должен остаться скрытым.
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

  /* ---------- Price filter ---------- */
  try {
    const tabs = $$('[data-filter]');
    const cards = $$('[data-item]');

    const apply = (filter) => {
      cards.forEach((card) => {
        const match = filter === 'all' || card.dataset.group === filter;
        card.hidden = !match;
      });
      tabs.forEach((t) => {
        const on = t.dataset.filter === filter;
        t.classList.toggle('is-on', on);
        t.setAttribute('aria-pressed', String(on));
      });
    };

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => apply(tab.dataset.filter));
    });
  } catch (err) {
    console.error('filter', err);
  }

  /* ---------- Estimate ---------- */
  const chosen = new Map();

  try {
    const est = $('[data-est]');
    const totalEl = $('[data-est-total]');
    const countEl = $('[data-est-count]');
    const clearBtn = $('[data-est-clear]');
    const boxes = $$('.svc__in');
    const chipsBox = $('[data-chosen]');
    const chipsEmpty = $('[data-chosen-empty]');

    const units = new Set(['headlight', 'taillight']);

    const render = () => {
      let sum = 0;
      let hasFrom = false;
      chosen.forEach((item) => {
        sum += item.price;
        if (item.from) hasFrom = true;
      });

      const n = chosen.size;
      const total = `${hasFrom && n ? 'от ' : ''}${rub.format(sum)} ₽`;

      if (totalEl) totalEl.textContent = n ? total : '0 ₽';
      if (countEl) {
        countEl.textContent = n
          ? `${n} ${plural(n, 'услуга', 'услуги', 'услуг')}`
          : '';
      }

      est.classList.toggle('is-on', n > 0);
      est.inert = n === 0;

      if (chipsBox) {
        $$('.chip', chipsBox).forEach((c) => c.remove());
        chosen.forEach((item, id) => {
          const chip = document.createElement('span');
          chip.className = 'chip';
          const label = document.createElement('span');
          label.textContent = item.name;
          const x = document.createElement('button');
          x.type = 'button';
          x.className = 'chip__x';
          x.setAttribute('aria-label', `Убрать «${item.name}»`);
          x.innerHTML = '<svg class="i" aria-hidden="true"><use href="#i-close"/></svg>';
          x.addEventListener('click', () => {
            const box = boxes.find((b) => b.value === id);
            if (box) {
              box.checked = false;
              box.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });
          chip.append(label, x);
          chipsBox.append(chip);
        });
        if (chipsEmpty) chipsEmpty.hidden = n > 0;
      }
    };

    boxes.forEach((box) => {
      const card = box.closest('[data-item]');
      box.addEventListener('change', () => {
        const id = box.value;
        card.classList.toggle('is-on', box.checked);
        if (box.checked) {
          chosen.set(id, {
            name: card.dataset.name,
            price: Number(card.dataset.price),
            from: card.dataset.from === '1',
            unit: units.has(id),
          });
        } else {
          chosen.delete(id);
        }
        render();
      });
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        boxes.forEach((b) => {
          if (!b.checked) return;
          b.checked = false;
          b.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    }

    $$('[data-pick]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const box = boxes.find((b) => b.value === btn.dataset.pick);
        if (box && !box.checked) {
          box.checked = true;
          box.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    });

    render();
  } catch (err) {
    console.error('estimate', err);
  }

  /* ---------- Booking form ---------- */
  try {
    const form = $('[data-form]');
    const done = $('[data-done]');
    const status = $('[data-status]');
    const sumOut = $('[data-done-sum]');
    const waLink = $('[data-wa]');
    const tgLink = $('[data-tg]');
    const back = $('[data-done-back]');
    const dateInput = $('input[name="date"]');

    if (dateInput) {
      const now = new Date();
      const iso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
      dateInput.min = iso;
      dateInput.value = iso;
    }

    const setError = (field, message) => {
      const wrap = field.closest('.fld');
      const slot = $('[data-err]', wrap);
      wrap.classList.toggle('is-bad', Boolean(message));
      field.setAttribute('aria-invalid', message ? 'true' : 'false');
      if (slot) slot.textContent = message || '';
    };

    const phoneInput = $('input[name="phone"]');
    if (phoneInput) {
      phoneInput.addEventListener('blur', () => {
        const digits = phoneInput.value.replace(/\D/g, '');
        if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) {
          const d = digits[0] === '8' ? `7${digits.slice(1)}` : digits;
          phoneInput.value = `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
        }
      });
    }

    const validate = () => {
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

      return errors;
    };

    if (form) {
      form.addEventListener('input', (e) => {
        const field = e.target;
        if (field.matches('input, select, textarea') && field.closest('.fld')?.classList.contains('is-bad')) {
          setError(field, '');
        }
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (status) status.textContent = '';

        const errors = validate();
        if (errors.length) {
          errors[0].focus({ preventScroll: false });
          if (status) status.textContent = 'Проверьте выделенные поля — без них не сможем приехать.';
          return;
        }

        const data = new FormData(form);
        const services = Array.from(chosen.values());
        const sum = services.reduce((acc, s) => acc + s.price, 0);
        const hasFrom = services.some((s) => s.from);

        const lines = [
          'Заявка на выездной детейлинг',
          '',
          `Имя: ${String(data.get('name')).trim()}`,
          `Телефон: ${String(data.get('phone')).trim()}`,
          data.get('car') ? `Автомобиль: ${String(data.get('car')).trim()}` : '',
          `Адрес: ${String(data.get('address')).trim()}`,
          `Когда: ${data.get('date')}${data.get('time') ? `, ${data.get('time')}` : ''}`,
          services.length
            ? `Услуги: ${services.map((s) => s.name).join(', ')}`
            : 'Услуги: подобрать по телефону',
          services.length
            ? `Предварительно: ${hasFrom ? 'от ' : ''}${rub.format(sum)} ₽`
            : '',
          data.get('note') ? `Комментарий: ${String(data.get('note')).trim()}` : '',
        ].filter((l) => l !== '');

        const text = lines.join('\n');

        if (sumOut) sumOut.textContent = text;
        if (waLink) waLink.href = `https://wa.me/79991234567?text=${encodeURIComponent(text)}`;
        if (tgLink) tgLink.href = 'https://t.me/detailing_msk';

        form.hidden = true;
        if (done) {
          done.hidden = false;
          done.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
        }
      });
    }

    if (back) {
      back.addEventListener('click', () => {
        if (done) done.hidden = true;
        if (form) {
          form.hidden = false;
          $('input[name="name"]', form)?.focus();
        }
      });
    }
  } catch (err) {
    console.error('form', err);
  }

  /* ---------- Year ---------- */
  try {
    const y = $('[data-year]');
    if (y) y.textContent = String(new Date().getFullYear());
  } catch (err) {
    /* noop */
  }
})();
