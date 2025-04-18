import pool from '../config/db.js';

export const login = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT user_id FROM users WHERE username = ? AND password = ?',
      [req.body.username, req.body.password]
    );
    
    if (rows.length > 0) {
      req.session.userId = rows[0].user_id;
      res.redirect('/crear');
    } else {
      res.redirect('/?error=credenciales');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error del servidor');
  }
};