//? ===========================
//?  IMPORTACIÓN DE LIBRERÍAS
//? ===========================
import express from 'express';
import session from 'express-session';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

 
//?  CONFIGURACIÓN DE SERVIDOR
 
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

 
//?  CONFIGURACIÓN DE MULTER
 
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public', 'img', 'forms'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
    if (!validExtensions.includes(fileExtension)) {
      return cb(new Error('Solo se permiten imágenes (JPG, JPEG, PNG, GIF)'));
    }
    cb(null, 'form-' + uniqueSuffix + fileExtension);
  }
});

const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Error: El archivo debe ser una imagen válida (JPEG, JPG, PNG, GIF)'));
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // Límite de 2MB
});

 
//?  MIDDLEWARES GENERALES
 
app.use(session({
  secret: 'contrasenyajiji', 
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'src', 'public')));

 
//?  CONFIGURACIÓN DE EJS
 
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

 
//*  CONEXIÓN A BASE DE DATOS
 
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'exp_kahoot'
});

 
//?  MIDDLEWARES PERSONALIZADOS
 
const requireLogin = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/?error=no-sesion');
  }
  next();
};

 
//?  RUTAS PRINCIPALES DEL PROYECTO
 

//* Ruta de inicio
app.get('/', (req, res) => {
  res.render('index', { 
    title: 'Inicio',
    user: req.session.userId ? true : false,
    error: req.query.error 
  });
});

//* Ruta de login
app.post('/login', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT user_id FROM users WHERE username = ? AND password = ?',
      [req.body.username, req.body.password]
    );
    if (rows.length > 0) {
      req.session.userId = rows[0].user_id;
      res.redirect('/main');
    } else {
      res.redirect('/?error=credenciales');
    }
  } catch (error) {
    console.error('Error en login:', error);
    res.redirect('/?error=servidor');
  }
});

//* Ruta de logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

//?COPIEN A PARTIR DE ESTA LINEA, A PARTIR DE AQUI SE CREA UNA RUTA
app.get('/jugar', (req, res) => {
  res.render('jugar');
});
//? Y HASTA AQUI SE NECESITA PARA CREAR OTRA RUTA

 
//?  REGISTRO Y AUTENTICACIÓN
 

app.post('/register', async (req, res) => {
  const { username, password, email } = req.body;
  try {
    const [userExists] = await pool.execute(
      'SELECT * FROM users WHERE username = ? OR email = ?', 
      [username, email]
    );
    if (userExists.length > 0) {
      return res.redirect('/?error=usuario-existe');
    }
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
      [username, password, email]
    );
    req.session.userId = result.insertId;
    res.redirect('/main');
  } catch (error) {
    console.error('Error en registro:', error);
    res.redirect('/?error=registro-fallido');
  }
});

 
//?  ÁREA PRINCIPAL DEL USUARIO (PROTEGIDA)
 

app.get('/main', requireLogin, async (req, res) => {
  try {
    const [forms] = await pool.execute(
      'SELECT form_id, title, imagen_path FROM forms WHERE user_id = ?',
      [req.session.userId]
    );
    const formsWithImages = forms.map(form => ({
      ...form,
      imagen_path: form.imagen_path ? `/img/forms/${form.imagen_path}` : null
    }));
    res.render('main', { user: req.session.userId, forms: formsWithImages });
  } catch (error) {
    console.error('Error al obtener formularios:', error);
    res.render('main', { user: req.session.userId, forms: [] });
  }
});
app.get('/maintogame', requireLogin, async (req, res) => {
  try {
    const [forms] = await pool.execute(
      `SELECT f.form_id, f.title, f.imagen_path, 
              COUNT(q.question_id) as question_count
       FROM forms f
       LEFT JOIN questions q ON f.form_id = q.form_id
       WHERE f.user_id = ?
       GROUP BY f.form_id
       HAVING question_count > 0`,
      [req.session.userId]
    );

    const gameForms = forms.map(form => ({
      id: form.form_id,
      title: form.title,
      image: form.imagen_path ? `/img/forms/${form.imagen_path}` : '/img/default-form.png',
      questionCount: form.question_count,
      isPlayable: form.question_count >= 2
    }));

    res.render('main-to-game', { 
      user: req.session.user,
      forms: gameForms
    });
  } catch (error) {
    console.error('Error al cargar juegos:', error);
    // Renderiza la misma vista pero con un mensaje de error
    res.render('main-to-game', { 
      user: req.session.user,
      forms: [],
      error: 'Error al cargar tus juegos. Intenta nuevamente.'
    });
  }
}); 

