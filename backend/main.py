"""FastAPI ECサイト バックエンドAPI"""

import hashlib
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from snowflake_client import fetch_all, execute

app = FastAPI(title="EC Site API", root_path="/api")


# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------
class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    email: str = ""
    full_name: str = ""

class CartAddRequest(BaseModel):
    product_id: int
    quantity: int = 1

class CartUpdateRequest(BaseModel):
    quantity: int

class ProductCreateRequest(BaseModel):
    name: str
    description: str = ""
    price: int
    stock: int = 0
    category_id: int
    image_url: str = ""

class OrderStatusRequest(BaseModel):
    status: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def sha256(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
@app.post("/auth/login")
def login(req: LoginRequest):
    rows = fetch_all(
        "SELECT * FROM USERS WHERE USERNAME=%s AND PASSWORD_HASH=%s",
        (req.username, sha256(req.password)),
    )
    if not rows:
        raise HTTPException(status_code=401, detail="ユーザー名またはパスワードが正しくありません")
    user = rows[0]
    return {"user": user}


@app.post("/auth/register")
def register(req: RegisterRequest):
    if not req.username or not req.full_name:
        raise HTTPException(status_code=400, detail="ユーザー名と氏名は必須です")
    existing = fetch_all("SELECT 1 FROM USERS WHERE USERNAME=%s", (req.username,))
    if existing:
        raise HTTPException(status_code=409, detail="そのユーザー名は既に使われています")
    execute(
        "INSERT INTO USERS (USERNAME,PASSWORD_HASH,EMAIL,FULL_NAME) VALUES(%s,%s,%s,%s)",
        (req.username, sha256(req.password), req.email, req.full_name),
    )
    rows = fetch_all("SELECT * FROM USERS WHERE USERNAME=%s", (req.username,))
    return {"user": rows[0]}


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------
@app.get("/categories")
def get_categories():
    return fetch_all("SELECT * FROM CATEGORIES ORDER BY CATEGORY_ID")


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------
@app.get("/products")
def get_products(keyword: str = "", category_id: Optional[int] = None):
    where, params = [], []
    if keyword:
        where.append("P.NAME ILIKE %s")
        params.append(f"%{keyword}%")
    if category_id:
        where.append("P.CATEGORY_ID = %s")
        params.append(category_id)
    where_clause = ("WHERE " + " AND ".join(where)) if where else ""
    return fetch_all(
        f"""
        SELECT P.*, C.NAME AS CATEGORY_NAME
        FROM PRODUCTS P
        LEFT JOIN CATEGORIES C ON P.CATEGORY_ID = C.CATEGORY_ID
        {where_clause}
        ORDER BY P.PRODUCT_ID
        """,
        tuple(params),
    )


# ---------------------------------------------------------------------------
# Cart
# ---------------------------------------------------------------------------
@app.get("/cart/{user_id}")
def get_cart(user_id: int):
    return fetch_all(
        """
        SELECT CI.CART_ITEM_ID, CI.QUANTITY, P.PRODUCT_ID, P.NAME, P.PRICE, P.IMAGE_URL, P.STOCK
        FROM CART_ITEMS CI
        JOIN PRODUCTS P ON CI.PRODUCT_ID = P.PRODUCT_ID
        WHERE CI.USER_ID = %s
        ORDER BY CI.ADDED_AT
        """,
        (user_id,),
    )


@app.post("/cart/{user_id}")
def add_to_cart(user_id: int, req: CartAddRequest):
    existing = fetch_all(
        "SELECT CART_ITEM_ID, QUANTITY FROM CART_ITEMS WHERE USER_ID=%s AND PRODUCT_ID=%s",
        (user_id, req.product_id),
    )
    if existing:
        execute(
            "UPDATE CART_ITEMS SET QUANTITY=QUANTITY+%s WHERE CART_ITEM_ID=%s",
            (req.quantity, existing[0]["CART_ITEM_ID"]),
        )
    else:
        execute(
            "INSERT INTO CART_ITEMS (USER_ID,PRODUCT_ID,QUANTITY) VALUES(%s,%s,%s)",
            (user_id, req.product_id, req.quantity),
        )
    return {"message": "カートに追加しました"}


@app.put("/cart/{user_id}/{cart_item_id}")
def update_cart_item(user_id: int, cart_item_id: int, req: CartUpdateRequest):
    execute(
        "UPDATE CART_ITEMS SET QUANTITY=%s WHERE CART_ITEM_ID=%s AND USER_ID=%s",
        (req.quantity, cart_item_id, user_id),
    )
    return {"message": "数量を更新しました"}


@app.delete("/cart/{user_id}/{cart_item_id}")
def delete_cart_item(user_id: int, cart_item_id: int):
    execute("DELETE FROM CART_ITEMS WHERE CART_ITEM_ID=%s AND USER_ID=%s", (cart_item_id, user_id))
    return {"message": "カートから削除しました"}


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------
@app.get("/orders/{user_id}")
def get_orders(user_id: int):
    orders = fetch_all(
        "SELECT * FROM ORDERS WHERE USER_ID=%s ORDER BY CREATED_AT DESC",
        (user_id,),
    )
    for o in orders:
        o["items"] = fetch_all(
            """
            SELECT OI.*, P.NAME
            FROM ORDER_ITEMS OI
            JOIN PRODUCTS P ON OI.PRODUCT_ID = P.PRODUCT_ID
            WHERE OI.ORDER_ID = %s
            """,
            (o["ORDER_ID"],),
        )
    return orders


@app.post("/orders/{user_id}")
def create_order(user_id: int):
    items = fetch_all(
        """
        SELECT CI.CART_ITEM_ID, CI.QUANTITY, P.PRODUCT_ID, P.PRICE, P.STOCK
        FROM CART_ITEMS CI
        JOIN PRODUCTS P ON CI.PRODUCT_ID = P.PRODUCT_ID
        WHERE CI.USER_ID = %s
        """,
        (user_id,),
    )
    if not items:
        raise HTTPException(status_code=400, detail="カートが空です")

    total = sum(it["PRICE"] * it["QUANTITY"] for it in items)
    execute(
        "INSERT INTO ORDERS (USER_ID, TOTAL_AMOUNT, STATUS) VALUES (%s, %s, '注文確定')",
        (user_id, total),
    )
    order = fetch_all("SELECT MAX(ORDER_ID) AS OID FROM ORDERS WHERE USER_ID=%s", (user_id,))
    order_id = order[0]["OID"]

    for it in items:
        execute(
            "INSERT INTO ORDER_ITEMS (ORDER_ID, PRODUCT_ID, QUANTITY, UNIT_PRICE) VALUES (%s,%s,%s,%s)",
            (order_id, it["PRODUCT_ID"], it["QUANTITY"], it["PRICE"]),
        )
        execute(
            "UPDATE PRODUCTS SET STOCK = STOCK - %s WHERE PRODUCT_ID = %s",
            (it["QUANTITY"], it["PRODUCT_ID"]),
        )
    execute("DELETE FROM CART_ITEMS WHERE USER_ID=%s", (user_id,))
    return {"order_id": order_id, "total": total}


# ---------------------------------------------------------------------------
# Admin - Products
# ---------------------------------------------------------------------------
@app.get("/admin/products")
def admin_get_products():
    return fetch_all(
        """
        SELECT P.PRODUCT_ID, P.NAME, P.DESCRIPTION, P.PRICE, P.STOCK,
               P.IMAGE_URL, P.CATEGORY_ID, C.NAME AS CATEGORY_NAME
        FROM PRODUCTS P LEFT JOIN CATEGORIES C ON P.CATEGORY_ID=C.CATEGORY_ID
        ORDER BY P.PRODUCT_ID
        """
    )


@app.post("/admin/products")
def admin_create_product(req: ProductCreateRequest):
    execute(
        "INSERT INTO PRODUCTS (NAME,DESCRIPTION,PRICE,STOCK,CATEGORY_ID,IMAGE_URL) VALUES(%s,%s,%s,%s,%s,%s)",
        (req.name, req.description, req.price, req.stock, req.category_id, req.image_url),
    )
    return {"message": f"「{req.name}」を追加しました"}


@app.delete("/admin/products/{product_id}")
def admin_delete_product(product_id: int):
    execute("DELETE FROM ORDER_ITEMS WHERE PRODUCT_ID=%s", (product_id,))
    execute("DELETE FROM CART_ITEMS WHERE PRODUCT_ID=%s", (product_id,))
    execute("DELETE FROM PRODUCTS WHERE PRODUCT_ID=%s", (product_id,))
    return {"message": "商品を削除しました"}


# ---------------------------------------------------------------------------
# Admin - Orders
# ---------------------------------------------------------------------------
@app.get("/admin/orders")
def admin_get_orders():
    orders = fetch_all(
        """
        SELECT O.*, U.FULL_NAME
        FROM ORDERS O JOIN USERS U ON O.USER_ID = U.USER_ID
        ORDER BY O.CREATED_AT DESC
        """
    )
    for o in orders:
        o["items"] = fetch_all(
            "SELECT OI.*, P.NAME FROM ORDER_ITEMS OI JOIN PRODUCTS P ON OI.PRODUCT_ID=P.PRODUCT_ID WHERE OI.ORDER_ID=%s",
            (o["ORDER_ID"],),
        )
    return orders


@app.put("/admin/orders/{order_id}")
def admin_update_order_status(order_id: int, req: OrderStatusRequest):
    execute("UPDATE ORDERS SET STATUS=%s WHERE ORDER_ID=%s", (req.status, order_id))
    return {"message": "ステータスを更新しました"}


# ---------------------------------------------------------------------------
# Admin - Dashboard
# ---------------------------------------------------------------------------
@app.get("/admin/dashboard")
def admin_dashboard():
    total_sales = fetch_all(
        "SELECT COALESCE(SUM(TOTAL_AMOUNT),0) AS VALUE FROM ORDERS WHERE STATUS != 'キャンセル'"
    )
    total_orders = fetch_all("SELECT COUNT(*) AS VALUE FROM ORDERS")
    total_users = fetch_all("SELECT COUNT(*) AS VALUE FROM USERS WHERE IS_ADMIN=FALSE")

    category_sales = fetch_all(
        """
        SELECT C.NAME AS CATEGORY, COALESCE(SUM(OI.UNIT_PRICE * OI.QUANTITY),0) AS SALES
        FROM CATEGORIES C
        LEFT JOIN PRODUCTS P ON C.CATEGORY_ID = P.CATEGORY_ID
        LEFT JOIN ORDER_ITEMS OI ON P.PRODUCT_ID = OI.PRODUCT_ID
        LEFT JOIN ORDERS O ON OI.ORDER_ID = O.ORDER_ID AND O.STATUS != 'キャンセル'
        GROUP BY C.NAME ORDER BY SALES DESC
        """
    )

    top_products = fetch_all(
        """
        SELECT P.NAME, SUM(OI.QUANTITY) AS SOLD, SUM(OI.UNIT_PRICE * OI.QUANTITY) AS REVENUE
        FROM ORDER_ITEMS OI
        JOIN PRODUCTS P ON OI.PRODUCT_ID = P.PRODUCT_ID
        JOIN ORDERS O ON OI.ORDER_ID = O.ORDER_ID AND O.STATUS != 'キャンセル'
        GROUP BY P.NAME ORDER BY REVENUE DESC LIMIT 10
        """
    )

    return {
        "total_sales": total_sales[0]["VALUE"],
        "total_orders": total_orders[0]["VALUE"],
        "total_users": total_users[0]["VALUE"],
        "category_sales": category_sales,
        "top_products": top_products,
    }


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok"}
