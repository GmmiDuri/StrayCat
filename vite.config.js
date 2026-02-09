import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        allowedHosts: true // 모든 호스트를 허용하여 터널링 에러를 해결합니다.
    }
})
