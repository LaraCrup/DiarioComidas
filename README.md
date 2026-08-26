# Diario de comidas

Registro descriptivo de comidas. Nuxt 4 + Supabase (Auth, Postgres con RLS, Storage privado).
Multiusuario desde el modelo de datos: cada fila y cada foto pertenecen a un usuario y la base
es la que lo hace cumplir, no el frontend.

---

## Puesta en marcha, desde cero

### 0. Node

Nuxt 4.4 pide **Node ≥ 22.18** (o ≥ 24.11). Con 22.14 anda igual pero tira un warning
`EBADENGINE` en cada install. Si tenés nvm: `nvm install 22 && nvm use 22`.

### 1. Instalar

```bash
cd diario-comidas
npm install --legacy-peer-deps
```

> El `--legacy-peer-deps` no es opcional: npm 10.9.2 tiene un bug (`Cannot read properties of
> null (reading 'edgesOut')`) resolviendo los peers opcionales de Nuxt 4. Con npm ≥ 11 o pnpm
> podés instalar normal.

### 2. Crear el proyecto en Supabase

[supabase.com/dashboard](https://supabase.com/dashboard) → **New project**. Anotá la contraseña
de la base; no la vas a necesitar para la app, pero sí si algún día entrás por psql.

### 3. Correr la migración — ✅ ya está hecho

Ya corrió sobre el proyecto de Supabase. Quedaron las
4 policies de `meals`, las 4 del bucket, el índice, el trigger y el bucket privado; los
advisors de seguridad y performance de Supabase dan cero avisos.

Si algún día lo levantás de nuevo desde cero: Dashboard → **SQL Editor** → **New query** → pegá entero
[`supabase/migrations/20260826120000_init.sql`](supabase/migrations/20260826120000_init.sql) → **Run**.

Crea la tabla `meals`, el enum de categorías, el índice, el trigger de `updated_at`, las 4
policies de RLS, el bucket privado `meal-photos` y sus 4 policies. Es idempotente: si lo corrés
dos veces no rompe nada.

Verificá que quedó bien:

```sql
select tablename, policyname, cmd from pg_policies
 where (schemaname, tablename) in (('public','meals'), ('storage','objects'))
 order by tablename, cmd;
-- Tienen que aparecer 4 policies en meals y 4 en objects.

select id, public from storage.buckets where id = 'meal-photos';
-- public tiene que ser false.
```

### 4. Configurar Auth — ⚠️ esto sí lo tenés que hacer vos

No se puede tocar por API, es la única cosa que queda pendiente.

Dashboard → **Authentication**:

| Dónde | Qué | Por qué |
|---|---|---|
| **Sign In / Providers → Email** | **Confirm email: OFF** | Con esto en ON (el default), te registrás y no podés entrar hasta clickear el mail. Si vas a usar la app hoy, apagalo. |
| **URL Configuration → Site URL** | `http://localhost:3000` mientras desarrollás, tu dominio cuando deployes | Es la base de los links que manda Supabase por mail. |
| **URL Configuration → Redirect URLs** | `http://localhost:3000/**` y `https://TU-DOMINIO/**` | Sin esto, el link de "olvidé mi contraseña" rebota. |
| **Sign In / Providers → Email → Allow new users to sign up** | Apagalo **después** de crear tus cuentas | Es una app personal. Con el registro abierto, cualquiera con la URL se hace una cuenta. |

### 5. Variables de entorno — ✅ ya está hecho

El `.env` ya está escrito con la URL y la publishable key del proyecto. Si necesitás rehacerlo,
`cp .env.example .env` y completá con Dashboard → **Project Settings**:

| Variable | Dónde sale |
|---|---|
| `SUPABASE_URL` | Data API → Project URL |
| `SUPABASE_KEY` | API Keys → `anon` / `publishable` |

`SUPABASE_KEY` es pública, viaja al browser. Está bien: lo que protege los datos es RLS, no
esconder la clave. **Nunca** pongas ahí la `service_role`.

### 6. Levantar

```bash
npm run dev     # http://localhost:3000
```

### 7. Crear el primer usuario

La base está vacía: cero usuarios, cero comidas, cero fotos. Andá a
`http://localhost:3000/registro`, poné tu mail y una contraseña de 8+ caracteres. Con
"Confirm email" apagado (paso 4) entrás derecho al diario.

(Alternativa desde el dashboard: **Authentication → Users → Add user → Create new user**, con
*Auto Confirm User* tildado.)

### 8. Verificar que el aislamiento funciona

Creá una **segunda** cuenta de prueba (`test@loquesea.com`) y corré:

```bash
./scripts/verificar-aislamiento.sh tu@mail.com TU_PASS test@loquesea.com PASS_TEST
```

Ya corrió contra este proyecto: **11 OK, 0 fallas**. El script no usa la app: pega directo
contra la API de Supabase con el token de cada usuario,
que es exactamente lo que haría alguien manipulando los requests a mano. Chequea que A no pueda
leer, insertar a nombre de, editar ni borrar filas de B; que no pueda apuntar una fila suya a
una foto de B; que no pueda subir a la carpeta de B ni firmar una URL de una foto de B; y que
el bucket no responda sin firma. Limpia lo que creó y termina con `RESULTADO: 11 OK, 0 fallas`.

Si querés la prueba equivalente en SQL, en el SQL Editor:

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims to '{"sub":"UUID_DE_A","role":"authenticated"}';
  select count(*) from public.meals;                          -- solo las de A
  select count(*) from public.meals where user_id = 'UUID_DE_B';  -- 0
  insert into public.meals (user_id, category, description)
    values ('UUID_DE_B', 'cena', 'robada');                   -- ERROR: violates RLS policy
rollback;
```

---

## Deploy

El endpoint del PDF necesita runtime de Node (no edge) y un timeout holgado: con 60 fotos el
request tarda entre 5 y 20 segundos según la conexión con Storage.

### Vercel (lo más rápido)

```bash
npm i -g vercel
vercel            # detecta Nuxt solo
vercel env add SUPABASE_URL
vercel env add SUPABASE_KEY
vercel --prod
```

`nuxt.config.ts` ya trae `nitro.vercel.functions.maxDuration = 60`. Sin eso, Vercel corta el
export a los 10 segundos.

### Cualquier host con Node (Fly, Render, Railway, un VPS)

```bash
npm run build
SUPABASE_URL=... SUPABASE_KEY=... node .output/server/index.mjs
```

Escucha en `PORT` (3000 por defecto). No hay estado en disco: escala y reinicia sin problema.

### Después de deployar

1. Supabase → Authentication → URL Configuration: poné el dominio real en **Site URL** y agregá
   `https://TU-DOMINIO/**` a **Redirect URLs**.
2. En el iPhone: abrí la URL en Safari → Compartir → **Agregar a pantalla de inicio**. Queda con
   ícono propio, a pantalla completa, y la sesión dura 30 días.

---

## Cómo está armado

```
app/
  pages/
    index.vue              lista agrupada por día, día más reciente arriba
    nueva.vue              alta
    comida/[id].vue        edición y borrado
    exportar.vue           rango de fechas -> PDF
    login.vue registro.vue olvide.vue reset.vue confirm.vue
  components/
    MealForm.vue           el formulario, compartido entre alta y edición
    MealCard.vue           una comida en la lista
    CategoryPicker.vue     las 5 categorías
    PhotoField.vue         cámara + preview
    AppHeader.vue
  composables/useMeals.ts  todo el acceso a datos (CRUD + Storage + signed URLs)
  utils/image.ts           compresión con canvas
  utils/authErrors.ts      mensajes de Supabase traducidos
shared/                    código que usan app y servidor (Nuxt 4 lo comparte solo)
  types/database.ts        tipos de la tabla
  utils/categories.ts      categorías y la sugerencia por horario
  utils/dates.ts           todo lo de fechas y zonas horarias
server/
  api/export.get.ts        genera el PDF, autenticado del lado del servidor
  utils/pdf.ts             armado del PDF con pdf-lib
  utils/pool.ts            descargas de fotos con concurrencia acotada
supabase/migrations/       el SQL
scripts/                   verificación de aislamiento
```

### Las decisiones que condicionan el resto

**Auth: email + contraseña.** El magic link te obliga a salir de la app y abrir el mail cada vez
que caduca la sesión. Con contraseña, el llavero del teléfono autocompleta y entrás de una.
La cookie de sesión dura 30 días (el default del módulo son 8 horas, o sea loguearte todos los
días durante el tratamiento).

**El PDF se arma en el servidor, con `pdf-lib`.** Es JS puro, ~450 KB, sin Chromium ni binarios
nativos, así que deploya en cualquier lado. Las fotos van de Storage al PDF como bytes, sin
decodificarse: el celular nunca tiene 60 imágenes en memoria. Medido con 65 registros y 60 fotos:
**12 páginas, 3,6 MB, 36 ms** de armado. Medido end to end contra el Supabase real (São Paulo),
con 12 comidas y 12 fotos bajadas del bucket privado: **1,4 s** de punta a punta. Puppeteer no
entra en serverless y jsPDF en el cliente se cuelga con ese volumen.

**Las fotos se comprimen en el browser con canvas**, sin librerías: `createImageBitmap` con
`imageOrientation: 'from-image'` (sin eso las fotos verticales del iPhone se suben acostadas),
resize a 1280 px y JPEG q0.7. Una foto de 4 MB queda en ~200 KB, que con 4G lento es la
diferencia entre subir en 1 segundo o en 20.

### Detalles no obvios

**Zona horaria.** `eaten_at` es `timestamptz`, un instante absoluto. Agrupar por día con
`date(eaten_at)` en SQL agrupa en **UTC**, y una cena de las 22:00 en Argentina caería al día
siguiente. Por eso el día se calcula siempre en la zona del usuario: en el browser con la local,
y en el PDF con la `tz` que el browser manda en el request. Los límites del rango de exportación
también se calculan en hora local y viajan como instantes ISO.

**El `user_id` nunca sale del cliente.** La columna tiene `default auth.uid()` y la app
directamente no lo manda. Si alguien lo mandara igual, el `with check` de la policy lo rechaza.
El endpoint del PDF saca el usuario de la cookie con `serverSupabaseUser` y consulta con el
cliente RLS de *ese* usuario, así que la query y las descargas de fotos pasan por las mismas
policies que desde el browser.

**El `photo_path` también está atado al dueño.** El `with check` de INSERT y UPDATE exige que
empiece con `<auth.uid()>/`. Aunque alguien conociera el path de la foto de otro, no puede
apuntar una fila suya ahí.

**Las URLs de las fotos duran 5 minutos.** El bucket es privado: no existe una URL permanente
que se pueda filtrar. Las miniaturas de la lista se firman todas en una sola llamada
(`createSignedUrls` en batch), no una por foto.

**Acentos y emojis en el PDF.** Helvetica en pdf-lib usa WinAnsi: las tildes y la ñ entran, pero
un emoji en una nota hacía explotar `drawText` y se caía el export entero. `clean()` en
`server/utils/pdf.ts` normaliza comillas tipográficas y descarta lo que no sea codificable.

**Los tipos de la base van como `type`, no como `interface`.** supabase-js pide que cada `Row`
sea asignable a `Record<string, unknown>`, y TypeScript solo le da index signature implícita a
los type alias. Con `interface`, el cliente degrada a `never` y todos los `.insert()` dejan de
tipar sin decir por qué.

---

## Comandos

```bash
npm run dev          # desarrollo
npm run build        # build de producción a .output/
npm run preview      # servir el build
npm run typecheck    # vue-tsc
```

`typecheck` escupe un `Resolve plugin path failed: vue-router/volar/sfc-route-blocks`. Es un
desajuste entre el tsconfig que genera Nuxt y el mapa de exports de vue-router; no afecta el
resultado (termina en 0 y sin errores de tipos).

---

## Cosas que no tiene, a propósito

Sin calorías, macros, puntajes ni comidas "buenas" o "malas". Sin gráficos, rachas,
notificaciones ni recordatorios. Es un diario descriptivo: el análisis lo hace la nutricionista.

Dos cosas que sí sumarían y no implementé: (1) un *service worker* mínimo para que la carga
funcione sin señal y sincronice después — en un restaurante con el sótano sin datos es un caso
real; (2) que la nutricionista pueda ver el diario en vivo con un link de solo lectura, en vez
de que le mandes un PDF por mail.
