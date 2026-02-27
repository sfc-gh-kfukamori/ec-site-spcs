-- ============================================================
-- SPCS ECサイト セットアップスクリプト
-- SPCSインフラ + ECテーブル作成 + サンプルデータ投入
-- ============================================================

-- 1) 使用するロールとウェアハウス
USE ROLE ACCOUNTADMIN;

CREATE WAREHOUSE IF NOT EXISTS EC_SITE_WH
  WAREHOUSE_SIZE = 'XSMALL'
  AUTO_SUSPEND = 60
  AUTO_RESUME = TRUE;

-- 2) データベース・スキーマ
CREATE DATABASE IF NOT EXISTS EC_SITE_DB;
USE DATABASE EC_SITE_DB;
USE SCHEMA PUBLIC;

-- 3) IMAGE REPOSITORY (コンテナイメージ格納用)
CREATE IMAGE REPOSITORY IF NOT EXISTS EC_SITE_REPO;

-- IMAGE REPOSITORY の URL を確認 (デプロイ時に使用)
SHOW IMAGE REPOSITORIES IN SCHEMA EC_SITE_DB.PUBLIC;

-- 4) COMPUTE POOL (コンテナ実行基盤)
CREATE COMPUTE POOL IF NOT EXISTS EC_SITE_POOL
  MIN_NODES = 1
  MAX_NODES = 1
  INSTANCE_FAMILY = CPU_X64_XS;

-- COMPUTE POOL のステータス確認 (ACTIVE になるまで数分待つ)
DESCRIBE COMPUTE POOL EC_SITE_POOL;

-- 5) 外部アクセス統合 (商品画像の外部URL取得用)
CREATE OR REPLACE NETWORK RULE EC_SITE_EGRESS_RULE
  MODE = EGRESS
  TYPE = HOST_PORT
  VALUE_LIST = ('picsum.photos', 'placehold.co');

CREATE OR REPLACE EXTERNAL ACCESS INTEGRATION EC_SITE_EXTERNAL_ACCESS
  ALLOWED_NETWORK_RULES = (EC_SITE_EGRESS_RULE)
  ENABLED = TRUE;

-- ============================================================
-- ECサイト テーブル定義 (既存テーブルがなければ作成)
-- ============================================================

