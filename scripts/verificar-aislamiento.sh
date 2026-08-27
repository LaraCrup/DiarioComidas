#!/usr/bin/env bash
#
# Prueba, contra el Supabase de verdad, que un usuario logueado no puede tocar
# nada de otro. No usa la app: pega directo contra la API, que es exactamente lo
# que haria alguien manipulando los requests a mano.
#
#   ./scripts/verificar-aislamiento.sh a@mail.com passA b@mail.com passB
#
# Lee SUPABASE_URL y SUPABASE_KEY del .env si existe.

set -uo pipefail

if [[ -f .env ]]; then
  set -a; source .env; set +a
fi

: "${SUPABASE_URL:?falta SUPABASE_URL}"
: "${SUPABASE_KEY:?falta SUPABASE_KEY}"

EMAIL_A="${1:?uso: $0 emailA passA emailB passB}"
PASS_A="${2:?}"
EMAIL_B="${3:?}"
PASS_B="${4:?}"

pass=0; fail=0
ok()  { printf '  \033[32mOK\033[0m   %s\n' "$1"; pass=$((pass+1)); }
bad() { printf '  \033[31mFALLA\033[0m %s\n' "$1"; fail=$((fail+1)); }
jget() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);const v=process.argv[1].split(".").reduce((a,k)=>a?.[k],j);console.log(v??"")}catch{console.log("")}})' "$1"; }
# id de la primera fila de una respuesta de PostgREST
jid() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s)[0].id)}catch{console.log("")}})'; }

login() {
  curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
    -H "apikey: $SUPABASE_KEY" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}"
}

echo "== Login =="
RA=$(login "$EMAIL_A" "$PASS_A"); TOKEN_A=$(echo "$RA" | jget access_token); UID_A=$(echo "$RA" | jget user.id)
RB=$(login "$EMAIL_B" "$PASS_B"); TOKEN_B=$(echo "$RB" | jget access_token); UID_B=$(echo "$RB" | jget user.id)
[[ -n "$TOKEN_A" ]] || { echo "No pude loguear a $EMAIL_A: $RA"; exit 1; }
[[ -n "$TOKEN_B" ]] || { echo "No pude loguear a $EMAIL_B: $RB"; exit 1; }
echo "  A = $UID_A"
echo "  B = $UID_B"

rest() { # rest <metodo> <path> <token> [body] [prefer]
  curl -s -w '\n%{http_code}' -X "$1" "$SUPABASE_URL/rest/v1/$2" \
    -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $3" \
    -H "Content-Type: application/json" -H "Prefer: ${5:-return=representation}" \
    ${4:+-d "$4"}
}
body() { echo "$1" | sed '$d'; }
code() { echo "$1" | tail -n1; }

echo
echo "== Preparo un registro de cada uno =="
R=$(rest POST meals "$TOKEN_A" '{"category":"cena","description":"[test] fila de A"}')
ID_A=$(body "$R" | jid)
R=$(rest POST meals "$TOKEN_B" '{"category":"cena","description":"[test] fila de B"}')
ID_B=$(body "$R" | jid)
[[ -n "$ID_A" && -n "$ID_B" ]] || { echo "No pude crear las filas de prueba. Respuesta: $R"; exit 1; }
echo "  comida A = $ID_A"
echo "  comida B = $ID_B"

R=$(rest POST workouts "$TOKEN_A" '{"kind":"gimnasio","note":"[test] entreno de A"}')
WID_A=$(body "$R" | jid)
R=$(rest POST workouts "$TOKEN_B" '{"kind":"correr","note":"[test] entreno de B"}')
WID_B=$(body "$R" | jid)
[[ -n "$WID_A" && -n "$WID_B" ]] || { echo "No pude crear los entrenamientos de prueba. Respuesta: $R"; exit 1; }
echo "  entreno A = $WID_A"
echo "  entreno B = $WID_B"

echo
echo "== Tabla meals =="

R=$(rest GET "meals?id=eq.$ID_B&select=id" "$TOKEN_A")
[[ "$(body "$R")" == "[]" ]] && ok "A no puede LEER la fila de B" || bad "A leyo la fila de B -> $(body "$R")"

R=$(rest GET "meals?select=user_id" "$TOKEN_A")
if body "$R" | grep -q "$UID_B"; then bad "el listado de A trae filas de B"; else ok "el listado de A solo trae filas de A"; fi

R=$(rest POST meals "$TOKEN_A" "{\"user_id\":\"$UID_B\",\"category\":\"cena\",\"description\":\"[test] robada\"}")
if [[ "$(code "$R")" == "4"* ]]; then ok "A no puede INSERTAR una fila a nombre de B (HTTP $(code "$R"))"
else bad "A inserto una fila a nombre de B (HTTP $(code "$R")) -> $(body "$R")"; fi

R=$(rest PATCH "meals?id=eq.$ID_B" "$TOKEN_A" '{"description":"[test] pisada"}')
[[ "$(body "$R")" == "[]" ]] && ok "A no puede EDITAR la fila de B" || bad "A edito la fila de B -> $(body "$R")"

R=$(rest DELETE "meals?id=eq.$ID_B" "$TOKEN_A")
[[ "$(body "$R")" == "[]" ]] && ok "A no puede BORRAR la fila de B" || bad "A borro la fila de B -> $(body "$R")"

