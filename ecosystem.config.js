const path = require('path');

const requestedInstances = Number(process.env.PM2_INSTANCES);
const instances =
  Number.isFinite(requestedInstances) && requestedInstances > 0
    ? requestedInstances
    : 2;

module.exports = {
  apps: [
    {
      name: 'dailyhelp-api',
      script: 'dist/main.js',
      cwd: __dirname,
      instances,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      env_file: process.env.ENV_FILE || path.join(__dirname, '.env'),
      max_memory_restart: '500M',
      time: true,
    },
  ],
};
