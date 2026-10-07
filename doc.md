# To-Do List — Cómo está construida

Lista de tareas organizada por bloques, que se usa desde el navegador o instalada en el móvil como una app. Cada usuario entra con su cuenta y solo ve sus propios bloques y tareas.

- **App publicada:** <https://to-do-list-topaz-phi-27.vercel.app>
- **Repositorio:** <https://github.com/j0saan97/TO-DO-LIST>
- **Guía paso a paso de la construcción:** [GUIA-TO-DO-LIST.md](GUIA-TO-DO-LIST.md)

## Qué hace

- Registro e inicio de sesión con email y contraseña.
- Bloques: crear, borrar y cambiar de color. Cada usuario nuevo empieza con cuatro.
- Tareas: crear, editar, mover de bloque, completar y borrar. Dentro de cada bloque se ordenan por importancia.
- Todo se guarda en una base de datos en la nube, así que los datos son los mismos en el PC y en el móvil.
- Se instala en el móvil desde el navegador, sin tienda de aplicaciones.

## Lenguajes y tecnologías

| Parte | Tecnología | Para qué se usa |
|-------|------------|-----------------|
| Lenguaje | TypeScript 6 | Todo el código de la app. Es JavaScript con tipos, que detecta errores antes de ejecutar. |
| Interfaz | React 19 | Construye la pantalla a partir de componentes. |
| Estilos | CSS | Diseño, colores, modo oscuro y adaptación a móvil. Sin librerías de estilos. |
| Herramienta de desarrollo | Vite 8 | Servidor de desarrollo y compilación para producción. |
| Base de datos | PostgreSQL (en Supabase) | Guarda los bloques y las tareas. |
| Lenguaje de base de datos | SQL | Define las tablas, las reglas de seguridad y el disparador. |
| Autenticación | Supabase Auth | Cuentas de usuario y sesiones. |
| Conexión con el backend | `@supabase/supabase-js` 2 | Librería con la que la app habla con Supabase. |
| App instalable | `vite-plugin-pwa` 2 | Genera el manifiesto y el service worker que convierten la web en PWA. |
| Iconos | `@vite-pwa/assets-generator` 2 | Genera los tamaños de icono a partir de un SVG. |
| Calidad de código | ESLint 10 | Revisa el código en busca de errores y malas prácticas. |
| Hosting | Vercel | Publica la app en internet. |
| Control de versiones | Git y GitHub | Historial del código y origen de los despliegues. |

No hay servidor propio: la app se ejecuta entera en el navegador y habla directamente con Supabase.

## Arquitectura

```
┌──────────────────────────┐        ┌──────────────────────────┐
│  Navegador o móvil (PWA) │        │         Supabase         │
│                          │        │                          │
│  React + TypeScript      │ HTTPS  │  Auth (usuarios)         │
│  Componentes → api.ts ───┼───────►│  API automática          │
│                          │        │  PostgreSQL + RLS        │
└──────────────────────────┘        └──────────────────────────┘
             ▲
             │ descarga la app
┌────────────┴─────────────┐        ┌──────────────────────────┐
│          Vercel          │◄───────│  GitHub (rama main)      │
│  Archivos estáticos      │ publica│                          │
└──────────────────────────┘        └──────────────────────────┘
```

1. El móvil o el navegador descarga la app desde Vercel.
2. El usuario inicia sesión contra Supabase Auth.
3. La app lee y escribe bloques y tareas a través de la API de Supabase.
4. La base de datos comprueba en cada petición que el usuario solo toca sus propias filas.

## Estructura del proyecto

```
todo-list-app/
├── index.html               Página base; carga la app
├── vite.config.ts           Configuración de Vite y de la PWA
├── pwa-assets.config.ts     Cómo generar los iconos
├── .env.example             Variables de entorno necesarias (sin valores)
├── public/                  Iconos de la app
├── supabase/
│   └── schema.sql           Tablas, seguridad y disparador de la base de datos
└── src/
    ├── main.tsx             Punto de entrada: monta React en la página
    ├── App.tsx              Controla la sesión y decide qué pantalla mostrar
    ├── types.ts             Tipos compartidos: Block, Task
    ├── index.css            Estilos globales y variables de color
    ├── App.css              Estilos de los componentes
    ├── lib/
    │   ├── supabase.ts      Cliente de Supabase
    │   └── api.ts           Operaciones contra la base de datos
    └── components/
        ├── AuthForm.tsx     Formulario de entrada y registro
        ├── Board.tsx        Tablero: estado y lógica de bloques y tareas
        ├── TaskForm.tsx     Formulario para crear una tarea
        ├── BlockForm.tsx    Formulario para crear un bloque
        ├── TaskBlock.tsx    Un bloque con su lista de tareas y su menú
        └── TaskItem.tsx     Una tarea: ver, completar, editar, borrar
```

## La app por partes

### 1. Interfaz (React)

La pantalla se compone de componentes anidados:

```
App
├── AuthForm                 (sin sesión)
└── Board                    (con sesión)
    ├── TaskForm
    ├── BlockForm
    └── TaskBlock            (uno por bloque)
        └── TaskItem         (uno por tarea)
```

- **`App`** solo se ocupa de la sesión. Muestra "Cargando..." mientras recupera la sesión guardada, el formulario de acceso si no hay ninguna, y el tablero si la hay.
- **`Board`** guarda en su estado la lista de bloques y la de tareas, y contiene todas las acciones (añadir, editar, borrar...). Pasa los datos y las acciones a sus hijos mediante props.
- **Los demás componentes** muestran datos y avisan a `Board` cuando el usuario hace algo. No hablan con la base de datos.

