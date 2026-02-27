# EC Site on Snowpark Container Services (SPCS)

Snowflake の Snowpark Container Services (SPCS) 上で動作するフルスタック EC サイトです。  
React (フロントエンド) + FastAPI (バックエンド) + Nginx (リバースプロキシ) を単一コンテナにまとめ、Snowflake のデータベースをストレージとして利用します。

## アクセスURL
https://ab7bed-sfseapac-k-fukamori.snowflakecomputing.app  

## アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│              SPCS Container (単一コンテナ)             │
│                                                     │
│  ┌───────────────┐       ┌───────────────────────┐  │
│  │    Nginx       │       │   FastAPI (uvicorn)   │  │
│  │   Port 8080    │──────▶│     Port 8000         │  │
│  │                │ /api/ │                       │  │
│  │  React 静的    │       │  ┌─────────────────┐  │  │
│  │  ファイル配信   │       │  │ snowflake_client│  │  │
│  │  (SPA)         │       │  │  OAuth Token    │  │  │
│  └───────────────┘       │  └────────┬────────┘  │  │
│                           └───────────┼───────────┘  │
│                                       │              │
│                          /snowflake/session/token     │
└───────────────────────────┼─────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │   Snowflake    │
                    │  EC_SITE_DB    │
                    │   .PUBLIC      │
                    │                │
                    │  - USERS       │
                    │  - PRODUCTS    │
                    │  - CATEGORIES  │
                    │  - CART_ITEMS  │
                    │  - ORDERS      │
                    │  - ORDER_ITEMS │
                    └────────────────┘
```

### コンポーネント構成

| コンポーネント | 技術 | 役割 |
|---|---|---|
| フロントエンド | React 19 + TypeScript + Tailwind CSS + Vite | SPA による EC サイト UI |
| バックエンド | Python FastAPI + uvicorn | REST API サーバー |
| リバースプロキシ | Nginx | ポート 8080 で静的ファイル配信 + API プロキシ |
| データベース | Snowflake テーブル | ユーザー・商品・注文等のデータ保存 |
| コンテナ基盤 | Snowpark Container Services | コンテナのホスティング・実行 |

### リクエストフロー

1. ブラウザが `https://<endpoint>.snowflakecomputing.app` にアクセス
2. SPCS Ingress が Snowflake アカウント認証を実施
3. Nginx (ポート 8080) がリクエストを受信
   - `/api/*` → FastAPI (ポート 8000) にプロキシ
   - それ以外 → React の静的ファイルを配信（SPA フォールバック）
4. FastAPI が `/snowflake/session/token` の OAuth トークンで Snowflake に接続
5. Snowflake テーブルに対して SQL を実行し、結果を返却

## 前提条件

- **Snowflake アカウント** (ACCOUNTADMIN ロールが必要)
- **Docker Desktop** (インストール済み・起動済み)
- **snow CLI** v3.x 以上 (`pip install snowflake-cli`)
- **Node.js** 20 以上 (ローカル開発時のみ)
- **Python** 3.12 以上 (ローカル開発時のみ)
- **gh CLI** (オプション、GitHub 操作用)
- **キーペア認証の設定** (Docker レジストリログインで MFA を回避するために推奨)

## セットアップ手順

### 1. Snowflake インフラの構築

Snowflake ワークシートまたは SnowSQL で `setup_spcs.sql` を実行します。

```sql
-- Snowflake ワークシートで実行
-- ファイルの内容を貼り付けて実行
```

このスクリプトは以下を作成します:

- **ウェアハウス**: `EC_SITE_WH` (XSMALL)
- **データベース**: `EC_SITE_DB` (スキーマ: PUBLIC)
- **IMAGE REPOSITORY**: `EC_SITE_REPO`
- **COMPUTE POOL**: `EC_SITE_POOL` (CPU_X64_XS, 1 ノード)
- **NETWORK RULE / EXTERNAL ACCESS INTEGRATION**: 外部画像アクセス用
- **テーブル 6 つ**: CATEGORIES, PRODUCTS, USERS, CART_ITEMS, ORDERS, ORDER_ITEMS
- **サンプルデータ**: カテゴリ 5 件、商品 27 件、ユーザー 4 件

