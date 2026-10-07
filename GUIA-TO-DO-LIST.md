# Guía de construcción: To-Do List en el móvil

Objetivo final: usar esta app en un móvil Android como una app más (icono en la pantalla de inicio, pantalla completa), con las tareas guardadas en Supabase y sin pasar por ninguna tienda de aplicaciones.

## Punto de partida y camino elegido

**Punto de partida** (commit `e5a908b`): una app web React 19 + TypeScript + Vite con bloques editables (crear, borrar, cambiar color) y tareas (crear, editar, completar, borrar, ordenadas por importancia). Todo el estado vivía en memoria: al recargar la página se perdía.

**Fases**, en este orden:

| Fase | Qué se consigue | Estado |
|------|-----------------|--------|
| 0 | App web funcionando en memoria | Hecho |
| 1 | Base de datos en Supabase (tablas + seguridad) | Hecho |
| 2 | La app conectada a Supabase | Hecho |
| 3 | Inicio de sesión | Hecho |
| 4 | Lectura y escritura real de bloques y tareas | Hecho |
| 5 | Ajustes para pantalla de móvil | Hecho |
| 6 | La app convertida en PWA instalable | Hecho |
| 7 | La app publicada en internet | Hecho |
| 8 | La app instalada y probada en el móvil | Pendiente |

**Decisiones técnicas:**

- **PWA** (aplicación web progresiva) para llevarla al móvil. La app se publica en una dirección web y se instala desde Chrome con "Añadir a pantalla de inicio". Es la vía más rápida y barata: no requiere Android Studio, ni cuenta de desarrollador, ni recompilar para actualizar.
- **Supabase** como backend: base de datos Postgres, autenticación y API lista sin escribir servidor.
- **Inicio de sesión con email y contraseña.** La clave de Supabase viaja dentro del código que se descarga el navegador y cualquiera puede verla; sin usuarios, cualquiera podría leer o borrar las tareas. Con login, cada persona solo ve las suyas.
- **Vercel** como hosting gratuito, conectado al repositorio de GitHub.
- **Ramas de Git**: se desarrolla en `dev`; `main` guarda la última copia que funciona y es la que se publica.

**Camino descartado:** empaquetar la app con Capacitor para generar un APK. Sigue siendo posible más adelante, encima de lo ya hecho, si algún día se quiere publicar en Google Play (ver el apéndice).

---

## Fase 1 — Base de datos en Supabase

### 1.1 Crear el proyecto

1. Entrar en <https://supabase.com> y crear una cuenta.
2. **New project**: nombre `todo-list`, región cercana (por ejemplo `eu-west`), y una contraseña de base de datos. Guardar esa contraseña en un gestor de contraseñas.
3. Esperar a que termine de aprovisionarse (1–2 minutos).

Nota: en el plan gratuito, un proyecto sin actividad durante una semana se pausa. Se reactiva desde el panel.

### 1.2 Diseño de las tablas

Dos tablas, que corresponden a los tipos de `src/types.ts`:

**`blocks`**

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | `uuid` | Clave primaria |
| `user_id` | `uuid` | Dueño del bloque |
| `name` | `text` | Único por usuario |
| `class_name` | `text` | Clase CSS de color por defecto |
| `color` | `text` | Color elegido por el usuario; puede ser nulo |
| `created_at` | `timestamptz` | Para mantener el orden de creación |

**`tasks`**

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | `bigint` | Clave primaria autogenerada |
| `user_id` | `uuid` | Dueño de la tarea |
| `block_id` | `uuid` | Bloque al que pertenece |
| `text` | `text` | |
| `importance` | `integer` | |
| `completed` | `boolean` | `false` por defecto |
| `created_at` | `timestamptz` | |

Cambio respecto al código actual: hoy una tarea apunta a su bloque por **nombre** (`task.block`). En la base de datos apunta por **id** (`block_id`). Así, borrar un bloque borra sus tareas automáticamente (`on delete cascade`) y en el futuro se podrá renombrar un bloque sin romper nada.

### 1.3 Crear las tablas

En el panel de Supabase: **SQL Editor → New query**, pegar y ejecutar:

```sql
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  class_name text not null,
  color text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.tasks (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  block_id uuid not null references public.blocks (id) on delete cascade,
  text text not null check (length(trim(text)) > 0),
  importance integer not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index tasks_block_id_idx on public.tasks (block_id);
create index tasks_user_id_idx on public.tasks (user_id);
```

### 1.4 Activar la seguridad por filas (RLS)

Sin este paso, cualquiera con la clave pública podría leer todas las filas. Ejecutar:

```sql
alter table public.blocks enable row level security;
alter table public.tasks enable row level security;

create policy "Cada usuario gestiona sus bloques"
  on public.blocks for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Cada usuario gestiona sus tareas"
  on public.tasks for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```

### 1.5 Bloques iniciales para cada usuario nuevo

Para que un usuario nuevo no empiece con el tablero vacío, un disparador le crea tres bloques al registrarse:

```sql
create function public.create_initial_blocks()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.blocks (user_id, name, class_name) values
    (new.id, 'Casa', 'block-poker'),
    (new.id, 'Trabajo', 'block-programacion'),
    (new.id, 'Estudios', 'block-tareas-varias');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_initial_blocks();
```

### 1.6 Comprobar

- **Table Editor**: aparecen `blocks` y `tasks`, ambas con la etiqueta de RLS activado.
- **Authentication → Users → Add user**: crear un usuario de prueba y verificar que en `blocks` aparecen sus tres bloques.

### 1.7 Guardar el SQL en el repositorio

Copiar los tres bloques de SQL a `supabase/schema.sql` y hacer commit. Así la estructura queda versionada y se puede recrear el proyecto desde cero.

---

## Fase 2 — Conectar la app a Supabase

### 2.1 Instalar el cliente

```bash
npm install @supabase/supabase-js
```

### 2.2 Variables de entorno

En el panel: **Project Settings → API Keys**. Copiar la **Project URL** y la clave **publishable** (en proyectos antiguos se llama `anon`).