El estado se maneja con los hooks de React (`useState`, `useEffect`, `useRef`), sin librerías de estado adicionales.

### 2. Capa de datos (`src/lib/`)

- **`supabase.ts`** crea el cliente con la dirección y la clave pública del proyecto, leídas de las variables de entorno.
- **`api.ts`** tiene una función por operación: `fetchBlocks`, `fetchTasks`, `addBlock`, `updateBlockColor`, `deleteBlock`, `addTask`, `updateTask` y `deleteTask`.

`api.ts` también traduce los nombres: la base de datos usa `snake_case` (`block_id`, `class_name`) y el código usa `camelCase` (`blockId`, `className`).

Cada acción sigue el mismo recorrido: el componente avisa a `Board`, `Board` llama a `api.ts`, y solo cuando Supabase confirma se actualiza la pantalla. Si falla, aparece un aviso y la pantalla no cambia. La excepción es el color de un bloque, que se pinta al instante y se guarda cuando el usuario deja de mover el selector.

### 3. Base de datos (PostgreSQL en Supabase)

Dos tablas, definidas en [supabase/schema.sql](supabase/schema.sql):

**`blocks`**

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `uuid` | Identificador |
| `user_id` | `uuid` | Dueño del bloque |
| `name` | `text` | Nombre, único por usuario |
| `class_name` | `text` | Clase CSS con el color por defecto |
| `color` | `text` | Color elegido por el usuario (opcional) |
| `created_at` | `timestamptz` | Fecha de creación |

**`tasks`**

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `bigint` | Identificador autogenerado |
| `user_id` | `uuid` | Dueño de la tarea |
| `block_id` | `uuid` | Bloque al que pertenece |
| `text` | `text` | Texto de la tarea |
| `importance` | `integer` | Orden dentro del bloque (1 es lo primero) |
| `completed` | `boolean` | Si está hecha |
| `created_at` | `timestamptz` | Fecha de creación |

- Al borrar un bloque se borran sus tareas (`on delete cascade`).
- Al borrar un usuario se borran sus bloques y tareas.
- Un disparador crea cuatro bloques iniciales cada vez que se registra un usuario: Poker, Programación, Huerta y Tareas varias.

### 4. Autenticación y seguridad

- El inicio de sesión es con email y contraseña, gestionado por Supabase Auth. La sesión se guarda en el dispositivo, así que no hay que entrar cada vez.
- La seguridad real está en la base de datos, no en la app. Las dos tablas tienen **seguridad por filas (RLS)** con una política cada una: un usuario solo puede leer, crear, modificar y borrar las filas cuyo `user_id` es el suyo.
- La clave de Supabase que lleva la app es la **pública** (*publishable*). Cualquiera puede verla en el código descargado, y no importa: sin iniciar sesión las tablas no devuelven nada.
- La clave secreta de Supabase y la contraseña de la base de datos no se usan en la app ni están en el repositorio.

### 5. Diseño y adaptación a móvil

- Los colores se definen como variables CSS en `index.css`, con una versión para modo claro y otra para modo oscuro que sigue la configuración del dispositivo.
- El tablero muestra tres columnas en pantallas anchas y una sola por debajo de 900 px.
- En pantallas táctiles, los botones y campos miden al menos 44 px de alto.
- El contenido respeta la barra de estado y la de navegación del móvil.

### 6. PWA (app instalable)

La web se convierte en app instalable con tres piezas:

- **Manifiesto**: indica el nombre, el icono, los colores y que debe abrirse a pantalla completa.
- **Service worker**: guarda los archivos de la app en el dispositivo para que abra rápido, y descarga las versiones nuevas automáticamente.
- **HTTPS**: lo proporciona Vercel.

Ambos archivos los genera `vite-plugin-pwa` al compilar, según la configuración de `vite.config.ts`. Los iconos salen de `public/favicon.svg` con `npm run icons`.

Sin conexión la app abre, pero no puede leer ni guardar tareas: los datos están siempre en Supabase.

### 7. Publicación (Vercel)

Vercel está conectado al repositorio de GitHub:

- Cada cambio en la rama `main` se compila y se publica automáticamente.
- Las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY` están configuradas en Vercel y se incrustan en la app al compilar.

## Ramas de Git

| Rama | Uso |
|------|-----|
| `dev` | Desarrollo. Aquí se hacen los cambios. |
| `main` | Última versión que funciona. Es la que se publica. |

Los cambios pasan de `dev` a `main` una vez probados.

## Ejecutarla en local

Requisitos: Node.js 22 o superior y un proyecto de Supabase con [supabase/schema.sql](supabase/schema.sql) ejecutado.

```bash
git clone https://github.com/j0saan97/TO-DO-LIST.git
cd TO-DO-LIST
npm install
```

Copiar `.env.example` a `.env` y rellenar la dirección y la clave pública del proyecto de Supabase. Después:

```bash
npm run dev
```

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run build` | Comprueba los tipos y compila para producción en `dist/` |
| `npm run preview` | Sirve la versión compilada, con la PWA activa |
| `npm run lint` | Revisa el código con ESLint |
| `npm run icons` | Regenera los iconos a partir de `public/favicon.svg` |

## Orden en que se construyó

1. App web en memoria: bloques y tareas sin guardar.
2. Base de datos en Supabase: tablas, seguridad por filas y disparador.
3. Conexión de la app con Supabase.
4. Inicio de sesión.
5. Lectura y escritura real de bloques y tareas.
6. Ajustes de interfaz para móvil.
7. Conversión en PWA.
8. Publicación en Vercel.

El detalle de cada paso está en [GUIA-TO-DO-LIST.md](GUIA-TO-DO-LIST.md).
