
/* ===== VALIDER INTERVENTION ===== */
function wireValidateIntervention() {
  const btn = document.getElementById("btnValiderIntervention");
  if (!btn) return;


  // 🔒 verrouillage visuel pour secteur
  if (!isAdmin()) {
    btn.disabled = true;
    btn.style.opacity = "0.4";
    btn.style.cursor = "not-allowed";
    btn.title = "Action réservée à l’administrateur";
    return; // ⛔ STOP ici
  }

  // 👑 ADMIN SEUL
  btn.onclick = () => {
    const txt = historyInterventionsEl().value.trim();
    if (!txt) {
      alert("Aucune intervention à valider.");
      return;
    }

    const now = new Date().toLocaleString("fr-FR");
    historyInterventionsEl().value = `🛠 ${now} — ${txt}`;

    alert("Intervention validée. Pense à enregistrer.");
  };
}


/* FIX: prevent ReferenceError for stray `it` */
var it = null;

(() => {
  "use strict";

  // =========================
  // CONFIG
  // =========================
  const API_URL = "https://script.google.com/macros/s/AKfycbxrTMFxQDSOHvBrgwXWHwoGhefpHEtcHLdaaq3YdtJLU5QqvBsjs08hrByRVwAYXg94Iw/exec";
  function getTreeIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

  const STORAGE_KEY = "marcq_arbres_v1";
  const MARCQ_CENTER = [50.676, 3.086];

  // Quartiers (coloring)
  const QUARTIER_COLORS = {
    "Hautes loges-Briqueterie": "#ff6b6b",
    "Bourg": "#4dabf7",
    "Buisson-Delcencerie": "#51cf66",
    "Mairie-Quesne": "#fcc419",
    "Pont-Plouich-CLémenceau": "#9775fa",
    "Cimetière Delcencerie": "#083b19ff",
    "Cimetière Pont": "#d9ff00",
  };

  // =========================
  // GLOBAL STATE
  // =========================
  let map;
  let quartiersLayer = null;
  let cityLayer = null;

  let trees = [];
  let selectedId = null;
  let legendControl = null; // ✅ éviter double légende
  let lastDeletedTree = null;
  let pendingPhotos = [];
let authToken = localStorage.getItem("authToken");
let gpsMarker = null;

// 🔒 GPS lock + stabilisation
let gpsWatchId = null;
let gpsSamples = [];
let lockedGpsLat = null;
let lockedGpsLng = null;
// ------------------------------
// 🔐 Déconnexion
// ------------------------------
function updateLogoutButtonVisibility() {
  const btn = document.getElementById("logoutBtn");
  if (!btn) return;
  btn.style.display = authToken ? "inline-flex" : "none";
}

function logout() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userRole");
  localStorage.removeItem("userSecteur");

  authToken = null;
  isAuthenticated = false;

  // Retour écran de connexion
  const overlay = document.getElementById("loginOverlay");
  if (overlay) overlay.style.display = "flex";

  updateLogoutButtonVisibility();

  // 🔄 refresh complet après déconnexion (garanti)
  setTimeout(() => window.location.reload(), 50);

}
let isAuthenticated = !!authToken;


// =========================
// 🔒 DROITS: verrouillage Travaux (sauf admin)
// =========================
function isAdmin() {
  return (localStorage.getItem("userRole") || "").toLowerCase() === "admin";
}
window.isAdmin = isAdmin; // ✅ AJOUT CRITIQUE


function isPastilleTree(t){
  // ici la "pastille" correspond à un état défini
  return !!(t && t.etat && String(t.etat).trim() !== "");
}
// =========================
// 🔐 FILTRAGE PAR SECTEUR (FRONT)
// =========================
function getVisibleTrees() {
  const role = localStorage.getItem("userRole");
  const secteurUser = localStorage.getItem("userSecteur");

  // 👑 Admin → tout voir
  if (role === "admin") {
    return trees;
  }

  // 👤 Compte secteur → uniquement son secteur
  return trees.filter(t => t.secteur === secteurUser);
}



function applyTravauxLock() {
  // champs à bloquer pour tous sauf admin
  const ids = [
    "etat",
    "dateDemande",
    "natureTravaux",
    "dateDemandeDevis",
    "devisNumero",
    "montantDevis",
    "dateExecution",
    "remarquesTravaux",
    "numeroBDC",
    "numeroFacture",
    "comment",
    "historyInterventions",
  ];

  const locked = !isAdmin();

  ids.forEach((id) => {
    const node = document.getElementById(id);
    if (!node) return;

    node.disabled = locked;
    node.readOnly = locked;

    // petit feedback visuel uniquement sur ces champs
    if (locked) {
      node.style.opacity = "0.55";
      node.style.cursor = "not-allowed";
    } else {
      node.style.opacity = "";
      node.style.cursor = "";
    }
  });
}


  const markers = new Map(); // id -> marker

  // =========================
  // DOM HELPERS
  // =========================
  const el = (id) => document.getElementById(id);

  const treeListEl = () => el("treeList");
  const countEl = () => el("count");
  const qEl = () => el("q");
  const treeIdEl = () => el("treeId");
  const editorTitle = () => el("editorTitle");
  const editorHint = () => el("editorHint");
  const latEl = () => el("lat");
  const lngEl = () => el("lng");
  const speciesEl = () => el("species");
  const heightEl = () => el("height");
  const dbhEl = () => el("dbh");
  const secteurEl = () => el("secteur");
  const addressEl = () => el("address");
  const tagsEl = () => el("tags");
  const etatEl = () => el("etat");
  const commentEl = () => el("comment");
const historyInterventionsEl = () => el("historyInterventions");
  const photosEl = () => el("photos");
  const galleryEl = () => el("gallery");

  const saveBtn = () => el("saveBtn");
  const newBtn = () => el("newBtn");
  const deleteBtn = () => el("deleteBtn");
  const exportBtn = () => el("exportBtn");
  const importBtn = () => el("importBtn");
  const importFile = () => el("importFile");

  const dateDemandeEl = () => el("dateDemande");
const natureTravauxEl = () => el("natureTravaux");
const dateDemandeDevisEl = () => el("dateDemandeDevis");
const devisNumeroEl = () => el("devisNumero");
const montantDevisEl = () => el("montantDevis");
const dateExecutionEl = () => el("dateExecution");
const remarquesTravauxEl = () => el("remarquesTravaux");
const numeroBDCEl = () => el("numeroBDC");
const numeroFactureEl = () => el("numeroFacture");

  // =========================
  // UTIL
  // =========================

async function postToGAS(payload) {
  if (!authToken) {
    throw new Error("Non authentifié");
  }

  const params = new URLSearchParams();
  params.append("token", authToken);

  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    params.append(
      key,
      typeof value === "object" ? JSON.stringify(value) : String(value)
    );
  });

  const res = await fetch(API_URL, { method: "POST", body: params });
  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, raw: text };
  }
}

// 🔥 LIGNE MANQUANTE
window.postToGAS = postToGAS;



  
  function uid() {
    return Math.random().toString(16).slice(2) + Date.now().toString(16);
  }

  function fmtCoord(x) {
    if (typeof x !== "number") return "";
    return x.toFixed(6);
  }

  function normalizeTags(s) {
    return (s || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  function escapeHtml(str) {
    return (str ?? "")
      .toString()
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getTreeById(id) {
    return trees.find((t) => t.id === id);
  }

  function loadTrees() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveTreesLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trees));
  }

  function persistAndRefresh(focusId = selectedId) {
    saveTreesLocal();
    renderMarkers();
    renderList();
    renderSecteurCount();
    if (focusId) setSelected(focusId);
  }

  window.persistAndRefresh = persistAndRefresh;

