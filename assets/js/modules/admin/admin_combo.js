/* Componente de seleccion con busqueda incremental.
   Sustituye a los <select> en los formularios del panel: el usuario
   escribe y ve las opciones que coinciden, con la mas parecida primero.
   Mantiene la API de un select (value, selectedOptions, onchange) para
   no tocar el codigo que lo consume. */

(function () {
    function norm(s) {
        return String(s == null ? '' : s)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    /* Puntuacion de coincidencia. Devuelve 0 si no hay ninguna.
       Orden: exacta > prefijo > palabra que empieza por el texto >
       subcadena > coincidencia difusa. Las coincidencias por debajo de
       `piso` se descartan para no llenar la lista de resultados vagos. */
    function score(text, query) {
        const t = norm(text), q = norm(query);
        if (!q) return 0;
        if (t === q) return 100;
        if (t.startsWith(q)) return 90;
        if (t.split(/[\s(),—\-./]+/).some(w => w.startsWith(q))) return 70;
        const idx = t.indexOf(q);
        if (idx >= 0) return 50 - Math.min(idx, 20);
        let qi = 0;
        for (let i = 0; i < t.length && qi < q.length; i++) {
            if (t[i] === q[qi]) qi++;
        }
        return qi === q.length ? 10 : 0;
    }

    /* Solo la coincidencia difusa (10) queda por debajo del piso cuando
       hay otras claramente mejores. */
    const FLOOR_EXCLUSIVE = 10;

    var uid = 0;

    /**
     * Convierte un <select> en un combobox de busqueda.
     * El select original queda oculto y sigue siendo la fuente de verdad.
     */
    window.upgradeSelect = function (selectEl) {
        if (!selectEl || selectEl.dataset.comboReady === '1') return;
        selectEl.dataset.comboReady = '1';
        selectEl.classList.add('combo-native');

        const id = 'combo-' + (++uid);
        const wrap = document.createElement('div');
        wrap.className = 'combo';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'combo-input';
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('role', 'combobox');
        input.setAttribute('aria-expanded', 'false');
        input.setAttribute('aria-autocomplete', 'list');
        if (selectEl.id) input.id = selectEl.id + '-combo';
        if (selectEl.placeholder) input.placeholder = selectEl.placeholder;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'combo-toggle';
        btn.tabIndex = -1;
        btn.setAttribute('aria-hidden', 'true');
        btn.innerHTML = '<i class="bi bi-chevron-down"></i>';

        const list = document.createElement('div');
        list.className = 'combo-list';
        list.id = id;
        list.setAttribute('role', 'listbox');
        list.hidden = true;
        input.setAttribute('aria-controls', id);

        wrap.appendChild(input);
        wrap.appendChild(btn);
        wrap.appendChild(list);
        selectEl.parentNode.insertBefore(wrap, selectEl.nextSibling);

        let active = -1;
        let visible = [];

        function options() {
            return Array.from(selectEl.options);
        }

        function labelOf(opt) {
            return opt ? opt.textContent.trim() : '';
        }

        function syncFromSelect() {
            const opt = selectEl.selectedOptions[0];
            const txt = labelOf(opt);
            input.value = opt && opt.value !== '' ? txt : '';
            input.placeholder = txt && opt.value === '' ? txt : (selectEl.placeholder || 'Seleccione');
            wrap.classList.toggle('is-empty', !opt || opt.value === '');
        }

        function open() {
            list.hidden = false;
            input.setAttribute('aria-expanded', 'true');
            wrap.classList.add('is-open');
            render(input.value === labelOf(selectEl.selectedOptions[0]) ? '' : input.value);
        }

        function close() {
            list.hidden = true;
            input.setAttribute('aria-expanded', 'false');
            wrap.classList.remove('is-open');
            active = -1;
            syncFromSelect();
        }

        function render(query) {
            const opts = options().filter(o => !o.disabled);
            const scoredAll = opts
                .map(o => ({ o, s: query ? score(o.textContent, query) : 1 }))
                .filter(x => x.s > 0)
                .sort((a, b) => b.s - a.s || a.o.index - b.o.index);

            /* Si hay coincidencias solidas, descartar las puramente
               difusas: evitan ruido en la lista. */
            const solid = scoredAll.filter(x => x.s > FLOOR_EXCLUSIVE);
            const scored = solid.length ? solid : scoredAll;

            const shown = query ? scored : scored.slice(0, 60);
            visible = shown.map(x => x.o);

            if (!visible.length) {
                list.innerHTML = '<div class="combo-empty">Sin coincidencias</div>';
                active = -1;
                return;
            }
            list.innerHTML = visible.map((o, i) => {
                const sel = o.selected ? ' is-selected' : '';
                const ph = o.value === '' ? ' is-placeholder' : '';
                return `<div class="combo-opt${sel}${ph}" role="option" data-i="${i}" aria-selected="${o.selected}">${o.textContent.trim()}</div>`;
            }).join('');
            active = query ? 0 : visible.findIndex(o => o.selected);
            paintActive();
        }

        function paintActive() {
            list.querySelectorAll('.combo-opt').forEach((el, i) => {
                el.classList.toggle('is-active', i === active);
            });
            const el = list.querySelector('.combo-opt.is-active');
            if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
        }

        function choose(i) {
            const opt = visible[i];
            if (!opt) return;
            selectEl.value = opt.value;
            syncFromSelect();
            close();
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        }

        input.addEventListener('focus', open);
        input.addEventListener('click', open);

        input.addEventListener('input', function () {
            if (list.hidden) open();
            render(this.value);
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                if (list.hidden) { open(); return; }
                if (!visible.length) return;
                active = e.key === 'ArrowDown'
                    ? (active + 1) % visible.length
                    : (active - 1 + visible.length) % visible.length;
                paintActive();
            } else if (e.key === 'Enter') {
                if (!list.hidden && active >= 0) {
                    e.preventDefault();
                    choose(active);
                }
            } else if (e.key === 'Escape') {
                if (!list.hidden) { e.preventDefault(); close(); }
            } else if (e.key === 'Tab') {
                close();
            }
        });

        btn.addEventListener('mousedown', function (e) {
            e.preventDefault();
            if (list.hidden) { input.focus(); open(); } else { close(); }
        });

        list.addEventListener('mousedown', function (e) {
            const el = e.target.closest('.combo-opt');
            if (!el) return;
            e.preventDefault();
            choose(Number(el.dataset.i));
        });

        document.addEventListener('mousedown', function (e) {
            if (!wrap.contains(e.target)) close();
        });

        /* Re-render when the native select is refilled or disabled. */
        const mo = new MutationObserver(function () {
            wrap.classList.toggle('is-disabled', selectEl.disabled);
            input.disabled = selectEl.disabled;
            btn.disabled = selectEl.disabled;
            syncFromSelect();
            if (!list.hidden) render(input.value);
        });
        mo.observe(selectEl, { childList: true, attributes: true, attributeFilter: ['disabled'] });

        wrap.classList.toggle('is-disabled', selectEl.disabled);
        input.disabled = selectEl.disabled;
        syncFromSelect();
        selectEl._combo = { syncFromSelect, open, close };
    };

    /** Aplica el upgrade a todos los <select> con data-combo. */
    window.upgradeCombos = function (root) {
        (root || document).querySelectorAll('select[data-combo]').forEach(window.upgradeSelect);
    };
})();
