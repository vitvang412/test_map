// ═══════════════════════════════════════════════════════════
// MAP-DATA.JS — Hiển thị báo cáo sự cố lên bản đồ
// Fetch từ API, render marker SVG, popup chi tiết
// ═══════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ── Chờ map sẵn sàng ──
    var checkMap = setInterval(function () {
        if (!window.MapInstance) return;
        clearInterval(checkMap);
        initAlertLayer(window.MapInstance);
    }, 200);

    // ── SVG icons theo loại sự cố (slug → path) ──
    var ALERT_ICONS = {
        theft_motorbike: {
            path: 'M19 9l-4-4h-4v2h3l2 2H5c-2.2 0-4 1.8-4 4s1.8 4 4 4c1.96 0 3.56-1.35 3.92-3.2h3.36c.36 1.85 1.96 3.2 3.92 3.2 2.2 0 4-1.8 4-4 0-1.7-1.1-3.17-2.68-3.78zM5 15.6c-1.44 0-2.6-1.16-2.6-2.6s1.16-2.6 2.6-2.6 2.6 1.16 2.6 2.6-1.16 2.6-2.6 2.6zm11.2 0c-1.44 0-2.6-1.16-2.6-2.6 0-.07.01-.14.02-.22l2.93-2.93c.98.33 1.72 1.2 1.84 2.27L16.2 11.6v4zm0 0',
            vb: '0 0 24 24'
        },
        pickpocket_robbery: {
            path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
            vb: '0 0 24 24'
        },
        burglary: {
            path: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
            vb: '0 0 24 24'
        },
        street_racing: {
            path: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z',
            vb: '0 0 24 24'
        },
        fighting_disorder: {
            path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-6h2v2H7v-2zm4-2h2v4h-2v-4zm4-4h2v8h-2V8z',
            vb: '0 0 24 24'
        },
        scam_tourist: {
            path: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
            vb: '0 0 24 24'
        },
        overcharging: {
            path: 'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z',
            vb: '0 0 24 24'
        }
    };

    // Fallback icon
    var FALLBACK_ICON = {
        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
        vb: '0 0 24 24'
    };

    // ── Tạo marker SVG element (không dùng emoji) ──
    function createMarkerSvg(alert) {
        var slug = alert.alertTypeSlug || '';
        var icon = ALERT_ICONS[slug] || FALLBACK_ICON;
        var color = alert.categoryColor || '#EF4444';
        var isVerified = alert.status === 'VISIBLE_VERIFIED';
        var isInsufficient = alert.status === 'INSUFFICIENT_EVIDENCE';
        var isUnverified = !isVerified && !isInsufficient;

        // Opacity: verified = full, unverified/insufficient = muted
        var markerOpacity = isVerified ? 1 : 0.35;

        var el = document.createElement('div');
        el.className = 'alert-marker';
        el.style.cssText = 'cursor:pointer;position:relative;';

        // Pin container (drop-shadow cho verified)
        var size = isVerified ? 38 : 32;
        var shadow = isVerified
            ? 'filter:drop-shadow(0 2px 4px rgba(0,0,0,.25));'
            : '';

        var svg = '<svg width="' + size + '" height="' + (size + 8) + '" viewBox="0 0 38 46" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;' + shadow + 'opacity:' + markerOpacity + '">'
            + '<path d="M19 0C10.72 0 4 6.72 4 15c0 11.25 15 29 15 29s15-17.75 15-29C34 6.72 27.28 0 19 0z" fill="' + color + '"/>'
            + '<circle cx="19" cy="15" r="11" fill="white" fill-opacity="0.92"/>'
            + '<g transform="translate(7,3) scale(1)">'
            + '<path d="' + icon.path + '" fill="' + color + '"/>'
            + '</g>'
            + '</svg>';

        el.innerHTML = svg;

        // Badge dấu chấm hỏi cho tin chưa xác minh
        if (isUnverified || isInsufficient) {
            var badge = document.createElement('span');
            badge.className = 'alert-marker__badge';
            badge.textContent = '?';
            el.appendChild(badge);
        }

        return el;
    }

    // ── Tạo popup HTML ──
    function buildAlertPopup(a) {
        var isVerified = a.status === 'VISIBLE_VERIFIED';
        var isInsufficient = a.status === 'INSUFFICIENT_EVIDENCE';
        var timeStr = '';
        try { timeStr = new Date(a.incidentTime).toLocaleString('vi-VN'); } catch (e) { timeStr = ''; }

        var statusLabel = '';
        var statusClass = '';
        if (isVerified) {
            statusLabel = 'Đã xác thực';
            statusClass = 'ap__status--verified';
        } else if (isInsufficient) {
            statusLabel = 'Thiếu bằng chứng';
            statusClass = 'ap__status--insufficient';
        } else {
            statusLabel = 'Chưa xác thực';
            statusClass = 'ap__status--unverified';
        }

        var html = '<div class="ap">';

        // Header: icon + type + status
        html += '<div class="ap__header">';
        html += '<span class="ap__type" style="color:' + (a.categoryColor || '#666') + '">' + esc(a.alertTypeName) + '</span>';
        html += '<span class="ap__status ' + statusClass + '">' + statusLabel + '</span>';
        html += '</div>';

        // Title
        html += '<div class="ap__title">' + esc(a.title) + '</div>';

        // Meta
        html += '<div class="ap__meta">';
        if (a.addressText) html += '<span>' + esc(a.addressText) + '</span>';
        if (timeStr) html += '<span>' + timeStr + '</span>';
        html += '</div>';

        // Description (truncated)
        if (a.description) {
            var desc = a.description.length > 140 ? a.description.substring(0, 140) + '...' : a.description;
            html += '<div class="ap__desc">' + esc(desc) + '</div>';
        }

        // Cảnh báo cho tin chưa xác thực / thiếu bằng chứng
        if (!isVerified) {
            html += '<div class="ap__warning">'
                + '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>'
                + '<span>Báo cáo này chưa đủ bằng chứng xác thực. Vui lòng cẩn trọng và hỗ trợ xác minh nếu bạn đang ở gần.</span>'
                + '</div>';
        }

        // Media preview
        if (a.mediaUrls && a.mediaUrls.length > 0) {
            html += '<div class="ap__media">';
            var max = Math.min(a.mediaUrls.length, 3);
            for (var i = 0; i < max; i++) {
                html += '<img src="' + esc(a.mediaUrls[i]) + '" alt="" loading="lazy" />';
            }
            html += '</div>';
        }

        // Footer: confirm/deny counts
        html += '<div class="ap__footer">';
        html += '<span class="ap__stat ap__stat--confirm">' + (a.confirmCount || 0) + ' xác nhận</span>';
        html += '<span class="ap__stat ap__stat--deny">' + (a.denyCount || 0) + ' phản bác</span>';
        if (a.userName) html += '<span class="ap__user">' + esc(a.userName) + '</span>';
        html += '</div>';

        html += '</div>';
        return html;
    }

    // ── Main init ──
    function initAlertLayer(map) {
        var markers = [];
        var popup = null;

        function clearMarkers() {
            for (var i = 0; i < markers.length; i++) {
                markers[i].remove();
            }
            markers = [];
        }

        function loadAlerts() {
            var bounds = map.getBounds();
            var sw = bounds.getSouthWest();
            var ne = bounds.getNorthEast();
            var now = new Date();
            var from = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            var params = new URLSearchParams({
                southLat: sw.lat.toFixed(6),
                northLat: ne.lat.toFixed(6),
                westLng: sw.lng.toFixed(6),
                eastLng: ne.lng.toFixed(6),
                fromTime: from.toISOString(),
                toTime: now.toISOString()
            });

            fetch('/api/alerts/map?' + params.toString())
                .then(function (res) { return res.json(); })
                .then(function (alerts) {
                    if (!Array.isArray(alerts)) return;
                    clearMarkers();
                    renderMarkers(alerts);
                })
                .catch(function (err) {
                    console.warn('[MAP-DATA] Lỗi tải alerts:', err);
                });
        }

        function renderMarkers(alerts) {
            for (var i = 0; i < alerts.length; i++) {
                var a = alerts[i];
                if (!a.latitude || !a.longitude) continue;

                // Bỏ qua REJECTED, EXPIRED
                if (a.status === 'REJECTED' || a.status === 'EXPIRED') continue;

                var el = createMarkerSvg(a);

                var marker = new goongjs.Marker({ element: el })
                    .setLngLat([parseFloat(a.longitude), parseFloat(a.latitude)])
                    .addTo(map);

                // Click → popup
                (function (alert, mk) {
                    mk.getElement().addEventListener('click', function (e) {
                        e.stopPropagation();
                        if (popup) popup.remove();
                        popup = new goongjs.Popup({
                            offset: 25,
                            closeButton: true,
                            maxWidth: '320px',
                            className: 'alert-popup'
                        })
                            .setLngLat([parseFloat(alert.longitude), parseFloat(alert.latitude)])
                            .setHTML(buildAlertPopup(alert))
                            .addTo(map);
                    });
                })(a, marker);

                markers.push(marker);
            }
        }

        // Load khi map idle
        map.on('load', function () {
            loadAlerts();
        });

        // Reload khi di chuyển map
        var moveTimer = null;
        map.on('moveend', function () {
            clearTimeout(moveTimer);
            moveTimer = setTimeout(loadAlerts, 600);
        });

        // Auto-refresh mỗi 2 phút
        setInterval(loadAlerts, 120000);
    }

    function esc(str) {
        if (!str) return '';
        var d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

})();
