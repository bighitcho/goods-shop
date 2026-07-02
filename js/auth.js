// Supabase 클라이언트 (전역)
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getCurrentUser() {
  const { data: { user } } = await db.auth.getUser();
  return user;
}

async function getProfile(userId) {
  const { data } = await db.from('profiles').select('*').eq('id', userId).single();
  return data;
}

async function isAdmin() {
  const user = await getCurrentUser();
  if (!user) return false;
  const profile = await getProfile(user.id);
  return profile?.is_admin === true;
}

async function requireAuth(redirect = 'login.html') {
  const user = await getCurrentUser();
  if (!user) { window.location.href = redirect; return null; }
  return user;
}

async function requireAdmin() {
  const user = await requireAuth();
  if (!user) return false;
  const admin = await isAdmin();
  if (!admin) {
    showToast('관리자만 접근할 수 있습니다.');
    setTimeout(() => window.location.href = 'index.html', 1000);
    return false;
  }
  return true;
}

async function signIn(email, password) {
  return await db.auth.signInWithPassword({ email, password });
}

async function signUp(email, password, name) {
  const { data, error } = await db.auth.signUp({ email, password });
  if (error) return { error };
  // 이름 업데이트 (트리거가 먼저 profiles 생성)
  if (data.user && name) {
    await db.from('profiles').update({ name }).eq('id', data.user.id);
  }
  return { data };
}

async function signOut() {
  await db.auth.signOut();
  window.location.href = 'index.html';
}

// 상단 네비게이션 렌더링
async function renderNav() {
  const user = await getCurrentUser();
  const navAuth = document.getElementById('nav-auth');
  if (!navAuth) return;

  if (user) {
    const admin = await isAdmin();
    navAuth.innerHTML = `
      ${admin ? `<a href="admin.html">⚙️ 관리자</a>` : ''}
      <a href="my-orders.html">내 주문</a>
      <button class="btn btn-outline btn-sm" onclick="signOut()">로그아웃</button>
    `;
  } else {
    navAuth.innerHTML = `
      <a href="login.html">로그인</a>
      <a href="signup.html" class="btn btn-primary btn-sm">회원가입</a>
    `;
  }
}

// 공통 토스트 메시지 (products.js에도 정의되지만 auth만 로드된 페이지용)
function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  requestAnimationFrame(() => {
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  });
}