Crear `.env` en la raíz (ya está en `.gitignore`, no se sube a Git):

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_KEY=sb_publishable_xxxxxxxx
```

Crear también `.env.example` con los mismos nombres y valores vacíos, y ese sí subirlo.

Nunca poner aquí la clave `secret` / `service_role`: se salta la seguridad por filas y quedaría a la vista de cualquiera.

### 2.3 Crear el cliente

Nuevo archivo `src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY,
)
```

### 2.4 Comprobar

`npm run dev` arranca sin errores en la consola del navegador.

---

## Fase 3 — Inicio de sesión

### 3.1 Configurar Supabase

**Authentication → Sign In / Providers → Email**: activado por defecto. Durante el desarrollo conviene desactivar **Confirm email** para poder registrarse sin esperar correos; volver a activarlo antes de publicar.

### 3.2 Pantalla de acceso

Nuevo componente `src/components/AuthForm.tsx` con email, contraseña y dos acciones:

- Registrarse: `supabase.auth.signUp({ email, password })`
- Entrar: `supabase.auth.signInWithPassword({ email, password })`

Mostrar el mensaje de error que devuelva Supabase si falla.

### 3.3 Controlar la sesión en `App.tsx`

- Al montar: `supabase.auth.getSession()` para recuperar la sesión guardada.
- Suscribirse a `supabase.auth.onAuthStateChange` para reaccionar a entradas y salidas.
- Sin sesión se muestra `AuthForm`; con sesión, el tablero.
- Añadir un botón **Cerrar sesión** (`supabase.auth.signOut()`).

La sesión se guarda en el almacenamiento local, también en la app instalada en el móvil: el usuario no tendrá que entrar cada vez.

### 3.4 Comprobar

Registrarse, recargar la página (la sesión se mantiene), cerrar sesión y volver a entrar.

---

## Fase 4 — Leer y escribir datos reales

### 4.1 Adaptar los tipos (`src/types.ts`)

- `Block` gana `id: string`.
- `Task` cambia `block: BlockName` por `blockId: string`.
- `INITIAL_BLOCKS` desaparece (ahora los crea la base de datos).

Las columnas en la base de datos usan `snake_case` (`class_name`, `block_id`) y el código `camelCase`: hace falta una pequeña función de conversión en cada sentido.

### 4.2 Capa de datos

Nuevo archivo `src/lib/api.ts` con una función por operación, para que los componentes no hablen directamente con Supabase:

| Función | Operación |
|---------|-----------|
| `fetchBlocks()` | `select` de `blocks` ordenado por `created_at` |
| `fetchTasks()` | `select` de `tasks` |
| `addBlock(name, className)` | `insert` |
| `updateBlockColor(id, color)` | `update` |
| `deleteBlock(id)` | `delete` (las tareas caen por cascada) |
| `addTask(...)` | `insert` |
| `updateTask(id, cambios)` | `update` |
| `deleteTask(id)` | `delete` |

### 4.3 Reescribir los manejadores de `App.tsx`

- Al iniciar sesión: cargar bloques y tareas, con un estado de "Cargando…".
- Cada manejador (`handleAdd`, `handleEdit`, `handleDelete`, `handleToggleComplete`, `handleAddBlock`, `handleDeleteBlock`, `handleChangeBlockColor`) llama a la función de `api.ts` y actualiza el estado con la respuesta.
- Eliminar `nextId`: el id lo genera la base de datos.
- Las claves y callbacks que hoy usan `name` del bloque pasan a usar `id`. Afecta a `TaskBlock`, `TaskItem`, `TaskForm` y `BlockForm`.
- Mostrar un aviso si una operación falla (por ejemplo, sin conexión).

Detalle a cuidar: el selector de color dispara muchos eventos mientras se arrastra. Guardar en Supabase solo al soltar, o con un pequeño retardo, para no lanzar decenas de peticiones.

### 4.4 Comprobar

- Crear bloques y tareas, recargar: siguen ahí.
- Verlos en **Table Editor**.
- Entrar con un segundo usuario: no ve los datos del primero.
- `npm run build` y `npm run lint` pasan sin errores.

---

## Fase 5 — Preparar la interfaz para móvil

1. **Probar en tamaño móvil** con las herramientas del navegador (F12 → icono de dispositivo), a 360 px de ancho.
2. **Tablero en una columna** en pantallas estrechas (media query en `src/App.css`).
3. **Botones táctiles**: al menos 44 px de alto.
4. **Campos de texto a 16 px** como mínimo, para evitar zoom automático al enfocar.
5. **Márgenes seguros** para la barra de estado y la de navegación: `viewport-fit=cover` en la etiqueta `viewport` de `index.html` y `env(safe-area-inset-*)` en el CSS.
6. **Elementos que hay que verificar en el móvil real** (Fase 8), porque en pantalla táctil pueden comportarse distinto que en el PC:
   - El selector de color (`<input type="color">`). Si no se abre, sustituirlo por una paleta de colores fijos.
   - El diálogo de confirmación al borrar un bloque (`window.confirm`).
   - El cierre del menú de opciones al tocar fuera.

---

## Fase 6 — Convertir la app en PWA

Una PWA necesita tres cosas: un manifiesto (nombre, colores e iconos de la app), un *service worker* (guarda la app en el móvil para que abra rápido) y servirse por HTTPS. Las dos primeras las genera un plugin de Vite; la tercera la da el hosting.

### 6.1 Instalar

```bash
npm install -D vite-plugin-pwa @vite-pwa/assets-generator
```

### 6.2 Icono

- `public/favicon.svg` es el dibujo original del icono.
- `pwa-assets.config.ts` indica cómo generar los tamaños que pide Android.
- `npm run icons` crea los PNG en `public/`. Solo hay que repetirlo si se cambia el dibujo.

### 6.3 Configurar el plugin

En `vite.config.ts` se añade `VitePWA` con:

- `registerType: 'autoUpdate'`: cuando se publica una versión nueva, el móvil la descarga sola.
- `manifest`: nombre (`To-Do List`), nombre corto bajo el icono (`To-Do`), `display: 'standalone'` (pantalla completa, sin barra del navegador), colores e iconos.

### 6.4 Etiquetas en `index.html`

Enlaces al icono y `theme-color`, que tiñe la barra de estado del móvil.

### 6.5 Comprobar

```bash
npm run build
npm run preview
```

Abrir la dirección que indique en Chrome, F12 → **Application → Manifest**: deben verse el nombre y los iconos sin errores. En **Service workers** debe aparecer uno activo.

Nota: el service worker solo se genera con `npm run build`. Con `npm run dev` la app funciona igual pero no es instalable.

---

## Fase 7 — Publicar en internet

### 7.1 Crear el proyecto en Vercel

1. Entrar en <https://vercel.com> y registrarse con **Continue with GitHub**.
2. **Add New → Project** y elegir el repositorio `TO-DO-LIST`. Si no aparece, pulsar *Adjust GitHub App Permissions* y dar acceso a ese repositorio.
3. Vercel detecta Vite y rellena solo la configuración (`npm run build`, carpeta `dist`). No tocarla.
4. Desplegar **Environment Variables** y añadir las dos de `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_KEY`
5. Pulsar **Deploy**. En un minuto da una dirección del tipo `https://to-do-list-xxxx.vercel.app`.

