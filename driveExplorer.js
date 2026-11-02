/**
 * driveExplorer.js - Explorateur Google Drive intégré à GPX Viewer
 * GPX Viewer v1.4.0
 *
 * Remplace la fenêtre Google Picker, qui ne permet ni d'afficher le dossier de chaque
 * fichier, ni de masquer les dossiers sans traces, ni d'imposer un tri.
 * Utilise uniquement l'API REST Google Drive v3 en lecture seule (scope drive.readonly).
 *
 * Dépend de app.js : window.accessToken, driveFetch(), loadDriveFile(), handleDriveError(),
 * DriveSessionExpiredError, window.getFileExtension(), window.matchesSelectedFormat(), window.formatLabel().
 */

const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
// Au-delà, la case « tout cocher » est désactivée (on ne veut pas afficher des centaines de traces)
const CHECK_ALL_MAX = 20;
// Nombre de lignes affichées à la fois : une liste de près de 1000 lignes ralentit chaque clic
const PAGE_SIZE = 100;
const collatorFr = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });

// Inventaire mis en cache pour la session (recalculé avec le bouton « Actualiser »)
const driveInventory = {
    loaded: false,
    files: [],      // { id, name, ext, modifiedTime, folderId, folderPath }
    folders: {}     // id -> { id, name, parent }
};

// Inventaire d'un dossier local (bouton « Ouvrir un dossier local »)
const localInventory = {
    loaded: true,
    rootName: '',
    files: []       // { id, name, ext, modifiedTime, folderId, folderPath, file }
};

// La même fenêtre sert pour Google Drive et pour un dossier local
function currentInventory() {
    return explorerState.mode === 'local' ? localInventory : driveInventory;
}

const explorerState = {
    mode: 'drive',         // 'drive' | 'local'
    tab: 'files',          // 'files' | 'folders'
    search: '',
    sortKey: 'name',       // 'name' | 'folder' | 'date'
    sortAsc: true,
    selected: new Set(),   // ids des fichiers cochés
    openFolderId: null,    // dossier affiché dans l'onglet « Mes dossiers »
    limit: PAGE_SIZE       // nombre de lignes affichées dans « Tous mes parcours »
};

// Parcourt toutes les pages d'une requête files.list
async function driveListAll(query, fields) {
    const results = [];
    let pageToken = '';
    do {
        const params = new URLSearchParams({
            q: query,
            fields: `nextPageToken, files(${fields})`,
            pageSize: '1000',
            spaces: 'drive'
        });
        if (pageToken) params.set('pageToken', pageToken);
        const response = await driveFetch(`${DRIVE_API}?${params}`);
        const data = await response.json();
        results.push(...(data.files || []));
        pageToken = data.nextPageToken || '';
    } while (pageToken);
    return results;
}

