/* Firma digital DatB — persistencia real en Supabase. */
let _firmaUser = null;

function initFirmaCanvas(user) {
    _firmaUser = user;
    const canvas = $('firma-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    let drawing = false;
    let hasMark = false;

    if (!window._store.firmas) window._store.firmas = {};
    const storedUser = (window._store.usuarios || []).find(u => u.id === user.id);
    const saved = window._store.firmas[`sr_firma_${user.id}`] || user.firma_perfil || storedUser?.firma_perfil || null;

    const showSaved = data => {
        if (!data) return;
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = data;
        $('canvas-placeholder')?.classList.add('d-none');
        const savedWrap = $('firma-saved-wrap');
        const savedImg = $('firma-saved-img');
        savedImg && (savedImg.src = data);
        savedWrap?.classList.remove('d-none');
        hasMark = true;
    };

    if (saved) {
        window._store.firmas[`sr_firma_${user.id}`] = saved;
        showSaved(saved);
    }

    function point(e) {
        const rect = canvas.getBoundingClientRect();
        const src = e.touches?.[0] || e;
        return {
            x: (src.clientX - rect.left) * (canvas.width / rect.width),
            y: (src.clientY - rect.top) * (canvas.height / rect.height)
        };
    }

    function start(e) {
        e.preventDefault();
        drawing = true;
        hasMark = true;
        $('canvas-placeholder')?.classList.add('d-none');
        const p = point(e);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
    }

    function move(e) {
        if (!drawing) return;
        e.preventDefault();
        ctx.lineWidth = Number($('firma-grosor')?.value || 2.5);
        ctx.strokeStyle = $('firma-color')?.value || '#0b1e3d';
        const p = point(e);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
    }

    const end = () => { drawing = false; };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end, { passive: true });

    $('btn-firma-clear').onclick = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        $('canvas-placeholder')?.classList.remove('d-none');
        $('firma-saved-wrap')?.classList.add('d-none');
        _perfilSetFirmaError('');
        hasMark = false;
    };

    $('btn-firma-save').onclick = async () => {
        const btn = $('btn-firma-save');
        _perfilSetFirmaError('');

        if (!hasMark) {
            _perfilSetFirmaError('Trace la firma antes de guardarla.');
            return;
        }

        const data = canvas.toDataURL('image/png');
        btn.disabled = true;

        try {
            if (typeof sbUpdateRow !== 'function') throw new Error('Sin conexión con Supabase.');
            const savedRow = await sbUpdateRow('usuarios', user.id, { firma_perfil: data });

            window._store.firmas[`sr_firma_${user.id}`] = data;
            user.firma_perfil = data;
            const idx = (window._store.usuarios || []).findIndex(u => u.id === user.id);
            if (idx !== -1) window._store.usuarios[idx] = { ...window._store.usuarios[idx], ...savedRow, firma_perfil: data };

            $('canvas-placeholder')?.classList.add('d-none');
            $('firma-saved-img') && ($('firma-saved-img').src = data);
            $('firma-saved-wrap')?.classList.remove('d-none');
            window.dispatchEvent(new CustomEvent('datb:user-updated', { detail: { user: { ...user, ...savedRow, firma_perfil: data } } }));
            showToastApp('Firma guardada correctamente.', 'success');
        } catch (e) {
            console.error('firma save:', e);
            _perfilSetFirmaError(e.message || 'No se pudo guardar la firma.');
        } finally {
            btn.disabled = false;
        }
    };

    $('btn-firma-delete').onclick = async () => {
        const btn = $('btn-firma-delete');
        _perfilSetFirmaError('');
        btn.disabled = true;
        try {
            if (typeof sbUpdateRow !== 'function') throw new Error('Sin conexión con Supabase.');
            const savedRow = await sbUpdateRow('usuarios', user.id, { firma_perfil: null });

            delete window._store.firmas[`sr_firma_${user.id}`];
            user.firma_perfil = null;
            const idx = (window._store.usuarios || []).findIndex(u => u.id === user.id);
            if (idx !== -1) window._store.usuarios[idx] = { ...window._store.usuarios[idx], ...savedRow, firma_perfil: null };

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            $('canvas-placeholder')?.classList.remove('d-none');
            $('firma-saved-wrap')?.classList.add('d-none');
            hasMark = false;
            window.dispatchEvent(new CustomEvent('datb:user-updated', { detail: { user: { ...user, ...savedRow, firma_perfil: null } } }));
            showToastApp('Firma eliminada correctamente.', 'success');
        } catch (e) {
            console.error('firma delete:', e);
            _perfilSetFirmaError(e.message || 'No se pudo eliminar la firma.');
        } finally {
            btn.disabled = false;
        }
    };
}

function _perfilSetFirmaError(msg) {
    const el = $('firma-err');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('d-none', !msg);
}
