/* =========================================================
   navigation_render.js — renderizado de la navegación lateral
   Requiere: buildModulos(user), renderModulo(id, user), $()
   ======================================================== */

function renderNavigation(user) {
    const nav = $('app-nav');
    nav.innerHTML = '';

    const modulos = buildModulos(user);
    modulos.forEach((m, i) => {
        const li  = document.createElement('li');
        const btn = document.createElement('button');

        btn.className      = `app-nav-btn${i === 0 ? ' active' : ''}`;
        btn.dataset.modulo = m.id;
        btn.innerHTML      = `<i class="bi ${m.icon}"></i><span>${m.label}</span>`;

        btn.addEventListener('click', function () {
            document.querySelectorAll('.app-nav-btn[data-modulo]')
                .forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderModulo(m.id, user);
        });

        li.appendChild(btn);
        nav.appendChild(li);
    });

    renderModulo(modulos[0].id, user);
}

/* Puente temporal: activa la implementación extraída sin modificar todavía
   el bloque equivalente dentro del legacy. Se eliminará al retirar ese bloque. */
(function installNavigationRenderer() {
    const legacyLoadDashboard = window.loadDashboard;
    if (typeof legacyLoadDashboard !== 'function') return;

    window.loadDashboard = function (user) {
        legacyLoadDashboard(user);
        renderNavigation(user);
    };
})();
