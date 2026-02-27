# ==============================================================
# Multi-stage Dockerfile: React + FastAPI + Nginx
# ==============================================================

# ---- Stage 1: React ビルド ----
FROM node:20-alpine AS frontend-build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: 最終イメージ ----
FROM python:3.12-slim

# Nginx インストール
RUN apt-get update && \
    apt-get install -y --no-install-recommends nginx && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Python 依存
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# バックエンドコード
COPY backend/ ./

# フロントエンドビルド成果物
COPY --from=frontend-build /build/dist /app/static

# Nginx 設定
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -f /etc/nginx/sites-enabled/default

# エントリーポイント
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 8080

CMD ["/app/entrypoint.sh"]
