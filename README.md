# Imperium — Hoja de registro (v2)

App web (React + Vite) pensada como complemento del librojuego.  
Los datos (naves, planetas, personajes, PR, bonus, etc.) se anotan **manualmente** y la app te da:

- Pantalla principal por imperio (planeta natal) con huecos de **Flota**, **Planetas** y **Personajes** (solo jugador).
- Barra superior fija con **Créditos (+/−)**, nº de naves y nº de planetas.
- Dado **1D6** persistente (recuerda el último resultado).
- Combate planetario y combate entre flotas (mostrando en la misma pantalla las fichas implicadas).
- Gestión de **naves destruidas** y botón para **recuperar nave para un imperio**.
- “Comprar/Contratar” descuenta créditos automáticamente.

## Importante: ramificación de nodos de planetas

La app está preparada para mostrar una imagen exacta por planeta:
- Coloca las imágenes en `public/planet-nodes/{NUMERO}.png`
- Ejemplo: `public/planet-nodes/27.png`

Actualmente no se incluyen esos recursos (para mantener el repo ligero).  
Cuando existan, se mostrarán automáticamente al introducir el número de planeta.

## Despliegue sin instalar nada en tu PC (recomendado)

Si tu ordenador de empresa no permite instalar Node, lo mejor es desplegar desde GitHub.

### Opción 1 — Vercel (recomendado)
1. Sube este proyecto a GitHub (repo público o privado).
2. En Vercel: **Add New → Project → Import Git Repository**.
3. Framework: **Vite**
4. Build Command: `pnpm build`
5. Output: `dist`
6. Deploy.

### Opción 2 — Netlify
1. New site from Git.
2. Build: `pnpm build`
3. Publish directory: `dist`

## Desarrollo local (solo si tienes Node)
```bash
pnpm install
pnpm dev
```
