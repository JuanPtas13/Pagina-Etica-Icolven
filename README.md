# Divergente · ICOLVEN — Frontend

Plataforma educativa del Instituto Colombo Venezolano para compartir proyectos, publicaciones y recursos de **Ética** y **Filosofía**. Los visitantes leen sin registrarse; los miembros con correo confirmado comentan y dan «Me gusta»; una única cuenta de profesor publica y modera.

> **Estado de validación (léelo primero).** El código está completo, pero **no se ha podido instalar dependencias, compilar ni ejecutar la app** en el entorno donde se escribió (la red bloqueó `registry.npmjs.org`). Ver [Pruebas](#pruebas-realizadas-y-pendientes). Lo primero que debes hacer es `npm install && npm run build`.

## Tecnologías

React 18 · TypeScript (estricto) · Vite · React Router 7 · Supabase JS v2 (Auth, PostgREST, Storage) · lucide-react · CSS global organizado con variables · Vitest (pruebas unitarias de utilidades).

## Requisitos

Node.js 20+ y el proyecto Supabase **existente** (no se crea ni modifica ningún esquema).

## Instalación y ejecución

```bash
npm install
cp .env.example .env        # y completa los valores
npm run dev                 # http://localhost:5173
```

### Variables de entorno

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto (Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | Clave pública «anon»/«publishable». **Nunca** uses `service_role`. |

`.env` está en `.gitignore`. Si faltan, la app muestra una pantalla indicando qué configurar.

### Comandos

`npm run typecheck` · `npm run build` (tsc + vite) · `npm test` (Vitest) · `npm run preview`.

## Estructura

```
src/
  lib/          supabase.ts (único cliente), errors.ts (mensajes seguros)
  types/        tipos de las 7 tablas
  contexts/     AuthContext (sesión, perfil, permisos derivados)
  services/     content.ts (lectura pública) · participation.ts (comentarios/likes)
                admin.ts (profesor) · storage.ts (URLs firmadas y subida)
  hooks/        useAsync, useSignedUrl
  components/   layout · ui · posts · comments · media
  pages/        Home · Projects · Posts · Auth · Admin · NotFound
  utils/        format.ts, media.ts (+ pruebas)
  styles/       global.css
```

## Páginas

Públicas: `/` inicio, `/proyectos`, `/proyectos/:slug`, `/publicaciones`, `/publicaciones/:id`, `/etica`, `/filosofia`, `/gabinete`.
Acceso: `/iniciar-sesion`, `/registro`, `/recuperar`, `/restablecer`, `/auth/callback`.
Profesor: `/admin` (inicio), `/admin/proyectos`, `/admin/publicaciones[/nueva|/:id]`, `/admin/categorias`, `/admin/comentarios`, `/admin/usuarios`.

El diseño sigue la guía visual adjunta (paleta `#003366 / #0F4C81 / #EBF1F8 / #D4A72C / #1F2937`, cabecera azul, héroe, tarjetas, panel lateral). El **héroe usa un degradado** porque no se dispone de las fotografías de la maqueta; se mostrará la portada del proyecto cuando exista.

## Integración con Supabase

- **Lectura pública:** filtra por `status = 'published'` en la consulta; las políticas RLS lo imponen de nuevo en el servidor.
- **Autenticación:** `signUp` envía solo `display_name` como metadato. El rol **nunca** se envía: lo fija el disparador `handle_new_user`. No se inserta perfil manualmente.
- **Confirmación de correo:** se implementó el flujo por **enlace** (`emailRedirectTo → /auth/callback`), el predeterminado de Supabase. Si tu proyecto usa código OTP, hay que cambiarlo por `verifyOtp`; **no se mezclaron ambos**.
- **Permisos en la interfaz** (`AuthContext`): `canParticipate` = correo confirmado + perfil `active`; `isTeacher` = además `role = 'teacher'`. Un error al consultar el perfil **no** concede nada. Son comodidades de UI: la autoridad es RLS.
- **Escrituras:** actualizaciones y borrados piden `.select()` para detectar el caso «RLS filtró la fila sin error» y mostrar un mensaje claro.
- **Estado de proyectos:** al pasar un proyecto a borrador, sus publicaciones que no estén ya en borrador también se pasan a borrador para que no queden publicadas sin contexto.
- **Reacciones:** sin interfaz optimista; el estado cambia solo cuando el servidor confirma. El conflicto de unicidad (`23505`) se trata como «ya estaba».
- **Comentarios:** solo `visible` en vistas públicas; 1–2000 caracteres con contador; borrar un comentario propio lo marca `deleted`. El contenido se renderiza como texto (sin `dangerouslySetInnerHTML`).
- **Moderación y suspensión:** el profesor solo alterna `active ↔ suspended`; no puede tocar `role`, ni su propia cuenta, ni activar perfiles `pending` (eso lo hace el disparador al confirmar el correo).

## Archivos (bucket privado `gabinete-media`)

Solo URLs firmadas (1 h, caché en memoria y renovación automática; se vuelve a firmar si el navegador falla al cargar). `storage_path` es una ruta, no una URL. Convención de rutas: `<UUID_PUBLICACION>/<archivo>` y `<UUID_PROYECTO>/portada-<archivo>`. La subida usa XHR para mostrar progreso real. Validación en cliente: JPG/PNG/WEBP/GIF, MP4/WEBM, PDF, DOCX/PPTX/XLSX, máx. 50 MB (el servidor sigue siendo la autoridad). Las URLs firmadas son temporales y no garantizan revocación inmediata. Los enlaces externos solo admiten `http(s)`; YouTube/Vimeo se incrustan en `iframe` con `sandbox`.

## Suposiciones que debes verificar (no se pudieron comprobar)

1. **`categories`**: sus columnas no estaban descritas; se asume `id` y `name`. Las áreas Ética/Filosofía localizan la categoría por nombre (sin acentos).
2. **`post_media.media_type`**: se escribe `image`, `video`, `document` o `link`. Si existe una restricción CHECK con otros valores, la subida fallará con «datos no válidos»: ajusta `ALLOWED_UPLOAD_TYPES`/`classifyMedia`.
3. **`posts.id`** se genera en el cliente (UUID) para subir archivos con la carpeta correcta; requiere que la política permita insertar con `id` explícito.
4. **Borrado de comentario propio:** se intenta `update status='deleted'`. Si las políticas solo permiten `delete`, hay que cambiarlo en `deleteOwnComment`.
5. **Nombres de autores:** se leen de `profiles`; si RLS no permite leer perfiles ajenos, se muestra «Miembro de la comunidad».
6. **Conteo de «Me gusta»/comentarios** en tarjetas usa agregados embebidos (`reactions(count)`); requiere las claves foráneas `post_id`. Si no son legibles, el conteo no se muestra.
7. **Supabase Auth → URL Configuration:** añade `http://localhost:5173/**` y tu dominio de Vercel (`/auth/callback`, `/restablecer`) a *Redirect URLs*. Verifica en el panel que la confirmación de correo y las plantillas estén activas.

Si alguna suposición falla por una política o restricción, la solución debe ser el cambio mínimo en el código o una migración **que tú autorices**; no se modificó RLS.

## Pruebas realizadas y pendientes

**Realizadas (limitadas):**
- Comprobación de tipos parcial con el TypeScript global y declaraciones provisionales para los paquetes ausentes: **sin errores propios** (identificadores, propiedades, variables sin uso). No valida el uso de las APIs reales de React/Router/Supabase.
- Verificación ad hoc con `tsx` de 15 aserciones sobre utilidades puras (slugs, validación de archivos, enlaces, clasificación de multimedia).

**NO realizadas:** `npm install`, `tsc` real, `vite build`, Vitest (el archivo `src/utils/format.test.ts` existe pero no se ejecutó), ejecución en navegador, revisión responsive visual y **todos** los escenarios funcionales contra Supabase (visitante, pendiente, activo, suspendido, profesor, borradores, subida/visualización de archivos, cierre de sesión, correo de confirmación).

**Lista reproducible para validar tras configurar `.env`:**
1. Visitante: abre `/`, una publicación publicada, y comprueba que «Me gusta»/comentar piden iniciar sesión.
2. Registra una cuenta → recibes correo → antes de confirmar, comprueba el aviso «pendiente» y que no puede participar.
3. Confirma el correo → perfil `active` → comenta, da y quita «Me gusta».
4. Suspende esa cuenta desde `/admin/usuarios` → comprueba que comentar/reaccionar falla con mensaje claro.
5. Con una cuenta miembro abre `/admin` → «Acceso restringido».
6. Como profesor: crea categorías «Ética» y «Filosofía», un proyecto con portada, una publicación como borrador; verifica que **no** aparece en modo visitante; publícala y adjunta imagen, PDF y enlace.
7. Cierra sesión y confirma que desaparecen las acciones autenticadas.
8. Prueba en móvil (≤ 780 px) y escritorio.

## Problemas conocidos / pendientes

- Sin inicio con Google (aparece en la maqueta; requiere configurar el proveedor en Supabase). Sin casilla «Recordarme»: la sesión ya persiste por defecto.
- Sin perfil/avatar de usuario ni paginación (las listas cargan hasta 60 publicaciones / 200 comentarios).
- Texto de publicaciones en texto plano (sin editor enriquecido).
- No se configuró ESLint; no hay pruebas de integración ni E2E.
- Las fotos del diseño no se incluyeron (no estaban disponibles como archivos).

## Despliegue en Vercel

1. Sube el repositorio a GitHub e impórtalo en Vercel (preset **Vite**; build `npm run build`, salida `dist`).
2. Define `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en *Environment Variables*.
3. `vercel.json` ya redirige todas las rutas a `index.html` (SPA).
4. Añade la URL de producción a *Redirect URLs* y *Site URL* en Supabase Auth.
