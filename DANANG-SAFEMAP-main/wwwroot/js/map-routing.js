// ═══════════════════════════════════════════════════════════
// MAP-ROUTING.JS — DaNang SafeMap  (optimized)
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function () {
    waitForMap(initRouting);
});

function waitForMap(cb, n = 0) {
    if (window.MapInstance) { cb(window.MapInstance); }
    else if (n < 50) { setTimeout(() => waitForMap(cb, n + 1), 200); }
    else { console.error('[ROUTE] MapInstance not found'); }
}

// ─── Hệ số hiệu chỉnh giao thông VN ────────────────────────────────────────
// Goong Direction API đã tính cho VN nên chỉ cộng thêm buffer nhỏ cho giờ cao điểm
const TRAFFIC_FACTOR = {
    driving:   1.25,
    motorbike: 1.10,
    cycling:   1.10,
};

// Tốc độ xe đạp trung bình ở đô thị VN (~15 km/h)
const CYCLE_SPEED_MPS = 4.2; // m/s ≈ 15.1 km/h

function initRouting(map) {

    // ── DOM refs ──────────────────────────────────────────
    const inpStart = document.getElementById('routeStart');
    const inpEnd   = document.getElementById('routeEnd');
    const suggStart = document.getElementById('suggStart');
    const suggEnd   = document.getElementById('suggEnd');
    const btnMyLoc  = document.getElementById('btnMyLocForRoute');
    const btnSwap   = document.getElementById('btnSwapRoute');
    const btnFind   = document.getElementById('btnFindRoute');
    const btnClear  = document.getElementById('btnClearRoute');
    const elStatus  = document.getElementById('routeStatus');
    const elResults = document.getElementById('routeResults');
    const routeCard = document.getElementById('gmRouteCard');

    // ── State ─────────────────────────────────────────────
    let coordStart = null, coordEnd = null;
    let startMarker = null, endMarker = null;

    let storedRoutes = { driving: null, motorbike: null, cycling: null };
    let activeMode = 'driving';

    // ── Pre-fill khi mở từ Place Card ─────────────────────
    if (routeCard) {
        const obs = new MutationObserver(() => {
            if (routeCard.style.display !== 'none') {
                if (window.RouteEndCoord && inpEnd && !inpEnd.value) {
                    const sp = window.SelectedPlace;
                    if (sp) { inpEnd.value = sp.name; coordEnd = window.RouteEndCoord; }
                }
                if (window.RouteStartCoord && inpStart && !inpStart.value) {
                    inpStart.value = '📍 Vị trí hiện tại của bạn';
                    coordStart = window.RouteStartCoord;
                }
            }
        });
        obs.observe(routeCard, { attributes: true, attributeFilter: ['style'] });
    }

    // ─────────────────────────────────────────────────────
    // AUTOCOMPLETE
    // ─────────────────────────────────────────────────────
    function attachAC(input, suggBox, setCoord) {
        if (!input || !suggBox) return;
        let timer;
        input.addEventListener('input', () => {
            setCoord(null);
            const q = input.value.trim();
            if (q.length < 2) { hideSugg(suggBox); return; }
            clearTimeout(timer);
            timer = setTimeout(() => fetchAC(q, input, suggBox, setCoord), 380);
        });
        document.addEventListener('click', e => {
            if (!input.closest('.gm-route-input-wrap')?.contains(e.target)) hideSugg(suggBox);
        });
    }

    async function fetchAC(query, input, suggBox, setCoord) {
        const key = window.APP_CONFIG?.goongRestApiKey;
        if (!key) return;
        try {
            const { lat, lng } = map.getCenter();
            const url = `https://rsapi.goong.io/Place/AutoComplete?input=${encodeURIComponent(query)}`
                + `&location=${lat},${lng}&radius=50000&more_compound=true&api_key=${key}`;
            const data = await fetchJSON(url);
            if (!data?.predictions?.length) {
                suggBox.innerHTML = '<div class="gm-sugg-item" style="color:#9AA0A6;cursor:default">Không tìm thấy</div>';
            } else {
                suggBox.innerHTML = data.predictions.slice(0, 5).map(p => {
                    const main = escHtml(p.structured_formatting?.main_text || p.description);
                    const sub = escHtml(p.structured_formatting?.secondary_text || '');
                    return `<div class="gm-sugg-item" data-pid="${escHtml(p.place_id)}" data-main="${main}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#9AA0A6" stroke-width="2"
                             width="13" height="13" style="flex-shrink:0;margin-top:2px">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        </svg>
                        <div style="overflow:hidden;min-width:0">
                            <div style="font-size:12.5px;font-weight:500;color:#1E293B;
                                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${main}</div>
                            <div style="font-size:11px;color:#9AA0A6;
                                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sub}</div>
                        </div>
                    </div>`;
                }).join('');

                suggBox.querySelectorAll('.gm-sugg-item[data-pid]').forEach(item => {
                    item.addEventListener('click', async () => {
                        input.value = item.dataset.main;
                        hideSugg(suggBox);
                        const coord = await fetchPlaceDetail(item.dataset.pid);
                        if (coord) setCoord(coord);
                    });
                });
            }
            suggBox.style.display = 'block';
        } catch (e) { console.error('[ROUTE] AC error:', e); }
    }

    async function fetchPlaceDetail(placeId) {
        const key = window.APP_CONFIG?.goongRestApiKey;
        if (!key) return null;
        try {
            const data = await fetchJSON(`https://rsapi.goong.io/Place/Detail?place_id=${placeId}&api_key=${key}`);
            const loc = data?.result?.geometry?.location;
            return loc ? { lat: loc.lat, lng: loc.lng } : null;
        } catch { return null; }
    }

    function hideSugg(box) { if (box) box.style.display = 'none'; }
    attachAC(inpStart, suggStart, c => coordStart = c);
    attachAC(inpEnd, suggEnd, c => coordEnd = c);

    // ─────────────────────────────────────────────────────
    // NÚT "VỊ TRÍ CỦA TÔI"
    // ─────────────────────────────────────────────────────
    btnMyLoc?.addEventListener('click', () => {
        if (!navigator.geolocation) { showStatus('Trình duyệt không hỗ trợ định vị.', 'error'); return; }
        showStatus('Đang xác định vị trí...', 'loading');
        navigator.geolocation.getCurrentPosition(
            async ({ coords: { latitude: lat, longitude: lng } }) => {
                coordStart = window.RouteStartCoord = { lat, lng };
                if (inpStart) {
                    const key = window.APP_CONFIG?.goongRestApiKey;
                    try {
                        const data = key
                            ? await fetchJSON(`https://rsapi.goong.io/Geocode?latlng=${lat},${lng}&api_key=${key}`)
                            : null;
                        inpStart.value = data?.results?.[0]?.formatted_address
                            || `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                    } catch {
                        inpStart.value = `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                    }
                }
                hideStatus();
            },
            () => showStatus('Không lấy được vị trí. Hãy cấp quyền định vị.', 'error')
        );
    });

    // ─────────────────────────────────────────────────────
    // NÚT SWAP
    // ─────────────────────────────────────────────────────
    btnSwap?.addEventListener('click', () => {
        if (!inpStart || !inpEnd) return;
        [inpStart.value, inpEnd.value] = [inpEnd.value, inpStart.value];
        [coordStart, coordEnd] = [coordEnd, coordStart];
    });

    // ─────────────────────────────────────────────────────
    // CLICK VÀO KẾT QUẢ ROW → switch route trên bản đồ
    // ─────────────────────────────────────────────────────
    const ROW_MAP = [
        ['resDriving',  'driving'],
        ['resMoto',     'motorbike'],
        ['resCycling',  'cycling'],
    ];

    ROW_MAP.forEach(([id, mode]) => {
        document.getElementById(id)?.addEventListener('click', () => {
            if (!storedRoutes[mode]) return;
            setActiveResult(id);
            activeMode = mode;
            redrawRoute(storedRoutes[mode].geometry);
        });
    });

    function setActiveResult(activeId) {
        ROW_MAP.forEach(([id]) => document.getElementById(id)?.classList.remove('active'));
        document.getElementById(activeId)?.classList.add('active');
    }

    // ─────────────────────────────────────────────────────
    // TÌM ĐƯỜNG
    // ─────────────────────────────────────────────────────
    btnFind?.addEventListener('click', async () => {
        const sv = inpStart?.value.trim();
        const ev = inpEnd?.value.trim();
        if (!sv || !ev) { showStatus('Vui lòng nhập điểm đi và điểm đến.', 'error'); return; }

        showStatus('Đang tính toán tuyến đường...', 'loading');
        if (elResults) elResults.style.display = 'none';
        clearRoute();

        if (!coordStart) coordStart = window.RouteStartCoord || await nominatim(sv);
        if (!coordEnd)   coordEnd   = window.RouteEndCoord   || await nominatim(ev);
        if (!coordStart) { showStatus('Không tìm thấy điểm xuất phát.', 'error'); return; }
        if (!coordEnd)   { showStatus('Không tìm thấy điểm đến.', 'error'); return; }

        try {
            // Gọi song song: Goong Direction (ô tô + xe máy) + OSRM cycling
            const [rCar, rMoto, rCycle] = await Promise.all([
                goongDirection(coordStart, coordEnd, 'car'),
                goongDirection(coordStart, coordEnd, 'bike'),
                osrmCycling(coordStart, coordEnd),
            ]);

            console.log('[ROUTE] car:', rCar, 'moto:', rMoto, 'cycle:', rCycle);

            if (!rCar && !rMoto) {
                showStatus('Không tìm được đường đi. Thử lại sau.', 'error');
                return;
            }

            // Fallback: nếu 1 trong 3 lỗi, dùng kết quả có sẵn
            const drivingRoute  = rCar  || rMoto;
            const motoRoute     = rMoto || rCar;

            // Xe đạp: ưu tiên OSRM cycling, fallback dùng geometry ô tô + tính thời gian bằng tốc độ xe đạp
            const cyclingRoute = rCycle || {
                geometry: drivingRoute.geometry,
                distance: drivingRoute.distance,
                duration: drivingRoute.distance / CYCLE_SPEED_MPS,
            };

            storedRoutes = {
                driving:   drivingRoute,
                motorbike: motoRoute,
                cycling:   cyclingRoute,
            };

            // Hiển thị kết quả
            updateRow('resDriving',  'timeCar',     'distCar',     drivingRoute,  'driving');
            updateRow('resMoto',     'timeMoto',    'distMoto',    motoRoute,     'motorbike');
            updateRow('resCycling',  'timeCycling', 'distCycling', cyclingRoute,  'cycling');

            // Vẽ mặc định = ô tô
            activeMode = 'driving';
            drawRoute(drivingRoute.geometry);
            placeMarkers(coordStart, coordEnd, sv, ev);
            setActiveResult('resDriving');

            if (elResults) elResults.style.display = 'block';
            hideStatus();

            // Fit bounds
            const isMobile = window.innerWidth <= 640;
            map.fitBounds(
                [[Math.min(coordStart.lng, coordEnd.lng), Math.min(coordStart.lat, coordEnd.lat)],
                 [Math.max(coordStart.lng, coordEnd.lng), Math.max(coordStart.lat, coordEnd.lat)]],
                {
                    padding: isMobile
                        ? { top: 380, bottom: 40, left: 40, right: 40 }
                        : { top: 60, bottom: 60, left: 420, right: 60 },
                    duration: 900,
                }
            );

        } catch (e) {
            console.error('[ROUTE]', e);
            showStatus('Có lỗi kết nối. Thử lại sau.', 'error');
        }
    });

    /**
     * Điền thời gian + khoảng cách vào 1 row kết quả.
     */
    function updateRow(rowId, timeId, distId, route, mode) {
        const adjustedSec = route.duration * (TRAFFIC_FACTOR[mode] ?? 1.2);
        setText(timeId, fmtTime(adjustedSec));
        setText(distId, fmtDist(route.distance));
    }

    // ── Xóa tuyến ─────────────────────────────────────────
    btnClear?.addEventListener('click', () => {
        clearRoute();
        storedRoutes = { driving: null, motorbike: null, cycling: null };
        if (elResults) elResults.style.display = 'none';
        hideStatus();
        if (inpStart) inpStart.value = '';
        if (inpEnd)   inpEnd.value = '';
        coordStart = coordEnd = null;
        window.RouteStartCoord = window.RouteEndCoord = null;
    });

    // ─────────────────────────────────────────────────────
    // GOONG DIRECTION API
    // Trả về { geometry (GeoJSON), distance (m), duration (s) }
    // ─────────────────────────────────────────────────────
    async function goongDirection(s, e, vehicle) {
        const key = window.APP_CONFIG?.goongRestApiKey;
        if (!key) return null;
        const url = `https://rsapi.goong.io/Direction?origin=${s.lat},${s.lng}`
            + `&destination=${e.lat},${e.lng}&vehicle=${vehicle}&api_key=${key}`;
        try {
            const data = await fetchJSON(url);
            if (data?.routes?.length) {
                const route = data.routes[0];
                const leg   = route.legs?.[0];
                const pts   = route.overview_polyline?.points;
                if (!pts || !leg) return null;

                const coords = decodePolyline(pts);
                return {
                    geometry: { type: 'LineString', coordinates: coords },
                    distance: leg.distance?.value || 0,
                    duration: leg.duration?.value || 0,
                };
            }
        } catch (err) { console.warn('[ROUTE] Goong Direction error:', vehicle, err); }
        return null;
    }

    // ─────────────────────────────────────────────────────
    // OSRM — Dùng cho Xe đạp (cycling profile)
    // ─────────────────────────────────────────────────────
    async function osrmCycling(s, e) {
        const url = `https://router.project-osrm.org/route/v1/cycling/${s.lng},${s.lat};${e.lng},${e.lat}`
            + `?overview=full&geometries=geojson`;
        try {
            const data = await fetchJSON(url);
            if (data?.code === 'Ok' && data.routes?.length) {
                const r = data.routes[0];
                return { geometry: r.geometry, distance: r.distance, duration: r.duration };
            }
        } catch (err) { console.warn('[ROUTE] OSRM cycling error:', err); }
        return null;
    }

    // Nominatim fallback (khi không có tọa độ từ Goong autocomplete)
    async function nominatim(q) {
        const biased = /đà nẵng|da nang|quảng nam|quang nam/i.test(q) ? q : `${q}, Đà Nẵng`;
        try {
            const data = await fetchJSON(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(biased)}`
                + `&format=json&limit=1&countrycodes=vn`
            );
            if (data?.length) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        } catch { }
        return null;
    }

    // ─────────────────────────────────────────────────────
    // DECODE GOOGLE ENCODED POLYLINE → [[lng, lat], ...]
    // ─────────────────────────────────────────────────────
    function decodePolyline(encoded) {
        const coords = [];
        let idx = 0, lat = 0, lng = 0;
        while (idx < encoded.length) {
            let shift = 0, result = 0, byte;
            do {
                byte = encoded.charCodeAt(idx++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);
            lat += (result & 1) ? ~(result >> 1) : (result >> 1);

            shift = 0; result = 0;
            do {
                byte = encoded.charCodeAt(idx++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);
            lng += (result & 1) ? ~(result >> 1) : (result >> 1);

            coords.push([lng / 1e5, lat / 1e5]);
        }
        return coords;
    }

    // ─────────────────────────────────────────────────────
    // VẼ TUYẾN ĐƯỜNG
    // ─────────────────────────────────────────────────────
    function drawRoute(geometry) {
        clearRoute();
        map.addSource('route-src', { type: 'geojson', data: { type: 'Feature', geometry } });
        map.addLayer({
            id: 'route-outline', type: 'line', source: 'route-src',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#fff', 'line-width': 8, 'line-opacity': 0.55 },
        });
        map.addLayer({
            id: 'route-line', type: 'line', source: 'route-src',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#3B82F6', 'line-width': 5, 'line-opacity': 0.95 },
        });
    }

    function redrawRoute(geometry) {
        const src = map.getSource('route-src');
        if (src) { src.setData({ type: 'Feature', geometry }); }
        else { drawRoute(geometry); }
    }

    function clearRoute() {
        ['route-line', 'route-outline'].forEach(id => {
            if (map.getLayer(id)) map.removeLayer(id);
        });
        if (map.getSource('route-src')) map.removeSource('route-src');
        startMarker?.remove(); startMarker = null;
        endMarker?.remove(); endMarker = null;
    }

    function placeMarkers(s, e, sv, ev) {
        const el = Object.assign(document.createElement('div'), {
            innerHTML: '<div style="width:13px;height:13px;border-radius:50%;background:#10B981;'
                + 'border:2.5px solid white;box-shadow:0 0 0 2px #10B981"></div>',
        });
        startMarker = new goongjs.Marker({ element: el, anchor: 'center' })
            .setLngLat([s.lng, s.lat])
            .setPopup(new goongjs.Popup({ offset: 14 })
                .setHTML(`<div class="lp"><div class="lp__top"><div class="lp__addr">🟢 ${escHtml(sv)}</div></div></div>`))
            .addTo(map);

        endMarker = new goongjs.Marker({ color: '#EF4444' })
            .setLngLat([e.lng, e.lat])
            .setPopup(new goongjs.Popup({ offset: 30 })
                .setHTML(`<div class="lp"><div class="lp__top"><div class="lp__addr">🔴 ${escHtml(ev)}</div></div></div>`))
            .addTo(map);
    }

    // ─────────────────────────────────────────────────────
    // UTILS
    // ─────────────────────────────────────────────────────
    async function fetchJSON(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
        return res.json();
    }

    function fmtTime(sec) {
        const m = Math.round(sec / 60);
        if (m < 1) return '< 1 phút';
        if (m < 60) return `${m} phút`;
        const h = Math.floor(m / 60);
        const rm = m % 60;
        return rm > 0 ? `${h} giờ ${rm} phút` : `${h} giờ`;
    }

    function fmtDist(m) {
        return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
    }

    function showStatus(msg, type) {
        if (!elStatus) return;
        elStatus.textContent = msg;
        elStatus.className = `gm-route-status gm-route-status--${type}`;
        elStatus.style.display = 'block';
    }

    function hideStatus() { if (elStatus) elStatus.style.display = 'none'; }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }
}
