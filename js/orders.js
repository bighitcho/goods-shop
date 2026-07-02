const STATUS_LABEL = { pending: '결제 대기', success: '결제 완료', failed: '결제 실패', cancelled: '취소됨' };
const STATUS_CLASS = { pending: 'badge-pending', success: 'badge-success', failed: 'badge-failed', cancelled: 'badge-cancelled' };

async function loadMyOrders() {
  const { data, error } = await db
    .from('orders')
    .select(`*, order_items(*, products(name))`)
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}

function renderOrderCard(order) {
  const date = new Date(order.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const items = order.order_items || [];
  return `
    <div class="order-card">
      <div class="order-header">
        <div>
          <div class="order-id">주문번호: ${order.toss_order_id}</div>
          <div class="order-date">${date}</div>
        </div>
        <span class="badge ${STATUS_CLASS[order.status] || ''}">${STATUS_LABEL[order.status] || order.status}</span>
      </div>
      <div class="order-items-list">
        ${items.map(i => `
          <div class="order-item">
            <span>${i.products?.name || '상품'} × ${i.quantity}</span>
            <span>${(i.price * i.quantity).toLocaleString()}원</span>
          </div>
        `).join('')}
      </div>
      <div class="order-footer">
        <span class="order-amount">합계 ${order.amount.toLocaleString()}원</span>
      </div>
    </div>`;
}

async function initMyOrders() {
  const user = await requireAuth();
  if (!user) return;

  await renderNav();

  const container = document.getElementById('orders-container');
  container.innerHTML = '<div class="loading"><div class="spinner"></div>불러오는 중...</div>';

  const orders = await loadMyOrders();

  if (orders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🧺</span>
        <p>아직 주문 내역이 없어요</p>
        <a href="index.html" class="btn btn-primary" style="margin-top:16px">쇼핑하러 가기</a>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="orders-list">${orders.map(renderOrderCard).join('')}</div>`;
}
