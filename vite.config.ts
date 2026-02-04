
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente (incluindo .env local)
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    base: '/', 
    define: {
      // Define process.env globalmente como objeto vazio para evitar "ReferenceError: process is not defined" em bibliotecas de terceiros
      'process.env': {},
      // Injeta variáveis específicas com fallback para string vazia para evitar crash no parsing
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY || ""),
      'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || env.SUPABASE_URL || ""),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || ""),
      'process.env.GOOGLE_CLIENT_ID': JSON.stringify(process.env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID || ""),
    },
    build: {
      outDir: 'dist',
      sourcemap: true, // Habilitado sourcemap para debug no Vercel se necessário
      rollupOptions: {
        output: {
          manualChunks: undefined
        }
      }
    },
    server: {
      port: 3000
    }
  };
});
