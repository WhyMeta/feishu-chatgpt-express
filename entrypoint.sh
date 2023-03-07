#/bin/sh
pm2 start processes.json
pm2 logs
exec "$@"