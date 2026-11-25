document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialiser la carte Leaflet
    const map = L.map('map').setView([46.603354, 1.888334], 6); // Centre de la France par défaut

    // 2. Définir les fonds de carte
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    });

    const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)'
    });

    // Fonds Esri World Imagery (Satellite)
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    // Ajouter OSM par défaut
    topoLayer.addTo(map);

    // Contrôle des couches
    const baseMaps = {
        "OpenTopoMap (Rando)": topoLayer,
        "OpenStreetMap": osmLayer,
        "Satellite": satelliteLayer
    };

    L.control.layers(baseMaps).addTo(map);

    // Corriger le problème d'affichage Leaflet au chargement (map grise ou réduite)
    setTimeout(() => {
        map.invalidateSize();
    }, 100);

    // Et à chaque redimensionnement de fenêtre
    window.addEventListener('resize', () => {
        map.invalidateSize();
    });

    console.log("Carte Leaflet initialisée avec succès !");

    // --- Module Géolocalisation & Suivi Rando Smartphone ---
    const gpsState = {
        active: false,
        watchId: null,
        wakeLock: null,
        userMarker: null,
        accuracyCircle: null,
        lastPosition: null,
        autoCenter: true,
        controlButton: null
    };

    function calcDistanceMeters(lat1, lon1, lat2, lon2) {
        if (typeof haversineDistance === 'function') {
            return haversineDistance(lat1, lon1, lat2, lon2);
        }
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function getDistanceToNearestTrack(userLat, userLng) {
        if (!appState.tracks || appState.tracks.length === 0) return null;
        let minDistance = Infinity;

        for (const track of appState.tracks) {
            if (!track.points || track.points.length === 0) continue;
            for (let i = 0; i < track.points.length; i++) {
                const pt = track.points[i];
                const dist = calcDistanceMeters(userLat, userLng, pt.lat, pt.lng);
                if (dist < minDistance) {
                    minDistance = dist;
                }
            }
        }
        return minDistance === Infinity ? null : minDistance;
    }

    function updateGpsBanner(position) {
        const banner = document.getElementById('gps-info-banner');
        const textEl = document.getElementById('gps-info-text');
        const recenterBtn = document.getElementById('btn-gps-recenter');
        if (!banner || !textEl) return;

        if (!gpsState.active) {
            banner.style.display = 'none';
            return;
        }

        banner.style.display = 'flex';

        if (!position) {
            textEl.innerHTML = `Recherche GPS en cours...`;
            return;
        }

        const accuracy = Math.round(position.coords.accuracy || 0);
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const dist = getDistanceToNearestTrack(lat, lng);

        let html = '';
        if (dist === null) {
            html = `GPS actif (±${accuracy} m) &bull; Aucun parcours affiché`;
        } else {
            const roundedDist = Math.round(dist);
            if (roundedDist <= 25) {
                html = `Sur le parcours (<span class="gps-dist">${roundedDist} m</span> &bull; ±${accuracy} m)`;
            } else if (roundedDist <= 100) {
                html = `À <span class="gps-dist">${roundedDist} m</span> du tracé (±${accuracy} m)`;
            } else if (roundedDist < 1000) {
                html = `⚠️ Écart tracé : <span class="gps-dist warning">${roundedDist} m</span> (±${accuracy} m)`;
            } else {
                const km = (roundedDist / 1000).toFixed(1);
                html = `⚠️ Écart tracé : <span class="gps-dist warning">${km} km</span> (±${accuracy} m)`;
            }
        }
        textEl.innerHTML = html;

        if (recenterBtn) {
            recenterBtn.style.display = gpsState.autoCenter ? 'none' : 'inline-block';
        }
    }

    async function requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                gpsState.wakeLock = await navigator.wakeLock.request('screen');
                gpsState.wakeLock.addEventListener('release', () => {
                    console.log('Screen Wake Lock relâché');
                });
                console.log('Screen Wake Lock activé');
            } catch (err) {
                console.warn('Wake Lock non disponible ou refusé :', err);
            }
        }
    }

    function releaseWakeLock() {
        if (gpsState.wakeLock) {
            try {
                gpsState.wakeLock.release();
            } catch (e) {}
            gpsState.wakeLock = null;
        }
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && gpsState.active && !gpsState.wakeLock) {
            requestWakeLock();
        }
    });

    map.on('dragstart', () => {
        if (gpsState.active && gpsState.autoCenter) {
            gpsState.autoCenter = false;
            const recenterBtn = document.getElementById('btn-gps-recenter');
            if (recenterBtn) recenterBtn.style.display = 'inline-block';
        }
    });

    const recenterBtn = document.getElementById('btn-gps-recenter');
    if (recenterBtn) {
        recenterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            gpsState.autoCenter = true;
            recenterBtn.style.display = 'none';
            if (gpsState.lastPosition) {
                const lat = gpsState.lastPosition.coords.latitude;
                const lng = gpsState.lastPosition.coords.longitude;
                map.panTo([lat, lng], { animate: true, duration: 0.5 });
            }
        });
    }

    function startGpsTracking() {
        if (!('geolocation' in navigator)) {
            alert("La géolocalisation n'est pas supportée par votre navigateur.");
            return;
        }

        gpsState.active = true;
        gpsState.autoCenter = true;
        if (gpsState.controlButton) {
            gpsState.controlButton.classList.add('active');
            gpsState.controlButton.setAttribute('title', 'Arrêter la géolocalisation');
        }

        updateGpsBanner(null);
        requestWakeLock();

        gpsState.watchId = navigator.geolocation.watchPosition(
            (pos) => {
                if (!gpsState.active) return;
                gpsState.lastPosition = pos;
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const accuracy = pos.coords.accuracy || 10;

                // 1. Cercle de précision
                if (!gpsState.accuracyCircle) {
                    gpsState.accuracyCircle = L.circle([lat, lng], {
                        radius: accuracy,
                        color: '#3b82f6',
                        fillColor: '#3b82f6',
                        fillOpacity: 0.12,
                        weight: 1
                    }).addTo(map);
                } else {
                    gpsState.accuracyCircle.setLatLng([lat, lng]);
                    gpsState.accuracyCircle.setRadius(accuracy);
                }

                // 2. Marqueur position utilisateur (Point bleu avec onde pulsante)
                if (!gpsState.userMarker) {
                    const gpsIcon = L.divIcon({
                        className: '',
                        html: '<div class="user-gps-wrapper"><div class="user-gps-pulse"></div><div class="user-gps-core"></div></div>',
                        iconSize: [22, 22],
                        iconAnchor: [11, 11]
                    });
                    gpsState.userMarker = L.marker([lat, lng], {
                        icon: gpsIcon,
                        zIndexOffset: 1000
                    }).addTo(map);
                } else {
                    gpsState.userMarker.setLatLng([lat, lng]);
                }

                // 3. Auto-recentrage
                if (gpsState.autoCenter) {
                    if (map.getZoom() < 15) {
                        map.setView([lat, lng], 16, { animate: true });
                    } else {
                        map.panTo([lat, lng], { animate: true });
                    }
                }

                // 4. Mise à jour de la bannière d'information
                updateGpsBanner(pos);
            },
            (err) => {
                console.warn('Erreur GPS :', err);
                let msg = "Erreur de géolocalisation.";
                if (err.code === 1) { // PERMISSION_DENIED
                    msg = "Autorisation de géolocalisation refusée par l'appareil ou le navigateur.\n\nVérifiez que l'accès à la position est autorisé pour ce site dans les paramètres de votre navigateur.";
                } else if (err.code === 2) { // POSITION_UNAVAILABLE
                    msg = "Signal GPS indisponible.\n\nVérifiez que le GPS (localisation) de votre smartphone est activé.";
                } else if (err.code === 3) { // TIMEOUT
                    msg = "Délai de recherche GPS dépassé.";
                }
                alert(msg);
                stopGpsTracking();
            },
            {
                enableHighAccuracy: true,
                maximumAge: 2000,
                timeout: 15000
            }
        );
    }

    function stopGpsTracking() {
        gpsState.active = false;
        if (gpsState.watchId !== null) {
            navigator.geolocation.clearWatch(gpsState.watchId);
            gpsState.watchId = null;
        }
        releaseWakeLock();

        if (gpsState.accuracyCircle && map.hasLayer(gpsState.accuracyCircle)) {
            map.removeLayer(gpsState.accuracyCircle);
            gpsState.accuracyCircle = null;
        }
        if (gpsState.userMarker && map.hasLayer(gpsState.userMarker)) {
            map.removeLayer(gpsState.userMarker);
            gpsState.userMarker = null;
        }
        if (gpsState.controlButton) {
            gpsState.controlButton.classList.remove('active');
            gpsState.controlButton.setAttribute('title', 'Me localiser / Suivi rando (Smartphone)');
        }

        const banner = document.getElementById('gps-info-banner');
        if (banner) banner.style.display = 'none';
    }

    // Ajout du bouton de géolocalisation sur la carte Leaflet
    const LocateControl = L.Control.extend({
        options: { position: 'topleft' },
        onAdd: function () {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-locate');
            const link = L.DomUtil.create('a', '', container);
            link.href = '#';
            link.title = 'Me localiser / Suivi rando (Smartphone)';
            link.setAttribute('role', 'button');
            link.setAttribute('aria-label', 'Me localiser');
            link.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block; margin:auto;">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12 2v3m0 14v3M2 12h3m14 0h3"></path>
                    <circle cx="12" cy="12" r="7" stroke-dasharray="2 2" stroke-width="1.5"></circle>
                </svg>
            `;
            gpsState.controlButton = link;

            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.on(link, 'click', (e) => {
                L.DomEvent.preventDefault(e);
                if (gpsState.active) {
                    stopGpsTracking();
                } else {
                    startGpsTracking();
                }
            });

            return container;
        }
    });
    map.addControl(new LocateControl());

    // 3. Bouton Fichier Local
    const localFileBtn = document.getElementById('btn-local-file');
    const fileInput = document.getElementById('gpx-file-input');

    const folderBtn = document.getElementById('btn-local-folder');
    const folderInput = document.getElementById('folder-input');

    // Type de fichier choisi (GPX par défaut) : filtre l'ouverture locale et Google Drive
    window.getSelectedFormat = function () {
        const checked = document.querySelector('input[name="track-format"]:checked');
        return checked ? checked.value : 'gpx';
    };
    window.SUPPORTED_EXTENSIONS = ['gpx', 'fit', 'trk'];
    window.getFileExtension = function (fileName) {
        const parts = (fileName || '').split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    };
    // Le fichier correspond-il au type choisi ?
    window.matchesSelectedFormat = function (fileName) {
        const ext = window.getFileExtension(fileName);
        const format = window.getSelectedFormat();
        return format === 'all' ? window.SUPPORTED_EXTENSIONS.includes(ext) : ext === format;
    };
    window.formatLabel = function () {
        const format = window.getSelectedFormat();
        return format === 'all' ? 'GPX, FIT ou TRK' : format.toUpperCase();
    };

    function updateAcceptAttribute() {
        const format = window.getSelectedFormat();
        fileInput.accept = format === 'all' ? '.gpx,.fit,.trk' : '.' + format;
    }
    document.querySelectorAll('input[name="track-format"]').forEach(radio => {
        radio.addEventListener('change', updateAcceptAttribute);
    });
    updateAcceptAttribute();

    localFileBtn.addEventListener('click', () => {
        updateAcceptAttribute();
        fileInput.click();
    });

    if (folderBtn && folderInput) {
        folderBtn.addEventListener('click', () => folderInput.click());
        folderInput.addEventListener('change', (e) => {
            const allFiles = Array.from(e.target.files);
            folderInput.value = '';
            if (allFiles.length === 0) {
                // Cas typique : dossier vide, ou dossier Google Drive pour ordinateur (G:) dont les
                // fichiers ne sont pas disponibles hors connexion : le navigateur n'en voit aucun.
                alert("Le navigateur n'a trouvé aucun fichier dans ce dossier.\n\n" +
                    "S'il s'agit d'un dossier Google Drive sur votre ordinateur (lecteur G:), rendez-le d'abord " +
                    "« disponible hors connexion » (clic droit), ou utilisez le bouton « Ouvrir depuis Google Drive ».");
                return;
            }
            console.log(`Dossier : ${allFiles.length} fichier(s) trouvé(s)`);
            // Nom du dossier choisi (premier élément du chemin relatif)
            const folderName = (allFiles[0].webkitRelativePath || '').split('/')[0] || 'dossier';
            // Affiche le contenu du dossier pour choisir les traces (filtrées selon le type choisi)
            window.openLocalFolderExplorer(allFiles, folderName);
        });
    }

    // État global de l'application
    const appState = {
        tracks: [], // { id, name, gpxLayer, distance, elevationGain, color }
        totalDistance: 0,
        totalElevationGain: 0,
        currentProfileTrackId: null // Id de la trace dont le profil est actuellement affiché
    };

    // Éléments du DOM
    const trackList = document.getElementById('track-list');
    const trackCountSpan = document.getElementById('track-count');
    const statTotalDistance = document.getElementById('stat-total-distance');
    const statTotalElevationGain = document.getElementById('stat-total-elevation-gain');
    const btnClearAll = document.getElementById('btn-clear-all');

    // Éléments du Profil Altimétrique
    const elevationProfileContainer = document.getElementById('elevation-profile-container');
    const btnCloseProfile = document.getElementById('btn-close-profile');

    // Éléments du panneau latéral
    const sidebar = document.querySelector('.sidebar');
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const btnOpenSidebar = document.getElementById('btn-open-sidebar');

    function toggleSidebar(collapse) {
        if (collapse) {
            sidebar.classList.add('collapsed');
            document.body.classList.add('sidebar-is-collapsed');
            if (btnOpenSidebar) btnOpenSidebar.style.display = 'flex';
        } else {
            sidebar.classList.remove('collapsed');
            document.body.classList.remove('sidebar-is-collapsed');
            if (btnOpenSidebar) btnOpenSidebar.style.display = 'none';
        }
        // Recalculer immédiatement et après la transition CSS pour Leaflet
        map.invalidateSize();
        setTimeout(() => {
            map.invalidateSize();
        }, 150);
        setTimeout(() => {
            map.invalidateSize();
        }, 350);
    }

    if (btnToggleSidebar) {
        btnToggleSidebar.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar(true);
        });
    }
    if (btnOpenSidebar) {
        btnOpenSidebar.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar(false);
        });
    }

    // Éléments de la Modale d'Aide
    const btnHelp = document.getElementById('btn-help');
    const btnCloseHelp = document.getElementById('btn-close-help');
    const helpModal = document.getElementById('help-modal');

    // --- Logique Modale d'Aide ---
    btnHelp.addEventListener('click', () => {
        helpModal.style.display = 'flex';
    });

    btnCloseHelp.addEventListener('click', () => {
        helpModal.style.display = 'none';
    });

    // Fermer la modale en cliquant à l'extérieur (sur le fond gris)
    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
            helpModal.style.display = 'none';
        }
    });

    // --- Fermeture du profil altimétrique ---
    if (btnCloseProfile) {
        btnCloseProfile.addEventListener('click', () => {
            if (typeof closeElevationProfile === 'function') {
                closeElevationProfile();
            } else {
                elevationProfileContainer.style.display = 'none';
            }
        });
    }

    // Lecture d'un fichier local selon son extension
    function readLocalFile(file) {
        const ext = window.getFileExtension(file.name);
        const reader = new FileReader();
        reader.onerror = () => alert(`Impossible de lire le fichier "${file.name}".`);
        if (ext === 'fit') {
            reader.onload = (event) => loadFitTrack(event.target.result, file.name);
            reader.readAsArrayBuffer(file);
        } else if (ext === 'trk') {
            reader.onload = (event) => loadTrkTrack(event.target.result, file.name);
            reader.readAsText(file);
        } else {
            // GPX par défaut
            reader.onload = (event) => loadGpxTrack(event.target.result, file.name);
            reader.readAsText(file);
        }
    }

    // Glisser-déposer des fichiers sur la page (même filtrage par type)
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', (e) => {
        e.preventDefault();
        const allFiles = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
        if (allFiles.length === 0) return;
        const files = allFiles.filter(f => window.matchesSelectedFormat(f.name));
        if (files.length < allFiles.length) {
            alert(`${allFiles.length - files.length} fichier(s) ignoré(s) : ils ne sont pas au format ${window.formatLabel()}.`);
        }
        files.forEach(readLocalFile);
    });

    window.readLocalFileGlobal = readLocalFile;

    fileInput.addEventListener('change', (e) => {
        const allFiles = Array.from(e.target.files);
        // Réinitialiser l'input pour permettre de re-sélectionner le même fichier si besoin
        fileInput.value = '';
        if (allFiles.length === 0) return;
        const files = allFiles.filter(f => window.matchesSelectedFormat(f.name));
        const ignored = allFiles.length - files.length;
        if (ignored > 0) {
            alert(`${ignored} fichier(s) ignoré(s) : ils ne sont pas au format ${window.formatLabel()}.`);
        }
        console.log(`${files.length} fichier(s) sélectionné(s)`);
        files.forEach(readLocalFile);
    });

    /**
     * Charge une trace GPX sur la carte et met à jour l'état
     */
    /**
     * Crée et affiche une trace issue d'un format décodé personnalisé (FIT ou TRK)
     */
    function createCustomTrack(points, fileName, format) {
        if (!points || points.length < 2) {
            alert(`La trace ${fileName} ne contient pas assez de points valides.`);
            return;
        }

        const trackColor = window.trackColors[window.colorIndex % window.trackColors.length];
        window.colorIndex++;
        const trackId = 'track-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

        const metrics = window.computeTrackMetrics(points);
        const flatLatLngs = points.map(p => L.latLng(p.lat, p.lng));

        const polyline = L.polyline(flatLatLngs, {
            color: trackColor,
            weight: 4,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round'
        });

        // Icônes de départ et d'arrivée
        const startIcon = L.icon({
            iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet-gpx@1.7.0/pin-icon-start.png',
            iconSize: [33, 50],
            iconAnchor: [16, 45],
            shadowUrl: 'https://cdn.jsdelivr.net/npm/leaflet-gpx@1.7.0/pin-shadow.png',
            shadowSize: [50, 50],
            shadowAnchor: [16, 45]
        });
        const endIcon = L.icon({
            iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet-gpx@1.7.0/pin-icon-end.png',
            iconSize: [33, 50],
            iconAnchor: [16, 45],
            shadowUrl: 'https://cdn.jsdelivr.net/npm/leaflet-gpx@1.7.0/pin-shadow.png',
            shadowSize: [50, 50],
            shadowAnchor: [16, 45]
        });

        const startMarker = L.marker(flatLatLngs[0], { icon: startIcon });
        const endMarker = L.marker(flatLatLngs[flatLatLngs.length - 1], { icon: endIcon });

        const trackGroup = L.featureGroup([polyline, startMarker, endMarker]).addTo(map);

        // Événement de clic pour le profil altimétrique
        const cleanName = fileName.replace(/\.[^/.]+$/, '');
        polyline.on('click', () => {
            showElevationProfile(metrics.elevationData, flatLatLngs, cleanName, trackColor, trackId);
        });

        // Flèches directionnelles régulières
        let arrowDecorator = null;
        if (flatLatLngs.length > 1 && typeof L.polylineDecorator === 'function') {
            try {
                arrowDecorator = L.polylineDecorator(flatLatLngs, {
                    patterns: [
                        {
                            offset: '25px',
                            repeat: '75px',
                            symbol: L.Symbol.arrowHead({
                                pixelSize: 10,
                                polygon: false,
                                pathOptions: {
                                    stroke: true,
                                    color: trackColor,
                                    weight: 2,
                                    opacity: 0.85
                                }
                            })
                        }
                    ]
                }).addTo(map);
            } catch (err) {
                console.warn("Impossible d'ajouter les flèches sur la trace :", err);
            }
        }

        map.fitBounds(trackGroup.getBounds());

        const trackData = {
            id: trackId,
            name: cleanName,
            format: format,
            gpxLayer: trackGroup,
            arrowDecorator: arrowDecorator,
            distance: metrics.distanceKm,
            elevationGain: metrics.elevationGainM,
            color: trackColor,
            points: points
        };

        appState.tracks.push(trackData);
        updateDashboard();

        clearTimeout(window.fitBoundsTimeout);
        window.fitBoundsTimeout = setTimeout(() => {
            if (appState.tracks.length > 1) {
                const group = new L.featureGroup(appState.tracks.map(t => t.gpxLayer));
                map.fitBounds(group.getBounds(), { padding: [20, 20] });
            }
        }, 300);
    }

    /**
     * Charge une trace binaire FIT
     */
    function loadFitTrack(arrayBuffer, fileName) {
        try {
            if (typeof window.parseFit !== 'function') {
                throw new Error("Le module de décodage FIT n'est pas chargé.");
            }
            const points = window.parseFit(arrayBuffer);
            createCustomTrack(points, fileName, 'FIT');
        } catch (err) {
            console.error("Erreur lecture FIT :", err);
            alert(`Impossible de lire le fichier FIT "${fileName}" :\n${err.message}`);
        }
    }

    /**
     * Charge une trace texte TRK
     */
    function loadTrkTrack(textContent, fileName) {
        try {
            if (typeof window.parseTrk !== 'function') {
                throw new Error("Le module de décodage TRK n'est pas chargé.");
            }
            const points = window.parseTrk(textContent);
            createCustomTrack(points, fileName, 'TRK');
        } catch (err) {
            console.error("Erreur lecture TRK :", err);
            alert(`Impossible de lire le fichier TRK "${fileName}" :\n${err.message}`);
        }
    }

    // Exposer globalement pour Google Drive Picker
    window.loadFitTrackGlobal = loadFitTrack;
    window.loadTrkTrackGlobal = loadTrkTrack;

    // Fonction utilitaire pour extraire le nom lisible de la trace (surtout utile quand Android renomme le fichier en "inbound...")
    function extractTrackName(gpxContent, fallbackFileName) {
        try {
            // Recherche de la balise <name> dans <trk> ou <metadata>
            const match = gpxContent.match(/<trk>[\s\S]*?<name>([\s\S]*?)<\/name>/i) 
                       || gpxContent.match(/<metadata>[\s\S]*?<name>([\s\S]*?)<\/name>/i)
                       || gpxContent.match(/<name>([\s\S]*?)<\/name>/i);
            if (match && match[1]) {
                const cleaned = match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
                if (cleaned.length > 0) {
                    return cleaned;
                }
            }
        } catch (err) {
            console.warn("Impossible d'extraire le nom XML du GPX:", err);
        }
        return (fallbackFileName || 'Trace GPX').replace(/\.[^/.]+$/, '');
    }

    function loadGpxTrack(gpxContent, fileName) {
        const trackColor = window.trackColors[window.colorIndex % window.trackColors.length];
        window.colorIndex++;
        const trackId = 'track-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

        // Si le nom du fichier est générique (type inbound... sur Android/iOS), ou systématiquement si disponible, on cherche le vrai nom dans le GPX
        let cleanName = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Trace';
        if (/^inbound/i.test(cleanName) || /^[0-9a-f]{10,}/i.test(cleanName) || /^document/i.test(cleanName)) {
            cleanName = extractTrackName(gpxContent, fileName);
        } else {
            // Si le GPX contient un nom interne explicite, on peut aussi l'utiliser
            const internalName = extractTrackName(gpxContent, null);
            if (internalName && internalName !== 'Trace GPX') {
                cleanName = internalName;
            }
        }

        const gpxLayer = new L.GPX(gpxContent, {
            async: true,
            marker_options: {
                startIconUrl: 'https://cdn.jsdelivr.net/npm/leaflet-gpx@1.7.0/pin-icon-start.png',
                endIconUrl: 'https://cdn.jsdelivr.net/npm/leaflet-gpx@1.7.0/pin-icon-end.png',
                shadowUrl: 'https://cdn.jsdelivr.net/npm/leaflet-gpx@1.7.0/pin-shadow.png'
            },
            polyline_options: {
                color: trackColor,
                weight: 4,
                opacity: 0.8,
                lineCap: 'round',
                lineJoin: 'round'
            }
        }).on('loaded', function (e) {
            const distance = e.target.get_distance() / 1000; // en km
            const elevationGain = e.target.get_elevation_gain(); // en m
            const elevationData = e.target.get_elevation_data(); // Récupère le tableau [distance, elevation, desc]

            // --- Données GPS pour le graphique interactif ---
            // Certains GPX encapsulent la trace dans de multiples FeatureGroups (parfois imbriqués)
            // On utilise une recherche récursive pour trouver la première vraie Polyline
            let polyline = null;
            function findPolyline(layerGroup) {
                const layers = layerGroup.getLayers ? layerGroup.getLayers() : [];
                for (const layer of layers) {
                    if (typeof layer.getLatLngs === 'function') {
                        return layer;
                    }
                    if (layer.getLayers) {
                        const found = findPolyline(layer);
                        if (found) return found;
                    }
                }
                return null;
            }

            polyline = findPolyline(e.target);

            if (!polyline) {
                console.error("Impossible de trouver la trace polyline dans le GPX.");
                return;
            }

            const latlngs = polyline.getLatLngs();

            // Sécurisation de l'aplatissement selon le format retourné (single line vs multi-line GPX)
            let flatLatLngs = [];
            if (Array.isArray(latlngs) && latlngs.length > 0) {
                if (Array.isArray(latlngs[0])) {
                    // C'est un MultiPolyline : On l'aplatit en s'assurant de gérer la profondeur
                    flatLatLngs = latlngs.flat(Infinity);
                } else {
                    // C'est un simple tableau de coordonnées
                    flatLatLngs = latlngs;
                }
            }

            // Ajouter l'évènement de clic sur la trace pour afficher son profil
            polyline.on('click', () => {
                showElevationProfile(elevationData, flatLatLngs, cleanName, trackColor, trackId);
            });

            // --- Fleches Directionnelles ---
            let arrowDecorator = null;
            if (flatLatLngs && flatLatLngs.length > 1 && typeof L.polylineDecorator === 'function') {
                try {
                    arrowDecorator = L.polylineDecorator(flatLatLngs, {
                        patterns: [
                            {
                                offset: '25px',
                                repeat: '75px',
                                symbol: L.Symbol.arrowHead({
                                    pixelSize: 10,
                                    polygon: false,
                                    pathOptions: {
                                        stroke: true,
                                        color: trackColor,
                                        weight: 2,
                                        opacity: 0.85
                                    }
                                })
                            }
                        ]
                    }).addTo(map);
                } catch (err) {
                    console.warn("Impossible d'ajouter les fleches sur la trace :", err);
                }
            }

            // Centrer la carte sur la trace courante (en attendant les eventuelles autres)
            map.fitBounds(e.target.getBounds());

            const trackData = {
                id: trackId,
                name: cleanName,
                format: 'GPX',
                gpxLayer: gpxLayer,
                arrowDecorator: arrowDecorator,
                distance: distance,
                elevationGain: elevationGain,
                color: trackColor,
                points: flatLatLngs.map(ll => ({ lat: ll.lat, lng: ll.lng }))
            };

            appState.tracks.push(trackData);
            updateDashboard();

            // Recalibrer la carte pour englober TOUTES les traces, MAIS avec un délai (Debounce)
            // Car le chargement de 4 fichiers d'un coup est asynchrone
            clearTimeout(window.fitBoundsTimeout);
            window.fitBoundsTimeout = setTimeout(() => {
                if (appState.tracks.length > 1) {
                    const group = new L.featureGroup(appState.tracks.map(t => t.gpxLayer));
                    map.fitBounds(group.getBounds(), { padding: [20, 20] });
                }
            }, 300);

        }).addTo(map);
    }

    // Rendre la fonction accessible globalement pour le Picker Google Drive
    window.loadGpxTrackGlobal = loadGpxTrack;

    /**
     * Met à jour le tableau de bord (Liste + Stats)
     */
    function updateDashboard() {
        // Mettre à jour les stats
        appState.totalDistance = appState.tracks.reduce((sum, track) => sum + track.distance, 0);
        appState.totalElevationGain = appState.tracks.reduce((sum, track) => sum + track.elevationGain, 0);

        trackCountSpan.textContent = appState.tracks.length;
        statTotalDistance.textContent = appState.totalDistance.toFixed(2) + ' km';
        statTotalElevationGain.textContent = Math.round(appState.totalElevationGain) + ' m';

        // Afficher la flèche de fermeture du panneau seulement si au moins une trace est chargée
        if (btnToggleSidebar) {
            btnToggleSidebar.style.display = appState.tracks.length > 0 ? 'flex' : 'none';
        }
        // Si toutes les traces ont été supprimées et que la sidebar était fermée, la rouvrir
        if (appState.tracks.length === 0 && sidebar && sidebar.classList.contains('collapsed')) {
            toggleSidebar(false);
        }

        // Mettre à jour la liste
        trackList.innerHTML = '';
        appState.tracks.forEach(track => {
            const li = document.createElement('li');
            li.className = 'track-item';

            const headerDiv = document.createElement('div');
            headerDiv.className = 'track-item-header';

            const nameDiv = document.createElement('div');
            nameDiv.className = 'track-name';
            const badgeClass = track.format ? `badge-${track.format.toLowerCase()}` : 'badge-gpx';
            const formatText = track.format || 'GPX';
            nameDiv.innerHTML = `<span class="track-color-indicator" style="background-color: ${track.color};"></span>${escapeHtml(track.name)}<span class="track-format-badge ${badgeClass}">${formatText}</span>`;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-delete';
            deleteBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            `;
            deleteBtn.title = "Supprimer la trace";
            deleteBtn.addEventListener('click', () => removeTrack(track.id));

            headerDiv.appendChild(nameDiv);
            headerDiv.appendChild(deleteBtn);

            const statsDiv = document.createElement('div');
            statsDiv.className = 'track-item-stats';
            statsDiv.innerHTML = `
                <span>Dist: ${track.distance.toFixed(1)} km</span>
                <span>D+: ${Math.round(track.elevationGain)} m</span>
            `;

            li.appendChild(headerDiv);
            li.appendChild(statsDiv);
            trackList.appendChild(li);
        });

        // Si le suivi GPS est actif, actualiser immédiatement la distance à la trace
        if (gpsState.active && gpsState.lastPosition) {
            updateGpsBanner(gpsState.lastPosition);
        }
    }

    /**
     * Ferme le profil altimétrique et nettoie les ressources associées (graphique et curseur sur la carte)
     */
    function closeElevationProfile() {
        if (profileContainer) {
            profileContainer.style.display = 'none';
        }
        if (elevationChart) {
            elevationChart.destroy();
            elevationChart = null;
        }
        appState.currentProfileTrackId = null;
        if (window.graphHoverMarker && map.hasLayer(window.graphHoverMarker)) {
            map.removeLayer(window.graphHoverMarker);
        }
    }

    /**
     * Supprime une trace de la carte et de l'état
     */
    function removeTrack(trackId) {
        const trackIndex = appState.tracks.findIndex(t => t.id === trackId);
        if (trackIndex !== -1) {
            const track = appState.tracks[trackIndex];

            // Si le profil altimétrique actuellement affiché est celui de cette trace, on le ferme
            if (appState.currentProfileTrackId === trackId) {
                closeElevationProfile();
            }

            // Retirer de la carte
            map.removeLayer(track.gpxLayer);
            if (track.arrowDecorator && map.hasLayer(track.arrowDecorator)) {
                map.removeLayer(track.arrowDecorator);
            }
            // Retirer du tableau d'état
            appState.tracks.splice(trackIndex, 1);
            // Mettre à jour l'UI
            updateDashboard();

            // Réajuster les limites de la carte s'il reste des traces
            if (appState.tracks.length > 0) {
                const group = new L.featureGroup(appState.tracks.map(t => t.gpxLayer));
                map.fitBounds(group.getBounds());
            } else {
                // S'il n'y a plus aucune trace, s'assurer que le profil est bien fermé
                closeElevationProfile();
            }
        }
    }

    /**
     * Supprime TOUTES les traces de la carte et de l'état
     */
    function clearAllTracks() {
        if (appState.tracks.length === 0) return;

        // Fermer le profil altimétrique
        closeElevationProfile();

        // Retirer toutes les couches de la carte
        appState.tracks.forEach(track => {
            map.removeLayer(track.gpxLayer);
            if (track.arrowDecorator && map.hasLayer(track.arrowDecorator)) {
                map.removeLayer(track.arrowDecorator);
            }
        });

        // Vider l'état
        appState.tracks = [];
        window.colorIndex = 0; // Réinitialiser le compteur de couleur

        // Mettre à jour l'UI
        updateDashboard();
    }

    // Écouteur pour le bouton "Tout Effacer"
    document.getElementById('btn-clear-all').addEventListener('click', clearAllTracks);

    // --- Profil Altimétrique (Chart.js) ---
    let elevationChart = null;
    const profileContainer = document.getElementById('elevation-profile-container');
    const profileTitle = document.getElementById('profile-title');
    const closeProfileBtn = document.getElementById('btn-close-profile');

    if (closeProfileBtn) {
        closeProfileBtn.addEventListener('click', closeElevationProfile);
    }

    // Écouteur pour cacher le marqueur quand la souris quitte la zone du graphique
    document.getElementById('elevation-chart').addEventListener('mouseleave', () => {
        if (window.graphHoverMarker && map.hasLayer(window.graphHoverMarker)) {
            map.removeLayer(window.graphHoverMarker);
        }
    });

    /**
     * Affiche le profil altimétrique de la trace donnée en utilisant Chart.js
     * @param {Array} elevationData - Tableau de points [distance, elevation, tooltip_desc]
     * @param {Array} flatLatLngs - Tableau des coordonnées géographiques associées (pour le pointeur)
     * @param {String} trackName - Nom de la trace
     * @param {String} color - Couleur de la trace pour le style
     * @param {String} trackId - Identifiant unique de la trace
     */
    function showElevationProfile(elevationData, flatLatLngs, trackName, color, trackId) {
        // Mémoriser quelle trace a son profil affiché
        appState.currentProfileTrackId = trackId || null;

        // Préparer les données pour Chart.js
        // elevationData format classique Leaflet-gpx: [[distance_en_m, elevation, label], ...]
        // Attention: Leaflet-gpx renvoie parfois la distance en km directement selon sa version/config, on vérifie
        const labels = elevationData.map(pt => (pt[0] > 1000 ? pt[0] / 1000 : pt[0]).toFixed(1)); // Distance axe X (approx km)
        const dataPoints = elevationData.map(pt => pt[1]); // Elevation axe Y

        profileTitle.textContent = "Profil : " + trackName;
        profileContainer.style.display = 'flex'; // Afficher la fenêtre

        const ctx = document.getElementById('elevation-chart').getContext('2d');

        // Détruire le graph précédent s'il existe
        if (elevationChart) {
            elevationChart.destroy();
        }

        elevationChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Altitude (m)',
                    data: dataPoints,
                    borderColor: color,
                    backgroundColor: color + '33', // Version transparente de la couleur pour remplir (HEX + 33 = 20% opacity)
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1, // Lissure légère de la courbe
                    pointRadius: 0 // Ne pas afficher de points moches à chaque donnée, que la ligne
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                onHover: (event, activeElements) => {
                    if (activeElements.length > 0) {
                        const dataIndex = activeElements[0].index;

                        // Si le point géographique correspondant existe
                        if (flatLatLngs && flatLatLngs[dataIndex]) {
                            const latlng = flatLatLngs[dataIndex];

                            // Création du marqueur miroir s'il n'existe pas encore
                            if (!window.graphHoverMarker) {
                                window.graphHoverMarker = L.circleMarker(latlng, {
                                    radius: 6,
                                    color: '#ffffff', // Bordure blanche pour contraster
                                    weight: 2,
                                    fillColor: color,
                                    fillOpacity: 1
                                }).addTo(map);
                            } else {
                                // Mise à jour de la position et de la couleur du marqueur
                                window.graphHoverMarker.setLatLng(latlng);
                                window.graphHoverMarker.setStyle({ fillColor: color });
                                if (!map.hasLayer(window.graphHoverMarker)) {
                                    window.graphHoverMarker.addTo(map);
                                }
                            }
                        }
                    }
                },
                plugins: {
                    legend: { display: false }, // Cacher la légende pour gagner de la place
                    tooltip: {
                        callbacks: {
                            title: function (context) {
                                return 'Distance : ' + context[0].label + ' km';
                            },
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#e2e8f0',
                            maxTicksLimit: 10 // Ne pas surcharger l'axe X de texte
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    y: {
                        ticks: {
                            color: '#e2e8f0',
                            callback: function (value) { return value + ' m'; }
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                }
            }
        });
    }

    // Le bouton Google Drive est géré à l'extérieur pour éviter les problèmes de chronologie de chargement
}); // Fin du DOMContentLoaded principal

