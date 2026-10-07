# Mejoras pendientes

Lista de trabajo de lo que falta por mejorar en la app. Se marca cada punto al terminarlo.

Estado de partida: la app está publicada en <https://to-do-list-topaz-phi-27.vercel.app>, funciona para una persona y se instala en el móvil. Los puntos de abajo son lo que hace falta para compartirla con más gente y para pulirla.

## 1. Imprescindibles antes de compartirla

Sin estos puntos, otras personas no podrían usarla bien.

### 1.1 Los correos de confirmación no llegan a otros usuarios

- [ ] **Pendiente**

**Problema:** el proyecto de Supabase exige confirmar el email al registrarse. Esos correos los envía el servicio gratuito de Supabase, pensado solo para pruebas: envía muy pocos por hora y, según su documentación, solo a miembros de la organización. Un usuario nuevo se quedaría esperando un correo que no llega.

**Solución elegida para un grupo de amigos:** desactivar la confirmación.

**Cómo:** en Supabase, **Authentication → Sign In / Providers → Email**, desactivar **Confirm email**.

**Alternativa si se abre al público:** configurar un servicio de correo propio (por ejemplo Resend) en **Authentication → Emails → SMTP Settings** y mantener la confirmación activada.

### 1.2 Los bloques iniciales son personales

- [ ] **Pendiente**

**Problema:** todo usuario nuevo empieza con Poker, Programación, Huerta y Tareas varias, que son los bloques de una persona concreta.

**Solución:** cambiar el disparador `create_initial_blocks` para que cree bloques genéricos (por ejemplo Personal, Trabajo y Casa) o uno solo.

**Cómo:** modificar la función en `supabase/schema.sql` y ejecutar el cambio en el SQL Editor de Supabase. No afecta a los usuarios ya registrados.

**Por decidir:** qué bloques iniciales poner.

### 1.3 Los errores de acceso salen en inglés

- [ ] **Pendiente**

**Problema:** el formulario muestra los mensajes tal como los devuelve Supabase ("Invalid login credentials", "User already registered").

**Solución:** traducir en `src/components/AuthForm.tsx` los errores más habituales y mostrar un mensaje genérico en español para el resto.

### 1.4 No se puede recuperar la contraseña

- [ ] **Pendiente**

**Problema:** quien olvide su contraseña pierde el acceso a su cuenta y a sus tareas.

**Solución:** añadir "¿Olvidaste tu contraseña?" al formulario, que envíe un correo con un enlace para elegir una nueva.

**Depende de:** un servicio de correo propio (la alternativa del punto 1.1), porque necesita enviar correos a cualquier dirección.

## 2. Comprobaciones pendientes en el móvil

Cosas que funcionan en el PC y hay que confirmar en un móvil real.

- [ ] **Selector de color de los bloques.** Si no se abre o resulta incómodo, sustituirlo por una paleta de colores fijos.
- [ ] **Confirmación al borrar un bloque con tareas.**
- [ ] **El menú Opciones se cierra al tocar fuera.**
- [ ] **El teclado no tapa el campo en el que se escribe.**
- [ ] **Sin conexión**: la app abre y muestra un aviso, no una pantalla en blanco.
- [ ] **Tamaño de botones y textos** cómodo con el dedo.

## 3. Mejoras de uso

No bloquean nada, pero mejoran la experiencia.

- [ ] **Respuesta inmediata al marcar una tarea.** Hoy la casilla cambia cuando Supabase confirma, y con mala cobertura se nota el retraso. Cambiarla al instante y deshacer si falla.
- [ ] **Renombrar bloques.** Hoy solo se pueden crear y borrar.
- [ ] **Reordenar bloques.** Hoy aparecen en el orden en que se crearon.
- [ ] **Ocultar o archivar las tareas completadas.** Hoy se quedan tachadas en la lista.
- [ ] **Aviso de versión nueva.** La app se actualiza sola, pero a veces hay que cerrarla y abrirla para ver los cambios.
- [ ] **Pantalla de inicio más cuidada** para quien abre la app por primera vez.

## 4. Mantenimiento

- [ ] **Vulnerabilidades en dependencias.** `npm audit` avisa de 4 (1 moderada y 3 altas), en herramientas de desarrollo. Revisarlas y aplicar `npm audit fix`.
- [ ] **README del repositorio.** Sigue siendo el de la plantilla de Vite. Sustituirlo por una presentación breve que enlace a `doc.md`.
- [ ] **Archivos de la plantilla sin usar.** `public/icons.svg` y `src/assets/` no los usa la app.
- [ ] **Pausa por inactividad.** En el plan gratuito, Supabase pausa el proyecto tras una semana sin uso. Se reactiva a mano desde el panel.

## 5. Si se abre al público

- [ ] **Política de privacidad.** La app guarda emails de los usuarios.
- [ ] **Eliminar la cuenta.** Que cada usuario pueda borrar su cuenta y sus datos desde la app.
- [ ] **Confirmación de email activada**, con servicio de correo propio.
- [ ] **Dominio propio** en lugar de la dirección `vercel.app`.
- [ ] **Revisar los límites de los planes gratuitos** de Supabase y Vercel según el número de usuarios.

## 6. Ideas para más adelante

- [ ] Inicio de sesión con Google.
- [ ] Uso sin conexión, con sincronización al recuperarla.
- [ ] Sincronización en tiempo real entre dispositivos (Supabase Realtime).
- [ ] Fechas límite, notificaciones y recordatorios.
- [ ] APK o publicación en Google Play con Capacitor (ver el apéndice de `GUIA-TO-DO-LIST.md`).

## Orden propuesto

1. Punto 1.1: desactivar la confirmación de email.
2. Punto 1.2: bloques iniciales genéricos.
3. Punto 1.3: errores en español.
4. Sección 2: comprobaciones en el móvil, y arreglar lo que falle.
5. Sección 3, por orden de lo que más se eche en falta.
