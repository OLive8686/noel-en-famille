let config = {};
let currentUser = localStorage.getItem('noel_user') || '';

document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  setupEventListeners();
  if (currentUser) showApp();
});

async function loadConfig() {
  const res = await fetch('/api/config');
  config = await res.json();
  setupUserButtons();
  setupSelects();
}

function setupUserButtons() {
  const c = document.getElementById('user-buttons');
  c.innerHTML = config.familyMembers.map(n =>
    '<button class="user-btn" onclick="selectUser(\'' + n + '\')">' + n + '</button>'
  ).join('');
}

function setupSelects() {
  document.getElementById('plat-categorie').innerHTML = config.categories.map(c =>
    '<option value="' + c + '">' + c + '</option>').join('');
  document.getElementById('plat-apporte-par').innerHTML = config.familyMembers.map(n =>
    '<option value="' + n + '">' + n + '</option>').join('');
}

function updateDestinataireSelect() {
  document.getElementById('cadeau-destinataire').innerHTML = config.familyMembers
    .filter(n => n !== currentUser)
    .map(n => '<option value="' + n + '">' + n + '</option>').join('');
}

function selectUser(name) {
  currentUser = name;
  localStorage.setItem('noel_user', name);
  showApp();
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  document.getElementById('current-user-display').textContent = currentUser;
  updateDestinataireSelect();
  loadCadeaux(); loadPlats(); loadStats();
}

function setupEventListeners() {
  document.getElementById('logout-btn').onclick = () => {
    currentUser = '';
    localStorage.removeItem('noel_user');
    document.getElementById('app-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
  };
  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    };
  });
  document.getElementById('add-cadeau-btn').onclick = () => openCadeauModal();
  document.getElementById('add-plat-btn').onclick = () => openPlatModal();
  document.getElementById('form-cadeau').onsubmit = saveCadeau;
  document.getElementById('form-plat').onsubmit = savePlat;
  document.querySelectorAll('.modal').forEach(m => {
    m.onclick = (e) => { if (e.target === m) closeModal(m.id); };
  });
}

async function loadCadeaux() {
  const res = await fetch('/api/cadeaux?user=' + encodeURIComponent(currentUser));
  renderCadeaux(await res.json());
}

function renderCadeaux(list) {
  const c = document.getElementById('cadeaux-list');
  if (!list.length) { c.innerHTML = '<p style="text-align:center;color:#666;padding:20px;">Aucun cadeau</p>'; return; }
  c.innerHTML = list.map(x =>
    '<div class="card"><div class="card-header"><span class="card-title">Pour ' + x.destinataire + '</span>' +
    '<span class="card-badge ' + (x.statut==='achete'?'badge-achete':'badge-a-acheter') + '">' + x.statut + '</span></div>' +
    '<div class="card-info"><strong>Description:</strong> ' + x.description + '</div>' +
    (x.prix ? '<div class="card-info"><strong>Prix:</strong> ' + x.prix + ' EUR</div>' : '') +
    (x.magasin ? '<div class="card-info"><strong>Magasin:</strong> ' + x.magasin + '</div>' : '') +
    (x.url ? '<a href="' + x.url + '" target="_blank" class="card-link">Voir le lien</a>' : '') +
    '<div class="card-actions"><button class="btn-edit" onclick="editCadeau(' + x.id + ')">Modifier</button>' +
    '<button class="btn-delete" onclick="deleteCadeau(' + x.id + ')">Supprimer</button></div></div>'
  ).join('');
}

async function loadStats() {
  const res = await fetch('/api/stats?user=' + encodeURIComponent(currentUser));
  const s = await res.json();
  document.getElementById('stats-bar').innerHTML =
    '<div class="stat"><div class="stat-value">' + (s.total||0) + '</div><div class="stat-label">Total</div></div>' +
    '<div class="stat"><div class="stat-value">' + (s.achetes||0) + '</div><div class="stat-label">Achetes</div></div>' +
    '<div class="stat"><div class="stat-value">' + (s.a_acheter||0) + '</div><div class="stat-label">A acheter</div></div>' +
    '<div class="stat"><div class="stat-value">' + (s.total_prix||0).toFixed(0) + ' EUR</div><div class="stat-label">Budget</div></div>';
}

