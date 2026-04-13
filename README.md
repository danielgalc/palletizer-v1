<div align="center">

# Palletizer

**Optimización inteligente de paletizado para envíos de equipos informáticos**

[![Laravel](https://img.shields.io/badge/Laravel-12.x-FF2D20?style=flat-square&logo=laravel&logoColor=white)](https://laravel.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Inertia.js](https://img.shields.io/badge/Inertia.js-2.x-9553E9?style=flat-square)](https://inertiajs.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![PHP](https://img.shields.io/badge/PHP-8.2+-777BB4?style=flat-square&logo=php&logoColor=white)](https://php.net)

</div>

---

## Descripción general

Palletizer es una aplicación web interna diseñada para equipos de logística que gestionan envíos de gran volumen de equipos informáticos (torres MT, torres SFF, portátiles y mini PCs). Calcula automáticamente el **plan de paletizado óptimo** seleccionando el transportista y tipo de pallet más económico para un destino dado, maximizando la densidad de equipos por capa.

El resultado se puede exportar a **PDF** (para imprimir) o **Excel** (para operaciones), e incluye un desglose completo: coste por pallet, coste de embalaje, detalle capa a capa y hasta 5 planes alternativos ordenados por coste total.

---

## Funcionalidades

### 🧠 Palletizer (optimizador)

| Funcionalidad | Descripción |
|---|---|
| **Optimización multi-transportista** | Evalúa todos los transportistas y tipos de pallet activos para el destino seleccionado y elige el más económico |
| **Simulación capa a capa** | Simula la colocación exacta de cajas por capa usando dimensiones y pesos reales |
| **Relleno vertical** | Coloca unidades adicionales en el hueco lateral no utilizado de cada capa |
| **Capas mixtas** | Permite mezclar tipos de equipo en una misma capa mediante separadores físicos |
| **Separadores de seguridad** | Inserta tableros separadores estructurales entre bloques de capas cuando es necesario |
| **Entrada por modelo** | Los equipos pueden introducirse por modelo de dispositivo (marca + nombre + cantidad) en lugar de contadores por tipo |
| **Selección de transportista** | Automática (el más barato) o manual (forzar un transportista o subconjunto) |
| **Selección de tipo de pallet** | Automática o con restricción manual a formatos específicos |
| **Coste de embalaje** | Calcula el coste de las cajas (solo unidades nuevas) a partir del stock actual de variantes |
| **Planes alternativos** | Muestra hasta 5 planes alternativos con la diferencia de coste respecto al óptimo |
| **Exportación a PDF** | Informe completo del plan: KPIs, listado de modelos, resumen por pallet, detalle de capas |
| **Exportación a Excel** | Libro multi-hoja: Resumen, Pallets, Capas, Modelos |

### ⚙️ Panel de administración

| Sección | Qué se gestiona |
|---|---|
| **Geografía** | Países, zonas de envío por transportista, asignación de provincias españolas a zonas |
| **Transportistas** | Empresas de transporte con activación/desactivación |
| **Tipos de pallet** | Dimensiones base, altura máxima y peso máximo por formato de pallet |
| **Tarifas** | Precio por pallet según transportista × zona × tipo de pallet, con cargo mínimo |
| **Tipos de caja** | Categorías genéricas de caja (tower, tower\_sff, laptop, mini\_pc) con dimensiones base |
| **Proveedores** | Proveedores de material de embalaje |
| **Variantes de caja** | Cajas concretas: dimensiones reales, condición (nueva/reutilizada), stock y coste unitario |
| **Modelos de dispositivo** | Catálogo de equipos: marca, modelo, tipo de caja, peso real, toggle activo/inactivo |

---

## Stack tecnológico

```
Backend   Laravel 12  ·  PHP 8.2+  ·  PostgreSQL 16
Frontend  React 18  ·  Inertia.js 2  ·  Tailwind CSS 3
Build     Vite 7
Exportes  barryvdh/laravel-dompdf  ·  phpoffice/phpspreadsheet
```

---

## Instalación

### Requisitos previos

- [Laragon](https://laragon.org/) (recomendado para desarrollo local en Windows)
- PostgreSQL 16 — descargar binarios desde [enterprisedb.com](https://www.enterprisedb.com/download-postgresql-binaries)
- PHP 8.2+ con las extensiones `pgsql` y `pdo_pgsql` habilitadas
- Node.js 20+
- Composer

> **Configuración de Laragon:** Descomprime los binarios de PostgreSQL en `C:/laragon/bin/postgresql/pgsql`. Habilita PostgreSQL desde el menú de Laragon y activa las extensiones `pgsql` y `pdo_pgsql` en **Menú → PHP → Extensiones**.

---

### Pasos

**1. Clonar el repositorio**

```bash
git clone https://github.com/tu-org/palletizer.git
cd palletizer
```

**2. Instalar dependencias**

```bash
composer install
npm install
```

**3. Configurar el entorno**

```bash
cp .env.example .env
php artisan key:generate
```

Edita `.env` y configura la conexión a la base de datos:

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=postgres
DB_PASSWORD=postgres
```

**4. Ejecutar migraciones y seeder**

```bash
php artisan migrate:fresh --seed
```

Esto crea todas las tablas y carga:
- Datos geográficos maestros (países, zonas, provincias)
- Transportistas, tipos de pallet y tarifas de ejemplo
- Tipos de caja, proveedores y variantes
- Catálogo de modelos de dispositivo

**5. Arrancar los servidores de desarrollo**

```bash
# En dos terminales separadas:
php artisan serve   # → http://127.0.0.1:8000
npm run dev
```

---

## Credenciales por defecto

Tras ejecutar el seeder, están disponibles las siguientes cuentas:

| Nombre | Email | Contraseña | Rol |
|---|---|---|---|
| Admin | `admin@palletizer.local` | `password` | `admin` |
| Alfonso | `alfonso@palletizer.com` | `palletizerpulsia` | `admin` |

> Los usuarios con rol `admin` tienen acceso completo al Panel de administración (`/admin`). Los usuarios estándar solo pueden acceder al Palletizer.

---

## Uso

### Palletizer (`/`)

1. Selecciona el **destino** — provincia española o zona internacional
2. Introduce los **equipos** — por contadores por tipo o seleccionando modelos de dispositivo concretos
3. Configura las **opciones** — modo de transportista (auto/manual), tipo de pallet, separadores, cajas de embalaje
4. Pulsa **Calcular** — el algoritmo evalúa todas las combinaciones transportista × tipo de pallet y devuelve el plan óptimo
5. Revisa el resultado — KPIs, detalle pallet a pallet y capa a capa, planes alternativos
6. **Exporta** a PDF o Excel

### Panel de administración (`/admin`)

El panel sigue un orden de dependencia entre datos. Al configurar desde cero:

```
Países & Zonas → Provincias → Transportistas → Tipos de pallet → Tarifas
                                                                  ↓
                              Tipos de caja → Proveedores → Variantes → Modelos de dispositivo
```

Consulta la **guía integrada** en `/admin/info` para un recorrido completo paso a paso.

---

## Estructura del proyecto

```
app/
├── Http/
│   ├── Controllers/
│   │   ├── Api/                  # Endpoints REST (transportistas, zonas)
│   │   ├── Admin/                # Controladores CRUD del panel admin
│   │   ├── ExportController      # Exportación PDF y Excel
│   │   └── PalletizerController  # Cálculo y renderizado del optimizador
│   └── Middleware/
│       └── AdminMiddleware       # Guard de rol para rutas /admin
└── Services/
    └── PalletizationService      # Algoritmo central de optimización

resources/js/
├── Layouts/
│   ├── AppLayout                 # Carcasa del Palletizer
│   └── AdminLayout               # Carcasa del panel admin con barra lateral
└── Pages/
    ├── Palletizer/Index          # UI principal del optimizador
    └── Admin/                    # Todas las páginas del panel admin

database/
├── migrations/
└── seeders/
    ├── DatabaseSeeder
    └── MasterDataSeeder          # Geografía, transportistas, tarifas, cajas, modelos
```

---

## Conceptos clave

**Zonas por transportista** — Cada zona de envío pertenece a un único transportista. Varios transportistas pueden cubrir la misma área geográfica a través de sus propias zonas independientes. Una provincia española se mapea a una zona por transportista mediante la tabla pivote `province_zones`.

**Algoritmo de paletización** — Para cada candidato (transportista × tipo de pallet), el servicio simula el apilado caja a caja, capa a capa, respetando las restricciones dimensionales y de peso. A continuación suma el coste de embalaje (variantes de caja nuevas con stock) y ordena todos los candidatos por coste total.

**Planes mixtos** — El optimizador también evalúa combinaciones de dos tipos de pallet repartidos en el mismo envío, por ejemplo llenando la mayoría de pallets con un formato más ligero y económico y el resto con uno de mayor capacidad. Las combinaciones degeneradas (0 pallets de uno de los tipos) se descartan automáticamente.

---

## Licencia

Este proyecto es software propietario desarrollado para uso interno en **Pulsia Itech**.
