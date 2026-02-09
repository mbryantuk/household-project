module.exports = {
  apps: [{
    name: 'kanban-monitor',
    script: './scripts/kanban/monitor.js',
    watch: false,
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production',
      KANBAN_URL: 'http://10.10.2.0:8089'
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/kanban-error.log',
    out_file: './logs/kanban-out.log'
  }]
};