function openCadeauModal(c) {
  document.getElementById('modal-cadeau-title').textContent = c ? 'Modifier' : 'Ajouter un cadeau';
  document.getElementById('cadeau-id').value = c?.id || '';
  document.getElementById('cadeau-destinataire').value = c?.destinataire || '';
  document.getElementById('cadeau-description').value = c?.description || '';
  document.getElementById('cadeau-url').value = c?.url || '';
  document.getElementById('cadeau-prix').value = c?.prix || '';
  document.getElementById('cadeau-magasin').value = c?.magasin || '';
  document.getElementById('cadeau-statut').value = c?.statut || 'a acheter';
  document.getElementById('modal-cadeau').classList.remove('hidden');
}

async function editCadeau(id) {
  const res = await fetch('/api/cadeaux?user=' + encodeURIComponent(currentUser));
  const c = (await res.json()).find(x => x.id === id);
  if (c) openCadeauModal(c);
}

async function saveCadeau(e) {
  e.preventDefault();
  const id = document.getElementById('cadeau-id').value;
  const data = {
    destinataire: document.getElementById('cadeau-destinataire').value,
    description: document.getElementById('cadeau-description').value,
    url: document.getElementById('cadeau-url').value,
    prix: document.getElementById('cadeau-prix').value,
    magasin: document.getElementById('cadeau-magasin').value,
    statut: document.getElementById('cadeau-statut').value,
    acheteur: currentUser
  };
  await fetch(id ? '/api/cadeaux/' + id : '/api/cadeaux', {
    method: id ? 'PUT' : 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  });
  closeModal('modal-cadeau'); loadCadeaux(); loadStats();
}

async function deleteCadeau(id) {
  if (!confirm('Supprimer ?')) return;
  await fetch('/api/cadeaux/' + id, {method: 'DELETE'});
  loadCadeaux(); loadStats();
}

async function loadPlats() {
  const res = await fetch('/api/plats');
  renderPlats(await res.json());
}

function renderPlats(list) {
  const c = document.getElementById('plats-list');
  if (!list.length) { c.innerHTML = '<p style="text-align:center;color:#666;padding:20px;">Aucun plat</p>'; return; }
  const byCat = {};
  list.forEach(p => { if (!byCat[p.categorie]) byCat[p.categorie] = []; byCat[p.categorie].push(p); });
  let html = '';
  config.categories.forEach(cat => {
    if (byCat[cat]) {
      html += '<div class="category-header">' + cat + '</div>';
      html += byCat[cat].map(p =>
        '<div class="card"><div class="card-header"><span class="card-title">' + p.nom + '</span></div>' +
        '<div class="card-info"><strong>Par:</strong> ' + p.apporte_par + '</div>' +
        (p.commentaires ? '<div class="card-info"><strong>Notes:</strong> ' + p.commentaires + '</div>' : '') +
        '<div class="card-actions"><button class="btn-edit" onclick="editPlat(' + p.id + ')">Modifier</button>' +
        '<button class="btn-delete" onclick="deletePlat(' + p.id + ')">Supprimer</button></div></div>'
      ).join('');
    }
  });
  c.innerHTML = html;
}

function openPlatModal(p) {
  document.getElementById('modal-plat-title').textContent = p ? 'Modifier' : 'Ajouter un plat';
  document.getElementById('plat-id').value = p?.id || '';
  document.getElementById('plat-nom').value = p?.nom || '';
  document.getElementById('plat-categorie').value = p?.categorie || config.categories[0];
  document.getElementById('plat-apporte-par').value = p?.apporte_par || currentUser;
  document.getElementById('plat-commentaires').value = p?.commentaires || '';
  document.getElementById('modal-plat').classList.remove('hidden');
}

async function editPlat(id) {
  const res = await fetch('/api/plats');
  const p = (await res.json()).find(x => x.id === id);
  if (p) openPlatModal(p);
}

async function savePlat(e) {
  e.preventDefault();
  const id = document.getElementById('plat-id').value;
  const data = {
    nom: document.getElementById('plat-nom').value,
    categorie: document.getElementById('plat-categorie').value,
    apporte_par: document.getElementById('plat-apporte-par').value,
    commentaires: document.getElementById('plat-commentaires').value
  };
  await fetch(id ? '/api/plats/' + id : '/api/plats', {
    method: id ? 'PUT' : 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  });
  closeModal('modal-plat'); loadPlats();
}

async function deletePlat(id) {
  if (!confirm('Supprimer ?')) return;
  await fetch('/api/plats/' + id, {method: 'DELETE'});
  loadPlats();
}

function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
