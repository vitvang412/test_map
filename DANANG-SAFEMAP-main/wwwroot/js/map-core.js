// ═══════════════════════════════════════════════════════════
// MAP-CORE.JS — DaNang SafeMap
// Google Maps style: full-screen map + floating search panel
// ═══════════════════════════════════════════════════════════

// ── Giới hạn vùng bản đồ ──
const REGION_BOUNDS = [
    [107.42, 14.92],
    [108.75, 16.22]
];

// ── Polygon ranh giới Đà Nẵng + Quảng Nam ──
const PROVINCE_RING = [
    [108.75, 16.08], [108.40, 16.22], [108.00, 16.22],
    [107.92, 16.05], [107.65, 15.90], [107.55, 15.75],
    [107.43, 15.50], [107.42, 15.18], [107.60, 14.95],
    [107.88, 14.93], [108.20, 15.00], [108.46, 15.22],
    [108.65, 15.68], [108.55, 15.92], [108.75, 16.08]
];

// ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

    // ── 1. API Key ──
    const maptileKey = window.APP_CONFIG && window.APP_CONFIG.goongMaptileKey;
    if (!maptileKey) {
        console.error('[MAP] Thiếu GoongMaps:MaptileKey');
        return;
    }

    goongjs.accessToken = maptileKey;

    // ── 2. Khởi tạo bản đồ ──
    const map = new goongjs.Map({
        container : 'map',
        style     : 'https://tiles.goong.io/assets/goong_map_web.json',
        center    : [108.2022, 16.0544],
        zoom      : 12.5,
        minZoom   : 9,
        maxZoom   : 19,
        maxBounds : [[107.30, 14.82], [108.88, 16.28]]
    });

    // Expose để các script khác dùng
    window.MapInstance = map;

    // ── 3. Controls ──
    map.addControl(new goongjs.NavigationControl(), 'top-right');
    map.addControl(new goongjs.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');

    const geolocate = new goongjs.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true
    });
    map.addControl(geolocate, 'top-right');
    window.GeolocateCtl = geolocate;

    // ── Nút chuyển vệ tinh (Giao diện HTML ngoài) ──
    var isSatellite = false;
    const btnToggleSat = document.getElementById('btnToggleSatellite');
    if (btnToggleSat) {
        btnToggleSat.addEventListener('click', function () {
            isSatellite = !isSatellite;
            var layer = map.getLayer('satellite-layer');
            if (!layer) { console.warn('[SAT] Satellite layer not ready yet'); return; }
            if (isSatellite) {
                map.setLayoutProperty('satellite-layer', 'visibility', 'visible');
                btnToggleSat.classList.add('is-satellite');
                document.getElementById('layerToggleText').textContent = 'Bản đồ';
            } else {
                map.setLayoutProperty('satellite-layer', 'visibility', 'none');
                btnToggleSat.classList.remove('is-satellite');
                document.getElementById('layerToggleText').textContent = 'Vệ tinh';
            }
        });
    }

    // ─────────────────────────────────────────────────────
    // GEOLOCATE → Popup thông tin vị trí (như bản cũ)
    // ─────────────────────────────────────────────────────
    let locationPopup = null;

    geolocate.on('geolocate', async function (e) {
        const lng      = e.coords.longitude;
        const lat      = e.coords.latitude;
        const accuracy = e.coords.accuracy;

        // Đóng popup cũ
        if (locationPopup) locationPopup.remove();

        // Hiện popup loading ngay lập tức
        locationPopup = new goongjs.Popup({ offset: 12, closeButton: true, maxWidth: '320px' })
            .setLngLat([lng, lat])
            .setHTML(buildLocPopupLoading())
            .addTo(map);

        // Gọi Goong Geocode lấy địa chỉ
        const address = await getAddressFromCoords(lng, lat);

        // Cập nhật popup đầy đủ
        if (locationPopup) {
            locationPopup.setHTML(buildLocPopupFull(address, lat, lng, accuracy));
        }

        // Nếu user đang mở route panel, tự điền vị trí vào điểm xuất phát
        const routeCard = document.getElementById('gmRouteCard');
        if (routeCard && routeCard.style.display !== 'none') {
            const inpStart = document.getElementById('routeStart');
            if (inpStart && !inpStart.value) {
                inpStart.value = '📍 Vị trí hiện tại của bạn';
                window.RouteStartCoord = { lat, lng };
            }
        }
    });

    async function getAddressFromCoords(lng, lat) {
        const key = window.APP_CONFIG?.goongRestApiKey;
        if (!key) return 'Không có API Key';
        try {
            const res  = await fetch(`https://rsapi.goong.io/Geocode?latlng=${lat},${lng}&api_key=${key}`);
            const data = await res.json();
            return data.results?.[0]?.formatted_address || 'Không tìm thấy địa chỉ';
        } catch { return 'Lỗi khi lấy địa chỉ'; }
    }

    function buildLocPopupLoading() {
        return `<div class="lp lp--with-photo">
            <div class="lp__photo">
                <div class="lp__photo-skeleton"></div>
            </div>
            <div class="lp__body">
                <div class="lp__top">
                    <svg class="lp__pin" viewBox="0 0 20 24" fill="none">
                        <path d="M10 0C6.13 0 3 3.13 3 7c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#10B981"/>
                        <circle cx="10" cy="7" r="2.5" fill="white"/>
                    </svg>
                    <div style="flex:1">
                        <div class="lp__skeleton--line" style="width:140px;margin-bottom:6px"></div>
                        <div class="lp__skeleton--line" style="width:90px"></div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    function buildLocPopupFull(address, lat, lng, accuracy) {
        const latStr = lat >= 0 ? `${lat.toFixed(5)}°N` : `${Math.abs(lat).toFixed(5)}°S`;
        const lngStr = lng >= 0 ? `${lng.toFixed(5)}°E` : `${Math.abs(lng).toFixed(5)}°W`;
        const d = 0.0012;
        const satUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export`
            + `?bbox=${lng-d},${lat-d},${lng+d},${lat+d}&bboxSR=4326&imageSR=4326&size=640,240&format=jpg&f=image`;
        return `<div class="lp lp--with-photo">
            <div class="lp__photo">
                <div class="lp__photo-skeleton"></div>
                <img class="lp__photo-img" src="${satUrl}" alt=""
                     onload="this.classList.add('loaded');this.previousElementSibling.style.display='none'"
                     onerror="this.parentElement.style.display='none'" />
                <div class="lp__photo-badge">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" width="10" height="10">
                        <circle cx="8" cy="8" r="3"/><path d="M8 1v3M8 12v3M1 8h3M12 8h3"/>
                    </svg>
                    Vị trí của bạn
                </div>
            </div>
            <div class="lp__body">
                <div class="lp__top">
                    <svg class="lp__pin" viewBox="0 0 20 24" fill="none">
                        <path d="M10 0C6.13 0 3 3.13 3 7c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#10B981"/>
                        <circle cx="10" cy="7" r="2.5" fill="white"/>
                    </svg>
                    <div>
                        <div class="lp__addr">${escHtml(address)}</div>
                    </div>
                </div>
                <div class="lp__divider"></div>
                <div class="lp__coords">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" width="11" height="11">
                        <circle cx="8" cy="8" r="6.5"/><line x1="8" y1="1.5" x2="8" y2="14.5"/>
                        <line x1="1.5" y1="8" x2="14.5" y2="8"/>
                        <path d="M2.5 5.5 Q8 4 13.5 5.5" stroke-width="1.2"/>
                        <path d="M2.5 10.5 Q8 12 13.5 10.5" stroke-width="1.2"/>
                    </svg>
                    <span>${latStr}&thinsp; ${lngStr}</span>
                    ${accuracy ? `<span class="lp__acc">&thinsp;±${Math.round(accuracy)}m</span>` : ''}
                </div>
            </div>
        </div>`;
    }

    // ── 4. Mask layer (che vùng ngoài 2 tỉnh) ──
    map.on('load', function () {
        const maskGeoJSON = {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [[-180,-90],[180,-90],[180,90],[-180,90],[-180,-90]],
                    [...PROVINCE_RING].reverse()
                ]
            }
        };

        map.addSource('region-mask-src', { type: 'geojson', data: maskGeoJSON });
        map.addLayer({
            id: 'region-mask-fill', type: 'fill', source: 'region-mask-src',
            paint: { 'fill-color': '#e8e6e0', 'fill-opacity': 0.82 }
        });

        map.addSource('region-border-src', {
            type: 'geojson',
            data: { type: 'Feature', geometry: { type: 'LineString', coordinates: PROVINCE_RING } }
        });
        map.addLayer({
            id: 'region-border', type: 'line', source: 'region-border-src',
            paint: { 'line-color': '#10B981', 'line-width': 1.5, 'line-opacity': 0.6, 'line-dasharray': [4, 3] }
        });

        // ── Lớp bản đồ vệ tinh (Google Hybrid) ──
        map.addSource('satellite-src', {
            type: 'raster',
            tiles: [
                'https://mt0.google.com/vt/lyrs=y&hl=vi&x={x}&y={y}&z={z}',
                'https://mt1.google.com/vt/lyrs=y&hl=vi&x={x}&y={y}&z={z}',
                'https://mt2.google.com/vt/lyrs=y&hl=vi&x={x}&y={y}&z={z}',
                'https://mt3.google.com/vt/lyrs=y&hl=vi&x={x}&y={y}&z={z}'
            ],
            tileSize: 256
        });
        map.addLayer({
            id: 'satellite-layer',
            type: 'raster',
            source: 'satellite-src',
            layout: { 'visibility': 'none' },
            paint: { 'raster-opacity': 1 }
        }, 'region-mask-fill');
    });

    // ═══════════════════════════════════════════════════
    // FLOATING SEARCH — Google Maps style
    // ═══════════════════════════════════════════════════
    const searchInput   = document.getElementById('mapSearchInput');
    const btnClearSrch  = document.getElementById('btnClearSearch');
    const dropdown      = document.getElementById('searchDropdown');
    const stateSearch   = document.getElementById('stateSearch');
    const placeCard     = document.getElementById('gmPlaceCard');
    const routeCard     = document.getElementById('gmRouteCard');

    let searchTimer  = null;
    let searchMarker = null;
    let selectedPlace = null; // { name, addr, lat, lng }

    // ── Input: gõ → autocomplete ──
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const q = searchInput.value.trim();
            if (btnClearSrch) btnClearSrch.style.display = q ? 'flex' : 'none';
            if (q.length < 2) { hideDropdown(); return; }
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => doSearch(q), 400);
        });

        // Hiện lại dropdown nếu có kết quả và focus lại
        searchInput.addEventListener('focus', () => {
            if (dropdown && dropdown.children.length > 0) dropdown.style.display = 'block';
        });
    }

    if (btnClearSrch) {
        btnClearSrch.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            btnClearSrch.style.display = 'none';
            hideDropdown();
            hidePlaceCard();
            clearMarker();
            selectedPlace = null;
            window.SelectedPlace = null;
        });
    }

    // Ẩn dropdown khi click ngoài
    document.addEventListener('click', e => {
        if (stateSearch && !stateSearch.contains(e.target)) hideDropdown();
    });

    // ── Goong AutoComplete ──
    async function doSearch(query) {
        const key = window.APP_CONFIG?.goongRestApiKey;
        if (!key) return;
        try {
            const c   = map.getCenter();
            const url = `https://rsapi.goong.io/Place/AutoComplete?input=${encodeURIComponent(query)}&location=${c.lat},${c.lng}&radius=50000&more_compound=true&api_key=${key}`;
            const res = await fetch(url);
            if (!res.ok) return;
            const data = await res.json();

            if (!data.predictions?.length) {
                dropdown.innerHTML = '<div class="gm-drop-empty">Không tìm thấy địa điểm nào</div>';
            } else {
                dropdown.innerHTML = data.predictions.slice(0, 6).map(p => `
                    <div class="gm-drop-item"
                         data-pid="${escHtml(p.place_id)}"
                         data-desc="${escHtml(p.description)}"
                         data-main="${escHtml(p.structured_formatting?.main_text || p.description)}"
                         data-sub="${escHtml(p.structured_formatting?.secondary_text || '')}">
                        <svg class="gm-drop-item__ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        </svg>
                        <div style="overflow:hidden;min-width:0">
                            <div class="gm-drop-item__main">${escHtml(p.structured_formatting?.main_text || p.description)}</div>
                            <div class="gm-drop-item__sub">${escHtml(p.structured_formatting?.secondary_text || '')}</div>
                        </div>
                    </div>`).join('');

                dropdown.querySelectorAll('.gm-drop-item[data-pid]').forEach(item => {
                    item.addEventListener('click', () => {
                        selectPlace(item.dataset.pid, item.dataset.desc, item.dataset.main);
                    });
                });
            }
            dropdown.style.display = 'block';
        } catch (e) { console.error('[MAP] Search error:', e); }
    }

    // ── Chọn một địa điểm → hiển thị Place Card ──
    async function selectPlace(placeId, description, mainText) {
        hideDropdown();
        if (searchInput) searchInput.value = mainText || description;

        const key = window.APP_CONFIG?.goongRestApiKey;
        if (!key) return;

        try {
            const res  = await fetch(`https://rsapi.goong.io/Place/Detail?place_id=${placeId}&api_key=${key}`);
            if (!res.ok) return;
            const data = await res.json();
            const loc  = data.result?.geometry?.location;
            if (!loc) return;

            const name = data.result.name || mainText || description;
            const addr = data.result.formatted_address || description;

            selectedPlace = { name, addr, lat: loc.lat, lng: loc.lng };
            window.SelectedPlace = selectedPlace;

            // Đặt marker
            clearMarker();
            searchMarker = new goongjs.Marker({ color: '#10B981' })
                .setLngLat([loc.lng, loc.lat])
                .addTo(map);

            // Bay đến
            map.flyTo({ center: [loc.lng, loc.lat], zoom: 17, duration: 1000 });

            // Điền card
            const latStr = `${Math.abs(loc.lat).toFixed(5)}°${loc.lat >= 0 ? 'N' : 'S'}`;
            const lngStr = `${Math.abs(loc.lng).toFixed(5)}°${loc.lng >= 0 ? 'E' : 'W'}`;

            setText('cardPlaceName', name);
            setText('cardPlaceAddr', addr !== name ? addr : '');
            setText('cardPlaceCoords', `${latStr}  ·  ${lngStr}`);

            // ── Cập nhật ảnh địa điểm (Dùng ArcGIS Satellite độ phân giải cao) ──
            const imgEl = document.getElementById('cardPlaceImg');
            const skel  = document.getElementById('gmPhotoSkeleton');
            if (imgEl && skel) {
                imgEl.style.display = 'none';
                imgEl.classList.remove('loaded');
                skel.style.display = 'block';
                // Bao phủ khoảng 300m quanh vị trí
                const d = 0.0015;
                imgEl.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${loc.lng-d},${loc.lat-d},${loc.lng+d},${loc.lat+d}&bboxSR=4326&imageSR=4326&size=600,300&format=jpg&f=image`;
            }

            if (placeCard) placeCard.style.display = 'block';

        } catch (e) { console.error('[MAP] Place detail error:', e); }
    }

    // ── Đóng Place Card ──
    on('btnClosePlaceCard', 'click', () => {
        hidePlaceCard();
        clearMarker();
        selectedPlace = null;
        window.SelectedPlace = null;
        if (searchInput) searchInput.value = '';
        if (btnClearSrch) btnClearSrch.style.display = 'none';
    });

    // ── "Đường đi" → mở Route Card ──
    on('btnGetDirections', 'click', () => {
        hidePlaceCard();
        if (stateSearch) stateSearch.style.display = 'none';

        // Pre-fill điểm đến
        const endInput = document.getElementById('routeEnd');
        if (endInput && selectedPlace) {
            endInput.value = selectedPlace.name;
            window.RouteEndCoord = { lat: selectedPlace.lat, lng: selectedPlace.lng };
        }
        if (routeCard) routeCard.style.display = 'block';
    });

    // ── "Định vị" button ──
    on('btnUseMyLoc', 'click', () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(pos => {
            map.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 16, duration: 1000 });
        });
    });

    // ── Đóng Route Card → quay về search ──
    on('btnCloseRoute', 'click', () => {
        if (routeCard) routeCard.style.display = 'none';
        if (stateSearch) stateSearch.style.display = 'block';
    });

    // ── Helpers ──
    function hideDropdown() { if (dropdown) dropdown.style.display = 'none'; }
    function hidePlaceCard(){ if (placeCard) placeCard.style.display = 'none'; }
    function clearMarker()  { if (searchMarker) { searchMarker.remove(); searchMarker = null; } }
    function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
    function on(id, evt, fn) { const el = document.getElementById(id); if (el) el.addEventListener(evt, fn); }

    console.log('[MAP] SafeMap ready — Đà Nẵng & Quảng Nam');
});

// ── escHtml (global, dùng cho map-routing.js cũng) ──
function escHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}