async function syncToSheets(treeObj) {
  try {
    const payload = { ...treeObj };

    // ✅ n'envoyer que les nouvelles photos (base64)
    payload.photos = (treeObj.photos || []).filter(
      p => p.dataUrl && p.dataUrl.startsWith("data:")
    );

  await postToGAS({ payload });
await loadTreesFromSheets();



  } catch (e) {
    console.error("❌ Sync Google Sheets échouée", e);
  }
}




  // =========================
  // ICONS / COLORS
  // =========================
function createTreeIcon(color = "#4CAF50", etat = "", validationEntreprise = false) {
  const g = "g_" + Math.random().toString(36).slice(2);

  let badge = "";
let cross = "";

if (validationEntreprise === true) {
  cross = `
    <line x1="18" y1="18" x2="46" y2="46"
          stroke="white" stroke-width="4"/>
    <line x1="46" y1="18" x2="18" y2="46"
          stroke="white" stroke-width="4"/>
  `;
}

 if (etat === "Dangereux (A abattre)") {
 badge = `
  <circle class="pulse-ring danger"
          cx="46" cy="11" r="8"
          fill="#e53935"
          opacity="0.75"
          style="transform-origin:46px 10px; transform-box:fill-box;" />
  <circle cx="46" cy="10" r="8" fill="#e53935" stroke="#000000ff" stroke-width="2"/>`;

}



  if (etat === "A surveiller") {
    badge = `<circle cx="46" cy="10" r="8" fill="#fb8c00" stroke="#000000ff" stroke-width="2"/>`;
  }

    if (etat === "A élaguer (URGENT)") {
    badge = `<circle cx="46" cy="10" r="8" fill="#FFFF00" stroke="#000000ff" stroke-width="2"/>`;
  }

  if (etat === "A élaguer (Moyen)") {
    badge = `<circle cx="46" cy="10" r="8" fill="#00FFFF" stroke="#000000ff" stroke-width="2"/>`;
  }

  if (etat === "A élaguer (Faible)") {
    badge = `<circle cx="46" cy="10" r="8" fill="#43a047" stroke="#000000ff" stroke-width="2"/>`;
  }

  return L.divIcon({
    className: "tree-marker",
    html: `
      <svg width="44" height="44" viewBox="0 0 64 64">
        <defs>
          <radialGradient id="${g}" cx="50%" cy="35%" r="60%">
            <stop offset="0%" stop-color="#b7f7c2"/>
            <stop offset="100%" stop-color="${color}"/>
          </radialGradient>
        </defs>

        <!-- feuillage -->
        <circle cx="32" cy="24" r="18" fill="url(#${g})"/>
        <circle cx="20" cy="30" r="14" fill="url(#${g})"/>
        <circle cx="44" cy="30" r="14" fill="url(#${g})"/>

        ${cross}

        <!-- tronc -->
        <rect x="28" y="38" width="8" height="18" rx="2" fill="#6D4C41"/>

        <!-- ✅ badge ÉTAT AU-DESSUS -->
        ${badge}
      </svg>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 42],
    popupAnchor: [0, -36],
  });
}

function getTreeIconScale(zoom) {
  if (zoom >= 17) return 1;     // zoom proche
  if (zoom >= 16) return 0.9;
  if (zoom >= 15) return 0.8;
  if (zoom >= 14) return 0.7;
  return 0.6;                  // zoom éloigné
}










  function getColorFromSecteur(secteur) {
    switch (secteur) {
      case "Hautes Loges - Briqueterie": return "#7CB342";
      case "Bourg": return "#1565C0";
      case "Buisson - Delcencerie": return "#cc5c01ff";
      case "Mairie - Quesne": return "#6A1B9A";
      case "Pont - Plouich - Clémenceau": return "#01a597ff";
      case "Cimetière Delcencerie": return "#083b19ff";
      case "Cimetière Pont": return "#df54d3";
      case "Hippodrome": return "#F9A825";
      case "Ferme aux Oies": return "#AD1457";
      default: return "#607D8B";
    }
  }

  function getQuartierColor(name) {
    return QUARTIER_COLORS[name] || "#999999";
  }
const SECTEURS = [
  "Hautes Loges - Briqueterie",
  "Bourg",
  "Buisson - Delcencerie",
  "Mairie - Quesne",
  "Pont - Plouich - Clémenceau",
  "Cimetière Delcencerie",
  "Cimetière Pont",
  "Hippodrome",
  "Ferme aux Oies"
];
function addLegendToMap() {
  // ✅ éviter double légende si startApp() est relancé
  if (legendControl) {
    try { map.removeControl(legendControl); } catch (e) {}
    legendControl = null;
  }

  const legend = L.control({ position: "bottomright" });

  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "map-legend");

    // ✅ FIX tablette / mobile
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);
    L.DomEvent.on(div, "touchstart", L.DomEvent.stopPropagation);
    L.DomEvent.on(div, "dblclick", L.DomEvent.stopPropagation);

    div.innerHTML = `
      <div class="legend-header">
        <b>Légende — Secteurs</b>
        <button id="legendToggleBtn">➖</button>
      </div>
      <div id="legendContent"></div>
    `;

    const content = div.querySelector("#legendContent");

    SECTEURS.forEach((secteur) => {
      const color = getColorFromSecteur(secteur);
      content.innerHTML += `
        <div class="legend-item">
          <span class="legend-icon" style="background:${color}"></span>
          ${secteur}
        </div>
      `;
    });

    return div;
  };

  legend.addTo(map);
  legendControl = legend;

setTimeout(() => {
    const btn = document.getElementById("legendToggleBtn");
    const content = document.getElementById("legendContent");
    if (!btn || !content) return;

    let open = true;
    btn.onclick = () => {
      open = !open;
      content.style.display = open ? "block" : "none";
      btn.textContent = open ? "➖" : "➕";
    };
  }, 0);
}



  // =========================
  // PREVIEW + NEW TAB
  // =========================
  function renderTreePreview(t) {
    const card = el("treePreview");
    if (!card) return;

    if (!t) {
      card.style.display = "none";
      return;
    }

    card.style.display = "block";

    el("p-id").textContent = t.id || "—";
    el("p-species").textContent = t.species || "—";
    el("p-secteur").textContent = t.secteur || "—";
    el("p-height").textContent = t.height ?? "—";
    el("p-dbh").textContent = t.dbh ?? "—";
    el("p-address").textContent = t.address || "—";
    el("p-comment").textContent = t.comment || "";

   
  }

  // IMPORTANT: pour que onclick="openTreeInNewTab()" marche depuis HTML
  window.openTreeInNewTab = function () {
    if (!selectedId) return;
    const t = getTreeById(selectedId);
    if (!t) return;

    const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Fiche arbre – ${escapeHtml(t.id)}</title>
<style>
body{font-family:system-ui,Arial,sans-serif;background:#0b1020;color:#eef1ff;padding:20px}
.card{max-width:700px;margin:auto;background:#111a33;border-radius:16px;padding:20px}
img{width:100%;max-height:500px;object-fit:contain;border-radius:12px;margin-bottom:16px}
small{color:#9db0ff}
</style>
</head>
<body>
<div class="card">
  ${t.photos?.length ? `<img src="${getPhotoSrc(t.photos[0])}">` : ""}
  <h1>Fiche de l’arbre</h1>
  <p><b>ID :</b> ${escapeHtml(t.id)}</p>
  <p><b>Espèce :</b> ${escapeHtml(t.species || "—")}</p>
  <p><b>Secteur :</b> ${escapeHtml(t.secteur || "—")}</p>
  <p><b>Hauteur :</b> ${t.height ?? "—"} m</p>
  <p><b>Diamètre :</b> ${t.dbh ?? "—"} cm</p>
  <p><b>Adresse :</b> ${escapeHtml(t.address || "—")}</p>
  <p><b>Commentaire :</b></p>
  <small>${escapeHtml(t.comment || "—")}</small>
</div>
</body>
</html>`;

    const win = window.open();
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  // =========================
  // GALLERY
  // =========================


function getPhotoSrc(p) {
  if (!p) return "";

  // 1️⃣ Photo fraîche (base64)
  if (p.dataUrl && p.dataUrl.startsWith("data:")) {
    return p.dataUrl;
  }

  // 2️⃣ Photo Drive (ID direct = TOP)
if (p.driveId) {
  return `https://drive.google.com/thumbnail?id=${p.driveId}&sz=w1200`;
}


  // 3️⃣ Fallback : URL Drive à parser
  if (p.url) {
    // /file/d/XXXX/view
    let m = p.url.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
if (m && m[1]) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1200`;



    // ?id=XXXX
    m = p.url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    if (m && m[1]) {
      return `https://drive.google.com/uc?export=view&id=${m[1]}`;
    }

    return p.url;
  }

  return "";
}



  
  function renderGallery(photos) {
    const g = galleryEl();
    if (!g) return;

    g.innerHTML = "";
    if (!photos || photos.length === 0) return;

    photos.forEach((p, idx) => {
      const wrap = document.createElement("div");
      wrap.className = "photo";

      const img = document.createElement("img");
     img.src = getPhotoSrc(p);

      img.alt = p.name || `Photo ${idx + 1}`;

      const meta = document.createElement("div");
      meta.className = "meta";

      const span = document.createElement("span");
      const date = p.addedAt ? new Date(p.addedAt).toLocaleString("fr-FR") : "";
      span.textContent = `${p.name || "photo"}${date ? " • " + date : ""}`;


      // 🔧 migration locale : récupérer driveId depuis l’URL si manquant
if (!p.driveId && p.url) {
  const extracted = extractDriveIdFromUrl(p.url);
  if (extracted) {
    p.driveId = extracted;
  }
}

    const del = document.createElement("button");
del.className = "danger";
del.textContent = "Retirer";

del.onclick = async () => {
  const photo = photos[idx];

  // 🕓 PHOTO TEMPORAIRE (pas encore enregistrée)
  if (!photo.driveId) {
    pendingPhotos = pendingPhotos.filter(p => p.id !== photo.id);

    updatePhotoStatus();

    const t = selectedId ? getTreeById(selectedId) : null;
    const allPhotos = [
      ...(t?.photos || []),
      ...pendingPhotos
    ];

    renderGallery(allPhotos);
    renderPhotoCarousel(allPhotos);
    return;
  }

  // 📦 PHOTO DÉJÀ ENREGISTRÉE (Drive)
  if (!selectedId) return;
  if (!confirm("Supprimer cette photo ?")) return;

  const t = getTreeById(selectedId);
  if (!t) return;

  const res = await postToGAS({
  action: "deletePhoto",
  treeId: t.id,
  photoDriveId: photo.driveId
});

if (res?.ok && res.result?.status === "PHOTO_DELETED") {
  alert("📸 Photo retirée avec succès");
} else {
  alert("❌ Erreur lors de la suppression de la photo");
}

await loadTreesFromSheets();
persistAndRefresh(t.id);

};



      meta.appendChild(span);
      meta.appendChild(del);

      wrap.appendChild(img);
      wrap.appendChild(meta);
      g.appendChild(wrap);
    });
  }

// =========================
// 🏷️ TAMPON DISCRET : ID + DATE + GPS SUR PHOTO (bas gauche)
// =========================
async function stampPhotoWithMeta(file, lat, lng, treeId) {
  file = await normalizePhotoToJpeg(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.src = reader.result;
    };

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = img.width;
      canvas.height = img.height;

      // image originale
      ctx.drawImage(img, 0, 0);

      // 🔹 paramètres texte
      const padding = Math.max(16, canvas.width * 0.015);
      const fontSize = Math.max(11, canvas.width * 0.014);

      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.textBaseline = "bottom";

      const dateStr = new Date().toLocaleString("fr-FR");
      const coordStr = `Lat: ${lat.toFixed(6)} | Lng: ${lng.toFixed(6)}`;
      const idStr = `ID : ${treeId}`;

      // ombre légère pour lisibilité
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 4;

      const startY = canvas.height - padding;
      const lineHeight = fontSize + 4;


      ctx.fillText(coordStr, padding, startY);
      ctx.fillText(dateStr, padding, startY - lineHeight);
      ctx.fillText(idStr, padding, startY - lineHeight * 2);

      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };

    img.onerror = reject;
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}



async function readFilesAsDataUrls(files) {
  const out = [];

  const lat = parseFloat(latEl().value);
  const lng = parseFloat(lngEl().value);

  for (const f of files) {
    
const stampedDataUrl = await stampPhotoWithMeta(
  f,
  lat,
  lng,
  treeIdEl().value || ""   // ✅ ICI LA BONNE SOURCE
);


  out.push({
  id: crypto.randomUUID(),
  name: f.name.replace(/\.(heic|png|jpg|jpeg)$/i, ".jpg"),
  type: "image/jpeg", // ✅ FORCÉ
  addedAt: Date.now(),
  dataUrl: stampedDataUrl,
});

  }

  return out;
}




  // =========================
  // LIST
  // =========================
 function treeMatchesQuery(t, q) {
  if (!q) return true;

  const s = q.toLowerCase();

  const hay = [
    t.id,                    // ✅ ID
    t.species,
    t.address,
    t.comment,
    (t.tags || []).join(" "),
    t.secteur,
    t.quartier,
    `${t.lat}`,
    `${t.lng}`,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return hay.includes(s);
}


  function highlightListSelection() {
    const list = treeListEl();
    if (!list) return;

    for (const node of list.querySelectorAll(".treeItem")) {
      node.style.outline = (node.dataset.id === selectedId)
        ? "2px solid rgba(106,166,255,.65)"
        : "none";
    }
  }

  function renderList() {
    const list = treeListEl();
    const count = countEl();
    const q = (qEl()?.value || "").trim();

    if (!list || !count) return;

    const filtered = getVisibleTrees().filter((t) => treeMatchesQuery(t, q));

    count.textContent = `${filtered.length} / ${trees.length}`;
    list.innerHTML = "";

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "hint";
      empty.textContent = q
        ? "Aucun résultat."
        : "Aucun arbre enregistré. Clique sur la carte pour en ajouter un.";
      list.appendChild(empty);
      return;
    }

    for (const t of filtered) {
      const item = document.createElement("div");
      item.className = "treeItem";
      item.dataset.id = t.id;

      const left = document.createElement("div");
      const title = document.createElement("b");
      title.textContent = t.species || "Arbre (espèce inconnue)";

      const meta = document.createElement("small");
      meta.textContent =
        `${fmtCoord(t.lat)}, ${fmtCoord(t.lng)}` +
        (t.address ? " • " + t.address : "") +
        (t.secteur ? " • " + t.secteur : "");

      const tagsWrap = document.createElement("div");
      tagsWrap.style.marginTop = "6px";
      tagsWrap.style.display = "flex";
      tagsWrap.style.flexWrap = "wrap";
      tagsWrap.style.gap = "6px";

      (t.tags || []).slice(0, 4).forEach((tag) => {
        const p = document.createElement("span");
        p.className = "pill";
        p.textContent = tag;
        tagsWrap.appendChild(p);
      });

      left.appendChild(title);
      left.appendChild(meta);
      if ((t.tags || []).length) left.appendChild(tagsWrap);

      const right = document.createElement("div");
      right.className = "actions";

      const zoomBtn = document.createElement("button");
      zoomBtn.className = "secondary";
      zoomBtn.textContent = "Voir";
      zoomBtn.onclick = () => {
        map.setView([t.lat, t.lng], Math.max(map.getZoom(), 16));
        const m = markers.get(t.id);
        if (m) m.openPopup();
        if(!isAdmin() && isPastilleTree(t)) { alert('⛔ Arbre verrouillé (pastille) : sélection réservée admin'); return; }
        setSelected(t.id);
        highlightListSelection();
      };

      right.appendChild(zoomBtn);

      item.onclick = (e) => {
        if (e.target && e.target.tagName && e.target.tagName.toLowerCase() === "button") return;
        if(!isAdmin() && isPastilleTree(t)) { alert('⛔ Arbre verrouillé (pastille) : sélection réservée admin'); return; }
        setSelected(t.id);
        highlightListSelection();
      };

      item.appendChild(left);
      item.appendChild(right);
      list.appendChild(item);
    }

    highlightListSelection();
  }

  function renderSecteurCount() {
    const container = el("secteurCount");
    if (!container) return;

    const counts = {};
    for (const t of getVisibleTrees()) {
      const s = t.secteur || "Non défini";
      counts[s] = (counts[s] || 0) + 1;
    }

    container.innerHTML = "";
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([secteur, nb]) => {
        const div = document.createElement("div");
        div.className = "treeItem";
        div.innerHTML = `<b>${escapeHtml(secteur)}</b><span class="pill">${nb}</span>`;
        container.appendChild(div);
      });
  }

  // =========================
  // SELECT / FORM
  // =========================
 function clearForm(keepCoords = true) {
  speciesEl().value = "";
  heightEl().value = "";
  dbhEl().value = "";
  secteurEl().value = "";
  addressEl().value = "";
  tagsEl().value = "";
  commentEl().value = "";
  historyInterventionsEl().value = "";
  document.getElementById("photoCarousel")?.classList.add("hidden");

  const cam = document.getElementById("cameraInput");
  const gal = document.getElementById("galleryInput");
  const status = document.getElementById("photoStatus");

  if (cam) cam.value = "";
  if (gal) gal.value = "";
  if (status) status.textContent = "";

  if (!keepCoords) {
    latEl().value = "";
    lngEl().value = "";
  }
}

 function setSelected(id) {

  // 🔥 RESET COMPLET DES PHOTOS (OBLIGATOIRE)
  renderGallery([]);
  carouselPhotos = [];
  carouselIndex = 0;
  document.getElementById("photoCarousel")?.classList.add("hidden");

  pendingPhotos = [];
  selectedId = id;

  const t = id ? getTreeById(id) : null;


    if (!t) {
      editorTitle().textContent = "Ajouter un arbre";
      editorHint().textContent = "Clique sur la carte pour choisir l’emplacement, puis complète la fiche.";
      deleteBtn().disabled = true;
      treeIdEl().value = "";
      clearForm(false);
      renderTreePreview(null);
      return;
    }

    editorTitle().textContent = "Fiche arbre";
    editorHint().textContent = "Modifie les infos puis clique sur Enregistrer.";
    deleteBtn().disabled = false;

    treeIdEl().value = t.id || "";

    latEl().value = fmtCoord(t.lat);
    lngEl().value = fmtCoord(t.lng);
    speciesEl().value = t.species || "";
    heightEl().value = t.height ?? "";
    dbhEl().value = t.dbh ?? "";
    secteurEl().value = t.secteur || "";
    addressEl().value = t.address || "";
    tagsEl().value = (t.tags || []).join(", ");
    etatEl().value = t.etat || "";
    dateDemandeEl().value = t.dateDemande || "";
    natureTravauxEl().value = t.natureTravaux || "";
    dateDemandeDevisEl().value = t.dateDemandeDevis || "";
    devisNumeroEl().value = t.devisNumero || "";
    montantDevisEl().value = t.montantDevis || "";
    dateExecutionEl().value = t.dateExecution || "";
    remarquesTravauxEl().value = t.remarquesTravaux || "";
    numeroBDCEl().value = t.numeroBDC || "";
    numeroFactureEl().value = t.numeroFacture || "";

    commentEl().value = t.comment || "";
    historyInterventionsEl().value = t.historiqueInterventions || "";

  // ⚠️ Affichage des photos UNIQUEMENT si arbre déjà enregistré
if (t.photos && t.photos.length > 0) {
  renderGallery(t.photos);
  renderPhotoCarousel(t.photos);
} else {
  document.getElementById("photoCarousel")?.classList.add("hidden");
}

renderTreePreview(t);

  }

  // =========================
  // MAP + LAYERS
  // =========================

