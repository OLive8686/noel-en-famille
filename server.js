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
  const { user } = req.query;
  let query = 'SELECT * FROM cadeaux';
  let params = [];
  
  if (user) {
    query += ' WHERE destinataire != ?';
    params.push(user);
  }
  
  query += ' ORDER BY created_at DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/cadeaux', (req, res) => {
  const { destinataire, description, url, acheteur, prix, magasin, statut } = req.body;

  db.run(
    `INSERT INTO cadeaux (destinataire, description, url, acheteur, prix, magasin, statut)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [destinataire, description, url, acheteur, prix, magasin, statut || 'a acheter'],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/cadeaux/:id', (req, res) => {
  const { id } = req.params;
  const { destinataire, description, url, acheteur, prix, magasin, statut } = req.body;
  
  db.run(
    `UPDATE cadeaux 
     SET destinataire=?, description=?, url=?, acheteur=?, prix=?, magasin=?, statut=?
     WHERE id=?`,
    [destinataire, description, url, acheteur, prix, magasin, statut, id],
    (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true });
    }
  );
});

app.delete('/api/cadeaux/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM cadeaux WHERE id=?', [id], (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: true });
  });
});

// Routes plats
app.get('/api/plats', (req, res) => {
  db.all('SELECT * FROM plats ORDER BY categorie, nom', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/plats', (req, res) => {
  const { nom, categorie, apporte_par, commentaires } = req.body;
  
  db.run(
    `INSERT INTO plats (nom, categorie, apporte_par, commentaires) 
     VALUES (?, ?, ?, ?)`,
    [nom, categorie, apporte_par, commentaires],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/plats/:id', (req, res) => {
  const { id } = req.params;
  const { nom, categorie, apporte_par, commentaires } = req.body;
  
  db.run(
    `UPDATE plats 
     SET nom=?, categorie=?, apporte_par=?, commentaires=?
     WHERE id=?`,
    [nom, categorie, apporte_par, commentaires, id],
    (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true });
    }
  );
});

app.delete('/api/plats/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM plats WHERE id=?', [id], (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: true });
  });
});

// Route tous les cadeaux (admin)
app.get('/api/cadeaux/all', (req, res) => {
  db.all('SELECT * FROM cadeaux ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Route stats globales (admin)
app.get('/api/stats/global', (req, res) => {
  db.get(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN statut = 'achete' THEN 1 ELSE 0 END) as achetes,
      SUM(CASE WHEN statut = 'a acheter' THEN 1 ELSE 0 END) as a_acheter,
      SUM(prix) as total_prix
     FROM cadeaux`,
    [],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(row);
    }
  );
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
  const { user } = req.query;

  db.get(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN statut = 'achete' THEN 1 ELSE 0 END) as achetes,
      SUM(CASE WHEN statut = 'a acheter' THEN 1 ELSE 0 END) as a_acheter,
      SUM(prix) as total_prix
     FROM cadeaux
     WHERE destinataire != ?`,
    [user || ''],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(row);
    }
  );
});

app.listen(PORT, () => {
  console.log(`🎄 Serveur démarré sur http://localhost:${PORT}`);
});