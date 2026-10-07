# Guía de construcción: To-Do List → Android

Objetivo final: tener esta app instalada en un móvil Android, con las tareas guardadas en Supabase.

## Punto de partida y camino elegido

**Lo que ya existe** (commit `e5a908b`): una app web React 19 + TypeScript + Vite con bloques editables (crear, borrar, cambiar color) y tareas (crear, editar, completar, borrar, ordenadas por importancia). Todo el estado vive en memoria en `src/App.tsx`: al recargar la página se pierde.

**Lo que falta**, en este orden:

| Fase | Qué se consigue | Estado |
|------|-----------------|--------|
| 0 | App web funcionando en memoria | Hecho |
| 1 | Base de datos en Supabase (tablas + seguridad) | Hecho |
| 2 | La app conectada a Supabase | Hecho |
| 3 | Inicio de sesión | Hecho |
| 4 | Lectura y escritura real de bloques y tareas | Hecho |
| 5 | Ajustes para pantalla de móvil | Hecho |
| 6 | Entorno Android instalado en el PC | Pendiente |
| 7 | App empaquetada con Capacitor | Pendiente |
| 8 | App probada en un móvil real | Pendiente |
| 9 | APK/AAB firmado y publicado | Pendiente |

**Decisiones técnicas:**

- **Capacitor** para Android. Envuelve la app web actual dentro de una app nativa, así que se reutiliza todo el código React. La alternativa (React Native) obligaría a reescribir la interfaz entera.
- **Supabase** como backend: base de datos Postgres, autenticación y API lista sin escribir servidor.
- **Inicio de sesión con email y contraseña.** Una app Android lleva la clave de Supabase dentro del APK y cualquiera puede extraerla; sin usuarios, cualquiera podría leer o borrar las tareas. Con login, cada persona solo ve las suyas.

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

Hoy la app arranca con cuatro bloques (`INITIAL_BLOCKS`). Para conservar eso, un disparador los crea cuando alguien se registra:

```sql
create function public.create_initial_blocks()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.blocks (user_id, name, class_name) values
    (new.id, 'Poker', 'block-poker'),
    (new.id, 'Programación', 'block-programacion'),
    (new.id, 'Huerta', 'block-poker'),
    (new.id, 'Tareas varias', 'block-tareas-varias');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_initial_blocks();
```

### 1.6 Comprobar

- **Table Editor**: aparecen `blocks` y `tasks`, ambas con la etiqueta de RLS activado.
- **Authentication → Users → Add user**: crear un usuario de prueba y verificar que en `blocks` aparecen sus cuatro bloques.

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

Nunca poner aquí la clave `secret` / `service_role`: se salta la seguridad por filas y acabaría dentro del APK.

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

La sesión se guarda en el almacenamiento local, que también funciona dentro de la app Android: el usuario no tendrá que entrar cada vez.

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
6. **Elementos que hay que verificar en el dispositivo real** (Fase 8), porque dentro de una app Android pueden comportarse distinto que en el navegador:
   - El selector de color (`<input type="color">`). Si no se abre, sustituirlo por una paleta de colores fijos.
   - El diálogo de confirmación al borrar un bloque (`window.confirm`).
   - El cierre del menú de opciones al tocar fuera.

---

## Fase 6 — Instalar el entorno Android

Ahora mismo en este PC hay Node 22 y npm 10, pero no hay Java ni Android SDK.

1. **Instalar Android Studio** desde <https://developer.android.com/studio>. Incluye el JDK y el SDK. El asistente inicial descarga varios GB.
2. En Android Studio: **More Actions → SDK Manager** y comprobar que están instalados:
   - Una plataforma Android reciente (pestaña *SDK Platforms*).
   - *Android SDK Build-Tools*, *Platform-Tools* y *Command-line Tools* (pestaña *SDK Tools*).
3. **Variables de entorno de Windows** (Configuración → Sistema → Variables de entorno):
   - `ANDROID_HOME` = `C:\Users\Administrador\AppData\Local\Android\Sdk`
   - `JAVA_HOME` = `C:\Program Files\Android\Android Studio\jbr`
   - Añadir a `Path`: `%ANDROID_HOME%\platform-tools`
4. Cerrar y abrir VS Code para que lea las variables.

**Comprobar** en una terminal nueva:

```bash
adb --version
```

---

## Fase 7 — Empaquetar con Capacitor

### 7.1 Instalar

```bash
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli
```

### 7.2 Inicializar

```bash
npx cap init "To-Do List" com.j0saan97.todolist --web-dir dist
```

El identificador (`com.j0saan97.todolist`) es único y **no se puede cambiar una vez publicada la app** en Google Play. Elegirlo con calma.

