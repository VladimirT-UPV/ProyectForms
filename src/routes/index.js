// src/routes/index.js
import express from 'express';
const router = express.Router();

router.get('/', (req, res) => res.render('index'));
router.get('/jugar', (req, res) => res.render('jugar'));
router.get('/main', (req, res) => res.render('main'));

export default router;
