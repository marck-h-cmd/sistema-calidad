import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let sqlFilePath = path.join(__dirname, '../../init-db/init.sql');
if (!fs.existsSync(sqlFilePath)) {
  sqlFilePath = path.join(__dirname, '../init-db/init.sql');
}

async function initDb() {
  console.log('🔄 Inicializando base de datos local...');
  console.log(`Conectando a: ${process.env.DATABASE_URL?.split('@')[1] || 'local'}`);
  
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('⏳ Ejecutando script SQL (init.sql)...');
    await pool.query(sqlContent);
    console.log('✅ Base de datos inicializada y poblada exitosamente.');
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDb();
