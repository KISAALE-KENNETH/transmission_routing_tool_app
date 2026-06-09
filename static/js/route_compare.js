/**
 * Saved-route storage and overlay management.
 *
 * Each successful optimization is auto-saved here. Users can toggle saved
 * routes on/off to superimpose them on the map (dashed lines in distinct
 * colors), so multiple route options can be compared visually side-by-side.
 *
 * Exposes window.RouteCompare = { save, toggle, remove, clearAll, fitAll, list }.
 */
(function () {
    'use strict';

    // Distinct, high-contrast palette (excludes blue to avoid clashing with the
    // live route which is drawn in #1565c0 by map.js displayRoute).
    const PALETTE = [
        '#e6194B', '#3cb44b', '#ffe119', '#f58231', '#911eb4',
        '#42d4f4', '#f032e6', '#bfef45', '#fabebe', '#9A6324'
    ];
    const MAX_SAVED = 10;
    const savedRoutes = [];

    function nextColor() {
        return PALETTE[savedRoutes.length % PALETTE.length];
    }

    function fmtKm(km) { return (km || 0).toFixed(2) + ' km'; }
    function fmtUsd(v) { return '$' + ((v || 0) / 1e6).toFixed(2) + 'M'; }

    function makeLabel(idx, entry) {
        const algo = (entry.algorithm || 'route').toUpperCase();
        return '#' + (idx + 1) + ' — ' + algo + ' • ' +
               fmtKm(entry.metrics.length_km) + ' • ' +
               fmtUsd(entry.metrics.total_cost);
    }

    function saveCurrentRoute(geojson, extras) {
        if (!geojson || !geojson.geometry) return null;
        extras = extras || {};

        if (savedRoutes.length >= MAX_SAVED) {
            const evicted = savedRoutes.shift();
            if (evicted.layer && typeof map !== 'undefined') map.removeLayer(evicted.layer);
        }

        const props = geojson.properties || {};
        const entry = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            geojson: geojson,
            color: nextColor(),
            layer: null,
            visible: false,
            algorithm: props.algorithm || extras.algorithm || 'unknown',
            metrics: {
                length_km: props.length_km || extras.length_km || 0,
                total_cost: props.total_cost || extras.total_cost || 0,
                cost_per_km: props.cost_per_km || extras.cost_per_km || 0,
                estimated_towers: props.estimated_towers || 0
            }
        };
        entry.label = makeLabel(savedRoutes.length, entry);
        savedRoutes.push(entry);
        renderList();
        return entry;
    }

    function toggleVisibility(id) {
        const e = savedRoutes.find(r => r.id === id);
        if (!e || typeof map === 'undefined') return;
        if (e.visible) {
            if (e.layer) map.removeLayer(e.layer);
            e.visible = false;
        } else {
            e.layer = L.geoJSON(e.geojson, {
                style: { color: e.color, weight: 4, opacity: 0.85, dashArray: '6,4' }
            }).addTo(map);
            e.visible = true;
        }
        renderList();
    }

    function removeRoute(id) {
        const i = savedRoutes.findIndex(r => r.id === id);
        if (i < 0) return;
        const e = savedRoutes[i];
        if (e.layer && typeof map !== 'undefined') map.removeLayer(e.layer);
        savedRoutes.splice(i, 1);
        renderList();
    }

    function clearAll() {
        savedRoutes.forEach(e => {
            if (e.layer && typeof map !== 'undefined') map.removeLayer(e.layer);
        });
        savedRoutes.length = 0;
        renderList();
    }

    function fitAll() {
        if (typeof map === 'undefined') return;
        const visible = savedRoutes.filter(e => e.visible && e.layer);
        if (!visible.length) {
            alert('Toggle on at least one saved route first.');
            return;
        }
        let bounds = visible[0].layer.getBounds();
        for (let i = 1; i < visible.length; i++) {
            bounds = bounds.extend(visible[i].layer.getBounds());
        }
        map.fitBounds(bounds, { padding: [40, 40] });
    }

    function renderList() {
        const host = document.getElementById('savedRoutesList');
        if (!host) return;
        if (!savedRoutes.length) {
            host.innerHTML = '<p style="font-size:11px; color:#777; margin:8px 0;">No saved routes yet. Run an optimization to add one.</p>';
            return;
        }
        let html = '';
        savedRoutes.forEach(e => {
            html += '<div class="saved-route-item" style="display:flex; align-items:center; gap:6px; margin:4px 0; font-size:11px;">'
                 + '<input type="checkbox" data-id="' + e.id + '" class="saved-route-toggle" ' + (e.visible ? 'checked' : '') + '>'
                 + '<span style="display:inline-block; width:14px; height:14px; background:' + e.color + '; border:1px solid #333; flex-shrink:0;"></span>'
                 + '<span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="' + e.label + '">' + e.label + '</span>'
                 + '<button class="saved-route-remove" data-id="' + e.id + '" title="Remove" style="background:transparent; border:none; color:#c33; cursor:pointer; padding:0 4px;">✕</button>'
                 + '</div>';
        });
        host.innerHTML = html;
        host.querySelectorAll('.saved-route-toggle').forEach(cb => {
            cb.addEventListener('change', () => toggleVisibility(cb.dataset.id));
        });
        host.querySelectorAll('.saved-route-remove').forEach(btn => {
            btn.addEventListener('click', () => removeRoute(btn.dataset.id));
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        const clearBtn = document.getElementById('clearSavedRoutesBtn');
        if (clearBtn) clearBtn.addEventListener('click', clearAll);
        const fitBtn = document.getElementById('fitSavedRoutesBtn');
        if (fitBtn) fitBtn.addEventListener('click', fitAll);
        renderList();
    });

    window.RouteCompare = {
        save: saveCurrentRoute,
        toggle: toggleVisibility,
        remove: removeRoute,
        clearAll: clearAll,
        fitAll: fitAll,
        get list() { return savedRoutes.slice(); }
    };
})();
