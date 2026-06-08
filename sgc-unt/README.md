# SGC-UNT — Sistema de Gestión de la Calidad
## Universidad Nacional de Trujillo

---

## 🚀 Instrucciones de despliegue con Docker

### Requisitos previos
- Docker Desktop instalado y corriendo
- Docker Compose v2+

### Pasos para ejecutar

```bash
# 1. Clonar / descomprimir el proyecto
cd sgc-unt

# 2. Levantar todos los servicios
docker compose up --build

# 3. Esperar ~2-3 minutos a que todo compile y levante

# 4. Acceder a:
#    Frontend:  http://localhost:3000
#    Backend:   http://localhost:3001
#    Health:    http://localhost:3001/health
```

### Credenciales por defecto
```
Correo:     admin@unitru.edu.pe
Contraseña: password
```

### Detener el sistema
```bash
docker compose down
```

### Reiniciar limpio (borra la base de datos)
```bash
docker compose down -v
docker compose up --build
```

---

## 🗂️ Módulos del sistema

| # | Módulo | Ruta |
|---|--------|------|
| 1 | Dashboard | `/dashboard` |
| 2 | Gestión Documental | `/documentos` |
| 3 | Mapa de Procesos | `/procesos` |
| 4 | Acreditación y Autoevaluación | `/acreditacion` |
| 5 | Auditorías e Inspecciones | `/auditorias` |
| 6 | CAPA (Correctivas/Preventivas) | `/capas` |
| 7 | Gestión de Riesgos | `/riesgos` |
| 8 | Indicadores de Gestión | `/indicadores` |
| 9 | Encuestas de Satisfacción | `/encuestas` |

---

## 🏗️ Stack tecnológico

- **Frontend**: Next.js 14 + React + Tailwind CSS + Recharts
- **Backend**: Node.js + Express + pg (PostgreSQL nativo)
- **Base de datos**: PostgreSQL 16
- **PDF**: Puppeteer con Chromium
- **Infraestructura**: Docker Compose

---

## 📁 Estructura del proyecto

```
sgc-unt/
├── docker-compose.yml
├── init-db/
│   └── init.sql              ← Script SQL completo
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── config/database.js
│       ├── middleware/auth.js
│       ├── services/pdfService.js
│       ├── routes/index.js
│       └── controllers/
│           ├── authController.js
│           ├── dashboardController.js
│           ├── documentoController.js
│           ├── procesoController.js
│           ├── acreditacionController.js
│           ├── auditoriaController.js
│           ├── capaController.js
│           ├── riesgoController.js
│           ├── indicadorController.js
│           └── encuestaController.js
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.js
    └── src/
        ├── app/
        │   ├── layout.js
        │   ├── page.js
        │   ├── globals.css
        │   ├── login/page.js
        │   ├── dashboard/page.js
        │   ├── documentos/page.js
        │   ├── procesos/page.js
        │   ├── acreditacion/page.js
        │   ├── auditorias/page.js
        │   ├── capas/page.js
        │   ├── riesgos/page.js
        │   ├── indicadores/page.js
        │   └── encuestas/page.js
        ├── components/Layout/Sidebar.js
        ├── context/AuthContext.js
        └── lib/api.js
```
