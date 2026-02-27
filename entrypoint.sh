#!/bin/sh
# Nginx と FastAPI (uvicorn) を同時起動するエントリーポイント
set -e

# FastAPI をバックグラウンドで起動
cd /app/backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 &

# Nginx をフォアグラウンドで起動
nginx -g 'daemon off;'