Sin las variables del paso 4 la app se publica pero no conecta con Supabase. Si se olvidan, añadirlas en **Settings → Environment Variables** y volver a desplegar.

### 7.2 Avisar a Supabase de la nueva dirección

En Supabase: **Authentication → URL Configuration → Site URL**, poner la dirección de Vercel. La usan los enlaces de los correos de confirmación.

### 7.3 Cómo se actualiza a partir de ahora

- Cada `git push` a `main` publica una versión nueva automáticamente.
- Cada `git push` a `dev` crea una dirección de prueba aparte, sin tocar la publicada.
- El móvil recibe la versión nueva al abrir la app (a veces hace falta cerrarla y abrirla otra vez).

### 7.4 Comprobar

Abrir la dirección de Vercel en el PC, entrar con la cuenta y ver las tareas.

---

## Fase 8 — Instalar y probar en el móvil

### 8.1 Instalar

1. Abrir la dirección de Vercel en **Chrome** del móvil.
2. Menú **⋮ → Añadir a pantalla de inicio → Instalar**.
3. El icono aparece en la pantalla de inicio y en el cajón de aplicaciones.

En iPhone: abrir en Safari, botón **Compartir → Añadir a pantalla de inicio**.

### 8.2 Lista de comprobación

- [ ] Se abre a pantalla completa, sin barra del navegador
- [ ] Registro e inicio de sesión
- [ ] La sesión se mantiene al cerrar y abrir la app
- [ ] Crear, editar, completar y borrar tareas
- [ ] Crear y borrar bloques (con su confirmación)
- [ ] Cambiar el color de un bloque
- [ ] El teclado no tapa el campo que se está escribiendo
- [ ] Los botones se pulsan bien con el dedo
- [ ] Sin conexión: la app abre y muestra un aviso, no una pantalla en blanco

### 8.3 Depurar

Con el móvil conectado por USB y la *Depuración USB* activada (Ajustes → Opciones de desarrollador), abrir `chrome://inspect` en Chrome del PC: aparece la app y se pueden usar la consola y el inspector.

### 8.4 Antes de compartirla con otras personas

- [ ] Activar **Confirm email** en Supabase
- [ ] Confirmar que RLS sigue activo en las dos tablas
- [ ] Confirmar que `.env` no está en Git

---

## Mejoras posteriores (fuera del objetivo inicial)

- Recuperación de contraseña e inicio de sesión con Google.
- Uso sin conexión con sincronización posterior (hoy la app abre sin conexión, pero no puede leer ni guardar tareas).
- Sincronización en tiempo real entre dispositivos (Supabase Realtime).
- Renombrar y reordenar bloques.
- Notificaciones y recordatorios.
- Dominio propio en lugar de la dirección `vercel.app`.

---

## Apéndice — Si algún día se quiere un APK o publicar en Google Play

No hace falta rehacer nada: **Capacitor** envuelve esta misma app web en una app Android.

1. Instalar Android Studio (incluye el JDK y el SDK; varios GB).
2. `npm install @capacitor/core @capacitor/android` y `npm install -D @capacitor/cli`.
3. `npx cap init "To-Do List" <identificador> --web-dir dist`. El identificador (por ejemplo `com.j0saan97.todolist`) no se puede cambiar una vez publicada la app.
4. `npm run build`, `npx cap add android` y `npx cap open android` para compilar desde Android Studio.
5. Para Google Play: cuenta de desarrollador (pago único de 25 USD), política de privacidad, un AAB firmado y, en cuentas personales nuevas, una prueba cerrada con 12 testers durante 14 días.
