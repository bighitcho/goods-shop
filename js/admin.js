async function loadAllOrders(statusFilter = '') {
  let query = db
    .from('orders')
    .select(`*, order_items(quantity, price, products(name)), profiles(email, name)`)
    .order('created_at', { ascending: false });
  if (statusFilter) query = query.eq('status', statusFilter);
  const { data, error } = await query;
  if (error) { console.error(error); return []; }
  return data;
}

function renderAdminRow(order) {
  const date = new Date(order.created_at).toLocaleString('ko-KR');
  const items = (order.order_items || []).map(i => `${i.products?.name} ×${i.quantity}`).join(', ');
  const statusClass = { pending: 'badge-pending', success: 'badge-success', failed: 'badge-failed', cancelled: 'badge-cancelled' };
  const statusLabel = { pending: '대기', success: '완료', failed: '실패', cancelled: '취소' };
  return `
    <tr>
      <td>${date}</td>
      <td>${order.profiles?.email || '-'}<br><small style="color:var(--text-light)">${order.profiles?.name || ''}</small></td>
      <td style="max-width:200px;word-break:break-all">${items}</td>
      <td><strong>${order.amount.toLocaleString()}원</strong></td>
      <td><span class="badge ${statusClass[order.status] || ''}">${statusLabel[order.status] || order.status}</span></td>
      <td><small style="color:var(--text-light);word-break:break-all">${order.toss_order_id}</small></td>
    </tr>`;
}

async function initAdmin() {
  const ok = await requireAdmin();
  if (!ok) return;

  await renderNav();

  const tbody = document.getElementById('orders-tbody');
  const filterEl = document.getElementById('status-filter');
  const totalEl = document.getElementById('total-count');
  const amountEl = document.getElementById('total-amount');

  async function reload() {
    tbody.innerHTML = '<tr><td colspan="6" class="loading">불러오는 중...</td></tr>';
    const orders = await loadAllOrders(filterEl?.value || '');

    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-light)">주문 없음</td></tr>';
    } else {
      tbody.innerHTML = orders.map(renderAdminRow).join('');
    }

    const successOrders = orders.filter(o => o.status === 'success');
    if (totalEl) totalEl.textContent = `총 ${orders.length}건`;
    if (amountEl) amountEl.textContent = `결제 완료: ${successOrders.reduce((s, o) => s + o.amount, 0).toLocaleString()}원`;
  }

  filterEl?.addEventListener('change', reload);
  await reload();
}
