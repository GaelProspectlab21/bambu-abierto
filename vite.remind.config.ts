import { defineConfig } from 'vite'

// Empaqueta la lógica de recordatorios para la función de Supabase (Deno). Sin React.
export default defineConfig({
  build: {
    lib: { entry: 'src/lib/remindServer.ts', formats: ['es'], fileName: () => 'core.js' },
    outDir: 'supabase/functions/_shared',
    emptyOutDir: false,
    minify: false,
    copyPublicDir: false,
  },
})