COMPUTE POOL が ACTIVE になるまで数分待ちます:

```sql
DESCRIBE COMPUTE POOL EC_SITE_POOL;
-- state が ACTIVE になるまで待つ
```

### 2. IMAGE REPOSITORY の URL を取得

```sql
SHOW IMAGE REPOSITORIES IN SCHEMA EC_SITE_DB.PUBLIC;
-- repository_url カラムの値をメモ
-- 例: sfseapac-k-fukamori.registry.snowflakecomputing.com/ec_site_db/public/ec_site_repo
```

### 3. Docker イメージのビルド

```bash
# プロジェクトルートで実行
docker build --platform linux/amd64 -t ec-site:latest .
```

> **注意**: SPCS は `linux/amd64` アーキテクチャで動作するため、Apple Silicon Mac では `--platform linux/amd64` が必須です。

### 4. イメージのタグ付け

```bash
# <IMAGE_REPO_URL> を手順 2 で取得した URL に置換
docker tag ec-site:latest <IMAGE_REPO_URL>/ec-site:latest
```

### 5. Snowflake レジストリにログイン

キーペア認証を使う場合 (推奨、MFA を回避できる):

```bash
snow spcs image-registry login \
  -c <CONNECTION_NAME> \
  --private-key-file ~/.snowflake/rsa_key.p8 \
  --authenticator SNOWFLAKE_JWT
```

パスワード認証を使う場合:

```bash
REGISTRY_HOST=$(echo <IMAGE_REPO_URL> | cut -d'/' -f1)
docker login ${REGISTRY_HOST} -u <SNOWFLAKE_USER>
```

### 6. イメージをプッシュ

```bash
docker push <IMAGE_REPO_URL>/ec-site:latest
```

### 7. SPCS サービスの作成

Snowflake ワークシートで以下を実行します。`<IMAGE_REPO_URL>` は手順 2 の値に置換してください。

```sql
CREATE SERVICE EC_SITE_SERVICE
  IN COMPUTE POOL EC_SITE_POOL
  FROM SPECIFICATION $$
    spec:
      containers:
      - name: ec-site
        image: <IMAGE_REPO_URL>/ec-site:latest
        env:
          SNOWFLAKE_DATABASE: EC_SITE_DB
          SNOWFLAKE_SCHEMA: PUBLIC
        resources:
          requests:
            cpu: 0.5
            memory: 1Gi
          limits:
            cpu: 1
            memory: 2Gi
      endpoints:
      - name: ec-site
        port: 8080
        public: true
  $$
  EXTERNAL_ACCESS_INTEGRATIONS = (EC_SITE_EXTERNAL_ACCESS);
```

### 8. サービスの確認・アクセス

```sql
-- ステータス確認 (READY / Running になるまで待つ)
SELECT SYSTEM$GET_SERVICE_STATUS('EC_SITE_SERVICE');

-- エンドポイント URL を取得
SHOW ENDPOINTS IN SERVICE EC_SITE_SERVICE;
```

表示された `ingress_url` にブラウザでアクセスします。  
**最初に Snowflake アカウントでのログインが必要です** (SPCS の Ingress 認証)。

### テスト用アカウント

| ユーザー名 | パスワード | 権限 |
|---|---|---|
| admin | admin123 | 管理者 |
| tanaka | pass1234 | 一般ユーザー |
| suzuki | pass1234 | 一般ユーザー |
| sato | pass1234 | 一般ユーザー |

## ローカル開発

フロントエンドとバックエンドを別々に起動してローカルで開発できます。