CREATE TABLE IF NOT EXISTS CATEGORIES (
    CATEGORY_ID INT AUTOINCREMENT PRIMARY KEY,
    NAME VARCHAR(100) NOT NULL,
    DESCRIPTION VARCHAR(500),
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS PRODUCTS (
    PRODUCT_ID INT AUTOINCREMENT PRIMARY KEY,
    NAME VARCHAR(200) NOT NULL,
    DESCRIPTION VARCHAR(2000),
    PRICE NUMBER(10,0) NOT NULL,
    STOCK INT DEFAULT 0,
    CATEGORY_ID INT,
    IMAGE_URL VARCHAR(500),
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS USERS (
    USER_ID INT AUTOINCREMENT PRIMARY KEY,
    USERNAME VARCHAR(100) NOT NULL UNIQUE,
    PASSWORD_HASH VARCHAR(256) NOT NULL,
    EMAIL VARCHAR(200),
    FULL_NAME VARCHAR(200),
    IS_ADMIN BOOLEAN DEFAULT FALSE,
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS CART_ITEMS (
    CART_ITEM_ID INT AUTOINCREMENT PRIMARY KEY,
    USER_ID INT NOT NULL,
    PRODUCT_ID INT NOT NULL,
    QUANTITY INT DEFAULT 1,
    ADDED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS ORDERS (
    ORDER_ID INT AUTOINCREMENT PRIMARY KEY,
    USER_ID INT NOT NULL,
    TOTAL_AMOUNT NUMBER(12,0) NOT NULL,
    STATUS VARCHAR(50) DEFAULT '注文確定',
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS ORDER_ITEMS (
    ORDER_ITEM_ID INT AUTOINCREMENT PRIMARY KEY,
    ORDER_ID INT NOT NULL,
    PRODUCT_ID INT NOT NULL,
    QUANTITY INT NOT NULL,
    UNIT_PRICE NUMBER(10,0) NOT NULL
);

-- ============================================================
-- サンプルデータ投入 (テーブルが空の場合のみ)
-- ============================================================

-- カテゴリ
INSERT INTO CATEGORIES (NAME, DESCRIPTION)
  SELECT * FROM (
    SELECT '家電' AS NAME, 'テレビ、冷蔵庫、洗濯機などの家電製品' AS DESCRIPTION
    UNION ALL SELECT '衣類', 'メンズ・レディースのファッションアイテム'
    UNION ALL SELECT '食品', '食料品・飲料・お菓子など'
    UNION ALL SELECT '書籍', '本・雑誌・電子書籍'
    UNION ALL SELECT 'スポーツ', 'スポーツ用品・アウトドアグッズ'
  )
  WHERE NOT EXISTS (SELECT 1 FROM CATEGORIES);

-- ユーザー (admin=admin123, 他=pass1234)
INSERT INTO USERS (USERNAME, PASSWORD_HASH, EMAIL, FULL_NAME, IS_ADMIN)
  SELECT * FROM (
    SELECT 'admin', SHA2('admin123'), 'admin@example.com', '管理者', TRUE
    UNION ALL SELECT 'tanaka', SHA2('pass1234'), 'tanaka@example.com', '田中太郎', FALSE
    UNION ALL SELECT 'suzuki', SHA2('pass1234'), 'suzuki@example.com', '鈴木花子', FALSE
    UNION ALL SELECT 'sato', SHA2('pass1234'), 'sato@example.com', '佐藤一郎', FALSE
  )
  WHERE NOT EXISTS (SELECT 1 FROM USERS);

-- 商品 (家電)
INSERT INTO PRODUCTS (NAME, DESCRIPTION, PRICE, STOCK, CATEGORY_ID, IMAGE_URL)
  SELECT * FROM (
    SELECT '4Kテレビ 55型', '高画質4K対応の55インチ液晶テレビ', 89800, 15, 1, ''
    UNION ALL SELECT 'ドラム式洗濯機', '乾燥機能付きドラム式洗濯機 10kg', 148000, 8, 1, ''
    UNION ALL SELECT 'コードレス掃除機', '軽量パワフルなコードレスクリーナー', 32800, 25, 1, ''
    UNION ALL SELECT '電子レンジ', 'オーブン機能付き多機能電子レンジ', 24800, 20, 1, ''
    UNION ALL SELECT '冷蔵庫 400L', '省エネ大容量冷蔵庫', 128000, 10, 1, ''
    UNION ALL SELECT '空気清浄機', 'HEPA対応の高性能空気清浄機', 29800, 18, 1, ''
  )
  WHERE NOT EXISTS (SELECT 1 FROM PRODUCTS);

-- 商品 (衣類)
INSERT INTO PRODUCTS (NAME, DESCRIPTION, PRICE, STOCK, CATEGORY_ID, IMAGE_URL)
  SELECT * FROM (
    SELECT 'カシミヤセーター', '上質カシミヤ100%のVネックセーター', 15800, 30, 2, ''
    UNION ALL SELECT 'デニムジャケット', 'ヴィンテージ風デニムジャケット', 9800, 20, 2, ''
    UNION ALL SELECT 'スニーカー', '通気性抜群のランニングスニーカー', 12800, 40, 2, ''
    UNION ALL SELECT 'ダウンコート', '軽量高保温ダウンコート', 24800, 15, 2, ''
    UNION ALL SELECT 'リネンシャツ', '夏向きの涼しいリネンシャツ', 6800, 35, 2, ''
  )
  WHERE NOT EXISTS (SELECT 1 FROM PRODUCTS WHERE CATEGORY_ID = 2);

-- 商品 (食品)
INSERT INTO PRODUCTS (NAME, DESCRIPTION, PRICE, STOCK, CATEGORY_ID, IMAGE_URL)
  SELECT * FROM (
    SELECT '有機コーヒー豆 500g', 'コロンビア産オーガニックコーヒー豆', 2480, 50, 3, ''
    UNION ALL SELECT '抹茶チョコレート', '宇治抹茶使用の高級チョコレート', 1280, 60, 3, ''
    UNION ALL SELECT '黒毛和牛 すき焼き用 500g', 'A5ランク黒毛和牛の肩ロース', 8800, 10, 3, ''
    UNION ALL SELECT '特選日本酒セット', '全国の銘酒3本セット', 5800, 20, 3, ''
    UNION ALL SELECT 'オーガニック蜂蜜', '国産の天然はちみつ 500g', 3200, 30, 3, ''
    UNION ALL SELECT '高級緑茶 100g', '静岡産の深蒸し煎茶', 1980, 40, 3, ''
  )
  WHERE NOT EXISTS (SELECT 1 FROM PRODUCTS WHERE CATEGORY_ID = 3);

-- 商品 (書籍)
INSERT INTO PRODUCTS (NAME, DESCRIPTION, PRICE, STOCK, CATEGORY_ID, IMAGE_URL)
  SELECT * FROM (
    SELECT 'Pythonプログラミング入門', 'ゼロから学ぶPython基礎', 2800, 50, 4, ''
    UNION ALL SELECT 'データ分析の教科書', 'ビジネスで使えるデータ分析手法', 3200, 30, 4, ''
    UNION ALL SELECT 'AI時代の働き方', 'AI活用で変わる仕事術', 1800, 45, 4, ''
    UNION ALL SELECT '経済学入門', '初心者向けのわかりやすい経済学', 2200, 25, 4, ''
    UNION ALL SELECT '世界の絶景写真集', '世界中の美しい風景を収録', 4500, 20, 4, ''
  )
  WHERE NOT EXISTS (SELECT 1 FROM PRODUCTS WHERE CATEGORY_ID = 4);

-- 商品 (スポーツ)
INSERT INTO PRODUCTS (NAME, DESCRIPTION, PRICE, STOCK, CATEGORY_ID, IMAGE_URL)
  SELECT * FROM (
    SELECT 'ヨガマット', '厚手6mmの滑りにくいヨガマット', 3980, 40, 5, 'https://picsum.photos/seed/yoga-mat/300/300'
    UNION ALL SELECT 'ランニングウォッチ', 'GPS搭載スポーツウォッチ', 19800, 20, 5, 'https://picsum.photos/seed/running-watch/300/300'
    UNION ALL SELECT 'テニスラケット', '初中級者向け軽量テニスラケット', 14800, 15, 5, 'https://picsum.photos/seed/tennis-racket/300/300'
    UNION ALL SELECT 'キャンプテント 3人用', '設営簡単な防水テント', 18500, 12, 5, 'https://picsum.photos/seed/camp-tent/300/300'
    UNION ALL SELECT 'ダンベルセット 20kg', '可変式ダンベル 2個セット', 8900, 25, 5, 'https://picsum.photos/seed/dumbbell/300/300'
  )
  WHERE NOT EXISTS (SELECT 1 FROM PRODUCTS WHERE CATEGORY_ID = 5);

-- ============================================================
-- サービス作成 (Docker push後に実行)
-- <IMAGE_URL> は SHOW IMAGE REPOSITORIES で取得したURLに置き換え
-- ============================================================

-- CREATE SERVICE EC_SITE_SERVICE
--   IN COMPUTE POOL EC_SITE_POOL
--   FROM SPECIFICATION $$
--     spec:
--       containers:
--       - name: ec-site
--         image: <IMAGE_URL>/ec-site:latest
--         env:
--           SNOWFLAKE_DATABASE: EC_SITE_DB
--           SNOWFLAKE_SCHEMA: PUBLIC
--         resources:
--           requests:
--             cpu: 0.5
--             memory: 1Gi
--           limits:
--             cpu: 1
--             memory: 2Gi
--       endpoints:
--       - name: ec-site
--         port: 8080
--         public: true
--   $$
--   EXTERNAL_ACCESS_INTEGRATIONS = (EC_SITE_EXTERNAL_ACCESS);

-- ステータス確認
-- SELECT SYSTEM$GET_SERVICE_STATUS('EC_SITE_SERVICE');
-- SHOW ENDPOINTS IN SERVICE EC_SITE_SERVICE;
