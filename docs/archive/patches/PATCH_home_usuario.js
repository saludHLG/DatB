
function _hu_chartAMR(d) {
    const c = document.getElementById('hu-c-amr'); if (!c) return;
    const markers = Object.entries(d.amr.markers)
        .filter(([, v]) => v.detected + v.not_detected + v.indeterminate > 0);
    const labels = markers.map(([k, v]) => `${k}${v.source === 'Ultra' ? ' ★' : ''}`);

    const h = Math.max(220, markers.length * 52);
    c.style.height    = h + 'px';
    c.style.maxHeight = 'none';          // cancela el inline style del template

    _hl_charts['hu-amr'] = new Chart(c, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Resistencia detectada', data: markers.map(([, v]) => v.detected),      backgroundColor: 'rgba(224,67,90,.85)', borderRadius: 3 },
                { label: 'Indeterminado',          data: markers.map(([, v]) => v.indeterminate), backgroundColor: 'rgba(240,165,0,.80)', borderRadius: 3 },
                { label: 'No detectada',           data: markers.map(([, v]) => v.not_detected),  backgroundColor: 'rgba(0,184,122,.80)', borderRadius: 3 },
            ]
        },
        options: {
            indexAxis          : 'y',
            responsive         : true,
            maintainAspectRatio: false,   // permite controlar la altura manualmente
            scales: {
                x: {
                    stacked: true,
                    ticks  : { precision: 0, color: '#64748b' },
                    grid   : { color: 'rgba(0,0,0,.05)' },
                },
                y: {
                    stacked: true,
                    ticks  : { font: { size: 11 }, color: '#334155' },
                    grid   : { display: false },
                    /* Reservar anchura mínima para las etiquetas de fármaco */
                    afterFit(scale) {
                        scale.width = Math.max(scale.width, 128);
                    },
                },
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels  : { font: { size: 11 }, padding: 8, boxWidth: 12, color: '#334155' },
                },
                tooltip: {
                    callbacks: {
                        title: ctx => {
                            const lbl = ctx[0].label.replace(' ★', '');
                            const src = d.amr.markers[lbl]?.source;
                            return `${lbl}${src ? ' (' + src + ')' : ''}`;
                        },
                    },
                },
            },
        },
    });
}