// --- Configuration de l'API Google ---
// Ces constantes doivent être accessibles globalement pour les scripts GSI et GAPI
const CLIENT_ID = '129413603825-hhavjkceh88vfou7q3okoffhn460u0id.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

// Variables globales pour l'API Google hors de l'écouteur DOMContentLoaded
window.tokenClient = null;
window.accessToken = null;
window.tokenExpiry = 0; // Horodatage (ms) d'expiration du jeton d'accès
window.pickerInited = true; // plus de dépendance au Google Picker (explorateur Drive intégré)
window.gisInited = false;

// Échappe le texte avant insertion HTML (noms de fichiers)
function escapeHtml(text) {
    return String(text == null ? '' : text)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Le jeton est-il encore utilisable ? (marge de sécurité de 60 s)
function isTokenValid() {
    return window.accessToken !== null && Date.now() < window.tokenExpiry;
}

// Oublie le jeton courant (expiré ou refusé par Google)
function resetToken() {
    window.accessToken = null;
    window.tokenExpiry = 0;
}

// Couleurs globales pour être accessibles de partout
window.trackColors = [
    '#FF0000', '#0033FF', '#009900', '#FF9900', '#9900CC',
    '#00CCFF', '#FF0099', '#999900', '#660000', '#000066',
];
window.colorIndex = 0;

// Logique du bouton Drive (Attachée quand le DOM est prêt ET les API sont prêtes)
function setupDriveButton() {
    const driveBtn = document.getElementById('btn-google-drive');
    if (!driveBtn) return;

    // Détection du mode local (file:///) : adapter le message d'aide en bas de la barre latérale
    if (window.location.protocol === 'file:') {
        const driveNotice = document.getElementById('drive-access-notice');
        if (driveNotice) {
            driveNotice.innerHTML = `⚠️ <strong>Application locale (file://)</strong><br>` +
                `Google interdit la connexion Cloud en local. Pour ouvrir votre Drive, utilisez la ` +
                `<a href="https://tresorier21000.github.io/GPX_Viewer/" target="_blank" style="color: var(--primary-color); text-decoration: underline; font-weight: bold;">version en ligne officielle</a>.`;
        }
    }

    if (window.pickerInited && window.gisInited) {
        driveBtn.disabled = false;
    }

    // On s'assure de ne pas attacher l'événement plusieurs fois
    if (driveBtn.dataset.listenerAttached === 'true') return;
    driveBtn.dataset.listenerAttached = 'true';

    driveBtn.addEventListener('click', () => {
        // En mode local (file://), Google interdit l'accès OAuth / Drive
        if (window.location.protocol === 'file:') {
            const confirmed = confirm(
                "L'accès à Google Drive n'est pas autorisé par Google depuis une application installée sur l'ordinateur (protocole file://).\n\n" +
                "Souhaitez-vous ouvrir la version en ligne officielle (https://tresorier21000.github.io/GPX_Viewer/) pour accéder à votre Google Drive ?"
            );
            if (confirmed) {
                window.open('https://tresorier21000.github.io/GPX_Viewer/', '_blank');
            }
            return;
        }

        if (!window.pickerInited || !window.gisInited) {
            alert('L\'API Google est en cours de chargement. Veuillez patienter.');
            return;
        }

        window.tokenClient.callback = async (resp) => {
            if (resp.error !== undefined) {
                console.error('Erreur d\'autorisation Google :', resp);
                resetToken();
                if (resp.error === 'access_denied') {
                    alert('Accès à Google Drive refusé.\n\nSi vous n\'avez pas cliqué sur "Annuler", votre adresse Gmail n\'est peut-être pas encore autorisée : demandez l\'accès au développeur.');
                } else {
                    alert(`Erreur lors de la connexion à Google : ${resp.error}${resp.error_description ? '\n' + resp.error_description : ''}`);
                }
                return;
            }
            window.accessToken = resp.access_token;
            window.hasConsented = true; // L'accord est donné : les renouvellements seront silencieux
            // Le jeton expire (≈ 1 h) : on mémorise l'échéance avec 60 s de marge
            const expiresIn = Number(resp.expires_in) || 3600;
            window.tokenExpiry = Date.now() + (expiresIn - 60) * 1000;
            openDriveExplorer();
        };

        if (isTokenValid()) {
            // Jeton encore valide : on ouvre le picker directement
            openDriveExplorer();
        } else if (!window.hasConsented) {
            // Première demande dans cette session : écran de consentement complet
            window.tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            // Jeton expiré : on en redemande un (silencieux si l'accord est déjà donné)
            window.accessToken = null;
            window.tokenClient.requestAccessToken({ prompt: '' });
        }
    });
}

// On l'appelle aussi au cas où le DOMContentLoaded se déclenche APRES gapi
document.addEventListener('DOMContentLoaded', setupDriveButton);

// Erreur dédiée pour interrompre proprement le chargement si le jeton a expiré
class DriveSessionExpiredError extends Error {}

async function driveFetch(url) {
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${window.accessToken}` }
    });
    if (response.status === 401) {
        resetToken();
        throw new DriveSessionExpiredError('Session Google expirée');
    }
    if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`);
    }
    return response;
}

