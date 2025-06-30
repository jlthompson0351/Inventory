import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Explicitly define environment variables for production builds
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || 'https://kxcubbibhofdvporfarj.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4Y3ViYmliaG9mZHZwb3JmYXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0MDA4OTcsImV4cCI6MjA1OTk3Njg5N30.tgIV238CB9EeMOWdqM-u8oDhhbCz2f7SzT7ma9jfeEo'),
  },
  build: {
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Ensure proper cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Manual chunk splitting for better performance
        manualChunks: {
          // Core vendor libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI libraries
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            'lucide-react'
          ],
          // Data and forms
          'vendor-data': [
            '@supabase/supabase-js',
            '@tanstack/react-query',
            'react-hook-form',
            '@hookform/resolvers',
            'zod'
          ],
          // Utilities
          'vendor-utils': [
            'lodash',
            'date-fns',
            'mathjs',
            'papaparse',
            'xlsx'
          ],
          // Charts and visualization
          'vendor-charts': ['recharts'],
          // QR/Barcode functionality
          'vendor-qr': ['html5-qrcode', 'jsqr', 'qrcode', 'qrcode.react', 'jsbarcode', 'react-barcode']
        }
      }
    },
    // Clear output directory before build
    emptyOutDir: true,
    // Optimize for production
    minify: 'esbuild',
    // Source maps for debugging (can be disabled for smaller bundles)
    sourcemap: false,
  }
}));
