import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        proxy: {
          '/api/supabase-mdm': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/supabase-mdm/, ''),
            // Supabase REST API 目标地址 (MDM 专用)
            target: 'https://htxfutvuywknwgkkjboq.supabase.co/rest/v1',
            ws: true,
          },
          '/api/auth': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/auth/, ''),
            // Supabase Auth API 目标地址
            target: 'https://htxfutvuywknwgkkjboq.supabase.co/auth/v1',
            ws: true,
          },
          '/api': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            // 本地 Mock 服务 (处理 Auth 等其他 API)
            target: 'http://localhost:5320/api',
            ws: true,
          },
        },
      },
    },
  };
});
