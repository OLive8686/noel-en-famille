const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ========== HELPERS JSON ==========
const DATA_DIR = path.join(__dirname, 'data');

function readJSON(filename) {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, '[]');
  }
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

function writeJSON(filename, data) {
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

function getNextId(items) {
  if (items.length === 0) return 1;
  return Math.max(...items.map(i => i.id)) + 1;
}

// ========== ROUTES CONFIG ==========
app.get('/api/config', (req, res) => {
  const configPath = path.join(__dirname, 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  res.json(config);
});

// ========== ROUTES CADEAUX ==========
app.get('/api/cadeaux', (req, res) => {
  try {
    const { user } = req.query;
    let cadeaux = readJSON('cadeaux.json');
    if (user) {
      cadeaux = cadeaux.filter(c => c.destinataire !== user);
    }
    cadeaux.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(cadeaux);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cadeaux', (req, res) => {
  try {
    const { destinataire, description, url, acheteur, prix, magasin, statut } = req.body;
    const cadeaux = readJSON('cadeaux.json');
    const newCadeau = {
      id: getNextId(cadeaux),
      destinataire,
      description,
      url: url || null,
      acheteur: acheteur || null,
      prix: prix || null,
      magasin: magasin || null,
      statut: statut || 'a acheter',
      created_at: new Date().toISOString()
    };
    cadeaux.push(newCadeau);
    writeJSON('cadeaux.json', cadeaux);
    res.json({ id: newCadeau.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/cadeaux/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { destinataire, description, url, acheteur, prix, magasin, statut } = req.body;
    const cadeaux = readJSON('cadeaux.json');
    const index = cadeaux.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Cadeau non trouvé' });
    }
    cadeaux[index] = { ...cadeaux[index], destinataire, description, url, acheteur, prix, magasin, statut };
    writeJSON('cadeaux.json', cadeaux);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cadeaux/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    let cadeaux = readJSON('cadeaux.json');
    cadeaux = cadeaux.filter(c => c.id !== id);
    writeJSON('cadeaux.json', cadeaux);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route tous les cadeaux (admin)
app.get('/api/cadeaux/all', (req, res) => {
  try {
    const cadeaux = readJSON('cadeaux.json');
    cadeaux.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(cadeaux);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ROUTES PLATS ==========
app.get('/api/plats', (req, res) => {
  try {
    const plats = readJSON('plats.json');
    plats.sort((a, b) => {
      if (a.categorie !== b.categorie) return a.categorie.localeCompare(b.categorie);
      return a.nom.localeCompare(b.nom);
    });
    res.json(plats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/plats', (req, res) => {
  try {
    const { nom, categorie, apporte_par, commentaires } = req.body;
    const plats = readJSON('plats.json');
    const newPlat = {
      id: getNextId(plats),
      nom,
      categorie,
      apporte_par: apporte_par || null,
      commentaires: commentaires || null,
      created_at: new Date().toISOString()
    };
    plats.push(newPlat);
    writeJSON('plats.json', plats);
    res.json({ id: newPlat.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/plats/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nom, categorie, apporte_par, commentaires } = req.body;
    const plats = readJSON('plats.json');
    const index = plats.findIndex(p => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Plat non trouvé' });
    }
    plats[index] = { ...plats[index], nom, categorie, apporte_par, commentaires };
    writeJSON('plats.json', plats);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/plats/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    let plats = readJSON('plats.json');
    plats = plats.filter(p => p.id !== id);
    writeJSON('plats.json', plats);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ROUTES STATS ==========
app.get('/api/stats', (req, res) => {
  try {
    const { user } = req.query;
    let cadeaux = readJSON('cadeaux.json');
    if (user) {
      cadeaux = cadeaux.filter(c => c.destinataire !== user);
    }
    const stats = {
      total: cadeaux.length,
      achetes: cadeaux.filter(c => c.statut === 'achete').length,
      a_acheter: cadeaux.filter(c => c.statut === 'a acheter').length,
      total_prix: cadeaux.reduce((sum, c) => sum + (parseFloat(c.prix) || 0), 0)
    };
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats/global', (req, res) => {
  try {
    const cadeaux = readJSON('cadeaux.json');
    const stats = {
      total: cadeaux.length,
      achetes: cadeaux.filter(c => c.statut === 'achete').length,
      a_acheter: cadeaux.filter(c => c.statut === 'a acheter').length,
      total_prix: cadeaux.reduce((sum, c) => sum + (parseFloat(c.prix) || 0), 0)
    };
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ROUTES CONFIG MEMBRES/CATEGORIES ==========
app.post('/api/config/members', (req, res) => {
  const { name } = req.body;
  const configPath = path.join(__dirname, 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  if (!config.familyMembers.includes(name)) {
    config.familyMembers.push(name);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }
  res.json({ success: true, members: config.familyMembers });
});

app.delete('/api/config/members/:name', (req, res) => {
  const { name } = req.params;
  const configPath = path.join(__dirname, 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  config.familyMembers = config.familyMembers.filter(m => m !== name);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  res.json({ success: true, members: config.familyMembers });
});

app.post('/api/config/categories', (req, res) => {
  const { name } = req.body;
  const configPath = path.join(__dirname, 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  if (!config.categories.includes(name)) {
    config.categories.push(name);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }
  res.json({ success: true, categories: config.categories });
});

app.delete('/api/config/categories/:name', (req, res) => {
  const { name } = req.params;
  const configPath = path.join(__dirname, 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  config.categories = config.categories.filter(c => c !== name);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  res.json({ success: true, categories: config.categories });
});

// ========== ROUTES SOUHAITS ==========
app.get('/api/souhaits', (req, res) => {
  try {
    const { user } = req.query;
    const souhaits = readJSON('souhaits.json');
    souhaits.sort((a, b) => {
      if (a.user !== b.user) return a.user.localeCompare(b.user);
      return new Date(b.created_at) - new Date(a.created_at);
    });

    // Masquer reserve_par selon le contexte
    const result = souhaits.map(s => {
      const souhait = { ...s };
      if (s.user === user) {
        // C'est mon souhait : je vois que c'est réservé mais pas par qui
        souhait.reserve_par = null;
        souhait.est_reserve = !!s.reserve_par;
        souhait.reserve_par_moi = false;
      } else if (s.reserve_par === user) {
        // J'ai réservé ce souhait
        souhait.est_reserve = true;
        souhait.reserve_par_moi = true;
      } else if (s.reserve_par) {
        // Quelqu'un d'autre a réservé
        souhait.est_reserve = true;
        souhait.reserve_par = null;
        souhait.reserve_par_moi = false;
      } else {
        souhait.est_reserve = false;
      }
      return souhait;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/souhaits/mine', (req, res) => {
  try {
    const { user } = req.query;
    let souhaits = readJSON('souhaits.json');
    souhaits = souhaits.filter(s => s.user === user);
    souhaits.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    // Ne pas montrer qui a réservé
    const result = souhaits.map(s => ({ ...s, reserve_par: null }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/souhaits', (req, res) => {
  try {
    const { user, description, url, prix, magasin } = req.body;

    if (prix && prix > 40) {
      return res.status(400).json({ error: 'Le budget maximum est de 40€' });
    }

    const souhaits = readJSON('souhaits.json');
    const newSouhait = {
      id: getNextId(souhaits),
      user,
      description,
      url: url || null,
      prix: prix || null,
      magasin: magasin || null,
      reserve_par: null,
      created_at: new Date().toISOString()
    };
    souhaits.push(newSouhait);
    writeJSON('souhaits.json', souhaits);
    res.json({ id: newSouhait.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/souhaits/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { user, description, url, prix, magasin } = req.body;

    if (prix && prix > 40) {
      return res.status(400).json({ error: 'Le budget maximum est de 40€' });
    }

    const souhaits = readJSON('souhaits.json');
    const index = souhaits.findIndex(s => s.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Souhait non trouvé' });
    }
    if (souhaits[index].user !== user) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    souhaits[index] = { ...souhaits[index], description, url, prix, magasin };
    writeJSON('souhaits.json', souhaits);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/souhaits/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { user } = req.query;

    let souhaits = readJSON('souhaits.json');
    const souhait = souhaits.find(s => s.id === id);
    if (!souhait) {
      return res.status(404).json({ error: 'Souhait non trouvé' });
    }
    if (souhait.user !== user) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    souhaits = souhaits.filter(s => s.id !== id);
    writeJSON('souhaits.json', souhaits);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/souhaits/:id/reserve', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { user } = req.body;

    const souhaits = readJSON('souhaits.json');
    const index = souhaits.findIndex(s => s.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Souhait non trouvé' });
    }

    const souhait = souhaits[index];
    if (souhait.user === user) {
      return res.status(403).json({ error: 'Vous ne pouvez pas réserver votre propre souhait' });
    }

    if (souhait.reserve_par === user) {
      // Annuler ma réservation
      souhaits[index].reserve_par = null;
      writeJSON('souhaits.json', souhaits);
      res.json({ success: true, reserved: false });
    } else if (souhait.reserve_par) {
      // Déjà réservé par quelqu'un d'autre
      res.status(400).json({ error: 'Ce souhait est déjà réservé' });
    } else {
      // Réserver
      souhaits[index].reserve_par = user;
      writeJSON('souhaits.json', souhaits);
      res.json({ success: true, reserved: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🎄 Serveur démarré sur http://localhost:${PORT}`);
});