```bash
# バックエンド (ターミナル 1)
cd backend
pip install -r requirements.txt
# 環境変数で Snowflake 接続情報を設定
export SNOWFLAKE_ACCOUNT=<your_account>
export SNOWFLAKE_USER=<your_user>
export SNOWFLAKE_PASSWORD=<your_password>
export SNOWFLAKE_DATABASE=EC_SITE_DB
export SNOWFLAKE_SCHEMA=PUBLIC
export SNOWFLAKE_WAREHOUSE=EC_SITE_WH
python -m uvicorn main:app --host 0.0.0.0 --port 8000

# フロントエンド (ターミナル 2)
cd frontend
npm install
npm run dev
# http://localhost:5173 でアクセス (Vite が /api を localhost:8000 にプロキシ)
```

## プロジェクト構成

```
ec-site-spcs/
├── Dockerfile              # マルチステージビルド (Node.js → Python)
├── nginx.conf              # Nginx リバースプロキシ設定
├── entrypoint.sh           # コンテナ起動スクリプト
├── deploy.sh               # デプロイヘルパースクリプト
├── setup_spcs.sql          # Snowflake インフラ + テーブル + サンプルデータ
├── backend/
│   ├── main.py             # FastAPI アプリケーション (全 API エンドポイント)
│   ├── snowflake_client.py # Snowflake 接続クライアント
│   └── requirements.txt    # Python 依存パッケージ
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.ts       # Vite 設定 (開発用 API プロキシ含む)
    ├── tsconfig.json
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── main.tsx         # エントリーポイント
        ├── App.tsx          # ルーティング定義
        ├── index.css        # Tailwind CSS インポート
        ├── api/
        │   └── client.ts    # API クライアント
        ├── components/
        │   └── ProductImage.tsx  # 画像フォールバックコンポーネント
        └── pages/
            ├── Home.tsx           # 商品一覧 (検索・カテゴリフィルタ)
            ├── Login.tsx          # ログインフォーム
            ├── Register.tsx       # ユーザー登録フォーム
            ├── Cart.tsx           # ショッピングカート
            ├── Orders.tsx         # 注文履歴
            ├── AdminProducts.tsx  # [管理] 商品管理
            ├── AdminOrders.tsx    # [管理] 注文管理
            └── AdminDashboard.tsx # [管理] 売上ダッシュボード
```

## コンテナと Snowflake の連携

### OAuth トークンによる認証

SPCS コンテナから Snowflake DB へのアクセスは **Snowflake 内部の OAuth トークン認証** で行われます。外部の OAuth サーバや IdP は関与せず、**Snowflake 自身がトークンの発行と検証の両方を担います**。

```
┌──────────────────────────┐
│     SPCS コンテナ          │
│                          │
│  /snowflake/session/     │
│    token                 │◄──── SPCS ランタイムが自動発行・マウント
│                          │
│  アプリがファイルを読み取り │
│       │                  │
└───────┼──────────────────┘
        │
        │ authenticator="oauth", token=<token>
        ▼
┌──────────────────────────┐
│      Snowflake           │
│                          │
│  ① トークン発行 (認可サーバ)│
│  ② トークン検証 (リソースサーバ)│
│  ③ SQL 実行・データ返却     │
│                          │
└──────────────────────────┘
```

### トークン発行の流れ

1. `CREATE SERVICE` でサービスを作成する
2. SPCS ランタイムがコンテナを起動する際に、**サービスを作成したロールの権限**に基づいた OAuth トークンを生成
3. トークンをコンテナ内の `/snowflake/session/token` にファイルとしてマウント
4. トークンは SPCS によって**定期的に自動更新**される（アプリ側での更新処理は不要）

### 環境変数の自動注入

SPCS はトークンに加えて、以下の環境変数もコンテナに自動注入します:

| 環境変数 | 内容 |
|---|---|
| `SNOWFLAKE_HOST` | Snowflake ホスト名 |
| `SNOWFLAKE_ACCOUNT` | アカウント識別子 |

アプリ側は `CREATE SERVICE` の spec で指定した `SNOWFLAKE_DATABASE` / `SNOWFLAKE_SCHEMA` と合わせて接続します。

### 通常の OAuth との比較

