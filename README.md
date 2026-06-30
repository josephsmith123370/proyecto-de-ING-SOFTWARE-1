# ♻️ Sistema Inteligente de Gestión de Residuos Sólidos - Municipalidad Distrital de Wanchaq

## 📌 Descripción

El Sistema Inteligente de Gestión de Residuos Sólidos es una plataforma web desarrollada para optimizar la gestión de residuos en la Municipalidad Distrital de Wanchaq (Cusco, Perú).

El sistema permite administrar usuarios, operadores, camiones, rutas, incidencias, recolecciones y notificaciones, ofreciendo además un dashboard administrativo con indicadores para apoyar la toma de decisiones.

---

## 🎯 Objetivo

Desarrollar una solución tecnológica que mejore la administración del servicio de recolección de residuos sólidos mediante herramientas de monitoreo, gestión y análisis de información.

---

## 👥 Tipos de usuarios

### 👨‍💼 Administrador

- Inicio de sesión con verificación OTP
- Gestión de usuarios
- Gestión de operadores
- Gestión de camiones
- Gestión de rutas
- Visualización de GPS
- Gestión de incidencias
- Gestión de notificaciones
- Dashboard Ejecutivo
- Reportes
- Configuración del perfil

### 👷 Operador

- Inicio de sesión
- Consulta de rutas asignadas
- Registro de recolecciones
- Consulta de incidencias
- Actualización del estado de rutas

### 👤 Ciudadano

- Registro e inicio de sesión
- Consulta de rutas de recolección
- Reporte de incidencias
- Seguimiento de incidencias
- Recepción de notificaciones
- Actualización del perfil

---

# 🛠 Tecnologías utilizadas

## Frontend

- HTML5
- CSS3
- JavaScript
- Chart.js
- Leaflet.js

## Backend

- Node.js
- Express.js

## Base de datos

- PostgreSQL
- Supabase

## Seguridad

- JWT
- Bcrypt
- OTP por correo electrónico

---

# 📂 Estructura del proyecto

```
proyecto/
│
├── backend/
│   ├── src/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   └── app.js
│
├── frontend/
│   ├── css/
│   ├── js/
│   ├── img/
│   └── *.html
│
└── README.md
```

---

# 🚀 Instalación

## Clonar repositorio

```bash
git clone https://github.com/josephsmith123370/proyecto-de-ING-SOFTWARE-1.git
```

## Ingresar al proyecto

```bash
cd proyecto-de-ING-SOFTWARE-1
```

## Backend

```bash
cd backend
npm install
npm run dev
```

## Frontend

Abrir los archivos HTML mediante un servidor local (por ejemplo, Live Server en Visual Studio Code).

---

# 🔐 Variables de entorno

Crear un archivo `.env` en la carpeta `backend`.

```env
PORT=3000

SUPABASE_URL=TU_SUPABASE_URL

SUPABASE_KEY=TU_SUPABASE_KEY

JWT_SECRET=TU_JWT_SECRET
```

> **Importante:** No subir el archivo `.env` al repositorio.

---

# 📊 Base de datos

El proyecto utiliza PostgreSQL mediante Supabase.

Tablas principales:

- usuarios
- zonas
- camiones
- rutas
- tracking_gps
- tipos_residuos
- recolecciones
- incidencias
- notificaciones
- codigos_acceso

---

# 📈 Funcionalidades principales

- Gestión de usuarios
- Gestión de operadores
- Gestión de camiones
- Gestión de rutas
- Monitoreo GPS
- Registro de recolecciones
- Gestión de incidencias
- Notificaciones
- Dashboard Ejecutivo
- Reportes
- Inicio de sesión seguro con OTP

---

# 👨‍💻 Autor

**Joseph Leonardo**

Proyecto desarrollado para el curso de Ingeniería de Software.

---

# 📄 Licencia

Proyecto desarrollado con fines académicos.
