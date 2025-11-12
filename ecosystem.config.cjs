/**
 * PM2 Ecosystem Configuration for Ovida Production Services
 *
 * This configuration manages the API and WebSocket services in production.
 *
 * Prerequisites:
 * 1. Install PM2 globally: npm install -g pm2
 * 2. Build the services: pnpm build
 * 3. Set up your .env file with production values
 *
 * Usage:
 *   Start all services:    pm2 start ecosystem.config.cjs
 *   Stop all services:     pm2 stop ecosystem.config.cjs
 *   Restart all services:  pm2 restart ecosystem.config.cjs
 *   View logs:             pm2 logs
 *   View status:           pm2 status
 *
 * Auto-start on system boot:
 *   pm2 startup
 *   pm2 save
 */

module.exports = {
  apps: [
    {
      name: 'ovida-api',
      script: './apps/api/dist/index.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    {
      name: 'ovida-ws',
      script: './apps/ws/dist/index.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 4001,
      },
      error_file: './logs/ws-error.log',
      out_file: './logs/ws-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
