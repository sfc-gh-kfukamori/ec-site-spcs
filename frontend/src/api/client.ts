const BASE = '/api';

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'エラーが発生しました' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  login: (username: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  register: (username: string, password: string, email: string, full_name: string) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password, email, full_name }) }),

  getCategories: () => request('/categories'),

  getProducts: (keyword?: string, categoryId?: number) => {
    const params = new URLSearchParams();
    if (keyword) params.set('keyword', keyword);
    if (categoryId) params.set('category_id', String(categoryId));
    return request(`/products?${params}`);
  },

  getCart: (userId: number) => request(`/cart/${userId}`),

  addToCart: (userId: number, productId: number, quantity = 1) =>
    request(`/cart/${userId}`, { method: 'POST', body: JSON.stringify({ product_id: productId, quantity }) }),

  updateCartItem: (userId: number, cartItemId: number, quantity: number) =>
    request(`/cart/${userId}/${cartItemId}`, { method: 'PUT', body: JSON.stringify({ quantity }) }),

  deleteCartItem: (userId: number, cartItemId: number) =>
    request(`/cart/${userId}/${cartItemId}`, { method: 'DELETE' }),

  getOrders: (userId: number) => request(`/orders/${userId}`),

  createOrder: (userId: number) =>
    request(`/orders/${userId}`, { method: 'POST' }),

  // Admin
  adminGetProducts: () => request('/admin/products'),
  adminCreateProduct: (product: any) =>
    request('/admin/products', { method: 'POST', body: JSON.stringify(product) }),
  adminDeleteProduct: (id: number) =>
    request(`/admin/products/${id}`, { method: 'DELETE' }),

  adminGetOrders: () => request('/admin/orders'),
  adminUpdateOrderStatus: (orderId: number, status: string) =>
    request(`/admin/orders/${orderId}`, { method: 'PUT', body: JSON.stringify({ status }) }),

  adminGetDashboard: () => request('/admin/dashboard'),
};
