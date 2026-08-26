# Diario de comidas

App web para anotar qué se come, cuándo, con una foto y una nota. Nada más: no cuenta calorías,
no calcula macros, no puntúa nada ni clasifica la comida en buena o mala. Es un registro
descriptivo — el análisis lo hace una persona, no la app.

Está pensada para usarse desde el celular, con una mano, parada en la cocina o en un
restaurante: cargar una comida lleva menos de 30 segundos. Y para exportar un rango de fechas a
un PDF legible, con las fotos incluidas, que se pueda imprimir o mandar por mail.

Multiusuario y de registro abierto: cada persona se hace su cuenta y ve únicamente lo suyo.

---

## Qué hace

- **Registro de comidas.** Categoría (desayuno, almuerzo, merienda, cena, snack), qué comiste en
  texto libre, foto opcional y nota opcional. La fecha y la hora se capturan solas al crear el
  registro, pero se pueden editar si cargás algo más tarde.
- **Vista principal** agrupada por día, el más reciente arriba, con la foto en miniatura.
- **Alta en el mínimo de pasos.** La categoría viene sugerida según la hora; la nota y la fecha
  arrancan plegadas; el botón de guardar queda fijo en la zona del pulgar.
- **Edición y borrado** de cualquier registro ya cargado.
- **Foto desde la cámara**, comprimida en el navegador antes de subir para que no tarde con mala
  conexión.
- **Export a PDF** de un rango de fechas, agrupado por día, con las fotos embebidas.

## Aislamiento entre usuarios

Lo hace cumplir la base de datos, no el frontend.

- RLS en la tabla `meals` con policies por `auth.uid()`, y policies equivalentes en el bucket de
  Storage, que es privado.
- El `user_id` nunca sale del cliente: la columna tiene `default auth.uid()` y la app
  directamente no lo manda. Si alguien lo mandara igual, el `with check` de la policy lo rechaza.
- El `photo_path` está atado al dueño: tiene que empezar con `<auth.uid()>/`. Aunque alguien
  conociera el path de la foto de otro, no puede apuntar una fila suya ahí.
- Las fotos se ven con URLs firmadas de 5 minutos. Al ser privado el bucket, no existe una URL
  permanente que se pueda filtrar.
- El endpoint del PDF saca el usuario de la cookie del lado del servidor y consulta con el
  cliente RLS de *ese* usuario: la query y las descargas de fotos pasan por las mismas policies
  que desde el browser.

`scripts/verificar-aislamiento.sh` prueba todo eso contra la API real, sin pasar por la app, que
es lo que haría alguien manipulando los requests a mano: que A no pueda leer, insertar a nombre
de, editar ni borrar filas de B, ni subir a su carpeta, ni firmar una URL de sus fotos.

## Stack

Nuxt 4 con TypeScript, Tailwind 4, Supabase (Auth, Postgres, Storage) y `pdf-lib`. Sin más
dependencias.

## Las decisiones que condicionan el resto

**Auth con email y contraseña.** El magic link obliga a salir de la app y abrir el mail cada vez
que caduca la sesión. Con contraseña, el llavero del teléfono autocompleta y entrás de una.

**El PDF se arma en el servidor.** `pdf-lib` es JS puro, sin Chromium ni binarios nativos, así
que deploya en cualquier lado. Las fotos van de Storage al PDF como bytes, sin decodificarse: el
celular nunca tiene 60 imágenes en memoria. Medido con 65 registros y 60 fotos: 12 páginas,
3,6 MB, 36 ms de armado. Puppeteer no entra en serverless y armarlo en el cliente se cuelga con
ese volumen.

**Las fotos se comprimen en el navegador con canvas**, sin librerías: `createImageBitmap` con
`imageOrientation: 'from-image'` (sin eso, las fotos verticales del iPhone se suben acostadas),
resize a 1280 px y JPEG q0.7. Una foto de 4 MB queda en ~200 KB.

**El día se agrupa siempre en hora local.** `eaten_at` es `timestamptz`, un instante absoluto:
agrupar con `date(eaten_at)` en SQL agrupa en UTC, y una cena de las 22:00 en Argentina caería
al día siguiente. En el browser se usa la zona local; el PDF recibe la zona en el request.

**Los tipos de la base van como `type`, no como `interface`.** supabase-js pide que cada `Row`
sea asignable a `Record<string, unknown>`, y TypeScript solo le da index signature implícita a
los type alias. Con `interface`, el cliente degrada a `never` y todos los `.insert()` dejan de
tipar sin decir por qué.

## Estructura

```
app/
  pages/           index, nueva, comida/[id], exportar + las de auth
  components/      MealForm, MealCard, CategoryPicker, PhotoField, AppHeader
  composables/     useMeals: CRUD, Storage y URLs firmadas
  utils/           compresión de imágenes, mensajes de error
shared/            código que comparten app y servidor: tipos, categorías, fechas
server/
  api/export.get.ts    genera el PDF, autenticado del lado del servidor
  utils/pdf.ts         armado con pdf-lib
supabase/migrations/   el esquema: tabla, índice, trigger, RLS y bucket
scripts/               verificación de aislamiento
```

## Correrlo

Necesita Node ≥ 22.18 y un proyecto de Supabase.

```bash
npm install --legacy-peer-deps
cp .env.example .env        # completar con la URL y la anon/publishable key
npm run dev
```

El esquema se crea corriendo `supabase/migrations/20260826120000_init.sql` entero en el SQL
Editor del dashboard. Después, en Authentication, hay que habilitar el registro por email,
prender la confirmación de email y agregar la URL de la app a Redirect URLs.

> El `--legacy-peer-deps` no es capricho: npm 10.9.2 tiene un bug resolviendo los peers
> opcionales de Nuxt 4 y crashea con `Cannot read properties of null (reading 'edgesOut')`. Con
> npm ≥ 11 o pnpm se instala normal.

Para producción, el endpoint del PDF necesita runtime de Node (no edge) y un timeout holgado:
con muchas fotos el request puede tardar entre 5 y 20 segundos. `nuxt.config.ts` ya trae
`maxDuration: 60` para Vercel.

## Qué no hace, a propósito

Sin conteo de calorías, macros, puntajes ni clasificación de comidas. Sin gráficos, rachas,
notificaciones, gamificación ni recordatorios.
