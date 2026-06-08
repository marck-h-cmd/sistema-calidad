import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

export const login = async (req, res) => {
  try {
    const { correo, contrasena } = req.body;
    if (!correo || !contrasena) return res.status(400).json({ error: 'Correo y contraseña requeridos' });

    const { rows } = await query('SELECT * FROM usuarios WHERE correo=$1 AND activo=true', [correo]);
    if (!rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });

    const usuario = rows[0];
    const valido = await bcrypt.compare(contrasena, usuario.contrasena_hash);
    if (!valido) return res.status(401).json({ error: 'Credenciales inválidas' });

    await query('UPDATE usuarios SET ultimo_acceso=$1 WHERE id=$2', [new Date(), usuario.id]);

    const token = jwt.sign(
      { id: usuario.id, correo: usuario.correo, rol: usuario.rol, nombres: usuario.nombres },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({
      token,
      usuario: { id: usuario.id, nombres: usuario.nombres, apellidos: usuario.apellidos, rol: usuario.rol, correo: usuario.correo }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const registrar = async (req, res) => {
  try {
    const { codigo, nombres, apellidos, correo, contrasena, rol, facultad, escuela } = req.body;
    const existe = await query('SELECT id FROM usuarios WHERE correo=$1', [correo]);
    if (existe.rows.length) return res.status(400).json({ error: 'Correo ya registrado' });

    const hash = await bcrypt.hash(contrasena, 10);
    const { rows } = await query(
      `INSERT INTO usuarios (codigo,nombres,apellidos,correo,contrasena_hash,rol,facultad,escuela)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,nombres,apellidos,correo,rol`,
      [codigo, nombres, apellidos, correo, hash, rol || 'docente', facultad, escuela]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const perfil = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id,codigo,nombres,apellidos,correo,rol,facultad,escuela,ultimo_acceso FROM usuarios WHERE id=$1',
      [req.usuario.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const listarUsuarios = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id,codigo,nombres,apellidos,correo,rol,facultad,escuela,activo FROM usuarios ORDER BY nombres'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
