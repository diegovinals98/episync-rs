module.exports = {
  apps: [
    {
      name: "family-series-track-v2-backend",
      script: "dist/main.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
      env_file: ".env",
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
    },
  ],
};