// Inventaire : tous les dossiers + tous les fichiers .gpx/.fit/.trk du Drive
async function loadDriveInventory() {
    const [rootResp, folders, candidates] = await Promise.all([
        driveFetch(`${DRIVE_API}/root?fields=id`).then(r => r.json()),
        driveListAll(`mimeType = '${DRIVE_FOLDER_MIME}' and trashed = false`, 'id, name, parents'),
        // Les fichiers de traces n'ont pas de type MIME fiable sur Drive : on interroge les types
        // habituels ET les noms, puis on filtre sur l'extension réelle (fileExtension).
        driveListAll(
            "trashed = false and (" +
            "name contains '.gpx' or name contains '.fit' or name contains '.trk' or " +
            "mimeType = 'application/gpx+xml' or mimeType = 'application/octet-stream' or " +
            "mimeType = 'application/xml' or mimeType = 'text/xml' or mimeType = 'text/plain' or " +
            "mimeType = 'application/vnd.ant.fit')",
            'id, name, fileExtension, modifiedTime, parents'
        )
    ]);

    const rootId = rootResp.id;
    const folderMap = {};
    folderMap[rootId] = { id: rootId, name: 'Mon Drive', parent: null };
    for (const f of folders) {
        folderMap[f.id] = { id: f.id, name: f.name, parent: (f.parents && f.parents[0]) || null };
    }

    const pathCache = {};
    function folderPath(id) {
        if (!id || !folderMap[id]) return 'Partagés avec moi';
        if (pathCache[id]) return pathCache[id];
        const parts = [];
        let current = id;
        let guard = 0;
        while (current && folderMap[current] && guard++ < 30) {
            parts.unshift(folderMap[current].name);
            current = folderMap[current].parent;
        }
        // « Mon Drive / VTT / 2025 » devient « VTT / 2025 » (la racine reste « Mon Drive »)
        if (parts.length > 1 && id !== rootId && folderMap[rootId] && parts[0] === folderMap[rootId].name) parts.shift();
        pathCache[id] = parts.join(' / ');
        return pathCache[id];
    }

    const seen = new Set();
    const files = [];
    for (const f of candidates) {
        if (seen.has(f.id)) continue;
        seen.add(f.id);
        const ext = (f.fileExtension || window.getFileExtension(f.name) || '').toLowerCase();
        if (!['gpx', 'fit', 'trk'].includes(ext)) continue;
        const folderId = (f.parents && f.parents[0]) || null;
        files.push({
            id: f.id,
            name: f.name,
            ext,
            modifiedTime: f.modifiedTime,
            folderId: folderId && folderMap[folderId] ? folderId : null,
            folderPath: folderPath(folderId)
        });
    }

    driveInventory.files = files;
    driveInventory.folders = folderMap;
    driveInventory.loaded = true;
}

// Fichiers correspondant au type choisi dans la barre latérale
function visibleFiles() {
    return currentInventory().files.filter(f => window.matchesSelectedFormat(f.name));
}

function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---------- Rendu ----------

function renderExplorer() {
    const body = document.getElementById('drive-explorer-body');
    const label = window.formatLabel();
    document.getElementById('drive-explorer-format').textContent = label;
    const isLocal = explorerState.mode === 'local';
    document.getElementById('drive-explorer-source').textContent = isLocal ? `Dossier « ${localInventory.rootName} »` : 'Google Drive';
    document.getElementById('drive-explorer-refresh').style.display = isLocal ? 'none' : '';
    document.getElementById('drive-format').value = window.getSelectedFormat();
    document.querySelectorAll('.drive-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === explorerState.tab);
    });

    if (!currentInventory().loaded) {
        body.innerHTML = `<div class="drive-empty"><div class="drive-spinner"></div>Inventaire de votre Google Drive en cours…</div>`;
        updateFooter();
        return;
    }

    const files = visibleFiles();
    if (files.length === 0) {
        body.innerHTML = `<div class="drive-empty">Aucun fichier ${escapeHtml(label)} trouvé ${isLocal ? 'dans ce dossier' : 'dans votre Google Drive'}.<br>Vérifiez le type de fichier choisi dans la barre latérale.</div>`;
        updateFooter();
        return;
    }

    if (explorerState.tab === 'files') {
        renderFilesTab(body, files);
    } else {
        renderFoldersTab(body, files);
    }
    updateFooter();
}

function sortFiles(files) {
    const dir = explorerState.sortAsc ? 1 : -1;
    const key = explorerState.sortKey;
    return files.slice().sort((a, b) => {
        let cmp;
        if (key === 'date') cmp = (a.modifiedTime || '').localeCompare(b.modifiedTime || '');
        else if (key === 'folder') cmp = collatorFr.compare(a.folderPath, b.folderPath) || collatorFr.compare(a.name, b.name);
        else cmp = collatorFr.compare(a.name, b.name);
        return cmp * dir;
    });
}

function fileRowsHtml(files, showFolder) {
    return files.map(f => `
        <tr data-id="${escapeHtml(f.id)}" class="${explorerState.selected.has(f.id) ? 'selected' : ''}">
            <td class="col-check"><input type="checkbox" ${explorerState.selected.has(f.id) ? 'checked' : ''} aria-label="Sélectionner ${escapeHtml(f.name)}"></td>
            <td class="col-name"><span class="track-format-badge badge-${f.ext}">${f.ext.toUpperCase()}</span>${escapeHtml(f.name)}</td>
            ${showFolder ? `<td class="col-folder" title="${escapeHtml(f.folderPath)}">${escapeHtml(f.folderPath)}</td>` : ''}
            <td class="col-date">${formatDate(f.modifiedTime)}</td>
        </tr>`).join('');
}

