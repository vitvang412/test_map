// ═══════════════════════════════════════════════════════════
// MAP-REPORT.JS — Form báo cáo sự cố từ người dùng
// - Nút FAB ở góc dưới-phải bản đồ
// - Popup form: chọn loại, tiêu đề, mô tả, thời gian, vị trí, ảnh
// - Ghim vị trí bằng cách click lên bản đồ (hoặc dùng Place đang chọn)
// ═══════════════════════════════════════════════════════════

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        const wait = setInterval(() => {
            if (window.MapInstance) {
                clearInterval(wait);
                initReportModule(window.MapInstance);
            }
        }, 80);
    });

    function initReportModule(map) {
        // ── FAB ──
        const fab = document.createElement('button');
        fab.className = 'rp-fab';
        fab.type = 'button';
        fab.title = 'Báo cáo sự cố mới';
        fab.innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Báo cáo sự cố</span>
        `;
        fab.addEventListener('click', openForm);
        document.body.appendChild(fab);

        // ── Modal form container ──
        const modal = document.createElement('div');
        modal.className = 'rp-modal';
        modal.innerHTML = `
            <div class="rp-modal__backdrop"></div>
            <div class="rp-modal__dialog" role="dialog" aria-modal="true">
                <header class="rp-modal__head">
                    <div>
                        <div class="rp-modal__title">Báo cáo sự cố an ninh</div>
                        <div class="rp-modal__sub">Thông tin bạn cung cấp giúp cộng đồng cảnh giác tại Đà Nẵng — Quảng Nam.</div>
                    </div>
                    <button class="rp-close" aria-label="Đóng" type="button">
                        <svg viewBox="0 0 24 24" width="18" height="18"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
                    </button>
                </header>

                <form class="rp-form" autocomplete="off">

                    <div class="rp-field">
                        <label class="rp-label">Loại sự cố <span>*</span></label>
                        <div class="rp-type-grid" id="rpTypeGrid"></div>
                    </div>

                    <div class="rp-field">
                        <label class="rp-label" for="rpTitle">Tiêu đề <span>*</span></label>
                        <input id="rpTitle" name="title" class="rp-input" type="text" maxlength="200" required placeholder="Tóm tắt ngắn (VD: Mất xe máy trước Lotte)"/>
                    </div>

                    <div class="rp-field">
                        <label class="rp-label" for="rpDesc">Mô tả chi tiết <span>*</span> <em class="rp-hint">≥ 20 ký tự</em></label>
                        <textarea id="rpDesc" name="description" class="rp-input rp-input--area" rows="4" minlength="20" required placeholder="Mô tả diễn biến, đặc điểm nhận dạng, dấu vết, tình trạng..."></textarea>
                    </div>

                    <div class="rp-row">
                        <div class="rp-field">
                            <label class="rp-label" for="rpTime">Thời điểm sự việc <span>*</span></label>
                            <input id="rpTime" name="incidentTime" class="rp-input" type="datetime-local" required/>
                        </div>
                        <div class="rp-field">
                            <label class="rp-label" for="rpMedia">Ảnh / video (tuỳ chọn)</label>
                            <input id="rpMedia" name="media" type="file" accept="image/*,video/*" multiple class="rp-input"/>
                        </div>
                    </div>

                    <div class="rp-field">
                        <label class="rp-label">Vị trí trên bản đồ <span>*</span></label>
                        <div class="rp-loc">
                            <button type="button" class="rp-loc__btn" id="rpPickLoc">
                                <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                <span id="rpLocLabel">Bấm để ghim vị trí trên bản đồ</span>
                            </button>
                            <button type="button" class="rp-loc__mini" id="rpUseMyLoc" title="Dùng vị trí hiện tại">
                                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/></svg>
                            </button>
                        </div>
                        <div class="rp-loc__addr" id="rpAddr" style="display:none"></div>
                    </div>

                    <label class="rp-check">
                        <input type="checkbox" id="rpConfirm"/>
                        <span>Tôi xác nhận thông tin cung cấp là chính xác. Hiểu rằng báo cáo sai sự thật sẽ bị trừ điểm uy tín.</span>
                    </label>

                    <div class="rp-error" id="rpError" style="display:none"></div>
                    <div class="rp-actions">
                        <button type="button" class="rp-btn rp-btn--ghost rp-cancel">Huỷ</button>
                        <button type="submit" class="rp-btn rp-btn--primary">Gửi báo cáo</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        const $ = (sel) => modal.querySelector(sel);
        $('.rp-close').addEventListener('click', closeForm);
        $('.rp-cancel').addEventListener('click', closeForm);
        $('.rp-modal__backdrop').addEventListener('click', closeForm);

        // ── State ──
        let pickedLat = null, pickedLng = null, pickedAddress = '';
        let pickMarker = null;
        let pickingMode = false;
        let alertTypes = [];
        let selectedTypeId = null;

        async function openForm() {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Vui lòng đăng nhập để gửi báo cáo');
                window.location.href = '/Auth/Login';
                return;
            }
            modal.classList.add('is-open');
            document.body.classList.add('rp-open');
            if (!alertTypes.length) await loadTypes();
            if (!$('#rpTime').value) {
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                $('#rpTime').value = now.toISOString().slice(0, 16);
            }
            // Nếu đã chọn 1 địa điểm (selectedPlace) qua thanh tìm kiếm → pre-fill
            if (window.SelectedPlace && !pickedLat) {
                pickedLat = window.SelectedPlace.lat;
                pickedLng = window.SelectedPlace.lng;
                pickedAddress = window.SelectedPlace.addr || window.SelectedPlace.name || '';
                updateLocLabel();
            }
        }
        function closeForm() {
            modal.classList.remove('is-open');
            document.body.classList.remove('rp-open');
            if (pickingMode) stopPicking();
        }

        async function loadTypes() {
            try {
                const res = await fetch('/api/alerts/types');
                if (!res.ok) return;
                alertTypes = await res.json();
                renderTypes();
            } catch (_) {}
        }

        function renderTypes() {
            const host = $('#rpTypeGrid');
            const STYLE = window.__TYPE_STYLE_MAP || typeStyleFallback();
            host.innerHTML = alertTypes.map(t => {
                const s = STYLE[t.slug] || { color: t.categoryColor || '#64748B' };
                return `
                    <button type="button" class="rp-type" data-id="${t.id}" style="--tint:${s.color}">
                        <span class="rp-type__dot" style="background:${s.color}"></span>
                        <span class="rp-type__name">${escHtml(t.name)}</span>
                        <span class="rp-type__cat">${escHtml(t.categoryName || '')}</span>
                    </button>
                `;
            }).join('');
            host.querySelectorAll('.rp-type').forEach(btn => {
                btn.addEventListener('click', () => {
                    selectedTypeId = parseInt(btn.dataset.id);
                    host.querySelectorAll('.rp-type').forEach(b => b.classList.toggle('is-active', b === btn));
                });
            });
        }

        // ── Picking location ──
        $('#rpPickLoc').addEventListener('click', startPicking);
        $('#rpUseMyLoc').addEventListener('click', () => {
            if (!navigator.geolocation) return;
            navigator.geolocation.getCurrentPosition(async (pos) => {
                pickedLat = pos.coords.latitude;
                pickedLng = pos.coords.longitude;
                pickedAddress = await reverseGeocode(pickedLat, pickedLng);
                updateLocLabel();
                map.flyTo({ center: [pickedLng, pickedLat], zoom: 16 });
                drawPickMarker();
            }, () => alert('Không lấy được vị trí hiện tại'));
        });

        function startPicking() {
            pickingMode = true;
            modal.classList.add('is-picking');
            $('#rpLocLabel').textContent = 'Hãy click lên bản đồ để ghim vị trí...';
            map.getCanvas().style.cursor = 'crosshair';
            map.once('click', onMapClickPick);
        }
        function stopPicking() {
            pickingMode = false;
            modal.classList.remove('is-picking');
            map.getCanvas().style.cursor = '';
            map.off('click', onMapClickPick);
        }
        async function onMapClickPick(e) {
            pickedLat = e.lngLat.lat;
            pickedLng = e.lngLat.lng;
            stopPicking();
            drawPickMarker();
            pickedAddress = await reverseGeocode(pickedLat, pickedLng);
            updateLocLabel();
        }

        function drawPickMarker() {
            if (pickMarker) pickMarker.remove();
            const el = document.createElement('div');
            el.className = 'rp-pick-marker';
            el.innerHTML = `
                <svg viewBox="0 0 32 39" width="36" height="44">
                    <path d="M16 1C8.3 1 2 7.2 2 14.9c0 3.8 1.7 7 3.7 9.6l9 12.3c.7.9 2 .9 2.7 0l9-12.3c2-2.6 3.7-5.8 3.7-9.6C30 7.2 23.7 1 16 1Z" fill="#10B981" stroke="#065F46" stroke-width="1.6"/>
                    <circle cx="16" cy="15" r="5" fill="#fff"/>
                </svg>`;
            pickMarker = new goongjs.Marker({ element: el, anchor: 'bottom' })
                .setLngLat([pickedLng, pickedLat])
                .addTo(map);
        }

        async function reverseGeocode(lat, lng) {
            const key = window.APP_CONFIG?.goongRestApiKey;
            if (!key) return '';
            try {
                const res = await fetch(`https://rsapi.goong.io/Geocode?latlng=${lat},${lng}&api_key=${key}`);
                const data = await res.json();
                return data.results?.[0]?.formatted_address || '';
            } catch (_) { return ''; }
        }

        function updateLocLabel() {
            if (pickedLat && pickedLng) {
                $('#rpLocLabel').innerHTML = `Đã ghim <b>${pickedLat.toFixed(5)}, ${pickedLng.toFixed(5)}</b>`;
                if (pickedAddress) {
                    const addrEl = $('#rpAddr');
                    addrEl.style.display = 'block';
                    addrEl.textContent = pickedAddress;
                }
            }
        }

        // ── Submit ──
        modal.querySelector('.rp-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const errBox = $('#rpError');
            errBox.style.display = 'none';
            errBox.textContent = '';

            if (!selectedTypeId) return showErr('Vui lòng chọn loại sự cố');
            const title = $('#rpTitle').value.trim();
            if (!title) return showErr('Nhập tiêu đề');
            const desc  = $('#rpDesc').value.trim();
            if (desc.length < 20) return showErr('Mô tả cần ít nhất 20 ký tự');
            const time = $('#rpTime').value;
            if (!time) return showErr('Chọn thời điểm sự việc');
            if (pickedLat == null || pickedLng == null) return showErr('Chưa ghim vị trí trên bản đồ');

            const fd = new FormData();
            fd.append('AlertTypeId',   selectedTypeId);
            fd.append('Title',         title);
            fd.append('Description',   desc);
            fd.append('IncidentTime',  new Date(time).toISOString());
            fd.append('Latitude',      pickedLat);
            fd.append('Longitude',     pickedLng);
            fd.append('AddressText',   pickedAddress || '');
            fd.append('UserConfirmed', $('#rpConfirm').checked);

            const files = $('#rpMedia').files;
            for (const f of files) fd.append('media', f, f.name);

            const token = localStorage.getItem('token');
            const submitBtn = modal.querySelector('.rp-btn--primary');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Đang gửi...';
            try {
                const res = await fetch('/api/alerts', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: fd
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || data.success === false) {
                    showErr(data.message || 'Gửi báo cáo thất bại');
                    return;
                }
                if (window.alertToast) window.alertToast(data.message || 'Báo cáo đã được ghi nhận', 'success');
                closeForm();
                resetForm();
                if (window.reloadAlertMap) window.reloadAlertMap();
            } catch (_) {
                showErr('Lỗi mạng, vui lòng thử lại');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Gửi báo cáo';
            }
        });

        function showErr(msg) {
            const errBox = $('#rpError');
            errBox.textContent = msg;
            errBox.style.display = 'block';
        }

        function resetForm() {
            modal.querySelector('.rp-form').reset();
            selectedTypeId = null;
            pickedLat = pickedLng = null;
            pickedAddress = '';
            if (pickMarker) { pickMarker.remove(); pickMarker = null; }
            $('#rpLocLabel').textContent = 'Bấm để ghim vị trí trên bản đồ';
            $('#rpAddr').style.display = 'none';
            modal.querySelectorAll('.rp-type').forEach(b => b.classList.remove('is-active'));
        }

        function escHtml(s) {
            if (!s) return '';
            const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
        }

        // Màu mặc định theo slug để match với map-data.js (nếu không có global)
        function typeStyleFallback() {
            return {
                theft_motorbike:    { color: '#DC2626' },
                pickpocket_robbery: { color: '#B91C1C' },
                burglary:           { color: '#991B1B' },
                street_racing:      { color: '#EA580C' },
                fighting_disorder:  { color: '#F59E0B' },
                scam_tourist:       { color: '#D97706' },
                overcharging:       { color: '#B45309' }
            };
        }
    }
})();