function addOrUpdateMarker(t) {
  let m = markers.get(t.id);

 const icon = createTreeIcon(
  getColorFromSecteur(t.secteur),
  t.etat,
  t.validationEntreprise === true
);

  if (!m) {
    m = L.marker([t.lat, t.lng], { icon }).addTo(map);

    m.on("click", () => {
      if(!isAdmin() && isPastilleTree(t)) { alert('⛔ Arbre verrouillé (pastille) : sélection réservée admin'); return; }
        setSelected(t.id);
      highlightListSelection();
    });

    markers.set(t.id, m);
  } else {
    m.setLatLng([t.lat, t.lng]);
    m.setIcon(icon);
  }
}




  function removeMarker(id) {
    const m = markers.get(id);
    if (m) {
      map.removeLayer(m);
      markers.delete(id);
    }
  }

  function renderMarkers() {
    for (const m of markers.values()) map.removeLayer(m);
    markers.clear();

    const visibleTrees = getVisibleTrees();
    for (const t of visibleTrees) {
      addOrUpdateMarker(t);
    }
  }

  function getQuartierFromLatLng(lat, lng) {
    if (!quartiersLayer) return "Inconnu";
    if (typeof leafletPip === "undefined") return "Inconnu";

    const layers = leafletPip.pointInLayer([lng, lat], quartiersLayer);
    if (layers.length > 0) {
      return layers[0].feature?.properties?.name || "Inconnu";
    }
    return "Inconnu";
  }

  async function loadQuartiersGeoJSON() {
    try {
      const res = await fetch("quartiers-marcq.geojson");
      if (!res.ok) throw new Error("quartiers-marcq.geojson introuvable");
      const geojson = await res.json();

      quartiersLayer = L.geoJSON(geojson, {
        style: (feature) => {
          const nom = feature?.properties?.name || "Inconnu";
          return {
            color: getQuartierColor(nom),
            weight: 2,
            fillColor: getQuartierColor(nom),
            fillOpacity: 0.25,
          };
        },
        onEachFeature: (feature, layer) => {
          const nom = feature?.properties?.name || "Quartier";
          layer.bindPopup(`<b>${escapeHtml(nom)}</b>`);
        },
      }).addTo(map);
    } catch (err) {
      console.warn("Erreur chargement quartiers", err);
    }
  }

  async function loadCityContourAndLock() {
    try {
      const url = "https://geo.api.gouv.fr/communes/59378?format=geojson&geometry=contour";
      const res = await fetch(url);
      if (!res.ok) throw new Error("API geo.api.gouv.fr indisponible");
      const geojson = await res.json();

      cityLayer = L.geoJSON(geojson, {
        style: {
          color: "#00ffff",
          weight: 4,
          opacity: 1,
          fillColor: "#00ffff",
          fillOpacity: 0.15,
        },
      }).addTo(map);

      const bounds = cityLayer.getBounds();
      if (bounds && bounds.isValid && bounds.isValid()) {
        map.fitBounds(bounds);
        map.setMaxBounds(bounds);
        map.options.maxBoundsViscosity = 1.0;
      }
    } catch (err) {
      console.warn("Erreur chargement contour commune", err);
    }
  }
