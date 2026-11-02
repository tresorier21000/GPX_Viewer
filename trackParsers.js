/**
 * trackParsers.js - Modules de décodage pour les formats FIT et TRK
 * GPX Viewer v1.4.0
 */

// Calcul de distance entre deux points GPS (formule de Haversine en mètres)
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Rayon de la Terre en mètres
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Calcul des statistiques globales (distance cumulée, D+ filtré, courbe altimétrique)
function computeTrackMetrics(points) {
    let totalDist = 0;
    let totalDPlus = 0;
    const elevationData = [];

    for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        if (i > 0) {
            const prev = points[i - 1];
            const d = haversineDistance(prev.lat, prev.lng, pt.lat, pt.lng);
            totalDist += d;

            // Seuil de 0.5 m pour filtrer le bruit GPS sur le D+
            const dEle = pt.ele - prev.ele;
            if (dEle > 0.5) {
                totalDPlus += dEle;
            }
        }
        elevationData.push([totalDist / 1000, pt.ele, '']); // distance en km (comme leaflet-gpx)
    }

    return {
        distanceKm: totalDist / 1000,
        elevationGainM: Math.round(totalDPlus),
        elevationData: elevationData
    };
}

/**
 * Décode un fichier binaire Garmin/Wahoo .FIT
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Array<{lat: number, lng: number, ele: number}>}
 */
function parseFit(arrayBuffer) {
    const dataView = new DataView(arrayBuffer);
    if (arrayBuffer.byteLength < 14) {
        throw new Error("Fichier FIT trop court.");
    }
    const headerLength = dataView.getUint8(0);
    let signature = '';
    for (let i = 8; i < 12; i++) {
        signature += String.fromCharCode(dataView.getUint8(i));
    }
    if (signature !== '.FIT') {
        throw new Error("Ce fichier n'est pas un fichier FIT valide (signature '.FIT' absente).");
    }

    const dataSize = dataView.getUint32(4, true);
    const totalDataEnd = Math.min(headerLength + dataSize, arrayBuffer.byteLength);

    let offset = headerLength;
    const localMesgDefs = {};
    const points = [];

    while (offset < totalDataEnd) {
        const recordHeader = dataView.getUint8(offset++);

        // En-tête standard
        if ((recordHeader & 0x80) === 0) {
            const isDefinition = (recordHeader & 0x40) !== 0;
            const hasDevData = (recordHeader & 0x20) !== 0;
            const localMsgType = recordHeader & 0x0F;

            if (isDefinition) {
                offset++; // réservé
                const architecture = dataView.getUint8(offset++);
                const isLittleEndian = (architecture === 0);
                const globalMsgNum = dataView.getUint16(offset, isLittleEndian);
                offset += 2;
                const numFields = dataView.getUint8(offset++);
                const fields = [];

                for (let i = 0; i < numFields; i++) {
                    const fieldDefNum = dataView.getUint8(offset++);
                    const size = dataView.getUint8(offset++);
                    const baseType = dataView.getUint8(offset++);
                    fields.push({ fieldDefNum, size, baseType });
                }

                let devFields = [];
                if (hasDevData) {
                    const numDevFields = dataView.getUint8(offset++);
                    for (let i = 0; i < numDevFields; i++) {
                        const defNum = dataView.getUint8(offset++);
                        const size = dataView.getUint8(offset++);
                        const devIdx = dataView.getUint8(offset++);
                        devFields.push({ defNum, size, devIdx });
                    }
                }

                localMesgDefs[localMsgType] = {
                    globalMsgNum,
                    isLittleEndian,
                    fields,
                    devFields
                };
            } else {
                // Données
                const def = localMesgDefs[localMsgType];
                if (!def) break;

                if (def.globalMsgNum === 20) { // 20 = record GPS
                    let lat = null;
                    let lon = null;
                    let alt = null;
                    let enhancedAlt = null;

                    for (const field of def.fields) {
                        if (offset + field.size > arrayBuffer.byteLength) break;
                        if (field.fieldDefNum === 0 && field.size === 4) {
                            lat = dataView.getInt32(offset, def.isLittleEndian);
                        } else if (field.fieldDefNum === 1 && field.size === 4) {
                            lon = dataView.getInt32(offset, def.isLittleEndian);
                        } else if (field.fieldDefNum === 2 && field.size === 2) {
                            alt = dataView.getUint16(offset, def.isLittleEndian);
                        } else if (field.fieldDefNum === 78 && field.size === 4) {
                            enhancedAlt = dataView.getUint32(offset, def.isLittleEndian);
                        }
                        offset += field.size;
                    }
                    if (def.devFields) {
                        for (const devField of def.devFields) {
                            offset += devField.size;
                        }
                    }

                    if (lat !== null && lon !== null && lat !== 0x7FFFFFFF && lon !== 0x7FFFFFFF && (lat !== 0 || lon !== 0)) {
                        const degLat = lat * (180.0 / 2147483648.0);
                        const degLon = lon * (180.0 / 2147483648.0);
                        let finalAlt = 0;
                        if (enhancedAlt !== null && enhancedAlt !== 0xFFFFFFFF) {
                            finalAlt = enhancedAlt / 5.0 - 500.0;
                        } else if (alt !== null && alt !== 0xFFFF) {
                            finalAlt = alt / 5.0 - 500.0;
                        }
                        points.push({
                            lat: degLat,
                            lng: degLon,
                            ele: Math.round(finalAlt * 10) / 10
                        });
                    }
                } else {
                    for (const field of def.fields) {
                        offset += field.size;
                    }
                    if (def.devFields) {
                        for (const devField of def.devFields) {
                            offset += devField.size;
                        }
                    }
                }
            }
        } else {
            // Compressed timestamp
            const localMsgType = (recordHeader >> 5) & 0x03;
            const def = localMesgDefs[localMsgType];
            if (!def) break;

            if (def.globalMsgNum === 20) {
                let lat = null;
                let lon = null;
                let alt = null;
                let enhancedAlt = null;

                for (const field of def.fields) {
                    if (offset + field.size > arrayBuffer.byteLength) break;
                    if (field.fieldDefNum === 0 && field.size === 4) {
                        lat = dataView.getInt32(offset, def.isLittleEndian);
                    } else if (field.fieldDefNum === 1 && field.size === 4) {
                        lon = dataView.getInt32(offset, def.isLittleEndian);
                    } else if (field.fieldDefNum === 2 && field.size === 2) {
                        alt = dataView.getUint16(offset, def.isLittleEndian);
                    } else if (field.fieldDefNum === 78 && field.size === 4) {
                        enhancedAlt = dataView.getUint32(offset, def.isLittleEndian);
                    }
                    offset += field.size;
                }
                if (def.devFields) {
                    for (const devField of def.devFields) {
                        offset += devField.size;
                    }
                }

                if (lat !== null && lon !== null && lat !== 0x7FFFFFFF && lon !== 0x7FFFFFFF && (lat !== 0 || lon !== 0)) {
                    const degLat = lat * (180.0 / 2147483648.0);
                    const degLon = lon * (180.0 / 2147483648.0);
                    let finalAlt = 0;
                    if (enhancedAlt !== null && enhancedAlt !== 0xFFFFFFFF) {
                        finalAlt = enhancedAlt / 5.0 - 500.0;
                    } else if (alt !== null && alt !== 0xFFFF) {
                        finalAlt = alt / 5.0 - 500.0;
                    }
                    points.push({
                        lat: degLat,
                        lng: degLon,
                        ele: Math.round(finalAlt * 10) / 10
                    });
                }
            } else {
                for (const field of def.fields) {
                    offset += field.size;
                }
                if (def.devFields) {
                    for (const devField of def.devFields) {
                        offset += devField.size;
                    }
                }
            }
        }
    }

    if (points.length === 0) {
        throw new Error("Aucun point GPS valide trouvé dans ce fichier FIT.");
    }

    return points;
}