// Télécharge un fichier Drive et l'affiche selon son extension
async function loadDriveFile(fileId, fileName) {
    const response = await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`);
    const ext = window.getFileExtension(fileName);
    if (ext === 'fit') {
        window.loadFitTrackGlobal(await response.arrayBuffer(), fileName);
    } else if (ext === 'trk') {
        window.loadTrkTrackGlobal(await response.text(), fileName);
    } else {
        window.loadGpxTrackGlobal(await response.text(), fileName);
    }
}

function handleDriveError(error, context) {
    if (error instanceof DriveSessionExpiredError) {
        alert('Votre session Google a expiré.\nCliquez à nouveau sur "Ouvrir depuis Google Drive" pour vous reconnecter.');
        return;
    }
    console.error(`Erreur Drive (${context}) :`, error);
    alert(`Erreur Google Drive pendant ${context} :\n${error.message}`);
}

// Initialisation GSI (Appelé par accounts.google.com/gsi/client)
window.gisLoaded = function () {
    console.log("Google Identity Services (GSI) chargé");
    window.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID, // Utilise la constante globale qu'on a défini plus haut
        scope: SCOPES, // Pareil
        callback: '', // défini lors du clic
        // Erreurs liées à la fenêtre de connexion (bloquée ou fermée)
        error_callback: (err) => {
            console.warn('Fenêtre de connexion Google :', err);
            if (err && err.type === 'popup_failed_to_open') {
                alert('La fenêtre de connexion Google a été bloquée par le navigateur.\nAutorisez les fenêtres pop-up pour ce site puis réessayez.');
            } else if (err && err.type === 'popup_closed') {
                // L'utilisateur a fermé la fenêtre : rien de grave, pas d'alerte
            } else {
                alert('Erreur lors de l\'ouverture de la connexion Google : ' + (err && err.type ? err.type : 'inconnue'));
            }
        },
    });
    window.gisInited = true;

    // Si la page est déjà chargée, on vérifie si le bouton est prêt
    const driveBtn = document.getElementById('btn-google-drive');
    if (driveBtn && window.pickerInited) driveBtn.disabled = false;
};