function sortHeader(key, text) {
    const active = explorerState.sortKey === key;
    const arrow = active ? (explorerState.sortAsc ? ' ▲' : ' ▼') : '';
    return `<th class="sortable${active ? ' active' : ''}" data-sort="${key}">${text}${arrow}</th>`;
}

function renderFilesTab(body, files) {
    const term = explorerState.search.trim().toLowerCase();
    const filtered = term
        ? files.filter(f => f.name.toLowerCase().includes(term) || f.folderPath.toLowerCase().includes(term))
        : files;
    const sorted = sortFiles(filtered);

    body.innerHTML = `
        <div class="drive-toolbar">
            <input type="search" id="drive-search" placeholder="Rechercher un parcours ou un dossier…" value="${escapeHtml(explorerState.search)}">
            <span class="drive-count">${sorted.length} parcours</span>
        </div>
        <div class="drive-table-wrapper">
            <table class="drive-table">
                <thead><tr>
                    <th class="col-check"><input type="checkbox" id="drive-check-all" ${sorted.length > CHECK_ALL_MAX
                        ? `disabled title="Tout cocher n'est possible que pour ${CHECK_ALL_MAX} parcours au plus : affinez d'abord la recherche"`
                        : `title="Tout cocher / tout décocher (liste affichée)"`} ${sorted.length && sorted.length <= CHECK_ALL_MAX && sorted.every(f => explorerState.selected.has(f.id)) ? 'checked' : ''}></th>
                    ${sortHeader('name', 'Nom')}
                    ${sortHeader('folder', 'Dossier')}
                    ${sortHeader('date', 'Modifié le')}
                </tr></thead>
                <tbody>${fileRowsHtml(sorted.slice(0, explorerState.limit), true)}</tbody>
            </table>
            ${sorted.length > explorerState.limit ? `<button id="drive-more" class="btn-link drive-more">Afficher ${Math.min(PAGE_SIZE, sorted.length - explorerState.limit)} parcours de plus (${sorted.length - explorerState.limit} restants) — ou affinez la recherche</button>` : ''}
        </div>`;

    const search = document.getElementById('drive-search');
    // Recherche : on attend une courte pause de frappe avant de redessiner la liste
    search.addEventListener('input', () => {
        clearTimeout(explorerState.searchTimer);
        explorerState.searchTimer = setTimeout(() => {
            explorerState.search = search.value;
            explorerState.limit = PAGE_SIZE;
            const pos = search.selectionStart;
            renderExplorer();
            const again = document.getElementById('drive-search');
            again.focus();
            again.setSelectionRange(pos, pos);
        }, 200);
    });
    const more = document.getElementById('drive-more');
    if (more) more.addEventListener('click', (e) => {
        e.stopPropagation();
        const wrapper = body.querySelector('.drive-table-wrapper');
        const scroll = wrapper.scrollTop;
        explorerState.limit += PAGE_SIZE;
        renderExplorer();
        body.querySelector('.drive-table-wrapper').scrollTop = scroll;
    });
    document.getElementById('drive-check-all').addEventListener('click', (e) => {
        e.stopPropagation();
        const check = e.target.checked;
        sorted.forEach(f => check ? explorerState.selected.add(f.id) : explorerState.selected.delete(f.id));
        body.querySelectorAll('tr[data-id]').forEach(tr => {
            tr.classList.toggle('selected', check);
            tr.querySelector('input[type=checkbox]').checked = check;
        });
        updateFooter();
    });
    body.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.sort;
            explorerState.limit = PAGE_SIZE;
            if (explorerState.sortKey === key) explorerState.sortAsc = !explorerState.sortAsc;
            else { explorerState.sortKey = key; explorerState.sortAsc = key !== 'date'; }
            renderExplorer();
        });
    });
}