/**
 * Convertit une coordonnée TRK en degrés décimaux signés.
 * Formats acceptés : "47.31205663ºN", "4.95930338°E", "-1.5", "1.5W"
 */
function parseTrkCoordinate(token) {
    if (!token) return NaN;
    const match = token.match(/^(-?\d+(?:\.\d+)?)\s*[º°]?\s*([NSEW])?$/i);
    if (!match) return NaN;
    let value = parseFloat(match[1]);
    const hemisphere = (match[2] || '').toUpperCase();
    if (hemisphere === 'S' || hemisphere === 'W') value = -Math.abs(value);
    return value;
}

/**
 * Décode un fichier texte .TRK (CompeGPS / TwoNav, OziExplorer, Garmin PCX5)
 * @param {string} textContent
 * @returns {Array<{lat: number, lng: number, ele: number}>}
 */
function parseTrk(textContent) {
    const lines = textContent.replace(/^\uFEFF/, '').split(/\r?\n/);
    const points = [];

    for (let rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        // Format CompeGPS / TwoNav : T [A|B] lat lon [date] [time] alt ...
        if (line.startsWith('T ') || line.startsWith('B ')) {
            const parts = line.split(/\s+/);
            let latIndex = 1;
            if (parts[1] === 'A' || parts[1] === 'B' || isNaN(parseFloat(parts[1]))) {
                latIndex = 2;
            }
            if (parts.length > latIndex + 1) {
                const lat = parseTrkCoordinate(parts[latIndex]);
                const lon = parseTrkCoordinate(parts[latIndex + 1]);
                let ele = 0;
                // Altitude : première valeur purement numérique après les coordonnées
                // (on saute la date "05-APR-23", l'heure "09:07:45.000" et les indicateurs)
                for (let i = latIndex + 2; i < parts.length; i++) {
                    if (!/^-?\d+(\.\d+)?$/.test(parts[i])) continue;
                    const val = parseFloat(parts[i]);
                    if (val > -500 && val < 9000) {
                        ele = val;
                    }
                    break;
                }
                if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && (lat !== 0 || lon !== 0)) {
                    points.push({ lat, lng: lon, ele: Math.round(ele * 10) / 10 });
                }
            }
        }
        // Format CSV / OziExplorer (ex: 47.297520, 5.004110, 0, 265.0, ...)
        else if (/^-?\d/.test(line) && line.indexOf(',') !== -1) {
            const parts = line.split(',');
            if (parts.length >= 2) {
                const lat = parseFloat(parts[0]);
                const lon = parseFloat(parts[1]);
                let ele = 0;
                if (parts.length >= 4) {
                    const parsedAlt = parseFloat(parts[3]);
                    if (!isNaN(parsedAlt) && parsedAlt > -500 && parsedAlt < 9000) {
                        ele = parsedAlt;
                    }
                }
                if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && (lat !== 0 || lon !== 0)) {
                    points.push({ lat, lng: lon, ele: Math.round(ele * 10) / 10 });
                }
            }
        }
    }

    if (points.length === 0) {
        throw new Error("Aucun point de tracé valide détecté dans ce fichier TRK.");
    }

    return points;
}

// Rendre accessible globalement
window.parseFit = parseFit;
window.parseTrk = parseTrk;
window.computeTrackMetrics = computeTrackMetrics;