//?  FORMULARIOS (CREACIÓN Y EDICIÓN)
 

app.get('/forms/new', requireLogin, (req, res) => {
  res.render('crear-formulario');
});

app.post('/forms/create', requireLogin, upload.single('formImage'), async (req, res) => {
  try {
    const { title, isPublic } = req.body;
    const imagePath = req.file ? req.file.filename : null;
    const isPublicBool = isPublic === 'on';
    const [result] = await pool.execute(
      'INSERT INTO forms (user_id, title, imagen_path, is_public) VALUES (?, ?, ?, ?)',
      [req.session.userId, title, imagePath, isPublicBool]
    );
    // Redirigir a la edición con el ID del nuevo formulario
    res.redirect(`/forms/${result.insertId}/edit`);
  } catch (error) {
    console.error('Error al crear formulario:', error);
    res.redirect('/forms/new?error=create-failed');
  }
});

app.get('/edicion', requireLogin, (req, res) => {
  res.render('edicion', { user: req.session.userId });
});

app.get('/forms/:id/edit', requireLogin, async (req, res) => {
  const formId = req.params.id;
  
  try {
    // Verificar que el formulario pertenece al usuario
    const [form] = await pool.execute(
      'SELECT * FROM forms WHERE form_id = ? AND user_id = ?',
      [formId, req.session.userId]
    );
    
    if (form.length === 0) {
      return res.redirect('/main?error=no-autorizado');
    }

    // Obtener preguntas existentes de la base de datos
    const [questions] = await pool.execute(
      'SELECT * FROM questions WHERE form_id = ?',
      [formId]
    );

    // Si no hay preguntas, crear una estructura vacía
    if (questions.length === 0) {
      const emptyQuestion = {
        text: '',
        answers: [
          { text: '', correct: false },
          { text: '', correct: false },
          { text: '', correct: false },
          { text: '', correct: false }
        ]
      };
      return res.render('editar-formulario', { 
        formId, 
        questions: [emptyQuestion] 
      });
    }

    // Si hay preguntas, obtener también las respuestas
    const questionsWithAnswers = [];
    for (const question of questions) {
      const [answers] = await pool.execute(
        'SELECT * FROM options WHERE question_id = ?',
        [question.question_id]
      );
      questionsWithAnswers.push({
        text: question.text,
        answers: answers.map(a => ({
          text: a.text,
          correct: a.is_correct === 1
        }))
      });
    }

    res.render('editar-formulario', { 
      formId, 
      questions: questionsWithAnswers 
    });

  } catch (error) {
    console.error('Error al cargar formulario:', error);
    res.redirect('/main?error=load-failed');
  }
});
/*
app.get('/forms/:id/edit', requireLogin, async (req, res) => {
  const formId = req.params.id;
  // Simulación de datos iniciales si aún no hay preguntas
  const questions = [
    {
      text: '',
      answers: [{ text: '', correct: false }, { text: '', correct: false }, { text: '', correct: false }, { text: '', correct: false }]
    },
    {
      text: '',
      answers: [{ text: '', correct: false }, { text: '', correct: false }, { text: '', correct: false }, { text: '', correct: false }]
    }
  ];

  // Puedes leer preguntas reales si ya existen en la DB
  res.render('editar-formulario', { formId, questions });
});

app.post('/forms/:id/save', async (req, res) => {
  const formId = req.params.id;
  const { action, questions } = req.body;

  if (action === 'add') {
    // Redirige a editar con una nueva pregunta vacía
    const extra = {
      text: '',
      answers: [
        { text: '', correct: false },
        { text: '', correct: false },
        { text: '', correct: false },
        { text: '', correct: false }
      ]
    };
    const currentQuestions = questions || [];
    currentQuestions.push(extra);
    return res.render('editar-formulario', { formId, questions: currentQuestions });
  }

  if (action === 'save') {
    try {
      // Primero borra todas las preguntas y respuestas anteriores (opcional)
      await db.query('DELETE FROM options WHERE question_id IN (SELECT question_id FROM questions WHERE form_id = ?)', [formId]);
      await db.query('DELETE FROM questions WHERE form_id = ?', [formId]);

      for (const q of questions) {
        const [questionResult] = await db.query(
          'INSERT INTO questions (form_id, text, time_limit, points) VALUES (?, ?, ?, ?)',
          [formId, q.text, 30, 100] // o usa valores dinámicos si los agregas luego
        );
        const questionId = questionResult.insertId;

        for (const ans of q.answers) {
          await db.query(
            'INSERT INTO options (question_id, text, is_correct) VALUES (?, ?, ?)',
            [questionId, ans.text, ans.correct ? 1 : 0]
          );
        }
      }

      return res.redirect('/main'); // O a donde quieras después de guardar
    } catch (err) {
      console.error('Error guardando el formulario:', err);
      return res.status(500).send('Error guardando el formulario');
    }
  }
});
*/

