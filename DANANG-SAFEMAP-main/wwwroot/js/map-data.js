// ═══════════════════════════════════════════════════════════
// MAP-DATA.JS — Hiển thị cảnh báo an ninh trên bản đồ
// - Cluster (gom nhóm khi zoom nhỏ)
// - Heatmap (mật độ vụ việc)
// - Marker cá nhân hoá theo từng loại sự cố (7 icon khác nhau)
// - Popup xác nhận / phủ nhận cộng đồng + điểm uy tín
// ═══════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ── Cấu hình icon + màu cho từng loại sự cố (slug) ──
    // Mỗi loại có:  color (màu pin),  ring (màu viền đậm),  svg (ký hiệu trong pin)
    const TYPE_STYLE = {
        theft_motorbike: {
            label: 'Trộm xe máy',
            color: '#DC2626',
            ring: '#7F1D1D',
            svg: '<path d="M17 17h1.5a2.5 2.5 0 0 0 0-5H17m0 5h-4m4 0v-3m-4 3H8a3 3 0 1 1 0-6h2.5l3-4H17l1.5 2.5M7 19a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm10 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
        },
        pickpocket_robbery: {
            label: 'Móc túi / Cướp giật',
            color: '#B91C1C',
            ring: '#7F1D1D',
            svg: '<path d="M6 10V8a3 3 0 1 1 6 0v2M4 10h10v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8Zm12 3 4 2-4 2" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
        },
        burglary: {
            label: 'Trộm đột nhập',
            color: '#991B1B',
            ring: '#450A0A',
            svg: '<path d="M4 11 12 5l8 6v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-8Zm11 2h-1.5m-3 0H9" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
        },
        street_racing: {
            label: 'Đua xe / Nẹt pô',
            color: '#EA580C',
            ring: '#7C2D12',
            svg: '<path d="M3 14h2l2-5h7l3 3h3v4h-3a2 2 0 1 1-4 0H9a2 2 0 1 1-4 0H3v-2Zm13-5v-2" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
        },
        fighting_disorder: {
            label: 'Ẩu đả / Gây rối',
            color: '#F59E0B',
            ring: '#92400E',
            svg: '<path d="M7 11V7a2 2 0 1 1 4 0v3m0 0V5.5a1.5 1.5 0 0 1 3 0V11m0-2v-2a1.5 1.5 0 0 1 3 0V13m-10 0H5a2 2 0 0 0-2 2l4 4h5a4 4 0 0 0 4-4v-4" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
        },
        scam_tourist: {
            label: 'Lừa đảo / Chèo kéo',
            color: '#D97706',
            ring: '#78350F',
            svg: '<path d="M12 4.5 2.5 20h19L12 4.5Zm0 5v5m0 2.5v.5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
        },
        overcharging: {
            label: 'Chặt chém giá',
            color: '#B45309',
            ring: '#78350F',
            svg: '<path d="M12 4v2m0 12v2M8 9.5C8 8.1 9.3 7 12 7s4 1.1 4 2.5S14.5 12 12 12s-4 1.1-4 2.5S9.3 17 12 17s4-1.1 4-2.5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
        }
    };
    const FALLBACK_STYLE = {
        label: 'Sự cố',
        color: '#64748B',
        ring: '#334155',
        svg: '<circle cx="12" cy="12" r="4" fill="#fff"/>'
    };

    function getStyle(slug) { return TYPE_STYLE[slug] || FALLBACK_STYLE; }

    // ── Marker SVG (pin shape + icon bên trong) ──
    function buildMarkerSvg(slug, { verified = false, size = 38 } = {}) {
        const s = getStyle(slug);
        // Nhiều marker cùng vị trí có thể xếp chồng → dùng drop-shadow nhẹ
        return `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size * 1.22}" viewBox="0 0 32 39" class="alert-marker__svg ${verified ? 'is-verified' : ''}">
                <defs>
                    <filter id="pin-shadow-${slug}" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="1.2"/>
                        <feOffset dx="0" dy="1.5" result="off"/>
                        <feComponentTransfer><feFuncA type="linear" slope="0.35"/></feComponentTransfer>
                        <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                </defs>
                <path filter="url(#pin-shadow-${slug})"
                      d="M16 1C8.3 1 2 7.2 2 14.9c0 3.8 1.7 7 3.7 9.6l9 12.3c.7.9 2 .9 2.7 0l9-12.3c2-2.6 3.7-5.8 3.7-9.6C30 7.2 23.7 1 16 1Z"
                      fill="${s.color}" stroke="${s.ring}" stroke-width="1.6"/>
                <circle cx="16" cy="15" r="10" fill="rgba(0,0,0,0.12)"/>
                <g transform="translate(4, 3)">${s.svg}</g>
                ${verified ? '<circle cx="24" cy="7" r="5" fill="#10B981" stroke="#fff" stroke-width="1.5"/><path d="M21.5 7.2l1.8 1.8 3-3.2" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' : ''}
            </svg>`;
    }

    // ─────────────────────────────────────────────────────
    // Chờ map sẵn sàng rồi khởi tạo alert layers
    // ─────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        const wait = setInterval(() => {
            if (window.MapInstance) {
                clearInterval(wait);
                const map = window.MapInstance;
                if (map.loaded()) initAlertLayers(map);
                else map.on('load', () => initAlertLayers(map));
            }
        }, 80);
    });

    // ─────────────────────────────────────────────────────
    // Khởi tạo nguồn dữ liệu + các lớp hiển thị
    // ─────────────────────────────────────────────────────
    function initAlertLayers(map) {
        // Nguồn dữ liệu alerts (clustering sẵn có của mapbox-style)
        map.addSource('alerts-src', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
            cluster: true,
            clusterMaxZoom: 13,
            clusterRadius: 50
        });

        // Nguồn heatmap (điểm đơn lẻ, không cluster)
        map.addSource('heatmap-src', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });

        // ── Lớp cluster (bóng nhóm) ──
        map.addLayer({
            id: 'alerts-clusters',
            type: 'circle',
            source: 'alerts-src',
            filter: ['has', 'point_count'],
            paint: {
                'circle-color': [
                    'step', ['get', 'point_count'],
                    '#FCA5A5', 5,
                    '#F87171', 15,
                    '#EF4444', 40,
                    '#B91C1C'
                ],
                'circle-radius': [
                    'step', ['get', 'point_count'],
                    18, 5, 22, 15, 28, 40, 34
                ],
                'circle-stroke-color': '#FFFFFF',
                'circle-stroke-width': 3,
                'circle-opacity': 0.88
            }
        });
        map.addLayer({
            id: 'alerts-cluster-count',
            type: 'symbol',
            source: 'alerts-src',
            filter: ['has', 'point_count'],
            layout: {
                'text-field': ['get', 'point_count_abbreviated'],
                'text-font': ['Roboto Regular'],
                'text-size': 13,
                'text-allow-overlap': true
            },
            paint: { 'text-color': '#FFFFFF' }
        });

        // ── Heatmap layer ──
        map.addLayer({
            id: 'alerts-heat',
            type: 'heatmap',
            source: 'heatmap-src',
            maxzoom: 16,
            layout: { visibility: 'none' },
            paint: {
                'heatmap-weight': ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 20, 1],
                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 9, 0.8, 15, 2.5],
                'heatmap-color': [
                    'interpolate', ['linear'], ['heatmap-density'],
                    0, 'rgba(16,185,129,0)',
                    0.2, 'rgba(250,204,21,0.55)',
                    0.45, 'rgba(249,115,22,0.70)',
                    0.7, 'rgba(239,68,68,0.82)',
                    1, 'rgba(127,29,29,0.92)'
                ],
                'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 9, 18, 15, 48],
                'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.85, 16, 0.25]
            }
        }, 'alerts-clusters');

        // ── State view mode ──
        const MODE = { MARKERS: 'markers', HEATMAP: 'heatmap', BOTH: 'both' };
        let currentMode = MODE.MARKERS;
        window.__alertMode = () => currentMode;

        // ── DOM markers cho alerts KHÔNG bị cluster ──
        /** @type {Map<number, goongjs.Marker>} */
        const htmlMarkers = new Map();
        let alertsCache = [];          // danh sách gốc từ API
        let activePopupId = null;      // id alert đang mở popup
        let activePopup   = null;      // goongjs.Popup instance

        // ── Click vào cluster → zoom in ──
        map.on('click', 'alerts-clusters', (e) => {
            const features = map.queryRenderedFeatures(e.point, { layers: ['alerts-clusters'] });
            if (!features.length) return;
            const clusterId = features[0].properties.cluster_id;
            map.getSource('alerts-src').getClusterExpansionZoom(clusterId, (err, zoom) => {
                if (err) return;
                map.easeTo({ center: features[0].geometry.coordinates, zoom: Math.min(zoom + 0.4, 18) });
            });
        });
        map.on('mouseenter', 'alerts-clusters', () => map.getCanvas().style.cursor = 'pointer');
        map.on('mouseleave', 'alerts-clusters', () => map.getCanvas().style.cursor = '');

        // ── Debounced loader khi map di chuyển / zoom ──
        let loadTimer = null;
        function scheduleLoad() {
            clearTimeout(loadTimer);
            loadTimer = setTimeout(loadAlertsFromAPI, 250);
        }
        map.on('moveend', scheduleLoad);
        map.on('zoomend', scheduleLoad);
        scheduleLoad();

        async function loadAlertsFromAPI() {
            try {
                const b = map.getBounds();
                const sw = b.getSouthWest(), ne = b.getNorthEast();
                const now = new Date();
                const from = new Date(now.getTime() - 30 * 24 * 3600 * 1000); // 30 ngày
                const qs = new URLSearchParams({
                    southLat: sw.lat, northLat: ne.lat,
                    westLng:  sw.lng, eastLng:  ne.lng,
                    fromTime: from.toISOString(),
                    toTime:   now.toISOString()
                });
                const res = await fetch('/api/alerts/map?' + qs.toString());
                if (!res.ok) return;
                const alerts = await res.json();
                alertsCache = Array.isArray(alerts) ? alerts : [];
                renderAlerts();
            } catch (e) {
                console.error('[map-data] load error:', e);
            }
        }

        function renderAlerts() {
            const markerFeatures = alertsCache.map(a => ({
                type: 'Feature',
                properties: { id: a.id, slug: a.alertTypeSlug, verified: a.status === 'VISIBLE_VERIFIED' },
                geometry: { type: 'Point', coordinates: [Number(a.longitude), Number(a.latitude)] }
            }));
            const heatFeatures = alertsCache.map(a => ({
                type: 'Feature',
                properties: { intensity: Math.max(1, (a.trustScore || 0) / 10 + (a.confirmCount || 0)) },
                geometry: { type: 'Point', coordinates: [Number(a.longitude), Number(a.latitude)] }
            }));
            map.getSource('alerts-src').setData({ type: 'FeatureCollection', features: markerFeatures });
            map.getSource('heatmap-src').setData({ type: 'FeatureCollection', features: heatFeatures });

            refreshHtmlMarkers();
        }

        // Khi cluster hoạt động, alert nào bị gom nhóm sẽ không render HTML marker.
        // Chúng ta dùng queryRenderedFeatures trên layer ẩn 'unclustered' để biết alert nào đang unclustered.
        // Để đơn giản & đáng tin cậy, ta quyết định dựa vào zoom:  nếu zoom > clusterMaxZoom (=13) → render tất cả;
        // ngược lại → dựa vào kết quả cluster của mapbox để ẩn/hiện.
        function refreshHtmlMarkers() {
            const show = currentMode === MODE.MARKERS || currentMode === MODE.BOTH;
            const z = map.getZoom();
            // Dưới ngưỡng cluster → chỉ hiện những điểm không nằm trong cluster.
            // Lấy feature unclustered bằng cách query source (không phải render).
            const src = map.getSource('alerts-src');
            // mapbox-gl-js có `source.getClusterLeaves`, nhưng chúng ta đi đường đơn giản:
            // - Zoom > clusterMaxZoom → hiện tất cả;
            // - Zoom <= clusterMaxZoom → ẩn tất cả HTML marker (cluster bubble đã đảm nhiệm).
            const showAll = show && z > 13;
            const visibleIds = new Set();

            if (showAll) {
                for (const a of alertsCache) visibleIds.add(a.id);
            }

            // Signature để phát hiện khi dữ liệu alert thay đổi (status / opacity / slug / toạ độ)
            // → cần re-render marker thay vì giữ pin cũ.
            const sigOf = (a) => `${a.alertTypeSlug}|${a.status}|${a.opacity}|${a.latitude}|${a.longitude}`;

            // Thêm / cập nhật marker
            for (const a of alertsCache) {
                if (!visibleIds.has(a.id)) continue;
                const existing = htmlMarkers.get(a.id);
                const sig = sigOf(a);
                if (existing && existing.sig === sig) continue;
                if (existing) existing.marker.remove();

                const el = document.createElement('div');
                el.className = 'alert-marker';
                el.innerHTML = buildMarkerSvg(a.alertTypeSlug, {
                    verified: a.status === 'VISIBLE_VERIFIED',
                    size: a.status === 'VISIBLE_VERIFIED' ? 40 : 36
                });
                el.style.opacity = Math.max(0.55, Math.min(1, (a.opacity || 50) / 100));
                el.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    openAlertPopup(a.id);
                });
                const marker = new goongjs.Marker({ element: el, anchor: 'bottom' })
                    .setLngLat([Number(a.longitude), Number(a.latitude)])
                    .addTo(map);
                htmlMarkers.set(a.id, { marker, sig });
            }
            // Xoá marker không còn hiển thị
            for (const [id, entry] of htmlMarkers) {
                if (!visibleIds.has(id)) { entry.marker.remove(); htmlMarkers.delete(id); }
            }
        }

        // ── Mode switch ──
        function applyMode() {
            const showMarkers = currentMode === MODE.MARKERS || currentMode === MODE.BOTH;
            const showHeat    = currentMode === MODE.HEATMAP || currentMode === MODE.BOTH;
            map.setLayoutProperty('alerts-clusters',     'visibility', showMarkers ? 'visible' : 'none');
            map.setLayoutProperty('alerts-cluster-count','visibility', showMarkers ? 'visible' : 'none');
            map.setLayoutProperty('alerts-heat',         'visibility', showHeat    ? 'visible' : 'none');
            refreshHtmlMarkers();
        }
        applyMode();

        // ── UI switcher ở góc trên phải dưới nav control ──
        const switcher = document.createElement('div');
        switcher.className = 'alert-view-switcher';
        switcher.innerHTML = `
            <button data-mode="markers" class="is-active" title="Hiện điểm">
                <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>Điểm</span>
            </button>
            <button data-mode="heatmap" title="Bản đồ nhiệt">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6" opacity=".55"/><circle cx="12" cy="12" r="9" opacity=".25"/></svg>
                <span>Nhiệt</span>
            </button>
            <button data-mode="both" title="Cả hai">
                <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/></svg>
                <span>Cả hai</span>
            </button>
        `;
        switcher.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-mode]');
            if (!btn) return;
            currentMode = btn.dataset.mode;
            switcher.querySelectorAll('button').forEach(b => b.classList.toggle('is-active', b === btn));
            applyMode();
        });
        document.body.appendChild(switcher);

        // ─────────────────────────────────────────────
        // POPUP CHI TIẾT — xác nhận cộng đồng
        // ─────────────────────────────────────────────
        async function openAlertPopup(id) {
            if (activePopup) { activePopup.remove(); activePopup = null; }
            activePopupId = id;

            const cached = alertsCache.find(a => a.id === id);
            if (!cached) return;

            const popup = new goongjs.Popup({
                offset: 34, closeButton: true, maxWidth: '340px', className: 'alert-popup'
            })
            .setLngLat([Number(cached.longitude), Number(cached.latitude)])
            .setHTML(buildAlertPopupHtml(cached))
            .addTo(map);
            activePopup = popup;

            // Gắn sự kiện sau khi DOM được render
            setTimeout(() => wirePopupActions(id), 10);

            // Gọi API chi tiết để lấy thông tin mới nhất (ConfirmCount/Deny cập nhật)
            try {
                const res = await fetch(`/api/alerts/${id}`);
                if (!res.ok) return;
                const fresh = await res.json();
                Object.assign(cached, fresh);
                if (activePopupId === id && activePopup) {
                    activePopup.setHTML(buildAlertPopupHtml(fresh));
                    setTimeout(() => wirePopupActions(id), 10);
                }
            } catch (_) {}
        }

        function wirePopupActions(id) {
            const root = document.querySelector('.alert-popup .alert-popup__card');
            if (!root) return;
            root.querySelector('[data-act="confirm"]')?.addEventListener('click', () => submitVerify(id, 'CONFIRM'));
            root.querySelector('[data-act="deny"]')?.addEventListener('click',    () => submitVerify(id, 'DENY'));
        }

        async function submitVerify(id, type) {
            const token = localStorage.getItem('token');
            if (!token) {
                flashMsg('Vui lòng đăng nhập để xác nhận cảnh báo', 'warn');
                return;
            }
            const card = document.querySelector('.alert-popup .alert-popup__card');
            if (card) card.classList.add('is-loading');
            try {
                const res = await fetch(`/api/alerts/${id}/verify`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ verificationType: type })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || data.success === false) {
                    flashMsg(data.message || 'Không thể gửi xác nhận', 'error');
                    return;
                }
                flashMsg(data.message || 'Đã ghi nhận phản hồi', 'success');
                // Reload chi tiết để cập nhật counter + status
                const fresh = await (await fetch(`/api/alerts/${id}`)).json();
                const idx = alertsCache.findIndex(a => a.id === id);
                if (idx >= 0) alertsCache[idx] = fresh;
                if (activePopup) activePopup.setHTML(buildAlertPopupHtml(fresh));
                setTimeout(() => wirePopupActions(id), 10);
                renderAlerts();
            } catch (e) {
                flashMsg('Lỗi mạng, vui lòng thử lại', 'error');
            } finally {
                card?.classList.remove('is-loading');
            }
        }

        // ── Toast nhỏ phía dưới để báo kết quả ──
        function flashMsg(text, level = 'success') {
            let host = document.getElementById('alertToast');
            if (!host) {
                host = document.createElement('div');
                host.id = 'alertToast';
                host.className = 'alert-toast-host';
                document.body.appendChild(host);
            }
            const el = document.createElement('div');
            el.className = 'alert-toast alert-toast--' + level;
            el.textContent = text;
            host.appendChild(el);
            setTimeout(() => el.classList.add('is-out'), 2200);
            setTimeout(() => el.remove(), 2700);
        }
        window.alertToast = flashMsg;

        // Expose để các script khác có thể tái load (ví dụ sau khi tạo báo cáo mới)
        window.reloadAlertMap = loadAlertsFromAPI;
    }

    // ─────────────────────────────────────────────────────
    // HTML popup — thiết kế "thẻ hồ sơ sự cố"
    // ─────────────────────────────────────────────────────
    function buildAlertPopupHtml(a) {
        const s = getStyle(a.alertTypeSlug);
        const verified = a.status === 'VISIBLE_VERIFIED';
        const statusTag = statusBadge(a.status);
        const time = formatVnDateTime(a.incidentTime);
        const hasMedia = Array.isArray(a.mediaUrls) && a.mediaUrls.length > 0;
        const firstMedia = hasMedia ? a.mediaUrls[0] : null;
        const rep = Math.max(1, Math.min(10, a.userReputationScore || 5));
        const repStars = renderRepStars(rep);

        const mediaHtml = firstMedia
            ? `<div class="alert-popup__media"><img src="${escHtml(firstMedia)}" alt="" onerror="this.parentElement.style.display='none'"/></div>`
            : '';

        const descShort = (a.description || '').slice(0, 180);

        return `
            <div class="alert-popup__card" data-id="${a.id}">
                <div class="alert-popup__band" style="background:linear-gradient(135deg, ${s.color}, ${s.ring})">
                    <div class="alert-popup__icon-pill" style="background:${s.ring}">
                        <svg viewBox="0 0 32 32" width="22" height="22"><g transform="translate(4,4)">${s.svg.replace(/stroke-width="1\.8"/g, 'stroke-width="2.2"')}</g></svg>
                    </div>
                    <div class="alert-popup__type">${escHtml(s.label)}</div>
                    <div class="alert-popup__status">${statusTag}</div>
                </div>

                ${mediaHtml}

                <div class="alert-popup__body">
                    <h3 class="alert-popup__title">${escHtml(a.title || '')}</h3>
                    <div class="alert-popup__meta">
                        <span class="ap-meta"><svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${escHtml(a.addressText || 'Chưa rõ địa chỉ')}</span>
                        <span class="ap-meta"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>${escHtml(time)}</span>
                    </div>
                    ${descShort ? `<p class="alert-popup__desc">${escHtml(descShort)}${a.description && a.description.length > 180 ? '…' : ''}</p>` : ''}

                    <div class="alert-popup__author">
                        <div class="ap-author__avatar" style="background:linear-gradient(135deg, #10B981, #0F766E)">
                            ${escHtml((a.userName || 'N').charAt(0).toUpperCase())}
                        </div>
                        <div class="ap-author__info">
                            <div class="ap-author__name">${escHtml(a.userName || 'Ẩn danh')}</div>
                            <div class="ap-author__rep">
                                <span class="ap-rep__score">Uy tín ${rep}/10</span>
                                <span class="ap-rep__stars">${repStars}</span>
                            </div>
                        </div>
                    </div>

                    <div class="alert-popup__stats">
                        <span class="ap-stat ap-stat--confirm"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>${a.confirmCount || 0} xác nhận</span>
                        <span class="ap-stat ap-stat--deny"><svg viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>${a.denyCount || 0} phủ nhận</span>
                        <span class="ap-stat ap-stat--trust" title="Điểm tin cậy của báo cáo"><svg viewBox="0 0 24 24"><path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 14.3 7.2 16.9l.9-5.4L4.2 7.7l5.4-.8L12 2z"/></svg>${a.trustScore || 0}</span>
                    </div>

                    <div class="alert-popup__actions">
                        <button class="ap-btn ap-btn--confirm" data-act="confirm" ${verified ? 'title="Báo cáo đã xác thực"' : ''}>
                            <svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                            Tôi ghi nhận
                        </button>
                        <button class="ap-btn ap-btn--deny" data-act="deny">
                            <svg viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
                            Không còn đúng
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    function renderRepStars(score) {
        // Hiển thị 5 sao dựa trên thang 1-10 (0.5 bước)
        const stars = Math.round((score / 10) * 5);
        let out = '';
        for (let i = 0; i < 5; i++) {
            out += i < stars
                ? '<svg viewBox="0 0 24 24" class="is-on"><path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 14.3 7.2 16.9l.9-5.4L4.2 7.7l5.4-.8L12 2z"/></svg>'
                : '<svg viewBox="0 0 24 24" class="is-off"><path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 14.3 7.2 16.9l.9-5.4L4.2 7.7l5.4-.8L12 2z"/></svg>';
        }
        return out;
    }

    function statusBadge(status) {
        switch (status) {
            case 'VISIBLE_VERIFIED':    return '<span class="ap-badge ap-badge--ok">Đã xác thực</span>';
            case 'VISIBLE_UNVERIFIED':  return '<span class="ap-badge ap-badge--warn">Chờ cộng đồng xác nhận</span>';
            case 'PENDING_REVIEW':      return '<span class="ap-badge ap-badge--warn">Chờ duyệt</span>';
            case 'RESOLVED':            return '<span class="ap-badge ap-badge--ok">Đã xử lý</span>';
            default:                    return '<span class="ap-badge">Ghi nhận</span>';
        }
    }

    function formatVnDateTime(iso) {
        try {
            const d = new Date(iso);
            return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (_) { return iso || ''; }
    }
})();
