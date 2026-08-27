# Diario de comidas

App web para anotar qué se come, cuándo, con una foto y una nota, y los entrenamientos que
hacés en el medio. Nada más: no cuenta calorías,
no calcula macros, no puntúa nada ni clasifica la comida en buena o mala. Es un registro
descriptivo — el análisis lo hace una persona, no la app.

Está pensada para usarse desde el celular, con una mano, parada en la cocina o en un
restaurante: cargar una comida lleva menos de 30 segundos. Y para exportar un rango de fechas a
un PDF legible, con las fotos incluidas, que se pueda imprimir o mandar por mail.

Multiusuario y de registro abierto: cada persona se hace su cuenta con nombre, apellido, email y
contraseña, y ve únicamente lo suyo.

---

## Qué hace

- **Registro de comidas.** Categoría (desayuno, almuerzo, merienda, cena, snack o postre), qué
  comiste en texto libre, foto opcional y nota opcional. La fecha y la hora se capturan solas al
  crear el registro, pero se pueden editar si cargás algo más tarde.
- **Registro de entrenamientos.** Gimnasio, correr o kinesiología, con fecha, hora y nota
  opcional.
- **Vista principal** agrupada por día, el más reciente arriba, con la foto en miniatura. Las
  comidas y los entrenamientos van en la misma línea de tiempo, pero se distinguen de un vistazo.
- **Mi perfil.** Ver y editar nombre y apellido, cambiar la contraseña y cerrar sesión.
- **Alta en el mínimo de pasos.** La categoría viene sugerida según la hora; la nota y la fecha
  arrancan plegadas; el botón de guardar queda fijo en la zona del pulgar.
- **Edición y borrado** de cualquier registro ya cargado.
- **Foto desde la galería o sacada en el momento**, comprimida en el navegador antes de subir
  para que no tarde con mala conexión.
- **Export a PDF** de un rango de fechas, agrupado por día, con las fotos embebidas y a nombre de
  la persona.
- **Se instala como app.** Es una PWA: desde el teléfono se agrega a la pantalla de inicio y abre
  a pantalla completa, sin barra de navegador.

## Aislamiento entre usuarios

Lo hace cumplir la base de datos, no el frontend.

- RLS en las tablas `meals` y `workouts` con policies por `auth.uid()`, y policies equivalentes
  en el bucket de Storage, que es privado.
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
de, editar ni borrar filas de B — ni en `meals` ni en `workouts` — ni subir a su carpeta, ni
firmar una URL de sus fotos.

## Stack

Nuxt 4 con TypeScript, Tailwind 4, Supabase (Auth, Postgres, Storage) y `pdf-lib`. Sin más
dependencias.

## Las decisiones que condicionan el resto

**Los entrenamientos van en su propia tabla, no en una columna `tipo` de `meals`.** Una comida
tiene descripción obligatoria y foto; un entrenamiento no tiene ninguna de las dos. Meterlos en
la misma tabla obliga a que la mitad de las columnas sean nulas y a que cada consulta filtre por
tipo. Separadas, cada una tiene sus propias constraints y el listado del día las mezcla en el
cliente, que es donde ese orden hace falta.

**El verde de los entrenamientos es el único color de la app además del rojo de error.** En el
listado de un día hay que poder saltear los entrenamientos cuando estás leyendo lo que comiste,
y al revés. Con una diferencia solo de forma (sin foto, con ícono) hay que frenarse a leer cada
tarjeta; con el fondo verde se resuelve de un vistazo.

**El nombre y el apellido van en el `user_metadata` de Auth, no en una tabla propia.** Se piden
en el alta, se escriben una sola vez y viajan en el JWT: los lee el browser y también el endpoint
del PDF, sin una consulta extra ni una tabla más con su propio RLS. Es un dato de presentación —
el aislamiento sigue colgando de `auth.uid()`, así que no importa que la persona pueda
cambiárselo. Las cuentas creadas antes de este cambio no tienen el dato y caen al email.