// =========================
// 📍 GEOLOCALISATION GPS
// =========================
function clearGpsLock() {
  try {
    if (gpsWatchId !== null) {
      navigator.geolocation.clearWatch(gpsWatchId);
      gpsWatchId = null;
    }
  } catch (e) {}

  gpsSamples = [];
  lockedGpsLat = null;
  lockedGpsLng = null;

  if (gpsMarker && map) {
    try { map.removeLayer(gpsMarker); } catch (e) {}
  }
  gpsMarker = null;
}

function locateUserGPS() {
  if (!navigator.geolocation) {
    alert("La géolocalisation n’est pas supportée sur cet appareil.");
    return;
  }

  // reset précédent fix
  clearGpsLock();
  gpsSamples = [];

  // UI
  selectedId = null;
  deleteBtn().disabled = true;
  editorTitle().textContent = "Recherche position GPS…";
  editorHint().textContent = "Stabilisation GPS (10 secondes)…";
  clearForm(false);

  gpsWatchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;

      // garde tout, mais on filtrera au calcul (évite 0 sample)
      gpsSamples.push({ lat: latitude, lng: longitude, accuracy: accuracy || 999 });

      // feedback live (dernière mesure)
      latEl().value = fmtCoord(latitude);
      lngEl().value = fmtCoord(longitude);
      if (map) map.setView([latitude, longitude], Math.max(map.getZoom(), 18));
    },
    (err) => {
      console.error(err);
      clearGpsLock();
      alert("Impossible d’obtenir la position GPS.");
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20000
    }
  );

  // ⏱️ après 10 secondes → verrouille la meilleure position (moyenne pondérée)
  setTimeout(() => {
    try {
      if (gpsWatchId !== null) {
        navigator.geolocation.clearWatch(gpsWatchId);
        gpsWatchId = null;
      }
    } catch (e) {}

    // filtre: ignore mesures trop imprécises
    const usable = gpsSamples.filter(p => Number.isFinite(p.accuracy) && p.accuracy <= 25);

    if (usable.length === 0) {
      clearGpsLock();
      alert("GPS insuffisamment précis (≤ 25 m). Réessaye.");
      return;
    }

    // moyenne pondérée par la précision: w = 1/accuracy²
    const weighted = usable.reduce(
      (acc, p) => {
        const w = 1 / (p.accuracy * p.accuracy);
        acc.lat += p.lat * w;
        acc.lng += p.lng * w;
        acc.w += w;
        acc.bestAcc = Math.min(acc.bestAcc, p.accuracy);
        return acc;
      },
      { lat: 0, lng: 0, w: 0, bestAcc: Infinity }
    );

    lockedGpsLat = weighted.lat / weighted.w;
    lockedGpsLng = weighted.lng / weighted.w;

    latEl().value = fmtCoord(lockedGpsLat);
    lngEl().value = fmtCoord(lockedGpsLng);

    editorTitle().textContent = "Ajouter un arbre (GPS verrouillé)";
    editorHint().textContent =
      `Position GPS verrouillée (moyenne sur ${usable.length} mesures, meilleure précision ±${Math.round(weighted.bestAcc)} m).`;

    // 📍 point GPS visible + déplaçable
    if (gpsMarker) {
      gpsMarker.setLatLng([lockedGpsLat, lockedGpsLng]);
    } else {
      gpsMarker = L.marker([lockedGpsLat, lockedGpsLng], {
        draggable: true,
        icon: L.divIcon({
          className: "gps-marker",
          html: "📍",
          iconSize: [24, 24],
          iconAnchor: [12, 24]
        })
      }).addTo(map);

      gpsMarker.on("dragend", () => {
        const pos = gpsMarker.getLatLng();
        lockedGpsLat = pos.lat;
        lockedGpsLng = pos.lng;

        latEl().value = fmtCoord(pos.lat);
        lngEl().value = fmtCoord(pos.lng);

        editorHint().textContent = "Position ajustée manuellement (drag)";
      });
    }

    if (map) map.setView([lockedGpsLat, lockedGpsLng], Math.max(map.getZoom(), 18));
    renderTreePreview(null);
    highlightListSelection();
  }, 10000);
}

  // =========================
  // INIT
  // =========================
  function initMap() {
  // ✅ évite Leaflet "Map container is already initialized"
  if (window._leafletMap) {
    map = window._leafletMap;
    return window._leafletMap;
  }
    map = L.map("map", {
      zoomControl: true,
      minZoom: 13,
      maxZoom: 19,
    }).setView(MARCQ_CENTER, 14);

    

    window._leafletMap = map; // ✅ FIX: stocke la map
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

   // 📍 Sélection emplacement (PC + mobile)
function handleMapSelect(e) {

  // ✅ si point GPS actif : clic carte = déplacer le point (plus simple que désactiver)
  if (gpsMarker) {
    const { lat, lng } = e.latlng;

    // option: impose aussi dans la commune si contour chargé
    if (cityLayer && typeof leafletPip !== "undefined") {
      const inside = leafletPip.pointInLayer([lng, lat], cityLayer).length > 0;
      if (!inside) {
        alert("⛔ L’arbre doit être situé dans Marcq-en-Barœul");
        return;
      }
    }

    gpsMarker.setLatLng([lat, lng]);
    lockedGpsLat = lat;
    lockedGpsLng = lng;

    latEl().value = fmtCoord(lat);
    lngEl().value = fmtCoord(lng);

    editorTitle().textContent = "Ajouter un arbre (GPS ajusté)";
    editorHint().textContent = "Position GPS ajustée au clic (déplaçable).";
    renderTreePreview(null);
    highlightListSelection();
    return;
  }

  // si contour chargé + pip dispo => imposer dans la commune
  if (cityLayer && typeof leafletPip !== "undefined") {
    const inside = leafletPip.pointInLayer(
      [e.latlng.lng, e.latlng.lat],
      cityLayer
    ).length > 0;

    if (!inside) {
      alert("⛔ L’arbre doit être situé dans Marcq-en-Barœul");
      return;

    }
  }

  const { lat, lng } = e.latlng;
  selectedId = null;

  deleteBtn().disabled = true;
  editorTitle().textContent = "Ajouter un arbre";
  editorHint().textContent = "Complète la fiche puis clique sur Enregistrer.";

  clearForm(false);
  latEl().value = fmtCoord(lat);
  lngEl().value = fmtCoord(lng);

  renderTreePreview(null);
  highlightListSelection();
}

// 👇 IMPORTANT : PC + MOBILE
map.on("click", handleMapSelect);
map.on("tap", handleMapSelect);

  }

  console.log("📎 binding galleryInput change");

  function wireUI() {
    qEl().addEventListener("input", () => renderList());
const takePhotoBtn = document.getElementById("takePhotoBtn");
const pickGalleryBtn = document.getElementById("pickGalleryBtn");

const cameraInput = document.getElementById("cameraInput");
const galleryInput = document.getElementById("galleryInput");
const photoStatus = document.getElementById("photoStatus");
// 📸 stockage temporaire des photos (IMPORTANT mobile)




// 📸 Caméra (mobile compatible)
cameraInput.addEventListener("change", async () => {
  if (!cameraInput.files || !cameraInput.files[0]) return;

  const newPhotos = await readFilesAsDataUrls(cameraInput.files);

  for (const photo of newPhotos) {
    if (!pendingPhotos.some(
      p => p.name === photo.name && p.size === photo.size
    )) {
      pendingPhotos.push(photo);
    }
  }

  cameraInput.value = ""; // 🔒 empêche double déclenchement

  updatePhotoStatus();
  renderGallery(pendingPhotos);
  renderPhotoCarousel(pendingPhotos);
});


// 🖼️ Galerie
galleryInput.addEventListener("change", async () => {
  if (!galleryInput.files || galleryInput.files.length === 0) return;

  const newPhotos = await readFilesAsDataUrls(galleryInput.files);

  for (const photo of newPhotos) {
    if (!pendingPhotos.some(
      p => p.name === photo.name && p.size === photo.size
    )) {
      pendingPhotos.push(photo);
    }
  }

  galleryInput.value = ""; // 🔒 reset obligatoire

  updatePhotoStatus();
  renderGallery(pendingPhotos);
  renderPhotoCarousel(pendingPhotos);
});



function updatePhotoStatus() {
  if (pendingPhotos.length === 0) {
    photoStatus.textContent = "";
    return;
  }

  photoStatus.textContent = `📷 ${pendingPhotos.length} photo${pendingPhotos.length > 1 ? "s" : ""} ajoutée${pendingPhotos.length > 1 ? "s" : ""}`;
}


// 📸 Caméra
takePhotoBtn.onclick = () => {
  cameraInput.click();
};

// 🖼️ Galerie
pickGalleryBtn.onclick = () => {
  galleryInput.click();
};

    exportBtn().onclick = () => {
      const blob = new Blob([JSON.stringify({ exportedAt: Date.now(), trees }, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "patrimoine-arbore-marcq-export.json";
      a.click();
      URL.revokeObjectURL(url);
    };
const toggleListBtn = el("toggleListBtn");
const treeListWrapper = el("treeListWrapper");
const gpsBtn = el("gpsBtn");
if (gpsBtn) {
  gpsBtn.onclick = () => locateUserGPS();
}

if (toggleListBtn && treeListWrapper) {
  let collapsed = false;

  toggleListBtn.onclick = () => {
    collapsed = !collapsed;

    treeListWrapper.style.display = collapsed ? "none" : "block";
    toggleListBtn.textContent = collapsed ? "Afficher" : "Réduire";
  };
}

    importBtn().onclick = () => importFile().click();

    importFile().onchange = async () => {
      const file = importFile().files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const incoming = Array.isArray(data) ? data : data.trees;
        if (!Array.isArray(incoming)) throw new Error("Format JSON inattendu.");

        const byId = new Map(trees.map((t) => [t.id, t]));
        for (const t of incoming) {
          if (!t || !t.id) continue;
          byId.set(t.id, t);
        }
        trees = Array.from(byId.values());
        persistAndRefresh();
        alert("Import terminé.");
      } catch (e) {
        alert("Import impossible : " + (e?.message || e));
      } finally {
        importFile().value = "";
      }
    };

    newBtn().onclick = () => {
    pendingPhotos = []; // 🔥 reset photos temporaires

      selectedId = null;
      deleteBtn().disabled = true;
      editorTitle().textContent = "Ajouter un arbre";
      editorHint().textContent = "Clique sur la carte pour choisir l’emplacement, puis complète la fiche.";
      clearForm(true);
      renderList();
      highlightListSelection();
      renderTreePreview(null);
    };

 deleteBtn().onclick = async () => {
  if (!selectedId) return;
  if (!confirm("Supprimer cet arbre ?")) return;

  const t = getTreeById(selectedId);
  if (!t) return;

  // 🧠 sauvegarde pour annulation
  lastDeletedTree = { ...t };

  // 🔗 suppression Google Sheets
 try {
  

 await postToGAS({
  action: "delete",
  id: t.id
});

} catch (e) {
  console.warn("Suppression Google Sheets échouée", e);
}


  // 🗑️ suppression locale
  trees = trees.filter(x => x.id !== t.id);
  removeMarker(t.id);
  selectedId = null;
  saveTreesLocal();
  renderMarkers();
  renderList();
  renderSecteurCount();
  setSelected(null);

  // 👀 afficher bouton Annuler
  const undoBtn = el("undoBtn");
  if (undoBtn) undoBtn.style.display = "inline-block";
};

const undoBtn = el("undoBtn");
if (undoBtn) {
  undoBtn.onclick = async () => {
    if (!lastDeletedTree) return;

    const t = lastDeletedTree;
    lastDeletedTree = null;

    // 🔁 restauration locale
    trees.unshift(t);
    saveTreesLocal();
    renderMarkers();
    renderList();
    renderSecteurCount();
    if(!isAdmin() && isPastilleTree(t)) { alert('⛔ Arbre verrouillé (pastille) : sélection réservée admin'); return; }
        setSelected(t.id);

    // 🔗 restauration Google Sheets
    await syncToSheets(t);

    // ❌ cacher le bouton
    undoBtn.style.display = "none";
  };
}


    saveBtn().onclick = async () => {
      const lat = (lockedGpsLat ?? parseFloat(latEl().value));
      const lng = (lockedGpsLng ?? parseFloat(lngEl().value));


      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        alert("Merci de définir un emplacement (clique sur la carte).");
        return;
      }

      const quartier = getQuartierFromLatLng(lat, lng);
const photos = pendingPhotos.map(p => ({
  id: p.id,
  name: p.name,
  addedAt: p.addedAt,
  dataUrl: p.dataUrl
}));



if (selectedId) {
  // update
  const t = getTreeById(selectedId);
  if (!t) return;

  t.lat = lat;
  t.lng = lng;
  t.quartier = quartier;
  t.species = speciesEl().value.trim();
  t.height = heightEl().value === "" ? null : Number(heightEl().value);
  t.dbh = dbhEl().value === "" ? null : Number(dbhEl().value);
  t.secteur = secteurEl().value;
  t.address = addressEl().value.trim();
  t.tags = normalizeTags(tagsEl().value);
  t.etat = etatEl().value || "";
  t.dateDemande = dateDemandeEl().value;
  t.natureTravaux = natureTravauxEl().value.trim();
  t.dateDemandeDevis = dateDemandeDevisEl().value;
  t.devisNumero = devisNumeroEl().value.trim();
  t.montantDevis = montantDevisEl().value;
  t.dateExecution = dateExecutionEl().value;
  t.remarquesTravaux = remarquesTravauxEl().value.trim();
  t.numeroBDC = numeroBDCEl().value.trim();
  t.numeroFacture = numeroFactureEl().value.trim();

  t.comment = commentEl().value.trim();
  t.historiqueInterventions = historyInterventionsEl().value.trim();

  // 🔥 photos : fusion définitive
  t.photos = [...(t.photos || []), ...pendingPhotos];
  pendingPhotos = [];

  t.updatedAt = Date.now();

  saveTreesLocal();        // 💾 local OK
  await syncToSheets(t);  // ☁️ Sheets (métadonnées seulement)

  persistAndRefresh(t.id); // 🔁 UI + carte + liste

  cameraInput.value = "";
  galleryInput.value = "";
  photoStatus.textContent = "";

  alert("Arbre mis à jour.");

  clearGpsLock();
  return;

}


      // create
      const t = {
        id: uid(),
        lat,
        lng,
        quartier,
        species: speciesEl().value.trim(),
        height: heightEl().value === "" ? null : Number(heightEl().value),
        dbh: dbhEl().value === "" ? null : Number(dbhEl().value),
        secteur: secteurEl().value,
        address: addressEl().value.trim(),
        tags: normalizeTags(tagsEl().value),
        etat: etatEl().value || "",
        comment: commentEl().value.trim(),
        historiqueInterventions: historyInterventionsEl().value.trim(),
        photos,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await syncToSheets(t);

      trees.unshift(t);
      persistAndRefresh(t.id);
pendingPhotos = [];

      treeIdEl().value = t.id;
      cameraInput.value = "";
      galleryInput.value = "";
      photoStatus.textContent = "";
      alert("Arbre ajouté.");
      clearGpsLock();
    };
  }
async function loadTreesFromSheets() {
  try {
    if (!authToken) {
      console.warn("⛔ Pas de token, chargement Sheets annulé");
      return;
    }

    const url =
      API_URL +
      "?token=" + encodeURIComponent(authToken) +
      "&_=" + Date.now();

    const res = await fetch(url, {
      cache: "no-store"
    });

    if (!res.ok) throw new Error("Sheets indisponible: " + res.status);

    const txt = await res.text();
    const data = JSON.parse(txt);
    // 🔐 Si Apps Script renvoie "unauthorized"
    if (data && data.ok === false && data.error === "unauthorized") {
      console.warn("🔒 Token expiré → retour login");
      localStorage.removeItem("authToken");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userSecteur");
      document.getElementById("loginOverlay").style.display = "flex";
      return;
    }

    if (!Array.isArray(data)) throw new Error("Format Sheets invalide");

    trees = data;
    saveTreesLocal();

    console.log("📥 Données chargées depuis Google Sheets :", trees.length);
  } catch (e) {
    console.warn("⚠️ Impossible de charger depuis Sheets, fallback local", e);
  }
}


let isAgentMode = localStorage.getItem("agentMode") === "true";

function applyAgentMode() {
  document.body.classList.toggle("agent-mode", isAgentMode);
  localStorage.setItem("agentMode", isAgentMode);

  const btn = document.getElementById("agentModeBtn");
  if (btn) {
    btn.textContent = isAgentMode ? "🖥️ Mode bureau" : "📱 Mode agent";
  }
}

document.getElementById("agentModeBtn")?.addEventListener("click", () => {
  isAgentMode = !isAgentMode;
  applyAgentMode();
});

// appliquer au chargement
applyAgentMode();

  // =========================
  // START
  // =========================



document.addEventListener("DOMContentLoaded", async () => {
  // 🔄 Relire le token au démarrage (persistant)
  authToken = localStorage.getItem("authToken");

  if (!authToken) {
    console.warn("🔒 Pas de token → affichage login");
    document.getElementById("loginOverlay").style.display = "flex";
    return;
  }

  // ✅ Token présent → on lance l'app + charge Sheets
  await startApp();
});

async function startApp() {
  // si Leaflet pas chargé => stop clair
  if (typeof L === "undefined") {
    console.error("Leaflet (L) n'est pas chargé.");
    alert("Leaflet ne s'est pas chargé. Vérifie la connexion / scripts.");
    return;
  }

  await loadTreesFromSheets();

  initMap();
  addLegendToMap();
  wireUI();
  wireValidateIntervention();
  applyTravauxLock();

  await loadQuartiersGeoJSON();
  await loadCityContourAndLock();

   renderMarkers();
  renderList();
  renderSecteurCount();

  // 🔗 OUVERTURE VIA QR CODE (?id=XXXX)
  const treeIdFromQR = getTreeIdFromURL();
  if (treeIdFromQR) {
    const t = trees.find(x => String(x.id) === String(treeIdFromQR));
    if (t) {
      setSelected(t.id);

      // 🎯 centrer la carte
      if (map && t.lat && t.lng) {
        map.setView([t.lat, t.lng], 18);
      }

      highlightListSelection();
    } else {
      alert("⚠️ Arbre introuvable (QR invalide)");
    }
  } else {
    setSelected(null);
  }

  console.log("✅ App chargée (auth OK).");
} // ✅ FIN startApp()





  let carouselIndex = 0;
let carouselPhotos = [];

function renderPhotoCarousel(photos) {
  const box = document.getElementById("photoCarousel");
  const img = document.getElementById("carouselImage");
  const count = document.getElementById("carouselCount");

  if (!photos || photos.length === 0) {
    box.classList.add("hidden");
    return;
  }

  carouselPhotos = photos;
  carouselIndex = Math.min(carouselIndex, photos.length - 1);


  box.classList.remove("hidden");
  updateCarousel();

  // boutons (UNE SEULE FOIS)
  box.querySelector(".left").onclick = () => {
    carouselIndex = (carouselIndex - 1 + carouselPhotos.length) % carouselPhotos.length;
    updateCarousel();
  };

  box.querySelector(".right").onclick = () => {
    carouselIndex = (carouselIndex + 1) % carouselPhotos.length;
    updateCarousel();
  };

  // 📱 swipe tactile
  let startX = 0;
  img.ontouchstart = (e) => startX = e.touches[0].clientX;
  img.ontouchend = (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    if (dx > 50) box.querySelector(".left").click();
    if (dx < -50) box.querySelector(".right").click();
  };
}

function updateCarousel() {
  const img = document.getElementById("carouselImage");
  const count = document.getElementById("carouselCount");

  const p = carouselPhotos[carouselIndex];
  img.src = getPhotoSrc(p);

  count.textContent = `${carouselIndex + 1} / ${carouselPhotos.length}`;
}

function extractDriveIdFromUrl(url) {
  if (!url) return null;

  // format /d/ID/
  const m1 = url.match(/\/d\/([^/]+)/);
  if (m1 && m1[1]) return m1[1];

  // format ?id=ID
  const m2 = url.match(/[?&]id=([^&]+)/);
  if (m2 && m2[1]) return m2[1];

  return null;
}


function getColorFromEtat(etat) {
  switch (etat) {
    case "Dangereux (A abattre)": return "#e53935"; // rouge
    case "A surveiller":  return "#fb8c00"; // orange
    case "A élaguer (URGENT)":  return "#FFFF00"; // jaune
    case "A élaguer (Moyen)":  return "#00FFFF"; // beuc lair
    case "A élaguer (Faible)":  return "#43a047"; // vert
    default: return null;
  }
}

document.getElementById("loginBtn")?.addEventListener("click", async () => {
  const login = document.getElementById("loginSelect").value; // ✅ AJOUT
  const pwd = document.getElementById("passwordInput").value;
  const err = document.getElementById("loginError");

  err.textContent = "";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: new URLSearchParams({
        action: "login",
        login: login,        // ✅ AJOUT
        password: pwd        // ✅ OK
      })
    });

    const txt = await res.text();
    const data = JSON.parse(txt);
    if (!data.ok) {
      err.textContent = "Mot de passe incorrect";
      return;
    }

    authToken = data.token;
    localStorage.setItem("authToken", authToken);

    // ✅ bonus : stocker infos user
    localStorage.setItem("userRole", data.role || "");
    localStorage.setItem("userSecteur", data.secteur || "");

    isAuthenticated = true;

    updateLogoutButtonVisibility();
    document.getElementById("loginOverlay").style.display = "none";
    startApp();

  } catch (e) {
    err.textContent = "Erreur de connexion";
  }
});


