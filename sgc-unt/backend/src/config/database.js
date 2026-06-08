import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Set search_path on every new connection
pool.on('connect', (client) => {
  client.query('SET search_path TO sgc, public');
});

export const query = (text, params) => pool.query(text, params);
