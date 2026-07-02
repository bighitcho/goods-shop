// 토스 페이먼츠 결제 위젯
let tossWidgets = null;

async function initTossWidget(amount) {
  const user = await getCurrentUser();
  const customerKey = user ? user.id : '__GUEST__';

  const tossPayments = TossPayments(TOSS_CLIENT_KEY);
  tossWidgets = tossPayments.widgets({ customerKey });

  await tossWidgets.setAmount({ currency: 'KRW', value: amount });
  await Promise.all([
    tossWidgets.renderPaymentMethods({ selector: '#payment-widget', variantKey: 'DEFAULT' }),
    tossWidgets.renderAgreement({ selector: '#agreement', variantKey: 'AGREEMENT' }),
  ]);
}

async function requestPayment(orderId, orderName, amount, user) {
  if (!tossWidgets) throw new Error('결제 위젯이 초기화되지 않았습니다.');

  const baseUrl = window.location.href.replace(/\/[^/]+(\?.*)?$/, '');

  await tossWidgets.requestPayment({
    orderId,
    orderName,
    successUrl: `${baseUrl}/success.html`,
    failUrl:    `${baseUrl}/fail.html`,
    customerEmail: user.email,
    customerName:  user.user_metadata?.name || user.email,
  });
}

// 주문 생성 (결제 요청 전 DB에 pending 상태로 저장)
async function createOrder(user, cart) {
  const orderId = 'order-' + crypto.randomUUID();
  const amount  = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const { data: order, error } = await db
    .from('orders')
    .insert({ user_id: user.id, toss_order_id: orderId, amount, status: 'pending' })
    .select()
    .single();
  if (error) throw error;

  const items = cart.map(i => ({
    order_id:   order.id,
    product_id: i.id,
    quantity:   i.quantity,
    price:      i.price,
  }));
  const { error: itemsError } = await db.from('order_items').insert(items);
  if (itemsError) throw itemsError;

  return { orderId, order, amount };
}

// 결제 확인 (success.html에서 호출)
async function confirmPayment(paymentKey, orderId, amount) {
  const { data: { session } } = await db.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/confirm-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || '결제 확인 실패');
  return json;
}
