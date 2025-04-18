const fs = require('fs');
const path = require('path');

// Estructura optimizada (conservando tus archivos existentes)
const structure = {
  'config': [],
  'src': {
    'controllers': [],
    'models': [],
    'public': {
      'css': [],
      'img': [],
      'js': []
    },
    'routes': [],
    'views': [
      'edicion.html',
      'espera.html',
      'index.html',
      'jugar.html',
      'main.html',
      'zeze.html'
    ]
  },
  '.env': '',
  'app.js': '',
  'package.json': ''
};

function createStructure(basePath, obj) {
  Object.entries(obj).forEach(([key, value]) => {
    const newPath = path.join(basePath, key);
    
    if (typeof value === 'object' && !Array.isArray(value)) {
      fs.mkdirSync(newPath, { recursive: true });
      createStructure(newPath, value);
    } else if (Array.isArray(value)) {
      fs.mkdirSync(newPath, { recursive: true });
      value.forEach(file => {
        const filePath = path.join(newPath, file);
        if (!fs.existsSync(filePath)) {
          fs.writeFileSync(filePath, '');
        }
      });
    } else if (value === '') {
      if (!fs.existsSync(newPath)) {
        fs.writeFileSync(newPath, '');
      }
    }
  });
}

// Mover archivos existentes a nuevas ubicaciones
function moveFiles() {
  const filesToMove = [
    { from: 'edicion.html', to: 'src/views/edicion.html' },
    { from: 'espera.html', to: 'src/views/espera.html' },
    { from: 'index.html', to: 'src/views/index.html' },
    { from: 'jugar.html', to: 'src/views/jugar.html' },
    { from: 'main.html', to: 'src/views/main.html' },
    { from: 'zeze.html', to: 'src/views/zeze.html' }
  ];

  filesToMove.forEach(file => {
    if (fs.existsSync(file.from)) {
      fs.renameSync(file.from, file.to);
    }
  });
}

// Ejecutar
createStructure(__dirname, structure);
moveFiles();
console.log('♻️ Proyecto reorganizado con éxito');