### 7.3 Crear el proyecto Android

```bash
npm run build
npx cap add android
```

Aparece la carpeta `android/`, que **sí se sube a Git** (trae su propio `.gitignore` para lo generado).

### 7.4 Ciclo de trabajo

Cada vez que cambie el código web:

```bash
npm run build
npx cap sync android
```

Conviene añadirlo como script en `package.json`:

```json
"android": "npm run build && npx cap sync android && npx cap open android"
```

Importante: las variables de `.env` se incrustan en el momento de `npm run build`. Si se cambia `.env`, hay que volver a compilar y sincronizar.

### 7.5 Icono y pantalla de inicio

```bash
npm install -D @capacitor/assets
```

Colocar `assets/icon.png` (1024×1024) y `assets/splash.png` (2732×2732) y ejecutar:

```bash
npx capacitor-assets generate --android
```

---

## Fase 8 — Probar en un móvil

### 8.1 Preparar el teléfono

1. **Ajustes → Acerca del teléfono**: pulsar 7 veces sobre *Número de compilación* para activar las opciones de desarrollador.
2. **Ajustes → Opciones de desarrollador**: activar *Depuración USB*.
3. Conectar por USB y aceptar el aviso de autorización que aparece en el teléfono.
4. `adb devices` debe listar el dispositivo.

Sin teléfono a mano: crear un emulador en Android Studio (**Device Manager → Create Device**).

### 8.2 Ejecutar

```bash
npx cap open android
```

En Android Studio, esperar a que termine la sincronización de Gradle (la primera vez tarda varios minutos), elegir el dispositivo y pulsar **Run**.

### 8.3 Lista de comprobación

- [ ] Registro e inicio de sesión
- [ ] La sesión se mantiene al cerrar y abrir la app
- [ ] Crear, editar, completar y borrar tareas
- [ ] Crear y borrar bloques (con su confirmación)
- [ ] Cambiar el color de un bloque
- [ ] El teclado no tapa el campo que se está escribiendo
- [ ] El botón "atrás" de Android no deja la app en un estado raro
- [ ] Qué ocurre sin conexión: debe verse un aviso, no una pantalla en blanco

### 8.4 Depurar

Con el móvil conectado, abrir `chrome://inspect` en Chrome del PC: aparece la app y se pueden usar la consola y el inspector como en una web normal.

---

## Fase 9 — Generar la versión final y publicar

### 9.1 Crear la clave de firma

En Android Studio: **Build → Generate Signed App Bundle or APK → Create new** (keystore).

- Guardar el archivo `.jks` **fuera del repositorio** y hacer copia de seguridad.
- Guardar las contraseñas en un gestor.
- Si se pierde, no se podrán publicar actualizaciones de la app.

### 9.2 Versión

En `android/app/build.gradle`:

- `versionCode`: número entero que debe subir en cada publicación (1, 2, 3…).
- `versionName`: lo que ve el usuario (`1.0.0`).

### 9.3 Opción A — Instalación directa (rápida y gratis)

Generar un **APK** firmado y pasarlo al móvil (cable, Drive, etc.). Al abrirlo, Android pedirá permitir la instalación desde orígenes desconocidos. Suficiente para uso personal.

### 9.4 Opción B — Google Play

1. Crear cuenta en <https://play.google.com/console> (pago único de 25 USD y verificación de identidad).
2. Crear la app y completar la ficha: descripción, capturas de pantalla, icono de 512×512, gráfico de 1024×500.
3. Completar los formularios obligatorios: **política de privacidad** (URL pública; necesaria porque la app recoge emails), seguridad de los datos, clasificación de contenido y público objetivo.
4. Generar un **AAB** firmado (no APK) y subirlo.
5. Las cuentas personales nuevas deben pasar una **prueba cerrada con al menos 12 testers durante 14 días** antes de poder solicitar el paso a producción.
6. Enviar a revisión. Suele tardar entre unas horas y varios días.

### 9.5 Antes de publicar

- [ ] Reactivar **Confirm email** en Supabase
- [ ] Revisar en Supabase **Authentication → URL Configuration**
- [ ] Confirmar que RLS sigue activo en las dos tablas
- [ ] Confirmar que `.env` y el `.jks` no están en Git

---

## Mejoras posteriores (fuera del objetivo inicial)

- Recuperación de contraseña e inicio de sesión con Google.
- Funcionamiento sin conexión con sincronización posterior.
- Sincronización en tiempo real entre dispositivos (Supabase Realtime).
- Renombrar y reordenar bloques.
- Notificaciones y recordatorios.
