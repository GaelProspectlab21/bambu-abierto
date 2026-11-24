# Cómo mandar mejoras

1. Haz un fork de este repo y clónalo.
2. `pnpm install` y `pnpm dev`. Sin variables `VITE_*` la app corre en modo local, sin cuenta ni nube.
3. Crea una rama, haz tus cambios y revisa que pasen las dos pruebas:
   ```bash
   pnpm build
   node checks/features.cjs
   ```
4. Abre un Pull Request contra `main` explicando qué cambiaste y por qué.

Reglas cortas (el detalle está en `AGENTS.md`):

- pnpm siempre, nunca npm ni yarn.
- Colores solo desde `src/tokens.css`.
- Texto visible en español de México, tuteo, sin guion largo, sin barra entre palabras, sin puntos suspensivos.
- Nunca subas claves, `.env` ni datos personales.

Este repo es una copia pública. Los cambios aceptados se aplican al proyecto original y la copia se vuelve a sincronizar.
