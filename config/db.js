//TODO: CONFIGURACION CORRESPONDIENDE A LA CONEXION DE LA BASE DE DATOS
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'exp_kahoot',
  waitForConnections: true,
  connectionLimit: 10
});

export default pool;