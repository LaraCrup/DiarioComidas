# Diario de comidas

Registro descriptivo de comidas para llevarle a tu nutricionista. Nuxt 4 + Supabase (Auth,
Postgres con RLS, Storage privado).

**El registro es abierto**: cualquiera con el link se hace su cuenta. El aislamiento entre
usuarios lo hace cumplir la base, no el frontend — cada fila y cada foto pertenecen a un
usuario, y las policies de RLS y del bucket están escritas de manera que un usuario logueado
no pueda leer ni la fila ni la foto de otro ni manipulando la request a mano. Hay un script
que lo prueba: [paso 8](#8-verificar-que-el-aislamiento-funciona).

Sin calorías, macros, puntajes ni comidas buenas o malas. Es un diario, no una app de dieta.

---

## Puesta en marcha, desde cero

### 0. Node

Nuxt 4.4 pide **Node ≥ 22.18** (o ≥ 24.11). Con 22.14 anda igual pero tira un warning
`EBADENGINE` en cada install. Si tenés nvm: `nvm install 22 && nvm use 22`.

### 1. Instalar

```bash
git clone https://github.com/LaraCrup/DiarioComidas.git
cd DiarioComidas
npm install --legacy-peer-deps
```

> El `--legacy-peer-deps` no es opcional: npm 10.9.2 tiene un bug (`Cannot read properties of
> null (reading 'edgesOut')`) resolviendo los peers opcionales de Nuxt 4. Con npm ≥ 11 o pnpm
> podés instalar normal.

### 2. Crear el proyecto en Supabase

[supabase.com/dashboard](https://supabase.com/dashboard) → **New project**. Anotá la contraseña
de la base; no la vas a necesitar para la app, pero sí si algún día entrás por psql.

### 3. Correr la migración

Dashboard → **SQL Editor** → **New query** → pegá entero
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

### 4. Configurar Auth — ⚠️ esto lo tenés que hacer a mano

No se puede tocar por API. Dashboard → **Authentication**:

| Dónde | Qué | Por qué |
|---|---|---|
| **Sign In / Providers → Email → Allow new users to sign up** | **ON** | El registro es abierto: cualquiera con la URL se hace su cuenta y ve solo lo suyo. |
| **Sign In / Providers → Email → Confirm email** | **ON** | Con registro abierto tiene que estar prendido: si no, alguien se anota con un mail que no es suyo, y el día que se olvide la contraseña el link de recuperación le llega a otra persona. Requiere SMTP propio, ver abajo. |
| **URL Configuration → Site URL** | tu dominio (o `http://localhost:3000` mientras desarrollás) | Es la base de los links que salen por mail. |
| **URL Configuration → Redirect URLs** | `https://TU-DOMINIO/**` y `http://localhost:3000/**` | Sin esto, el link de "olvidé mi contraseña" rebota. |

#### SMTP: obligatorio si el registro es abierto

El SMTP que trae Supabase manda **2 mails por hora** y solo a direcciones del equipo del
proyecto. Con registro abierto eso significa que la tercera persona que se anote en una hora
no recibe nada y queda con la cuenta trabada.

Authentication → **Emails → SMTP Settings** → *Enable custom SMTP*. Cualquiera sirve;
[Resend](https://resend.com) da 3.000 mails por mes gratis y se configura en cinco minutos:

```
Host: smtp.resend.com     Port: 587
User: resend              Pass: <tu API key>
Sender: algo@tu-dominio-verificado
```

Mientras probás solo vos, podés dejar **Confirm email en OFF** y saltarte esto. Pero antes de
pasarle el link a alguien más, prendelo.

### 5. Variables de entorno

```bash
cp .env.example .env
```

Completá con Dashboard → **Project Settings**:

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

La base arranca vacía. Andá a `/registro`, poné tu mail y una contraseña de 8+ caracteres.
Con "Confirm email" apagado entrás derecho; con confirmación prendida, primero clickeás el
link que te llega por mail.

Cada persona que se registre queda completamente aislada del resto: ve sus comidas, sus fotos
y su PDF, y nada más. Eso es lo que prueba el paso 8.

(Alternativa desde el dashboard: **Authentication → Users → Add user → Create new user**, con
*Auto Confirm User* tildado.)

### 8. Verificar que el aislamiento funciona

Creá una **segunda** cuenta de prueba (`test@loquesea.com`) y corré:

```bash
./scripts/verificar-aislamiento.sh tu@mail.com TU_PASS test@loquesea.com PASS_TEST
```

El script no usa la app: pega directo contra la API de Supabase con el token de cada usuario,
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

### 9. Límites del plan free que te van a alcanzar primero

| Recurso | Free | Se traduce en |
|---|---|---|
| Storage | 1 GB | ~5.000 fotos (salen ~200 KB cada una después de comprimir) |
| Egress | 5 GB/mes | cada export de dos semanas con fotos son ~5 MB |
| Base de datos | 500 MB | las filas son texto, no te va a molestar |
| Proyecto pausado | a los 7 días sin actividad | si nadie entra una semana, hay que despausarlo a mano |

Si el registro es abierto, el que se agota primero es Storage.

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
