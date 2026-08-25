module.exports = {
  apps: [
    {
      name: "marketing-api",
      script: "./dist/server.js",
      interpreter: "node",
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "500M",
      env_development: {
        NODE_ENV: "development",
        PORT: 7007,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 7007,
      },
      error_file: "./logs/api-err.log",
      out_file: "./logs/api-out.log",
      merge_logs: true,
      autorestart: true,
      min_uptime: "10s",
      max_restarts: 10,
    },
    {
      name: "click-worker",
      script: "./dist/worker/clickWorker.js",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "500M",
      restart_delay: 2000,
      env_development: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
      error_file: "./logs/worker-err.log",
      out_file: "./logs/worker-out.log",
      merge_logs: true,
      autorestart: true,
      min_uptime: "5s",
      max_restarts: 15,
    },
  ],
};
