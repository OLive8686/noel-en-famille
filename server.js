const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes config (recharge à chaque requête)
app.get('/api/config', (req, res) => {
  const configPath = path.join(__dirname, 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  res.json(config);
});

// Routes cadeaux
app.get('/api/cadeaux', (req, res) => {
  try {
    const { user } = req.query;
    let rows;
    if (user) {
      rows = db.prepare('SELECT * FROM cadeaux WHERE destinataire != ? ORDER BY created_at DESC').all(user);
    } else {
      rows = db.prepare('SELECT * FROM cadeaux ORDER BY created_at DESC').all();
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cadeaux', (req, res) => {
  try {
    const { destinataire, description, url, acheteur, prix, magasin, statut } = req.body;
    const result = db.prepare(
      `INSERT INTO cadeaux (destinataire, description, url, acheteur, prix, magasin, statut)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(destinataire, description, url, acheteur, prix, magasin, statut || 'a acheter');
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/cadeaux/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { destinataire, description, url, acheteur, prix, magasin, statut } = req.body;
    db.prepare(
      `UPDATE cadeaux
       SET destinataire=?, description=?, url=?, acheteur=?, prix=?, magasin=?, statut=?
       WHERE id=?`
    ).run(destinataire, description, url, acheteur, prix, magasin, statut, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cadeaux/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM cadeaux WHERE id=?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Routes plats
app.get('/api/plats', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM plats ORDER BY categorie, nom').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/plats', (req, res) => {
  try {
    const { nom, categorie, apporte_par, commentaires } = req.body;
    const result = db.prepare(
      `INSERT INTO plats (nom, categorie, apporte_par, commentaires)
       VALUES (?, ?, ?, ?)`
    ).run(nom, categorie, apporte_par, commentaires);
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/plats/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { nom, categorie, apporte_par, commentaires } = req.body;
    db.prepare(
      `UPDATE plats
       SET nom=?, categorie=?, apporte_par=?, commentaires=?
       WHERE id=?`
    ).run(nom, categorie, apporte_par, commentaires, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/plats/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM plats WHERE id=?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route tous les cadeaux (admin)
app.get('/api/cadeaux/all', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM cadeaux ORDER BY created_at DESC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route stats globales (admin)
app.get('/api/stats/global', (req, res) => {
  try {
    const row = db.prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN statut = 'achete' THEN 1 ELSE 0 END) as achetes,
        SUM(CASE WHEN statut = 'a acheter' THEN 1 ELSE 0 END) as a_acheter,
        SUM(prix) as total_prix
       FROM cadeaux`
    ).get();
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route gestion membres
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

// Route gestion categories
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

// Route stats
app.get('/api/stats', (req, res) => {
  try {
    const { user } = req.query;
    const row = db.prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN statut = 'achete' THEN 1 ELSE 0 END) as achetes,
        SUM(CASE WHEN statut = 'a acheter' THEN 1 ELSE 0 END) as a_acheter,
        SUM(prix) as total_prix
       FROM cadeaux
       WHERE destinataire != ?`
    ).get(user || '');
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ROUTES SOUHAITS ==========

// Récupérer tous les souhaits (avec gestion de la visibilité des réservations)
app.get('/api/souhaits', (req, res) => {
  try {
    const { user } = req.query;
    const rows = db.prepare('SELECT * FROM souhaits ORDER BY user, created_at DESC').all();

    // Masquer reserve_par sauf pour celui qui a réservé
    // Le propriétaire voit que c'est réservé mais pas par qui
    const result = rows.map(s => {
      const souhait = { ...s };
      if (s.user === user) {
        // C'est mon souhait : je vois que c'est réservé mais pas par qui
        souhait.reserve_par = null;
        souhait.est_reserve = !!s.reserve_par;
        souhait.reserve_par_moi = false;
      } else if (s.reserve_par === user) {
        // J'ai réservé ce souhait : je vois que c'est moi
        souhait.est_reserve = true;
        souhait.reserve_par_moi = true;
      } else if (s.reserve_par) {
        // Quelqu'un d'autre a réservé : je vois juste "réservé"
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

// Récupérer mes souhaits uniquement
app.get('/api/souhaits/mine', (req, res) => {
  try {
    const { user } = req.query;
    const rows = db.prepare('SELECT * FROM souhaits WHERE user = ? ORDER BY created_at DESC').all(user);
    // Ne pas montrer qui a réservé
    const result = rows.map(s => ({ ...s, reserve_par: null }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ajouter un souhait
app.post('/api/souhaits', (req, res) => {
  try {
    const { user, description, url, prix, magasin } = req.body;

    // Validation du prix max 40€
    if (prix && prix > 40) {
      return res.status(400).json({ error: 'Le budget maximum est de 40€' });
    }

    const result = db.prepare(
      `INSERT INTO souhaits (user, description, url, prix, magasin)
       VALUES (?, ?, ?, ?, ?)`
    ).run(user, description, url, prix, magasin);
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Modifier un souhait (seulement le propriétaire)
app.put('/api/souhaits/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { user, description, url, prix, magasin } = req.body;

    // Validation du prix max 40€
    if (prix && prix > 40) {
      return res.status(400).json({ error: 'Le budget maximum est de 40€' });
    }

    // Vérifier que c'est bien le propriétaire
    const row = db.prepare('SELECT user FROM souhaits WHERE id = ?').get(id);
    if (!row || row.user !== user) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    db.prepare(
      `UPDATE souhaits SET description=?, url=?, prix=?, magasin=? WHERE id=?`
    ).run(description, url, prix, magasin, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un souhait (seulement le propriétaire)
app.delete('/api/souhaits/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req.query;

    // Vérifier que c'est bien le propriétaire
    const row = db.prepare('SELECT user FROM souhaits WHERE id = ?').get(id);
    if (!row || row.user !== user) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    db.prepare('DELETE FROM souhaits WHERE id=?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Réserver un souhait (toggle)
app.post('/api/souhaits/:id/reserve', (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req.body;

    const row = db.prepare('SELECT * FROM souhaits WHERE id = ?').get(id);
    if (!row) {
      return res.status(404).json({ error: 'Souhait non trouvé' });
    }

    // On ne peut pas réserver son propre souhait
    if (row.user === user) {
      return res.status(403).json({ error: 'Vous ne pouvez pas réserver votre propre souhait' });
    }

    // Toggle: si déjà réservé par moi, annuler; sinon réserver
    if (row.reserve_par === user) {
      // Annuler ma réservation
      db.prepare('UPDATE souhaits SET reserve_par = NULL WHERE id = ?').run(id);
      res.json({ success: true, reserved: false });
    } else if (row.reserve_par) {
      // Déjà réservé par quelqu'un d'autre
      res.status(400).json({ error: 'Ce souhait est déjà réservé' });
    } else {
      // Réserver
      db.prepare('UPDATE souhaits SET reserve_par = ? WHERE id = ?').run(user, id);
      res.json({ success: true, reserved: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🎄 Serveur démarré sur http://localhost:${PORT}`);
});
