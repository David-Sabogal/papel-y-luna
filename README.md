# 🌙 Papel & Luna — Sistema POS

Sistema de punto de venta (POS) desarrollado como proyecto final del curso de Desarrollo de Aplicaciones Web. Arquitectura full-stack con React en el frontend y Node.js + Express en el backend.

---

## 👥 Equipo

| Nombre | Código |
|--------|--------|
| Yum | 0000325678 |
| Camal | 0000360871 |
| Gualter | 0000345843 |

---

## 🚀 URLs de producción

| Servicio | URL |
|----------|-----|
| Frontend | `https://papel-y-luna.vercel.app` |
| Backend API | `https://papel-y-luna-api.up.railway.app` |
| Health check | `https://papel-y-luna-api.up.railway.app/health` |
| Authors | `https://papel-y-luna-api.up.railway.app/authors` |

---

## 🏗️ Arquitectura

```
papel-y-luna/
├── frontend/          → React (Create React App)
│   └── src/
│       ├── api/       → cliente axios con interceptores JWT
│       ├── context/   → AuthContext (sesión global)
│       ├── components/→ Factura, CorreccionVenta, ReembolsoVenta, ImageUploader
│       └── pages/     → Venta, Historial, Productos, Categorias, Descuentos,
│                         Compras, Proveedores, Clientes, Faltantes, Reportes
│
└── backend/           → Node.js + Express
    └── src/
        ├── models/    → Sequelize ORM (11 modelos)
        ├── controllers/ → lógica de negocio por entidad
        ├── routes/    → endpoints REST
        ├── middlewares/ → authJwt, requireRole, requestLogger
        └── validators/  → express-validator por entidad
```

---

## 🗄️ Modelos de base de datos

| Modelo | Descripción |
|--------|-------------|
| `Usuario` | Autenticación y roles (ADMIN / USER) |
| `Producto` | Catálogo con inventario |
| `Categoria` | Categorías de producto |
| `Venta` | Ventas con estados y trazabilidad |
| `VentaItem` | Ítems de cada venta |
| `Reembolso` | Reembolsos parciales y totales |
| `ReembolsoItem` | Ítems reembolsados |
| `Cliente` | Clientes con saldo pendiente |
| `Descuento` | Descuentos por porcentaje o valor fijo |
| `Compra` | Registro de compras a proveedores |
| `CompraItem` | Ítems de cada compra |
| `Proveedor` | Proveedores |
| `Faltante` | Demanda no atendida |

---

## 🔌 Endpoints principales

### Autenticación
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
```

### Productos
```
GET    /api/productos
GET    /api/productos/:id
POST   /api/productos          (ADMIN)
PUT    /api/productos/:id       (ADMIN)
DELETE /api/productos/:id       (ADMIN)
```

### Ventas
```
GET    /api/ventas
GET    /api/ventas/:id
POST   /api/ventas
PUT    /api/ventas/:id/corregir
PATCH  /api/ventas/:id/abono
PATCH  /api/ventas/:id/anular   (ADMIN)
GET    /api/ventas/reporte       (ADMIN)
POST   /api/ventas/:id/reembolsos (ADMIN)
GET    /api/ventas/:id/reembolsos (ADMIN)
```

### Clientes
```
GET    /api/clientes
GET    /api/clientes/:id
GET    /api/clientes/:id/saldoDebe
POST   /api/clientes
PUT    /api/clientes/:id
DELETE /api/clientes/:id
```

### Compras
```
GET    /api/compras              (ADMIN)
GET    /api/compras/:id          (ADMIN)
POST   /api/compras              (ADMIN)
```

### Otros módulos
```
GET|POST|PUT|DELETE  /api/categorias
GET|POST|PUT|DELETE  /api/proveedores
GET|POST|PUT|DELETE  /api/descuentos
GET|POST             /api/faltantes
PATCH                /api/faltantes/:id/estado
GET                  /api/faltantes/reporte
GET|POST|PUT|DELETE  /api/usuarios  (ADMIN)
```

### Endpoints públicos
```
GET  /health
GET  /authors
```

---

## ⚙️ Instalación local

### Requisitos
- Node.js 18+
- npm 9+

### 1. Clonar repositorio
```bash
git clone https://github.com/TU_USUARIO/papel-y-luna.git
cd papel-y-luna
```

### 2. Backend
```bash
cd backend
npm install
```

Crear archivo `.env`:
```env
NODE_ENV=development
PORT=4000
JWT_SECRET=papel_y_luna_secreto_super_largo_2026
JWT_EXPIRES_IN=8h
```

```bash
npm run dev
```

El servidor queda en `http://localhost:4000`

Poblar base de datos:
```bash
npx sequelize-cli db:seed:all
```

Usuarios de prueba:
| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| admin | admin123 | ADMIN |
| cajero | cajero123 | USER |

### 3. Frontend
```bash
cd frontend
npm install
npm start
```

El frontend queda en `http://localhost:3000`

---

## 🔐 Autenticación

El sistema usa **JWT (JSON Web Tokens)**:

1. El usuario hace login → recibe un token
2. El token se almacena en `localStorage`
3. Axios lo inyecta automáticamente en cada request (`Authorization: Bearer <token>`)
4. El backend valida el token en rutas protegidas
5. El middleware `requireRole` restringe por rol (ADMIN / USER)

---

## 📦 Módulos del sistema

| Módulo | Descripción |
|--------|-------------|
| **Nueva Venta** | POS con catálogo visual, búsqueda, descuentos, métodos de pago (Efectivo/Nequi/Débito/Debe), ventas guardadas |
| **Historial** | Filtros por estado/pago/cliente/fecha, corrección, reembolso, abonos |
| **Productos** | CRUD con imagen, categoría, código auto-generado, control de inventario |
| **Categorías** | CRUD con color e ícono |
| **Descuentos** | CRUD con tipo porcentaje o valor fijo |
| **Compras** | Registro de compras, proveedor rápido, producto rápido, actualiza stock |
| **Proveedores** | CRUD completo |
| **Clientes** | CRUD con seguimiento de saldo pendiente (crédito) |
| **Faltantes** | Registro de demanda no atendida, reporte agrupado, crear producto desde faltante |
| **Reportes** | Ventas, productos más vendidos, compras y faltantes por rango de fechas |

---

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18, React Router, Axios, react-dropzone |
| Backend | Node.js, Express 4 |
| ORM | Sequelize 6 |
| Base de datos | PostgreSQL (producción) / SQLite (desarrollo) |
| Autenticación | JWT + bcrypt |
| Validación | express-validator |
| Logging | Morgan |
| Deploy Frontend | Vercel |
| Deploy Backend | Railway |

---

## 📝 Notas de arquitectura

- **Separación de responsabilidades**: rutas → controladores → modelos
- **Transacciones de base de datos**: ventas, compras y reembolsos usan transacciones Sequelize para garantizar integridad
- **Trazabilidad**: las correcciones y anulaciones guardan un `snapshotAnterior` en JSON
- **Inventario**: se actualiza automáticamente en ventas (descuento), compras (incremento), reembolsos (restauración) y anulaciones
- **Roles**: ADMIN accede a todo, USER solo puede crear ventas y registrar faltantes