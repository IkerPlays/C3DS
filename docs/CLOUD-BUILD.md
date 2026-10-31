# Compilación en la nube

Desde el editor: **Exportar ▾ → ☁ Compilar en la nube**. La web envía el proyecto a una Netlify Function, que lanza el
workflow `cloud-build.yml` de GitHub Actions (devkitARM + tex3ds + makerom + bannertool). Al terminar, la web ofrece
descargar el resultado (`.3dsx` + `.cia`, o con **🪟 Juego para Windows** el `.exe` y su instalador) como **artifact** (caduca en 1 día). **No se crea ninguna release.**

```
navegador ──POST /api/build──▶ Netlify Function ──(token)──▶ GitHub
   ▲                                │  1. valida el proyecto y REGENERA los archivos con las plantillas del sitio
   │ GET /api/build/:id             │  2. sube jobs/<id>.zip a la rama `cloud-builds`
   │ (estado, cada 5 s)             │  3. dispara el workflow Cloud build (workflow_dispatch)
   └──────── descarga ◀─────────────┘  4. al terminar: URL firmada del artifact `build-<id>`
```

## Configuración (una sola vez)
1. **Crear el token** (GitHub → Settings → Developer settings → *Fine-grained personal access tokens* → Generate):
   - *Resource owner*: `IkerPlays` · *Repository access*: **Only select repositories → `C3DS`**
   - *Repository permissions*: **Contents: Read and write**, **Actions: Read and write** (Metadata: Read-only se añade solo)
   - Caducidad: la más corta que te resulte cómoda (p. ej. 90 días) y apúntala para renovarlo.
2. **Guardarlo en Netlify**: *Site configuration → Environment variables → Add a variable*
   - `C3DS_GITHUB_TOKEN` = el token (marca **Contains secret values**; ámbito *Functions*).
   - (opcional) `C3DS_REPO` = `usuario/repo` si no es `IkerPlays/C3DS`.
3. Haz un nuevo deploy. El token **nunca** llega al navegador ni al código del sitio: solo lo lee la función.

Si falta el token, la web lo indica y sigue funcionando “Exportar .zip”.

## Seguridad y límites
- El navegador envía **datos** (el proyecto); el servidor **regenera** `Makefile`, `main.c`, etc. con sus plantillas. Nunca se ejecuta un `Makefile` o un workflow enviado por el usuario, y los nombres se sanean (`makeSafe`, `cString`).
- El job que compila no tiene permisos de escritura ni secretos; solo el job `cleanup` (sin código del usuario) borra `jobs/<id>.zip`.
- Máx. ≈4 MB por proyecto (límite de las Functions de Netlify) y 3 compilaciones simultáneas.
- Cualquiera que abra el sitio puede lanzar compilaciones (consumen minutos de Actions). Si hiciera falta, añade
  *rate limiting* de Netlify o un captcha (p. ej. Turnstile) delante de `/api/build`.
- Revoca el token en GitHub si sospechas que se ha filtrado.
