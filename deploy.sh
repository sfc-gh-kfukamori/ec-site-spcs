#!/bin/bash
# ==============================================================
# SPCS ECサイト デプロイスクリプト
# ==============================================================
set -e

# ---- 設定 ----
# 以下の変数を環境に合わせて設定してください
# IMAGE_REPO_URL は SHOW IMAGE REPOSITORIES の結果から取得
IMAGE_REPO_URL="${IMAGE_REPO_URL:-}"
SNOWFLAKE_ACCOUNT="${SNOWFLAKE_ACCOUNT:-SFSEAPAC-K_FUKAMORI}"
IMAGE_NAME="ec-site"
IMAGE_TAG="latest"

if [ -z "$IMAGE_REPO_URL" ]; then
  echo "ERROR: IMAGE_REPO_URL を設定してください"
  echo ""
  echo "以下のSQLで取得できます:"
  echo "  SHOW IMAGE REPOSITORIES IN SCHEMA EC_SITE_DB.PUBLIC;"
  echo ""
  echo "使用例:"
  echo "  IMAGE_REPO_URL=<org>-<account>.registry.snowflakecomputing.com/ec_site_db/public/ec_site_repo ./deploy.sh"
  exit 1
fi

FULL_IMAGE="${IMAGE_REPO_URL}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "=== Step 1: Docker イメージをビルド ==="
docker build --platform linux/amd64 -t ${IMAGE_NAME}:${IMAGE_TAG} .

echo "=== Step 2: イメージにタグ付け ==="
docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${FULL_IMAGE}

echo "=== Step 3: Snowflake レジストリにログイン ==="
REGISTRY_HOST=$(echo $IMAGE_REPO_URL | cut -d'/' -f1)
docker login ${REGISTRY_HOST} -u ${SNOWFLAKE_USER:-FUKAMORI}

echo "=== Step 4: イメージをプッシュ ==="
docker push ${FULL_IMAGE}

echo ""
echo "=== プッシュ完了 ==="
echo ""
echo "次に Snowflake で以下のSQLを実行してサービスを作成してください:"
echo ""
echo "CREATE SERVICE EC_SITE_SERVICE"
echo "  IN COMPUTE POOL EC_SITE_POOL"
echo "  FROM SPECIFICATION \$\$"
echo "    spec:"
echo "      containers:"
echo "      - name: ec-site"
echo "        image: ${FULL_IMAGE}"
echo "        env:"
echo "          SNOWFLAKE_DATABASE: EC_SITE_DB"
echo "          SNOWFLAKE_SCHEMA: PUBLIC"
echo "          SNOWFLAKE_WAREHOUSE: EC_SITE_WH"
echo "        resources:"
echo "          requests:"
echo "            cpu: 0.5"
echo "            memory: 1Gi"
echo "          limits:"
echo "            cpu: 1"
echo "            memory: 2Gi"
echo "      endpoints:"
echo "      - name: ec-site"
echo "        port: 8080"
echo "        public: true"
echo "  \$\$"
echo "  EXTERNAL_ACCESS_INTEGRATIONS = (EC_SITE_EXTERNAL_ACCESS);"
echo ""
echo "ステータス確認:"
echo "  SELECT SYSTEM\$GET_SERVICE_STATUS('EC_SITE_SERVICE');"
echo "  SHOW ENDPOINTS IN SERVICE EC_SITE_SERVICE;"