// Bouton Déconnexion
document.getElementById("logoutBtn")?.addEventListener("click", logout);


})();

    



/* =========================
   ✅ HISTORIQUE INTERVENTIONS (AJOUT)
========================= */

function formatInterventionLine_() {
  const get = (id) => (document.getElementById(id)?.value || "").trim();

  const dateDemande = get("dateDemande");
  const natureTravaux = get("natureTravaux");
  const dateDemandeDevis = get("dateDemandeDevis");
  const devisNumero = get("devisNumero");
  const montantDevis = get("montantDevis");
  const dateExecution = get("dateExecution");
  const remarquesTravaux = get("remarquesTravaux");
  const numeroBDC = get("numeroBDC");
  const numeroFacture = get("numeroFacture");

  const all = [dateDemande,natureTravaux,dateDemandeDevis,devisNumero,montantDevis,dateExecution,remarquesTravaux,numeroBDC,numeroFacture]
    .some(v => v !== "");
  if (!all) return "";

  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");

  return `[${yyyy}-${mm}-${dd}] dateDemande=${dateDemande} | natureTravaux=${natureTravaux} | dateDemandeDevis=${dateDemandeDevis} | devisNumero=${devisNumero} | montantDevis=${montantDevis} | dateExecution=${dateExecution} | remarquesTravaux=${remarquesTravaux} | numeroBDC=${numeroBDC} | numeroFacture=${numeroFacture}`;
}

