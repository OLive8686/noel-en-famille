let config = {};
let currentUser = localStorage.getItem('noel_user') || '';
let isAdmin = false;
let adminUnlocked = localStorage.getItem('noel_admin_unlocked') === 'true';
const ADMIN_CODE = '4747';

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

  // Check if admin (must be admin user AND have unlocked with code)
  const isAdminUser = (currentUser === config.admin);
  isAdmin = isAdminUser && adminUnlocked;

  if (isAdmin) {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
  } else {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
  }

  // If admin user but not unlocked, show code prompt
  if (isAdminUser && !adminUnlocked) {
    setTimeout(() => {
      document.getElementById('modal-admin-code').classList.remove('hidden');
      document.getElementById('admin-code-input').focus();
    }, 500);
  }

  updateDestinataireSelect();
  loadCadeaux(); loadPlats(); loadStats();
  if (isAdmin) loadAdminData();
}

function verifyAdminCode() {
  const input = document.getElementById('admin-code-input');
  const code = input.value.trim();

  if (code === ADMIN_CODE) {
    adminUnlocked = true;
    localStorage.setItem('noel_admin_unlocked', 'true');
    isAdmin = true;
    closeModal('modal-admin-code');
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    loadAdminData();
    input.value = '';
  } else {
    alert('Code incorrect !');
    input.value = '';
    input.focus();
  }
}

function setupEventListeners() {
  document.getElementById('logout-btn').onclick = () => {
    currentUser = '';
    isAdmin = false;
    localStorage.removeItem('noel_user');
    document.getElementById('app-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    // Reset to cadeaux tab
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('[data-tab="cadeaux"]').classList.add('active');
    document.getElementById('tab-cadeaux').classList.add('active');
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

  // Admin event listeners
  document.getElementById('add-member-btn').onclick = addMember;
  document.getElementById('add-category-btn').onclick = addCategory;
  document.getElementById('new-member-name').onkeypress = (e) => { if (e.key === 'Enter') addMember(); };
  document.getElementById('new-category-name').onkeypress = (e) => { if (e.key === 'Enter') addCategory(); };
  document.getElementById('admin-code-input').onkeypress = (e) => { if (e.key === 'Enter') verifyAdminCode(); };
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
  if (isAdmin) loadAdminData();
}

async function deleteCadeau(id) {
  if (!confirm('Supprimer ?')) return;
  await fetch('/api/cadeaux/' + id, {method: 'DELETE'});
  loadCadeaux(); loadStats();
  if (isAdmin) loadAdminData();
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

// ========== ADMIN FUNCTIONS ==========

async function loadAdminData() {
  await loadAdminStats();
  await loadAllCadeaux();
  renderMembersList();
  renderCategoriesList();
}

async function loadAdminStats() {
  const res = await fetch('/api/stats/global');
  const s = await res.json();
  document.getElementById('admin-stats-bar').innerHTML =
    '<div class="stat"><div class="stat-value">' + (s.total||0) + '</div><div class="stat-label">Total cadeaux</div></div>' +
    '<div class="stat"><div class="stat-value">' + (s.achetes||0) + '</div><div class="stat-label">Achetes</div></div>' +
    '<div class="stat"><div class="stat-value">' + (s.a_acheter||0) + '</div><div class="stat-label">A acheter</div></div>' +
    '<div class="stat"><div class="stat-value">' + (s.total_prix||0).toFixed(0) + ' EUR</div><div class="stat-label">Budget total</div></div>';
}

async function loadAllCadeaux() {
  const res = await fetch('/api/cadeaux/all');
  const list = await res.json();
  const c = document.getElementById('admin-cadeaux-list');
  if (!list.length) { c.innerHTML = '<p style="text-align:center;color:#666;padding:20px;">Aucun cadeau</p>'; return; }
  c.innerHTML = list.map(x =>
    '<div class="card admin-card"><div class="card-header"><span class="card-title">Pour ' + x.destinataire + '</span>' +
    '<span class="card-badge ' + (x.statut==='achete'?'badge-achete':'badge-a-acheter') + '">' + x.statut + '</span></div>' +
    '<div class="card-info"><strong>Description:</strong> ' + x.description + '</div>' +
    '<div class="card-info"><strong>Acheteur:</strong> ' + (x.acheteur || 'Non defini') + '</div>' +
    (x.prix ? '<div class="card-info"><strong>Prix:</strong> ' + x.prix + ' EUR</div>' : '') +
    (x.magasin ? '<div class="card-info"><strong>Magasin:</strong> ' + x.magasin + '</div>' : '') +
    (x.url ? '<a href="' + x.url + '" target="_blank" class="card-link">Voir le lien</a>' : '') +
    '<div class="card-actions"><button class="btn-edit" onclick="editCadeauAdmin(' + x.id + ')">Modifier</button>' +
    '<button class="btn-delete" onclick="deleteCadeauAdmin(' + x.id + ')">Supprimer</button></div></div>'
  ).join('');
}

async function editCadeauAdmin(id) {
  const res = await fetch('/api/cadeaux/all');
  const c = (await res.json()).find(x => x.id === id);
  if (c) {
    // For admin, show all members in destinataire select
    document.getElementById('cadeau-destinataire').innerHTML = config.familyMembers
      .map(n => '<option value="' + n + '">' + n + '</option>').join('');
    openCadeauModal(c);
  }
}

async function deleteCadeauAdmin(id) {
  if (!confirm('Supprimer ce cadeau ?')) return;
  await fetch('/api/cadeaux/' + id, {method: 'DELETE'});
  loadAllCadeaux();
  loadAdminStats();
  loadCadeaux();
  loadStats();
}

function renderMembersList() {
  const c = document.getElementById('members-list');
  c.innerHTML = config.familyMembers.map(m =>
    '<div class="member-tag">' + m +
    (m !== config.admin ? '<button class="remove-btn" onclick="removeMember(\'' + m + '\')">&times;</button>' : '') +
    '</div>'
  ).join('');
}

function renderCategoriesList() {
  const c = document.getElementById('categories-list');
  c.innerHTML = config.categories.map(cat =>
    '<div class="member-tag">' + cat +
    '<button class="remove-btn" onclick="removeCategory(\'' + cat + '\')">&times;</button>' +
    '</div>'
  ).join('');
}

async function addMember() {
  const input = document.getElementById('new-member-name');
  const name = input.value.trim();
  if (!name) return;

  await fetch('/api/config/members', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ name })
  });

  input.value = '';
  await loadConfig();
  renderMembersList();
  setupUserButtons();
  setupSelects();
  updateDestinataireSelect();
}

async function removeMember(name) {
  if (!confirm('Supprimer ' + name + ' de la liste ?')) return;

  await fetch('/api/config/members/' + encodeURIComponent(name), {
    method: 'DELETE'
  });

  await loadConfig();
  renderMembersList();
  setupUserButtons();
  setupSelects();
  updateDestinataireSelect();
}

async function addCategory() {
  const input = document.getElementById('new-category-name');
  const name = input.value.trim();
  if (!name) return;

  await fetch('/api/config/categories', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ name })
  });

  input.value = '';
  await loadConfig();
  renderCategoriesList();
  setupSelects();
}

async function removeCategory(name) {
  if (!confirm('Supprimer la categorie ' + name + ' ?')) return;

  await fetch('/api/config/categories/' + encodeURIComponent(name), {
    method: 'DELETE'
  });

  await loadConfig();
  renderCategoriesList();
  setupSelects();
  loadPlats();
}