function renderFoldersTab(body, files) {
    // Regroupement par dossier parent direct (seuls les dossiers contenant des traces apparaissent)
    const groups = new Map();
    for (const f of files) {
        const key = f.folderId || '__shared__';
        if (!groups.has(key)) groups.set(key, { id: key, path: f.folderPath, files: [] });
        groups.get(key).files.push(f);
    }
    const list = Array.from(groups.values()).sort((a, b) => collatorFr.compare(a.path, b.path));

    body.innerHTML = `
        <div class="drive-toolbar"><span class="drive-count">${list.length} dossier(s) contenant des fichiers ${escapeHtml(window.formatLabel())}, par ordre alphabétique</span></div>
        <div class="drive-folder-list">
            ${list.map(g => {
                const open = explorerState.openFolderId === g.id;
                const sortedFiles = g.files.slice().sort((a, b) => collatorFr.compare(a.name, b.name));
                return `
                <div class="drive-folder${open ? ' open' : ''}" data-folder="${escapeHtml(g.id)}">
                    <div class="drive-folder-header">
                        <button class="drive-folder-toggle" title="Afficher le contenu">
                            <span class="chevron">${open ? '▾' : '▸'}</span>
                            <span class="folder-icon">📁</span>
                            <span class="folder-path">${escapeHtml(g.path)}</span>
                            <span class="folder-count">${g.files.length}</span>
                        </button>
                        <button class="btn-open-folder" title="Afficher toutes les traces de ce dossier">Tout ouvrir</button>
                    </div>
                    ${open ? `<table class="drive-table"><tbody>${fileRowsHtml(sortedFiles, false)}</tbody></table>` : ''}
                </div>`;
            }).join('')}
        </div>`;

    body.querySelectorAll('.drive-folder').forEach(el => {
        const id = el.dataset.folder;
        el.querySelector('.drive-folder-toggle').addEventListener('click', () => {
            explorerState.openFolderId = explorerState.openFolderId === id ? null : id;
            renderExplorer();
        });
        el.querySelector('.btn-open-folder').addEventListener('click', () => {
            const group = groups.get(id);
            if (group.files.length > 20 && !confirm(`Le dossier « ${group.path} » contient ${group.files.length} parcours.\nLes afficher tous ? (au-delà de 10 traces, la carte devient peu lisible)`)) {
                return;
            }
            closeDriveExplorer();
            loadDriveSelection(group.files);
        });
    });
}

// Sélection par délégation (un seul écouteur pour toute la liste).
// Maj + clic sélectionne toute la plage depuis le dernier clic.
// (attaché une seule fois au conteneur, qui est conservé d'un affichage à l'autre)
function bindRowSelection(body) {
    let lastIndex = null;
    body.addEventListener('click', (e) => {
        const tr = e.target.closest('tr[data-id]');
        if (!tr || !body.contains(tr)) return;
        const rows = Array.from(tr.parentElement.querySelectorAll('tr[data-id]'));
        const index = rows.indexOf(tr);
        const select = !explorerState.selected.has(tr.dataset.id);
        const range = (e.shiftKey && lastIndex !== null && lastIndex < rows.length)
            ? rows.slice(Math.min(lastIndex, index), Math.max(lastIndex, index) + 1)
            : [tr];
        for (const row of range) {
            const id = row.dataset.id;
            if (select) explorerState.selected.add(id); else explorerState.selected.delete(id);
            row.classList.toggle('selected', select);
            row.querySelector('input[type=checkbox]').checked = select;
        }
        if (e.shiftKey) window.getSelection().removeAllRanges();
        lastIndex = index;
        updateFooter();
    });
}

function updateFooter() {
    const btn = document.getElementById('drive-explorer-open');
    const n = currentInventory().loaded ? visibleFiles().filter(f => explorerState.selected.has(f.id)).length : 0;
    btn.disabled = n === 0;
    btn.textContent = n > 0 ? `Afficher la sélection (${n})` : 'Afficher la sélection';
}

// ---------- Ouverture / fermeture ----------

async function openDriveExplorer() {
    const modal = document.getElementById('drive-explorer');
    explorerState.mode = 'drive';
    explorerState.search = '';
    explorerState.limit = PAGE_SIZE;
    explorerState.selected.clear();
    modal.style.display = 'flex';
    renderExplorer();
    if (!driveInventory.loaded) {
        await refreshDriveInventory();
    }
}

