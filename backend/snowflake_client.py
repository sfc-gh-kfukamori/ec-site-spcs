"""Snowflake接続クライアント - SPCS内ではOAuth token、ローカルではパスワード認証"""

import os
import snowflake.connector
from contextlib import contextmanager

def _get_connection():
    """SPCS内ではトークンファイルから認証、ローカルでは環境変数から認証"""
    token_path = "/snowflake/session/token"

    if os.path.exists(token_path):
        with open(token_path, "r") as f:
            token = f.read().strip()
        return snowflake.connector.connect(
            host=os.environ["SNOWFLAKE_HOST"],
            account=os.environ["SNOWFLAKE_ACCOUNT"],
            authenticator="oauth",
            token=token,
            database=os.environ.get("SNOWFLAKE_DATABASE", "EC_SITE_DB"),
            schema=os.environ.get("SNOWFLAKE_SCHEMA", "PUBLIC"),
            warehouse=os.environ.get("SNOWFLAKE_WAREHOUSE", "EC_SITE_WH"),
        )
    else:
        return snowflake.connector.connect(
            account=os.environ["SNOWFLAKE_ACCOUNT"],
            user=os.environ["SNOWFLAKE_USER"],
            password=os.environ["SNOWFLAKE_PASSWORD"],
            database=os.environ.get("SNOWFLAKE_DATABASE", "EC_SITE_DB"),
            schema=os.environ.get("SNOWFLAKE_SCHEMA", "PUBLIC"),
            warehouse=os.environ.get("SNOWFLAKE_WAREHOUSE", "EC_SITE_WH"),
            role=os.environ.get("SNOWFLAKE_ROLE", "ACCOUNTADMIN"),
        )

_conn = None

def get_conn():
    global _conn
    if _conn is None or _conn.is_closed():
        _conn = _get_connection()
    return _conn

def fetch_all(sql: str, params: tuple = ()):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(sql, params)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]

def execute(sql: str, params: tuple = ()):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(sql, params)
    return cur
