const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

// Charger .env en local
if (fs.existsSync('.env')) {
  require('dotenv').config();
}

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ========== CONNEXION TURSO ==========
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Initialiser les tables
async function initDB() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS cadeaux (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      destinataire TEXT NOT NULL,
      description TEXT NOT NULL,
      url TEXT,
      acheteur TEXT,
      prix REAL,
      magasin TEXT,
      statut TEXT DEFAULT 'a acheter',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS plats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      categorie TEXT NOT NULL,
      apporte_par TEXT,
      commentaires TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS souhaits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT NOT NULL,
      description TEXT NOT NULL,
      url TEXT,
      prix REAL,
      magasin TEXT,
      reserve_par TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Tables initialisées');
}

// ========== ROUTES CONFIG ==========
app.get('/api/config', (req, res) => {
  const configPath = path.join(__dirname, 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  res.json(config);
});

// ========== ROUTES CADEAUX ==========
app.get('/api/cadeaux', async (req, res) => {
  try {
    const { user } = req.query;
    let result;
    if (user) {
      result = await db.execute({
        sql: 'SELECT * FROM cadeaux WHERE destinataire != ? ORDER BY created_at DESC',
        args: [user]
      });
    } else {
      result = await db.execute('SELECT * FROM cadeaux ORDER BY created_at DESC');
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cadeaux', async (req, res) => {
  try {
    const { destinataire, description, url, acheteur, prix, magasin, statut } = req.body;
    const result = await db.execute({
      sql: `INSERT INTO cadeaux (destinataire, description, url, acheteur, prix, magasin, statut)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [destinataire, description, url || null, acheteur || null, prix || null, magasin || null, statut || 'a acheter']
    });
    res.json({ id: Number(result.lastInsertRowid) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/cadeaux/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { destinataire, description, url, acheteur, prix, magasin, statut } = req.body;
    await db.execute({
      sql: `UPDATE cadeaux SET destinataire=?, description=?, url=?, acheteur=?, prix=?, magasin=?, statut=? WHERE id=?`,
      args: [destinataire, description, url, acheteur, prix, magasin, statut, id]
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cadeaux/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.execute({ sql: 'DELETE FROM cadeaux WHERE id=?', args: [id] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cadeaux/all', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM cadeaux ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ROUTES PLATS ==========
app.get('/api/plats', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM plats ORDER BY categorie, nom');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/plats', async (req, res) => {
  try {
    const { nom, categorie, apporte_par, commentaires } = req.body;
    const result = await db.execute({
      sql: `INSERT INTO plats (nom, categorie, apporte_par, commentaires) VALUES (?, ?, ?, ?)`,
      args: [nom, categorie, apporte_par || null, commentaires || null]
    });
    res.json({ id: Number(result.lastInsertRowid) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/plats/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nom, categorie, apporte_par, commentaires } = req.body;
    await db.execute({
      sql: `UPDATE plats SET nom=?, categorie=?, apporte_par=?, commentaires=? WHERE id=?`,
      args: [nom, categorie, apporte_par, commentaires, id]
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/plats/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.execute({ sql: 'DELETE FROM plats WHERE id=?', args: [id] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ROUTES STATS ==========
app.get('/api/stats', async (req, res) => {
  try {
    const { user } = req.query;
    let result;
    if (user) {
      result = await db.execute({
        sql: `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN statut = 'achete' THEN 1 ELSE 0 END) as achetes,
          SUM(CASE WHEN statut = 'a acheter' THEN 1 ELSE 0 END) as a_acheter,
          SUM(prix) as total_prix
        FROM cadeaux WHERE destinataire != ?`,
        args: [user]
      });
    } else {
      result = await db.execute(`SELECT
        COUNT(*) as total,
        SUM(CASE WHEN statut = 'achete' THEN 1 ELSE 0 END) as achetes,
        SUM(CASE WHEN statut = 'a acheter' THEN 1 ELSE 0 END) as a_acheter,
        SUM(prix) as total_prix
      FROM cadeaux`);
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats/global', async (req, res) => {
  try {
    const result = await db.execute(`SELECT
      COUNT(*) as total,
      SUM(CASE WHEN statut = 'achete' THEN 1 ELSE 0 END) as achetes,
      SUM(CASE WHEN statut = 'a acheter' THEN 1 ELSE 0 END) as a_acheter,
      SUM(prix) as total_prix
    FROM cadeaux`);
    res.json(result.rows[0]);
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
app.get('/api/souhaits', async (req, res) => {
  try {
    const { user } = req.query;
    const result = await db.execute('SELECT * FROM souhaits ORDER BY user, created_at DESC');

    const rows = result.rows.map(s => {
      const souhait = { ...s };
      if (s.user === user) {
        souhait.reserve_par = null;
        souhait.est_reserve = !!s.reserve_par;
        souhait.reserve_par_moi = false;
      } else if (s.reserve_par === user) {
        souhait.est_reserve = true;
        souhait.reserve_par_moi = true;
      } else if (s.reserve_par) {
        souhait.est_reserve = true;
        souhait.reserve_par = null;
        souhait.reserve_par_moi = false;
      } else {
        souhait.est_reserve = false;
      }
      return souhait;
    });

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/souhaits/mine', async (req, res) => {
  try {
    const { user } = req.query;
    const result = await db.execute({
      sql: 'SELECT * FROM souhaits WHERE user = ? ORDER BY created_at DESC',
      args: [user]
    });
    const rows = result.rows.map(s => ({ ...s, reserve_par: null }));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/souhaits', async (req, res) => {
  try {
    const { user, description, url, prix, magasin } = req.body;

    if (prix && prix > 40) {
      return res.status(400).json({ error: 'Le budget maximum est de 40€' });
    }

    const result = await db.execute({
      sql: `INSERT INTO souhaits (user, description, url, prix, magasin) VALUES (?, ?, ?, ?, ?)`,
      args: [user, description, url || null, prix || null, magasin || null]
    });
    res.json({ id: Number(result.lastInsertRowid) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/souhaits/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { user, description, url, prix, magasin } = req.body;

    if (prix && prix > 40) {
      return res.status(400).json({ error: 'Le budget maximum est de 40€' });
    }

    const check = await db.execute({ sql: 'SELECT user FROM souhaits WHERE id = ?', args: [id] });
    if (check.rows.length === 0 || check.rows[0].user !== user) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    await db.execute({
      sql: `UPDATE souhaits SET description=?, url=?, prix=?, magasin=? WHERE id=?`,
      args: [description, url, prix, magasin, id]
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/souhaits/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { user } = req.query;

    const check = await db.execute({ sql: 'SELECT user FROM souhaits WHERE id = ?', args: [id] });
    if (check.rows.length === 0 || check.rows[0].user !== user) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    await db.execute({ sql: 'DELETE FROM souhaits WHERE id=?', args: [id] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/souhaits/:id/reserve', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { user } = req.body;

    const result = await db.execute({ sql: 'SELECT * FROM souhaits WHERE id = ?', args: [id] });
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Souhait non trouvé' });
    }

    const souhait = result.rows[0];
    if (souhait.user === user) {
      return res.status(403).json({ error: 'Vous ne pouvez pas réserver votre propre souhait' });
    }

    if (souhait.reserve_par === user) {
      await db.execute({ sql: 'UPDATE souhaits SET reserve_par = NULL WHERE id = ?', args: [id] });
      res.json({ success: true, reserved: false });
    } else if (souhait.reserve_par) {
      res.status(400).json({ error: 'Ce souhait est déjà réservé' });
    } else {
      await db.execute({ sql: 'UPDATE souhaits SET reserve_par = ? WHERE id = ?', args: [user, id] });
      res.json({ success: true, reserved: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== DÉMARRAGE ==========
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🎄 Serveur démarré sur http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Erreur initialisation DB:', err);
  process.exit(1);
});