// Affiche le contenu d'un dossier local choisi dans la fenêtre Windows/Mac
// (cette fenêtre système ne montre que les sous-dossiers, jamais les fichiers)
function openLocalFolderExplorer(fileList, rootName) {
    localInventory.rootName = rootName;
    localInventory.files = Array.from(fileList).map((file, i) => {
        const parts = (file.webkitRelativePath || file.name).split('/');
        parts.pop();
        const folder = parts.join(' / ') || rootName;
        return {
            id: 'local-' + i,
            name: file.name,
            ext: window.getFileExtension(file.name),
            modifiedTime: file.lastModified ? new Date(file.lastModified).toISOString() : '',
            folderId: folder,
            folderPath: folder,
            file
        };
    }).filter(f => ['gpx', 'fit', 'trk'].includes(f.ext));

    explorerState.mode = 'local';
    explorerState.tab = 'files';
    explorerState.search = '';
    explorerState.limit = PAGE_SIZE;
    explorerState.openFolderId = null;
    explorerState.selected.clear();
    // Petit dossier : tout est pré-coché, il suffit de cliquer sur « Afficher la sélection »
    const visible = visibleFiles();
    if (visible.length <= CHECK_ALL_MAX) visible.forEach(f => explorerState.selected.add(f.id));

    document.getElementById('drive-explorer').style.display = 'flex';
    renderExplorer();
}

async function refreshDriveInventory() {
    driveInventory.loaded = false;
    renderExplorer();
    try {
        await loadDriveInventory();
    } catch (error) {
        closeDriveExplorer();
        handleDriveError(error, "l'inventaire de votre Drive");
        return;
    }
    renderExplorer();
}

function closeDriveExplorer() {
    document.getElementById('drive-explorer').style.display = 'none';
}

async function loadDriveSelection(files) {
    if (explorerState.mode === 'local') {
        files.forEach(f => window.readLocalFileGlobal(f.file));
        return;
    }
    for (const file of files) {
        try {
            await loadDriveFile(file.id, file.name);
        } catch (error) {
            if (error instanceof DriveSessionExpiredError) {
                handleDriveError(error);
                return;
            }
            console.error('Erreur lors du téléchargement depuis Drive :', error);
            alert(`Impossible de charger le fichier ${file.name} depuis Drive.\n(${error.message})`);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('drive-explorer');
    if (!modal) return;
    bindRowSelection(document.getElementById('drive-explorer-body'));
    document.getElementById('drive-explorer-close').addEventListener('click', closeDriveExplorer);
    document.getElementById('drive-explorer-cancel').addEventListener('click', closeDriveExplorer);
    document.getElementById('drive-explorer-refresh').addEventListener('click', refreshDriveInventory);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeDriveExplorer(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display !== 'none') closeDriveExplorer();
    });
    document.querySelectorAll('.drive-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            explorerState.tab = btn.dataset.tab;
            renderExplorer();
        });
    });
    document.getElementById('drive-explorer-open').addEventListener('click', () => {
        // Seules les traces cochées ET visibles (type de fichier choisi) sont chargées
        const chosen = visibleFiles().filter(f => explorerState.selected.has(f.id));
        if (chosen.length > 20 && !confirm(`Afficher ${chosen.length} parcours ?\n(au-delà de 10 traces, la carte devient peu lisible)`)) {
            return;
        }
        closeDriveExplorer();
        loadDriveSelection(chosen);
    });
    // Sélecteur de type dans la fenêtre : synchronisé avec celui de la barre latérale
    document.getElementById('drive-format').addEventListener('change', (e) => {
        const radio = document.querySelector(`input[name="track-format"][value="${e.target.value}"]`);
        if (radio) {
            radio.checked = true;
            radio.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
    // Si le type de fichier change pendant que la fenêtre est ouverte
    document.querySelectorAll('input[name="track-format"]').forEach(r => r.addEventListener('change', () => {
        if (modal.style.display !== 'none') renderExplorer();
    }));
});

window.openDriveExplorer = openDriveExplorer;
window.openLocalFolderExplorer = openLocalFolderExplorer;
