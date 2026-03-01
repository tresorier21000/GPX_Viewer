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

    // 3. Bouton Fichier Local
    const localFileBtn = document.getElementById('btn-local-file');
    const fileInput = document.getElementById('gpx-file-input');

    localFileBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // État global de l'application
    const appState = {
        tracks: [], // { id, name, gpxLayer, distance, elevationGain, color }
        totalDistance: 0,
        totalElevationGain: 0
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
            elevationProfileContainer.style.display = 'none';
        });
    };

    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            console.log(`${files.length} fichier(s) sélectionné(s)`);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const gpxContent = event.target.result;
                    loadGpxTrack(gpxContent, file.name);
                };
                reader.readAsText(file);
            });
            // Réinitialiser l'input pour permettre de re-sélectionner le même fichier si besoin
            fileInput.value = '';
        }
    });

    /**
     * Charge une trace GPX sur la carte et met à jour l'état
     */
    function loadGpxTrack(gpxContent, fileName) {
        const trackColor = window.trackColors[window.colorIndex % window.trackColors.length];
        window.colorIndex++;
        const trackId = 'track-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

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
                showElevationProfile(elevationData, flatLatLngs, fileName.replace('.gpx', ''), trackColor);
            });

            // --- Flèches Directionnelles ---
            // (Désactivées car incompatibles avec les objets multi-lignes issus de certains GPX, provoquant un crash JS)

            // Centrer la carte sur la trace courante (en attendant les éventuelles autres)
            map.fitBounds(e.target.getBounds());

            const trackData = {
                id: trackId,
                name: fileName.replace('.gpx', ''),
                gpxLayer: gpxLayer,
                distance: distance,
                elevationGain: elevationGain,
                color: trackColor
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

        // Mettre à jour la liste
        trackList.innerHTML = '';
        appState.tracks.forEach(track => {
            const li = document.createElement('li');
            li.className = 'track-item';

            const headerDiv = document.createElement('div');
            headerDiv.className = 'track-item-header';

            const nameDiv = document.createElement('div');
            nameDiv.className = 'track-name';
            nameDiv.innerHTML = `<span class="track-color-indicator" style="background-color: ${track.color};"></span>${track.name}`;

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
    }

    /**
     * Supprime une trace de la carte et de l'état
     */
    function removeTrack(trackId) {
        const trackIndex = appState.tracks.findIndex(t => t.id === trackId);
        if (trackIndex !== -1) {
            const track = appState.tracks[trackIndex];
            // Retirer de la carte
            map.removeLayer(track.gpxLayer);
            // Retirer du tableau d'état
            appState.tracks.splice(trackIndex, 1);
            // Mettre à jour l'UI
            updateDashboard();

            // Réajuster les limites de la carte s'il reste des traces
            if (appState.tracks.length > 0) {
                const group = new L.featureGroup(appState.tracks.map(t => t.gpxLayer));
                map.fitBounds(group.getBounds());
            }
        }
    }

    /**
     * Supprime TOUTES les traces de la carte et de l'état
     */
    function clearAllTracks() {
        if (appState.tracks.length === 0) return;

        // Retirer toutes les couches de la carte
        appState.tracks.forEach(track => {
            map.removeLayer(track.gpxLayer);
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

    closeProfileBtn.addEventListener('click', () => {
        profileContainer.style.display = 'none';
        if (window.graphHoverMarker && map.hasLayer(window.graphHoverMarker)) {
            map.removeLayer(window.graphHoverMarker);
        }
    });

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
     */
    function showElevationProfile(elevationData, flatLatLngs, trackName, color) {
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
const API_KEY = 'AIzaSyCSzh2bC6BleQeaWcqFbJQtBqyzi8H3YKE';
const APP_ID = '129413603825';
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

// Variables globales pour l'API Google hors de l'écouteur DOMContentLoaded
window.tokenClient = null;
window.accessToken = null;
window.pickerInited = false;
window.gisInited = false;

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

    if (window.pickerInited && window.gisInited) {
        driveBtn.disabled = false;
    }

    // On s'assure de ne pas attacher l'événement plusieurs fois
    if (driveBtn.dataset.listenerAttached === 'true') return;
    driveBtn.dataset.listenerAttached = 'true';

    driveBtn.addEventListener('click', () => {
        if (!window.pickerInited || !window.gisInited) {
            alert('L\'API Google est en cours de chargement. Veuillez patienter.');
            return;
        }

        window.tokenClient.callback = async (resp) => {
            if (resp.error !== undefined) {
                throw (resp);
            }
            window.accessToken = resp.access_token;
            createPicker();
        };

        if (window.accessToken === null) {
            // Demander le token si on ne l'a pas
            window.tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            // On a déjà le token, on crée le picker directement sans rien redemander
            createPicker();
        }
    });
}

// On l'appelle aussi au cas où le DOMContentLoaded se déclenche APRES gapi
document.addEventListener('DOMContentLoaded', setupDriveButton);

function createPicker() {
    const view = new google.picker.DocsView(google.picker.ViewId.DOCS);
    view.setIncludeFolders(true); // Permet de voir et naviguer dans les dossiers
    // On autorise les fichiers GPX/XML et aussi le type de dossier Google Drive pour pouvoir naviguer
    view.setMimeTypes('application/octet-stream,application/gpx+xml,text/xml,application/vnd.google-apps.folder');

    const picker = new google.picker.PickerBuilder()
        // On retire NAV_HIDDEN pour afficher le panneau latéral
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .setDeveloperKey(API_KEY)
        .setAppId(APP_ID)
        .setOAuthToken(window.accessToken)
        .addView(view)
        .addView(new google.picker.DocsUploadView())
        .setCallback(pickerCallback)
        .setSize(850, 600)
        .build();
    picker.setVisible(true);
}

async function pickerCallback(data) {
    if (data.action === google.picker.Action.PICKED) {
        console.log("Fichiers Drive sélectionnés :", data.docs);
        const documents = data.docs;

        for (const doc of documents) {
            const fileId = doc.id;
            const fileName = doc.name;

            try {
                // Télécharger le contenu du fichier via un Fetch HTTP avec le token OAuth
                const fileUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
                const response = await fetch(fileUrl, {
                    headers: {
                        'Authorization': `Bearer ${window.accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const gpxContent = await response.text();
                // On utilise window pour appeler loadGpxTrack qui était coincé dans DOMContentLoaded
                // Ah, loadGpxTrack est dans DOMContentLoaded. Rendons-la globale !
                if (typeof window.loadGpxTrackGlobal === 'function') {
                    window.loadGpxTrackGlobal(gpxContent, fileName);
                } else {
                    console.error("loadGpxTrackGlobal n'est pas défini");
                }

            } catch (error) {
                console.error('Erreur lors du téléchargement depuis Drive:', error);
                alert(`Impossible de charger le fichier ${fileName} depuis Drive.`);
            }
        }
    }
}
// Variables globales pour l'API Google hors de l'écouteur DOMContentLoaded
window.tokenClient = null;
window.accessToken = null;
window.pickerInited = false;
window.gisInited = false;

// Initialisation GSI (Appelé par accounts.google.com/gsi/client)
window.gisLoaded = function () {
    console.log("Google Identity Services (GSI) chargé");
    window.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID, // Utilise la constante globale qu'on a défini plus haut
        scope: SCOPES, // Pareil
        callback: '', // défini lors du clic
    });
    window.gisInited = true;

    // Si la page est déjà chargée, on vérifie si le bouton est prêt
    const driveBtn = document.getElementById('btn-google-drive');
    if (driveBtn && window.pickerInited) driveBtn.disabled = false;
};

// Initialisation gapi (Appelé par apis.google.com/js/api.js)
window.gapiLoaded = function () {
    gapi.load('client:picker', initializeGapiClient);
};

async function initializeGapiClient() {
    console.log("GAPI Client chargé");
    await gapi.client.init({
        apiKey: API_KEY, // Utilise la constante globale au lieu de la chaîne en dur
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    });
    window.pickerInited = true;

    const driveBtn = document.getElementById('btn-google-drive');
    if (driveBtn && window.gisInited) driveBtn.disabled = false;
}