| 役割 | 一般的な OAuth | SPCS の場合 |
|---|---|---|
| 認可サーバ (トークン発行) | Google, Auth0 等の外部 IdP | **Snowflake** |
| リソースサーバ (トークン検証) | アプリの API サーバ | **Snowflake** |
| クライアント (トークン使用) | Web/モバイルアプリ | **コンテナ内のアプリ** |

Snowflake が発行と検証を一手に担うため、外部サービスへの依存がなく、認証情報（パスワードやキーペア）をコンテナに埋め込む必要もありません。

### 実装 (`backend/snowflake_client.py`)

```python
token_path = "/snowflake/session/token"
if os.path.exists(token_path):
    # SPCS 環境: OAuth トークンで接続 (パスワード不要)
    with open(token_path, "r") as f:
        token = f.read().strip()
    snowflake.connector.connect(
        host=os.environ["SNOWFLAKE_HOST"],
        account=os.environ["SNOWFLAKE_ACCOUNT"],
        authenticator="oauth",
        token=token,
        database="EC_SITE_DB",
        schema="PUBLIC",
        warehouse="EC_SITE_WH",
    )
else:
    # ローカル環境: パスワード認証にフォールバック
    snowflake.connector.connect(user=..., password=..., ...)
```

`/snowflake/session/token` の有無で SPCS 環境かローカル環境かを自動判定するため、同一コードがどちらの環境でも動作します。

## コードの注目ポイント

### 1. 単一コンテナアーキテクチャ

React + FastAPI + Nginx を 1 つのコンテナにまとめることで、以下のメリットがあります:

- **CORS/CSRF 問題の回避**: フロントエンドと API が同一オリジンで提供される
- **SPCS の制約に適合**: SPCS は 1 サービスにつき 1 つのパブリックエンドポイントのみ
- **デプロイの簡素化**: 単一イメージの管理のみで済む

Nginx が `/api/*` を FastAPI にプロキシし、それ以外は React の静的ファイルを配信する構成です。

### 2. SPA フォールバック (`nginx.conf`)

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

React Router によるクライアントサイドルーティングを正しく動作させるため、存在しないパスへのリクエストをすべて `index.html` にフォールバックしています。

### 3. マルチステージ Docker ビルド (`Dockerfile`)

```dockerfile
FROM node:20-alpine AS frontend-build  # React ビルド用 (最終イメージには含まれない)
FROM python:3.12-slim                  # 実行用イメージ
```

- **Stage 1**: Node.js で React をビルドし、静的ファイル (`dist/`) を生成
- **Stage 2**: Python イメージに FastAPI + Nginx + ビルド済み静的ファイルのみをコピー

Node.js ランタイムや `node_modules` は最終イメージに含まれないため、イメージサイズを大幅に削減できます。

### 4. 画像フォールバック (`frontend/src/components/ProductImage.tsx`)

外部画像サービスに依存せず、カテゴリに応じた絵文字を SVG としてインライン生成するフォールバック機能を実装しています。SPCS の Ingress 経由では外部画像の読み込みが CSP によりブロックされる場合があるため、この方式で確実に画像を表示します。

### 5. パスワードハッシュの整合性 (`backend/main.py` / `setup_spcs.sql`)

Python 側では `hashlib.sha256()` を使い、Snowflake 側では `SHA2()` 関数を使ってパスワードをハッシュしています。両者は同一のアルゴリズム (SHA-256) を使用するため、SQL で作成したサンプルユーザーに Python API 経由でログインできます。

## サービスの管理

```sql
-- サービスの停止
ALTER SERVICE EC_SITE_SERVICE SUSPEND;

-- サービスの再開
ALTER SERVICE EC_SITE_SERVICE RESUME;

-- サービスの削除
DROP SERVICE EC_SITE_SERVICE;

-- ログの確認
SELECT SYSTEM$GET_SERVICE_LOGS('EC_SITE_SERVICE', 0, 'ec-site', 50);

-- COMPUTE POOL の停止 (コスト節約)
ALTER COMPUTE POOL EC_SITE_POOL SUSPEND;
```

## ライセンス

MIT
