const fs = require('fs');
const path = require('path');
const { ZipArchive } = require('archiver');

const rootDir = path.resolve(__dirname, '..');
const outputZip = path.join(rootDir, 'tourdelcafe.zip');
const tempZip = path.join(rootDir, 'tourdelcafe.new.zip');

// Lista de archivos a incluir en raíz
const rootFiles = [
  'admin-inventario.html',
  'coupon-service.js',
  'customers_export.csv',
  'data.js',
  'index.html',
  'inscripciones.css',
  'inscripciones.html',
  'inscripciones.js',
  'inventory-service.js',
  'package.json',
  'products_export_1.csv',
  'registration-service.js',
  'script.js',
  'server.js',
  'styles.css',
  'tienda.css',
  'tienda.html',
  'tienda.js'
];

// Subcarpetas completas a incluir
const subDirs = [
  'assets',
  'corporativo',
  'checkout',
  'admin',
  'data',
  'config',
  'scripts'
];

// Patrones estrictos de exclusión
const excludePatterns = [
  /node_modules/i,
  /package-lock\.json$/i,
  /\.git/i,
  /\.tmp$/i,
  /tourdelcafe.*\.zip$/i,
  /\.DS_Store$/i,
  /Thumbs\.db$/i
];

function isExcluded(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return excludePatterns.some(pattern => pattern.test(normalized));
}

async function createZip() {
  console.log('==============================================');
  console.log(' Generando paquete para despliegue Hostinger  ');
  console.log(' Destino: tourdelcafe.zip (Raíz)             ');
  console.log('==============================================\n');

  if (fs.existsSync(tempZip)) {
    fs.unlinkSync(tempZip);
  }

  const output = fs.createWriteStream(tempZip);
  const archive = new ZipArchive({
    zlib: { level: 9 } // Compresión óptima
  });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      const sizeBytes = archive.pointer();
      const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
      console.log(`\nCompresión finalizada: ${sizeBytes.toLocaleString()} bytes (~${sizeMB} MB)`);

      // Reemplazo atómico del archivo destino
      if (fs.existsSync(outputZip)) {
        try {
          fs.unlinkSync(outputZip);
        } catch (e) {
          console.warn('Nota al reemplazar zip anterior:', e.message);
        }
      }
      fs.renameSync(tempZip, outputZip);
      console.log(`\n🎉 Archivo creado exitosamente:\n   -> ${outputZip}\n   -> Tamaño final: ${sizeMB} MB`);
      resolve();
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('Advertencia:', err);
      } else {
        reject(err);
      }
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // 1. Archivos en raíz
    console.log('[1/2] Añadiendo archivos frontend y backend en raíz...');
    let rootCount = 0;
    for (const file of rootFiles) {
      const fullPath = path.join(rootDir, file);
      if (fs.existsSync(fullPath)) {
        if (!isExcluded(file)) {
          archive.file(fullPath, { name: file });
          console.log(`   + ${file}`);
          rootCount++;
        }
      } else {
        console.warn(`   ⚠️ No encontrado: ${file}`);
      }
    }
    console.log(`   Total archivos raíz: ${rootCount}\n`);

    // 2. Subdirectorios recursivos con rutas normalizadas '/'
    console.log('[2/2] Añadiendo subcarpetas (rutas con separador Linux /)...');
    let subFileCount = 0;

    function addDirectory(dirRelative) {
      const dirFull = path.join(rootDir, dirRelative);
      if (!fs.existsSync(dirFull)) {
        console.warn(`   ⚠️ Directorio no encontrado: ${dirRelative}`);
        return;
      }

      const entries = fs.readdirSync(dirFull, { withFileTypes: true });
      for (const entry of entries) {
        // Asegurar barras normales '/'
        const itemRelative = `${dirRelative}/${entry.name}`.replace(/\\/g, '/');
        const itemFull = path.join(dirFull, entry.name);

        if (isExcluded(itemRelative)) {
          continue;
        }

        if (entry.isDirectory()) {
          addDirectory(itemRelative);
        } else if (entry.isFile()) {
          archive.file(itemFull, { name: itemRelative });
          subFileCount++;
        }
      }
    }

    for (const dir of subDirs) {
      console.log(`   📁 Procesando ${dir}/...`);
      addDirectory(dir);
    }
    console.log(`   Total archivos en subcarpetas: ${subFileCount}`);

    console.log('\nEmpaquetando flujo y finalizando archivo...');
    archive.finalize();
  });
}

createZip().catch((err) => {
  console.error('❌ Error fatal al generar ZIP:', err);
  process.exit(1);
});