function clearTravauxFields_() {
  ["dateDemande","natureTravaux","dateDemandeDevis","devisNumero","montantDevis","dateExecution","remarquesTravaux","numeroBDC","numeroFacture"].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.value="";
  });
}

function appendToHistoryUI_(line) {
  const ta = document.getElementById("historyInterventions");
  if (!ta) return;
  const cur = (ta.value || "").trim();
  ta.value = cur ? (cur + "\n" + line) : line;
}

function updateRightPreviewHistory_(text) {
  const box = document.getElementById("rightHistoryInterventions");
  if (box) box.textContent = text || "";
}

function getSelectedTreeObject_() {
  if (typeof selectedTree !== "undefined" && selectedTree) return selectedTree;
  if (typeof currentTree !== "undefined" && currentTree) return currentTree;
  if (typeof selectedArbre !== "undefined" && selectedArbre) return selectedArbre;
  return null;
}

function setSelectedTreeHistory_(txt) {
  const t = getSelectedTreeObject_();
  if (t) t.historyInterventions = txt;
}

function handleValiderIntervention_() {
  const line = formatInterventionLine_();
  if (!line) return;
  appendToHistoryUI_(line);

  const txt = (document.getElementById("historyInterventions")?.value || "").trim();
  setSelectedTreeHistory_(txt);
  updateRightPreviewHistory_(txt);

  clearTravauxFields_();

  const sb = document.getElementById("saveBtn");
  if (sb) sb.click();
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnValiderIntervention");
  if (btn) btn.addEventListener("click", handleValiderIntervention_);
});

