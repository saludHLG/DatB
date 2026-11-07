/* Pestanas de la seccion Variables (catalogos).
   Sigue el mismo patron que Localizacion, con atributo y paneles propios
   para no interferir con .loc-subtab / .loc-panel de la otra pestana. */
(function () {
    const PANELES = { grupos: 'gv', muestras: 'tm', microorganismos: 'micro' };

    function activar(nombre) {
        document.querySelectorAll('#cat-subtabs [data-cat]').forEach(b => {
            b.classList.toggle('active', b.dataset.cat === nombre);
        });
        document.querySelectorAll('#tab-catalogos .cat-panel').forEach(p => {
            p.classList.add('d-none');
        });
        const panel = document.getElementById('cat-' + nombre);
        if (panel) panel.classList.remove('d-none');

        /* Redibujar el catalogo visible, igual que hace Localizacion. */
        const tipo = PANELES[nombre];
        if (tipo === 'gv' && typeof renderCatGV === 'function') renderCatGV();
        if (tipo === 'tm' && typeof renderCatTM === 'function') renderCatTM();
        if (tipo === 'micro' && typeof renderCatMicro === 'function') renderCatMicro();
        actualizarContadores();
    }

    function actualizarContadores() {
        const pares = [
            ['count-grupos', '#gv-admin-list .cat-item'],
            ['count-muestras', '#tm-admin-list .cat-item'],
            ['count-micro', '#micro-admin-list .cat-item'],
        ];
        for (const [id, sel] of pares) {
            const el = document.getElementById(id);
            if (!el) continue;
            const n = document.querySelectorAll(sel).length;
            el.textContent = n ? `${n} elemento(s)` : '';
        }
    }

    window.renderCatPanel = activar;

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('#cat-subtabs [data-cat]').forEach(btn => {
            btn.addEventListener('click', () => activar(btn.dataset.cat));
        });
    });
})();
