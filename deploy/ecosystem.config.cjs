// PM2: dos procesos propios (martino-api y martino-web) en puertos que no usan otros sitios.
// pm2 start deploy/ecosystem.config.cjs && pm2 save
const path = require('path');
const root = path.resolve(__dirname, '..');

module.exports = {
  apps: [
    {
      name: 'martino-api',
      cwd: path.join(root, 'apps/api'),
      script: 'dist/main.js',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '400M',
      time: true,
    },
    {
      name: 'martino-web',
      cwd: path.join(root, 'apps/web'),
      script: path.join(root, 'node_modules/next/dist/bin/next'),
      args: 'start -H 127.0.0.1 -p 3020',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '600M',
      time: true,
    },
  ],
};