R=$(rest PATCH "meals?id=eq.$ID_A" "$TOKEN_A" "{\"user_id\":\"$UID_B\"}")
OWNER=$(body "$R" | jget 0.user_id)
[[ "$OWNER" != "$UID_B" ]] && ok "A no puede REGALARLE su fila a B" || bad "A le cambio el dueño a su fila"

R=$(rest POST meals "$TOKEN_A" "{\"category\":\"cena\",\"description\":\"[test] path ajeno\",\"photo_path\":\"$UID_B/robada.jpg\"}")
if [[ "$(code "$R")" == "4"* ]]; then ok "A no puede apuntar una fila suya a una foto de B (HTTP $(code "$R"))"
else bad "A guardo un photo_path de B (HTTP $(code "$R"))"; fi

echo
echo "== Tabla workouts =="

R=$(rest GET "workouts?id=eq.$WID_B&select=id" "$TOKEN_A")
[[ "$(body "$R")" == "[]" ]] && ok "A no puede LEER el entreno de B" || bad "A leyo el entreno de B -> $(body "$R")"

R=$(rest GET "workouts?select=user_id" "$TOKEN_A")
if body "$R" | grep -q "$UID_B"; then bad "el listado de entrenos de A trae filas de B"; else ok "el listado de entrenos de A solo trae filas de A"; fi

R=$(rest POST workouts "$TOKEN_A" "{\"user_id\":\"$UID_B\",\"kind\":\"correr\",\"note\":\"[test] robado\"}")
if [[ "$(code "$R")" == "4"* ]]; then ok "A no puede INSERTAR un entreno a nombre de B (HTTP $(code "$R"))"
else bad "A inserto un entreno a nombre de B (HTTP $(code "$R")) -> $(body "$R")"; fi

R=$(rest PATCH "workouts?id=eq.$WID_B" "$TOKEN_A" '{"note":"[test] pisado"}')
[[ "$(body "$R")" == "[]" ]] && ok "A no puede EDITAR el entreno de B" || bad "A edito el entreno de B -> $(body "$R")"

R=$(rest DELETE "workouts?id=eq.$WID_B" "$TOKEN_A")
[[ "$(body "$R")" == "[]" ]] && ok "A no puede BORRAR el entreno de B" || bad "A borro el entreno de B -> $(body "$R")"

R=$(rest PATCH "workouts?id=eq.$WID_A" "$TOKEN_A" "{\"user_id\":\"$UID_B\"}")
OWNER=$(body "$R" | jget 0.user_id)
[[ "$OWNER" != "$UID_B" ]] && ok "A no puede REGALARLE su entreno a B" || bad "A le cambio el dueño a su entreno"

echo
echo "== Bucket meal-photos =="
TMP=$(mktemp -t fotoprueba)
printf '\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xd9' > "$TMP"

C=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$SUPABASE_URL/storage/v1/object/meal-photos/$UID_B/robada.jpg" \
  -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: image/jpeg" --data-binary "@$TMP")
[[ "$C" == 4* ]] && ok "A no puede SUBIR a la carpeta de B (HTTP $C)" || bad "A subio a la carpeta de B (HTTP $C)"

C=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$SUPABASE_URL/storage/v1/object/meal-photos/$UID_A/propia.jpg" \
  -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: image/jpeg" --data-binary "@$TMP")
[[ "$C" == 2* ]] && ok "A si puede subir a su propia carpeta (HTTP $C)" || bad "A no pudo subir a su carpeta (HTTP $C)"

R=$(curl -s -w '\n%{http_code}' -X POST "$SUPABASE_URL/storage/v1/object/sign/meal-photos/$UID_A/propia.jpg" \
  -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" -d '{"expiresIn":60}')
[[ "$(code "$R")" == 4* ]] && ok "B no puede FIRMAR una URL de la foto de A (HTTP $(code "$R"))" || bad "B firmo la foto de A -> $(body "$R")"

C=$(curl -s -o /dev/null -w '%{http_code}' "$SUPABASE_URL/storage/v1/object/public/meal-photos/$UID_A/propia.jpg")
[[ "$C" == 4* ]] && ok "la foto no se puede bajar sin firmar: el bucket es privado (HTTP $C)" || bad "la foto es publica (HTTP $C)"

echo
echo "== Limpieza =="
rest DELETE "meals?id=eq.$ID_A" "$TOKEN_A" >/dev/null
rest DELETE "meals?id=eq.$ID_B" "$TOKEN_B" >/dev/null
rest DELETE "meals?description=like.[test]*" "$TOKEN_A" >/dev/null
rest DELETE "workouts?id=eq.$WID_A" "$TOKEN_A" >/dev/null
rest DELETE "workouts?id=eq.$WID_B" "$TOKEN_B" >/dev/null
rest DELETE "workouts?note=like.[test]*" "$TOKEN_A" >/dev/null
curl -s -o /dev/null -X DELETE "$SUPABASE_URL/storage/v1/object/meal-photos/$UID_A/propia.jpg" \
  -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $TOKEN_A"
rm -f "$TMP"
echo "  listo"

echo
printf '%s: %d OK, %d fallas\n' "RESULTADO" "$pass" "$fail"
[[ "$fail" -eq 0 ]] || exit 1
