const CART_KEY = 'goods_cart';

/* ── 장바구니 ── */
function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
}
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}
function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
}
function addToCart(product) {
  const cart = getCart();
  const existing = cart.find(i => i.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  saveCart(cart);
  showToast(`🛒 ${product.name}을(를) 담았어요!`);
}
function changeQty(productId, delta) {
  const cart = getCart().map(i => i.id === productId ? { ...i, quantity: i.quantity + delta } : i).filter(i => i.quantity > 0);
  saveCart(cart);
  renderCartItems();
}
function getCartTotal() {
  return getCart().reduce((s, i) => s + i.price * i.quantity, 0);
}
function getCartCount() {
  return getCart().reduce((s, i) => s + i.quantity, 0);
}
function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const count = getCartCount();
  badge.textContent = count > 0 ? count : '';
  badge.style.display = count > 0 ? 'flex' : 'none';
}

/* ── 장바구니 모달 ── */
function openCart() {
  document.getElementById('cart-modal')?.classList.add('open');
  renderCartItems();
}
function closeCart() {
  document.getElementById('cart-modal')?.classList.remove('open');
}
function renderCartItems() {
  const el = document.getElementById('cart-items');
  if (!el) return;
  const cart = getCart();
  if (cart.length === 0) {
    el.innerHTML = '<p class="cart-empty">장바구니가 비어있어요 🧺</p>';
    document.getElementById('cart-total-amount').textContent = '0원';
    return;
  }
  el.innerHTML = cart.map(item => `
    <div class="cart-item">
      <span class="cart-item-name">${item.name}</span>
      <div class="cart-item-qty">
        <button onclick="changeQty('${item.id}', -1)">−</button>
        <span>${item.quantity}</span>
        <button onclick="changeQty('${item.id}', 1)">+</button>
      </div>
      <span class="cart-item-price">${(item.price * item.quantity).toLocaleString()}원</span>
    </div>
  `).join('');
  document.getElementById('cart-total-amount').textContent = getCartTotal().toLocaleString() + '원';
}

async function goToCheckout() {
  const user = await getCurrentUser();
  if (!user) {
    closeCart();
    showToast('로그인이 필요합니다.');
    setTimeout(() => window.location.href = 'login.html', 1200);
    return;
  }
  if (getCart().length === 0) {
    showToast('장바구니가 비어있어요!');
    return;
  }
  window.location.href = 'checkout.html';
}

/* ── 상품 로드 ── */
async function loadProducts() {
  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}

/* ── 상품 카드 렌더 ── */
function renderProductCard(p) {
  const safeName = p.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
  const safeImg = (p.image_url || '').replace(/'/g, "\\'");
  const emoji = ['🎀', '🌸', '✨', '🎁', '🍓'][Math.floor(Math.random() * 5)];
  return `
    <div class="product-card">
      <div class="product-img">
        ${p.image_url
          ? `<img src="${p.image_url}" alt="${p.name}" onerror="this.parentElement.innerHTML='<span class=\\'product-img-placeholder\\'>${emoji}</span>'">`
          : `<span class="product-img-placeholder">${emoji}</span>`}
      </div>
      <div class="product-info">
        <h3 class="product-name">${p.name}</h3>
        <p class="product-desc">${p.description || ''}</p>
        <div class="product-footer">
          <span class="product-price">${p.price.toLocaleString()}원</span>
          <span class="product-stock">${p.stock > 0 ? `재고 ${p.stock}개` : '<span class="out-of-stock">품절</span>'}</span>
        </div>
        <button class="btn btn-primary"
          onclick="addToCart({id:'${p.id}',name:'${safeName}',price:${p.price},image_url:'${safeImg}'})"
          ${p.stock === 0 ? 'disabled' : ''}>
          ${p.stock === 0 ? '품절' : '🛒 장바구니 담기'}
        </button>
      </div>
    </div>`;
}

/* ── 토스트 ── */
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) { toast = document.createElement('div'); toast.className = 'toast'; document.body.appendChild(toast); }
  toast.textContent = msg;
  void toast.offsetWidth; // reflow
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
}