**El service worker no cachea ni una pantalla con datos.** Es lo que la hace instalable, pero un
caché es un archivo que queda en el teléfono después de cerrar sesión, y acá son datos de salud.
Solo guarda los assets del build (llevan hash en el nombre), los iconos y la página de sin
conexión. El HTML de las pantallas, `/api/*` y todo lo que va a Supabase pasan siempre por la red.
Por eso tampoco funciona offline: los registros viven en el servidor, así que sin internet la app
muestra "sin conexión" en vez de un cascarón vacío. Está escrito a mano, sin Workbox, justamente
para poder decir en diez líneas qué se guarda y qué no.

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
  pages/           index, nueva, comida/[id], entrenamiento/*, exportar, perfil + las de auth
  components/      MealForm/MealCard/CategoryPicker, WorkoutForm/WorkoutCard/KindPicker,
                   PhotoField, AppHeader
  composables/     useMeals: CRUD, Storage y URLs firmadas · useWorkouts: CRUD
                   useProfile: nombre de la sesión
  plugins/         pwa.client: registra el service worker
  utils/           compresión de imágenes, mensajes de error
shared/            código que comparten app y servidor: tipos, categorías, fechas, nombres
public/            manifest, service worker, página de sin conexión e iconos
server/
  api/export.get.ts    genera el PDF, autenticado del lado del servidor
  utils/pdf.ts         armado con pdf-lib
supabase/migrations/   el esquema: tablas, índices, triggers, RLS y bucket
scripts/               verificación de aislamiento
```

## Correrlo

Necesita Node ≥ 22.18 y un proyecto de Supabase.

```bash
npm install --legacy-peer-deps
cp .env.example .env        # completar con la URL y la anon/publishable key
npm run dev
```

El esquema se crea corriendo los archivos de `supabase/migrations/` **en orden** en el SQL Editor
del dashboard: primero `20260826120000_init.sql` entero, después cada migración posterior. Todos
son idempotentes, así que volver a correrlos no rompe nada. Después, en Authentication, hay que
habilitar el registro por email, prender la confirmación de email y agregar la URL de la app a
Redirect URLs.

> El `--legacy-peer-deps` no es capricho: npm 10.9.2 tiene un bug resolviendo los peers
> opcionales de Nuxt 4 y crashea con `Cannot read properties of null (reading 'edgesOut')`. Con
> npm ≥ 11 o pnpm se instala normal.

Para producción, el endpoint del PDF necesita runtime de Node (no edge) y un timeout holgado:
con muchas fotos el request puede tardar entre 5 y 20 segundos. `nuxt.config.ts` ya trae
`maxDuration: 60` para Vercel.

## Los iconos

Para cambiarlos alcanza con pisar los archivos con el mismo nombre: el manifest y el `<head>` ya
apuntan a todos. Esto es lo que espera cada uno:

| Archivo | Tamaño | Notas |
|---|---|---|
| `icon-192.png` | 192×192 | El que usa Android en la pantalla de inicio |
| `icon-512.png` | 512×512 | Splash de Android y tiendas de PWA |
| `icon-maskable-512.png` | 512×512 | El dibujo tiene que entrar en el 80% central: Android lo recorta en círculo, gota o cuadrado según el launcher |
| `apple-touch-icon.png` | 180×180 | iOS ignora el manifest y usa solo este. Sin transparencia y sin esquinas redondeadas: las redondea el sistema |
| `favicon.ico` | 16×16 y 32×32 | La pestaña del navegador. Lleva los dos tamaños adentro del mismo `.ico` |
| `icon.svg` | vectorial | Favicon en alta resolución y archivo maestro |

Todos van sin transparencia: si el PNG tiene alfa, iOS lo rellena de negro. Y todos tienen que
ser exactamente cuadrados — si el archivo mide 513×512 y el manifest declara `512x512`, Chrome
puede descartar el icono y dejar de ofrecer la instalación.

El service worker solo se registra en producción (`npm run build && npm run preview`); en dev
está apagado para que no tape los cambios. Para probar la instalación hace falta HTTPS, salvo en
`localhost`, que está exceptuado.

## Qué no hace, a propósito

Sin conteo de calorías, macros, puntajes ni clasificación de comidas. Sin gráficos, rachas,
notificaciones, gamificación ni recordatorios. Tampoco carga offline: guardar una comida sin
conexión pide una cola local y una sincronización con resolución de conflictos, que es una
feature entera y no un detalle del service worker.