app.post('/forms/:id/save', requireLogin, async (req, res) => {
  const formId = req.params.id;
  const { action, questions } = req.body;

  try {
    // Verificar que el formulario pertenece al usuario
    const [form] = await pool.execute(
      'SELECT * FROM forms WHERE form_id = ? AND user_id = ?',
      [formId, req.session.userId]
    );
    
    if (form.length === 0) {
      return res.redirect('/main?error=no-autorizado');
    }

    if (action === 'add') {
      // Agregar una nueva pregunta vacía
      const newQuestions = Array.isArray(questions) ? [...questions] : [];
      newQuestions.push({
        text: '',
        answers: [
          { text: '', correct: false },
          { text: '', correct: false },
          { text: '', correct: false },
          { text: '', correct: false }
        ]
      });
      return res.render('editar-formulario', { formId, questions: newQuestions });
    }

    if (action === 'save') {
      // Eliminar preguntas existentes
      await pool.execute('DELETE FROM options WHERE question_id IN (SELECT question_id FROM questions WHERE form_id = ?)', [formId]);
      await pool.execute('DELETE FROM questions WHERE form_id = ?', [formId]);

      // Insertar nuevas preguntas y respuestas
      for (const q of questions) {
        const [questionResult] = await pool.execute(
          'INSERT INTO questions (form_id, text, time_limit, points) VALUES (?, ?, ?, ?)',
          [formId, q.text, 30, 100]
        );
        
        for (const ans of q.answers) {
          await pool.execute(
            'INSERT INTO options (question_id, text, is_correct) VALUES (?, ?, ?)',
            [questionResult.insertId, ans.text, ans.correct ? 1 : 0]
          );
        }
      }

      return res.redirect('/main?success=form-saved');
    }

  } catch (error) {
    console.error('Error al guardar formulario:', error);
    res.redirect(`/forms/${formId}/edit?error=save-failed`);
  }
});
 
// Ruta para crear un nuevo juego y mostrar el código QR
app.get('/games/create/:formId', requireLogin, async (req, res) => {
  try {
    const { formId } = req.params;
    const userId = req.session.userId;

    // Verificar que el formulario pertenece al usuario
    const [form] = await pool.execute(
      `SELECT * FROM forms WHERE form_id = ? AND user_id = ?`,
      [formId, userId]
    );

    if (form.length === 0) {
      return res.status(404).render('error', { message: 'Formulario no encontrado' });
    }

    // Generar código de juego (6-7 dígitos)
    const gameCode = Math.floor(100000 + Math.random() * 9000000).toString().substring(0, 7);

    // Crear la partida en la base de datos
    const [result] = await pool.execute(
      `INSERT INTO games (game_code, form_id, host_id, status)
       VALUES (?, ?, ?, 'waiting')`,
      [gameCode, formId, userId]
    );

    const gameId = result.insertId;

    // Renderizar la vista con el código QR
    res.render('game-code', {
      form: {
        form_id: form[0].form_id,
        title: form[0].title,
        imagen_path: form[0].imagen_path ? `/img/forms/${form[0].imagen_path}` : '/img/default-form.png'
      },
      gameCode,
      gameId
    });

  } catch (error) {
    console.error('Error al crear partida:', error);
    res.status(500).render('error', { message: 'Error al crear la partida' });
  }
});

//!  INICIAR SERVIDOR
 
app.listen(3000, () => {
  console.log('Servidor funcionando en http://localhost:3000');
});


// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    message: 'Algo salió mal!',
    user: req.session.userId ? true : false
  });
});