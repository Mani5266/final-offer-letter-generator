const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { generateDoc } = require('./docGenerator/index');
const { supabase } = require('./utils/supabase');

const app = express();
const PORT = process.env.PORT || 3002;

// Middlewares
app.use(express.json());
app.use(cors({ origin: true, credentials: true, exposedHeaders: ['Content-Disposition'] }));
app.use(express.static(path.join(__dirname, '../frontend')));

// ── SIMPLE AUTH MIDDLEWARE ──────────────────────────────────────────────────
// Trusts the 'x-user-id' header from the frontend
const simpleAuth = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'User ID missing. Please login.' });
  req.user = { id: userId };
  next();
};

// ── DOCUMENT GENERATION ──────────────────────────────────────────────────────

app.post('/generate', simpleAuth, async (req, res) => {
  try {
    const buffer = await generateDoc(req.body);
    const empName = (req.body.empFullName || 'Letter').replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'Letter';
    const filename = `Offer_${empName}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(buffer);
  } catch (err) {
    console.error('DocGen Error:', err);
    res.status(500).json({ error: 'Failed to generate document' });
  }
});

// ── OFFER MANAGEMENT (CRUD) ──────────────────────────────────────────────────

// Get all offers
app.get('/api/offers', simpleAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// Create or Update offer
app.post('/api/offers', simpleAuth, async (req, res) => {
  const { id, emp_name, designation, annual_ctc, payload } = req.body;
  try {
    let result;
    if (id) {
      result = await supabase
        .from('offers')
        .update({ emp_name, designation, annual_ctc, payload, updated_at: new Date() })
        .eq('id', id)
        .eq('user_id', req.user.id);
    } else {
      result = await supabase
        .from('offers')
        .insert({ user_id: req.user.id, emp_name, designation, annual_ctc, payload })
        .select();
    }

    if (result.error) throw result.error;
    res.json({ message: 'Offer saved', id: id || result.data?.[0]?.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save offer' });
  }
});

// Delete offer
app.delete('/api/offers/:id', simpleAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('offers')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// Start server only in local dev (Vercel uses the exported app)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
