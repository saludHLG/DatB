/* app digital signature module */
let _firmaUser = null;

function initFirmaCanvas(user) {
    _firmaUser = user;
    const canvas = $('firma-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    let drawing = false, hasMark = false;

    if (!window._store.firmas) window._store.firmas = {};
    const saved = window._store.firmas[`sr_firma_${user.id}`];

    if (saved) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = saved;
        $('canvas-placeholder').classList.add('d-none');
        $('firma-saved-img').src = saved;
        $('firma-saved-wrap').classList.remove('d-none');
        hasMark = true;
    }

    function pos(e) {
        const r = canvas.getBoundingClientRect();
        const sx = canvas.width / r.width, sy = canvas.height / r.height;
        const src = e.touches ? e.touches[0] : e;
        return { x: (src.clientX - r.left) * sx, y: (src.clientY - r.top) * sy };
    }
    function onStart(e) {
        e.preventDefault(); drawing = true;
        if (!hasMark) { hasMark = true; $('canvas-placeholder').classList.add('d-none'); }
        const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y);
    }
    function onMove(e) {
        if (!drawing) return; e.preventDefault();
        ctx.lineWidth = Number($('firma-grosor').value);
        ctx.strokeStyle = $('firma-color').value;
        const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
    }
    function onEnd() { drawing = false; }

    canvas.addEventListener('mousedown', onStart);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onEnd);
    canvas.addEventListener('mouseleave', onEnd);
    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd);

    $('btn-firma-clear').onclick = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        $('canvas-placeholder').classList.remove('d-none');
        hasMark = false;
    };
    $('btn-firma-save').onclick = () => {
        if (!hasMark) return;
        const data = canvas.toDataURL('image/png');
        window._store.firmas[`sr_firma_${user.id}`] = data;
        const idx = (window._store.usuarios || []).findIndex(u => u.id === user.id);
        if (idx !== -1) window._store.usuarios[idx].firma_perfil = data;
        if (typeof sbUpdateRow === 'function')
            sbUpdateRow('usuarios', user.id, { firma_perfil: data }).catch(e => console.error('firma save:', e));
        $('firma-saved-img').src = data;
        $('firma-saved-wrap').classList.remove('d-none');
        showToastApp('Firma guardada.', 'success');
    };
    $('btn-firma-delete').onclick = () => {
        delete window._store.firmas[`sr_firma_${user.id}`];
        const idx = (window._store.usuarios || []).findIndex(u => u.id === user.id);
        if (idx !== -1) window._store.usuarios[idx].firma_perfil = null;
        if (typeof sbUpdateRow === 'function')
            sbUpdateRow('usuarios', user.id, { firma_perfil: null }).catch(e => console.error('firma delete:', e));
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        $('canvas-placeholder').classList.remove('d-none');
        $('firma-saved-wrap').classList.add('d-none');
        hasMark = false;
        showToastApp('Firma eliminada.', 'info');
    };
}
