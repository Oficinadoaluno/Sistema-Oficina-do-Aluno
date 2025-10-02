import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Esta é a linha mais importante para resolver o seu problema.
  // Ela informa à aplicação que todos os caminhos para assets (JS, CSS, imagens)
  // devem começar com /portal/.
  base: '/portal/',
});