// =========================
// 📄 EXPORT PDF (ADMIN UNIQUEMENT) — TÉLÉCHARGEMENT LOCAL
// =========================
window.exportArbrePDF = async function (id) {
  if (!id) return alert("ID d’arbre manquant");

  try {
    const res = await window.postToGAS({ action: "exportArbrePDF", id });

    if (!res || !res.ok || !res.fileUrl) {
      console.error(res);
      return alert("Erreur lors de la génération du PDF");
    }

    window.open(res.fileUrl, "_blank");
  } catch (e) {
    console.error(e);
    alert("Erreur export PDF");
  }
};

window.exportAnnuelPDF = async function () {
  const year = document.getElementById("yearSelect")?.value;

  if (!year) {
    alert("Veuillez choisir une année");
    return;
  }

  try {
    const res = await window.postToGAS({
      action: "exportAnnuelPDF",
      year: year
    });

    if (!res || !res.ok || !res.fileUrl) {
      console.error(res);
      return alert("Erreur export annuel");
    }

    window.open(res.fileUrl, "_blank");
  } catch (e) {
    console.error(e);
    alert("Erreur export PDF annuel");
  }
};

// =========================
// 📄 EXPORT PDF — FEUILLES MÉTIER
// =========================
window.exportSurveillancePDF = async function () {
  if (!isAdmin()) {
    alert("Action réservée à l’administrateur");
    return;
  }

  const res = await postToGAS({
    action: "exportSurveillancePDF"
  });

  if (res?.ok && res.fileUrl) {
    window.open(res.fileUrl, "_blank");
  } else {
    console.error(res);
    alert("Erreur export PDF Arbres à surveiller");
  }
};

window.exportAbattagesPDF = async function () {
  if (!isAdmin()) {
    alert("Action réservée à l’administrateur");
    return;
  }

  const res = await postToGAS({
    action: "exportAbattagesPDF"
  });

  if (res?.ok && res.fileUrl) {
    window.open(res.fileUrl, "_blank");
  } else {
    console.error(res);
    alert("Erreur export PDF Abattages");
  }
};

window.exportElagagesPDF = async function () {
  if (!isAdmin()) {
    alert("Action réservée à l’administrateur");
    return;
  }

  const res = await postToGAS({
    action: "exportElagagesPDF"
  });

  if (res?.ok && res.fileUrl) {
    window.open(res.fileUrl, "_blank");
  } else {
    console.error(res);
    alert("Erreur export PDF Élagages");
  }
};

async function normalizePhotoToJpeg(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          const fixedFile = new File(
            [blob],
            file.name.replace(/\.(heic|png|jpg|jpeg)$/i, ".jpg"),
            { type: "image/jpeg" }
          );
          URL.revokeObjectURL(url);
          resolve(fixedFile);
        },
        "image/jpeg",
        0.9
      );
    };

    img.src = url;
  });
}
