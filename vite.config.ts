import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import {
  executeAiAction,
  proxyLearningSync,
  proxyTelemetry,
  type AiAction,
} from './server/childlearnServer';

function childlearnApiPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'childlearn-local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const requestUrl = req.url;
        if (!requestUrl) {
          next();
          return;
        }

        const url = new URL(requestUrl, 'http://localhost');
        const isAiRoute = url.pathname === '/api/ai';
        const isSyncRoute = url.pathname === '/api/learning-sync';
        const isTelemetryRoute = url.pathname === '/api/telemetry';

        if (!isAiRoute && !isSyncRoute && !isTelemetryRoute) {
          next();
          return;
        }

        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }

        const method = req.method ?? 'GET';
        const body =
          chunks.length === 0
            ? {}
            : (() => {
                try {
                  return JSON.parse(Buffer.concat(chunks).toString('utf-8')) as unknown;
                } catch {
                  return {};
                }
              })();

        const result = isAiRoute
          ? await executeAiAction(url.searchParams.get('action') as AiAction | null, body, {
              env,
            })
          : isSyncRoute
            ? await proxyLearningSync(method, requestUrl, method === 'GET' ? null : body, {
                env,
              })
            : await proxyTelemetry(body, { env });

        res.statusCode = result.status;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(result.body));
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), childlearnApiPlugin(env)],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            motion: ['framer-motion'],
            icons: ['lucide-react'],
          },
        },
      },
    },
  };
});
