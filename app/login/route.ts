export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const error = new URL(request.url).searchParams.has('error');
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,interactive-widget=resizes-content">
<title>LP Insight — Clinic Portal Sign In</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    min-height: 100dvh;
    width: 100%;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    background: radial-gradient(circle at 50% 10%, #EEF6F1 0%, #FFFFFF 55%, #F0F5F2 100%);
    color: #111815;
  }
  .page {
    min-height: 100dvh;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.25rem;
    position: relative;
    overflow: hidden;
  }
  .bg-glow-1 {
    position: fixed;
    top: -10%;
    left: 14%;
    width: 380px;
    height: 380px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(37, 80, 63, 0.14) 0%, rgba(37, 80, 63, 0) 70%);
    pointer-events: none;
  }
  .bg-glow-2 {
    position: fixed;
    bottom: -12%;
    right: 12%;
    width: 420px;
    height: 420px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(16, 185, 129, 0.14) 0%, rgba(16, 185, 129, 0) 70%);
    pointer-events: none;
  }
  .card {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 960px;
    background: #FFFFFF;
    border-radius: 24px;
    border: 1px solid rgba(37, 80, 63, 0.16);
    box-shadow: 0 24px 64px -14px rgba(24, 56, 44, 0.16), 0 2px 10px rgba(0, 0, 0, 0.04);
    display: flex;
    overflow: hidden;
  }
  .left-panel {
    width: 375px;
    flex-shrink: 0;
    background: linear-gradient(155deg, #10261E 0%, #1B3D30 50%, #0D1E18 100%);
    color: #FFFFFF;
    padding: 2rem 1.85rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
    border-right: 1px solid rgba(255, 255, 255, 0.08);
  }
  .left-glow {
    position: absolute;
    top: -20%;
    right: -20%;
    width: 260px;
    height: 260px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(16, 185, 129, 0.28) 0%, transparent 70%);
    pointer-events: none;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.28rem 0.65rem;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.14);
    font-size: 0.67rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #A7F3D0;
    margin-bottom: 1rem;
  }
  .badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10B981;
  }
  .brand-row {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    margin-bottom: 0.4rem;
  }
  .brand-icon {
    width: 38px;
    height: 38px;
    border-radius: 11px;
    background: linear-gradient(135deg, #2F6650 0%, #1E4435 100%);
    border: 1px solid rgba(167, 243, 208, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 0.95rem;
    color: #FFFFFF;
    box-shadow: 0 4px 16px rgba(16, 185, 129, 0.28);
  }
  .brand-title {
    font-size: 1.45rem;
    font-weight: 800;
    color: #FFFFFF;
    letter-spacing: -0.02em;
    margin: 0;
  }
  .brand-desc {
    font-size: 0.82rem;
    color: rgba(255, 255, 255, 0.76);
    line-height: 1.45;
    margin: 0.2rem 0 1.25rem 0;
  }
  .guide-box {
    display: flex;
    flex-direction: column;
    gap: 0.72rem;
    background: rgba(255, 255, 255, 0.04);
    padding: 0.95rem;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  .guide-title {
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #6EE7B7;
    margin-bottom: 0.1rem;
  }
  .step {
    display: flex;
    gap: 0.65rem;
    align-items: flex-start;
  }
  .step-num {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.72rem;
    font-weight: 800;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .s1 { background: rgba(16, 185, 129, 0.22); border: 1px solid rgba(16, 185, 129, 0.5); color: #6EE7B7; }
  .s2 { background: rgba(56, 189, 248, 0.2); border: 1px solid rgba(56, 189, 248, 0.45); color: #7DD3FC; }
  .s3 { background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.45); color: #FCD34D; }
  .step-h { font-size: 0.79rem; font-weight: 700; color: #FFFFFF; }
  .step-p { font-size: 0.71rem; color: rgba(255, 255, 255, 0.68); line-height: 1.35; margin-top: 1px; }
  .step-p strong { color: #D1FAE5; }
  .left-footer {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.55);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 0.75rem;
    margin-top: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .right-panel {
    flex: 1;
    padding: 2.15rem 2.4rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-width: 0;
  }
  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.25rem;
  }
  .portal-label {
    font-size: 0.74rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #25503F;
  }
  .domain-pill {
    font-size: 0.72rem;
    font-weight: 700;
    color: #065F46;
    background: #ECFDF5;
    border: 1px solid #A7F3D0;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
  }
  h1 {
    font-size: 1.65rem;
    font-weight: 800;
    color: #111815;
    margin: 0 0 0.35rem 0;
    letter-spacing: -0.025em;
  }
  .subtitle {
    font-size: 0.86rem;
    color: #5C6B63;
    margin: 0 0 1.4rem 0;
    line-height: 1.45;
  }
  .alert {
    display: none;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 0.85rem;
    background: #FEF2F2;
    border: 1px solid #FECACA;
    border-radius: 10px;
    color: #B91C1C;
    font-size: 0.8rem;
    font-weight: 500;
    margin-bottom: 1.1rem;
  }
  .alert.show { display: flex; }
  .form-stack {
    display: flex;
    flex-direction: column;
    gap: 1.05rem;
  }
  .field label {
    display: block;
    font-size: 0.82rem;
    font-weight: 700;
    color: #1D2B25;
    margin-bottom: 0.35rem;
  }
  .input-wrap {
    position: relative;
  }
  .input-icon {
    position: absolute;
    left: 13px;
    top: 50%;
    transform: translateY(-50%);
    color: #7D8C84;
    display: flex;
    pointer-events: none;
  }
  .field input[type="email"],
  .field input[type="password"],
  .field input[type="text"] {
    width: 100%;
    padding: 0.74rem 2.6rem 0.74rem 2.5rem;
    font-size: 0.9rem;
    font-family: inherit;
    border-radius: 11px;
    border: 1.5px solid #DCE4DF;
    outline: none;
    background: #FFFFFF;
    color: #111815;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .field input:focus {
    border-color: #25503F;
    box-shadow: 0 0 0 3px rgba(37, 80, 63, 0.12);
  }
  .field input.valid {
    border-color: #10B981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
  }
  .field input.invalid {
    border-color: #EF4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
  }
  .toggle-pw {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #7D8C84;
    cursor: pointer;
    padding: 4px;
    display: flex;
  }
  .domain-hint {
    display: none;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.75rem;
    font-weight: 600;
    margin-top: 0.35rem;
  }
  .domain-hint.ok { display: flex; color: #059669; }
  .domain-hint.err { display: flex; color: #DC2626; }
  .remember-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .remember-row input {
    width: 15px;
    height: 15px;
    accent-color: #25503F;
    cursor: pointer;
  }
  .remember-row label {
    font-size: 0.79rem;
    color: #55635C;
    cursor: pointer;
    user-select: none;
  }
  .submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.82rem;
    border-radius: 11px;
    background: linear-gradient(135deg, #25503F 0%, #1A3A2D 100%);
    color: #FFFFFF;
    font-family: inherit;
    font-weight: 700;
    font-size: 0.92rem;
    border: none;
    cursor: pointer;
    box-shadow: 0 6px 18px -3px rgba(37, 80, 63, 0.38);
    transition: opacity 0.15s, transform 0.15s;
  }
  .submit-btn:hover { opacity: 0.95; }
  .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  details.register-box {
    margin-top: 1.15rem;
    border: 1px solid #E2E9E5;
    border-radius: 12px;
    padding: 0.7rem 0.9rem;
    background: #F8FBF9;
  }
  details.register-box summary {
    cursor: pointer;
    font-size: 0.82rem;
    font-weight: 700;
    color: #25503F;
    user-select: none;
  }
  .register-form {
    margin-top: 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .register-form input {
    padding: 0.62rem 0.8rem !important;
  }
  .register-status {
    font-size: 0.78rem;
    font-weight: 600;
    margin: 0.25rem 0 0;
    color: #25503F;
  }
  .register-status.err { color: #B91C1C; }
  .right-footer {
    font-size: 0.73rem;
    color: #7D8C84;
    border-top: 1px solid #EEF2EF;
    padding-top: 0.75rem;
    margin-top: 1.15rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .policy-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: #059669;
    font-weight: 600;
  }
  @media (max-width: 820px) {
    .card { flex-direction: column; max-width: 520px; }
    .left-panel { width: 100%; padding: 1.5rem; }
    .right-panel { padding: 1.5rem; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="bg-glow-1"></div>
  <div class="bg-glow-2"></div>
  <main class="card">
    <section class="left-panel">
      <div class="left-glow"></div>
      <div style="position:relative;z-index:2">
        <div class="badge"><span class="badge-dot"></span>ClinicLivingPlus Security</div>
        <div class="brand-row">
          <div class="brand-icon">lp</div>
          <h2 class="brand-title">LP Insight</h2>
        </div>
        <p class="brand-desc">Evidence-grounded clinical library &amp; research workspace for authorized practitioners.</p>

        <div class="guide-box">
          <div class="guide-title">How To Sign In · Step-by-Step</div>
          <div class="step">
            <div class="step-num s1">1</div>
            <div>
              <div class="step-h">Use your clinic email</div>
              <div class="step-p">Sign in with your official <strong>@cliniclivingplus.com</strong> address.</div>
            </div>
          </div>
          <div class="step">
            <div class="step-num s2">2</div>
            <div>
              <div class="step-h">Enter your password</div>
              <div class="step-p">Use your personal LP Insight password to access your private saved chats.</div>
            </div>
          </div>
          <div class="step">
            <div class="step-num s3">3</div>
            <div>
              <div class="step-h">First time here?</div>
              <div class="step-p">Open <strong>Create an account</strong> below with your clinic email and administrator invitation password.</div>
            </div>
          </div>
        </div>
      </div>

      <div class="left-footer">
        <span>256-bit Cryptographic HMAC</span>
        <span style="color:#6EE7B7;font-weight:700">@cliniclivingplus.com</span>
      </div>
    </section>

    <section class="right-panel">
      <div>
        <div class="top-bar">
          <span class="portal-label">Clinic Portal</span>
          <span class="domain-pill">@cliniclivingplus.com only</span>
        </div>

        <h1>Sign In</h1>
        <p class="subtitle">Enter your ClinicLivingPlus work email and password to continue.</p>

        <div id="loginError" class="alert${error ? ' show' : ''}" role="alert">
          <span id="loginErrorText">${error ? 'Sign-in failed. Check your @cliniclivingplus.com email and password, then try again.' : ''}</span>
        </div>

        <form id="loginForm" class="form-stack" method="post" action="/api/login">
          <div class="field">
            <label for="email">Work Email Address</label>
            <div class="input-wrap">
              <span class="input-icon" aria-hidden="true">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </span>
              <input id="email" name="email" type="email" autocomplete="username" placeholder="doctor@cliniclivingplus.com" maxlength="254" required>
            </div>
            <div id="emailHint" class="domain-hint"></div>
          </div>

          <div class="field">
            <label for="password">Password</label>
            <div class="input-wrap">
              <span class="input-icon" aria-hidden="true">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </span>
              <input id="password" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" maxlength="200" required>
              <button type="button" id="togglePw" class="toggle-pw" aria-label="Show password">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>

          <div class="remember-row">
            <input type="checkbox" id="rememberMe" name="rememberMe" checked>
            <label for="rememberMe">Keep me signed in on this workstation (7 days)</label>
          </div>

          <button id="loginSubmit" type="submit" class="submit-btn">
            <span>Sign In to Clinical Portal</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </button>
        </form>

        <details class="register-box">
          <summary>First time here? Create an account</summary>
          <form id="register" class="register-form">
            <div class="field">
              <label for="name">Your name</label>
              <input id="name" name="name" type="text" autocomplete="name" placeholder="Dr. Jane Doe" maxlength="80" required>
            </div>
            <div class="field">
              <label for="newEmail">Clinic email (@cliniclivingplus.com)</label>
              <input id="newEmail" name="email" type="email" autocomplete="username" placeholder="doctor@cliniclivingplus.com" maxlength="254" required>
              <div id="newEmailHint" class="domain-hint"></div>
            </div>
            <div class="field">
              <label for="newPassword">New password (12–200 characters)</label>
              <input id="newPassword" name="password" type="password" autocomplete="new-password" minlength="12" maxlength="200" required>
            </div>
            <div class="field">
              <label for="invite">Administrator invitation password</label>
              <input id="invite" name="invite" type="password" autocomplete="off" maxlength="200" required>
            </div>
            <button id="registerSubmit" type="submit" class="submit-btn">Create Account</button>
            <p id="registerStatus" class="register-status" role="status"></p>
          </form>
        </details>
      </div>

      <div class="right-footer">
        <span class="policy-tag">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
          Strict Clinic Domain Policy
        </span>
        <span>Do not enter identifying patient information.</span>
      </div>
    </section>
  </main>
</div>

<script>
  const DOMAIN = '@cliniclivingplus.com';
  const emailInput = document.getElementById('email');
  const emailHint = document.getElementById('emailHint');
  const newEmailInput = document.getElementById('newEmail');
  const newEmailHint = document.getElementById('newEmailHint');
  const loginError = document.getElementById('loginError');
  const loginErrorText = document.getElementById('loginErrorText');

  function updateDomainFeedback(input, hintEl) {
    const val = input.value.trim().toLowerCase();
    const hasAt = val.includes('@');
    const isClinic = val.endsWith(DOMAIN) && val.indexOf('@') > 0;
    const isOther = hasAt && !isClinic && (val.split('@')[1] || '').includes('.');
    input.classList.toggle('valid', isClinic);
    input.classList.toggle('invalid', isOther);
    if (isClinic) {
      hintEl.className = 'domain-hint ok';
      hintEl.textContent = '✓ Verified ClinicLivingPlus Domain';
    } else if (isOther) {
      hintEl.className = 'domain-hint err';
      hintEl.textContent = '✕ Only @cliniclivingplus.com work emails are permitted';
    } else {
      hintEl.className = 'domain-hint';
      hintEl.textContent = '';
    }
    return isClinic;
  }

  emailInput.addEventListener('input', () => {
    updateDomainFeedback(emailInput, emailHint);
    loginError.classList.remove('show');
  });
  newEmailInput.addEventListener('input', () => updateDomainFeedback(newEmailInput, newEmailHint));

  document.getElementById('togglePw').addEventListener('click', () => {
    const pw = document.getElementById('password');
    const show = pw.type === 'password';
    pw.type = show ? 'text' : 'password';
    document.getElementById('togglePw').setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.remove('show');
    const email = emailInput.value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    if (!email.endsWith(DOMAIN) || email.indexOf('@') <= 0) {
      loginErrorText.textContent = 'Access Denied: Only @cliniclivingplus.com email addresses are permitted.';
      loginError.classList.add('show');
      emailInput.classList.add('invalid');
      emailInput.focus();
      return;
    }

    const btn = document.getElementById('loginSubmit');
    btn.disabled = true;
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        loginErrorText.textContent = data.error || 'Authentication failed. Check your clinic email and password.';
        loginError.classList.add('show');
        btn.disabled = false;
        return;
      }
      window.location.href = '/';
    } catch {
      loginErrorText.textContent = 'Network or server connection error. Please try again.';
      loginError.classList.add('show');
      btn.disabled = false;
    }
  });

  document.getElementById('register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = document.getElementById('registerSubmit');
    const status = document.getElementById('registerStatus');
    status.className = 'register-status';
    status.textContent = '';

    const email = newEmailInput.value.trim().toLowerCase();
    if (!email.endsWith(DOMAIN) || email.indexOf('@') <= 0) {
      status.className = 'register-status err';
      status.textContent = 'Access Denied: Only @cliniclivingplus.com email addresses are permitted.';
      newEmailInput.classList.add('invalid');
      newEmailInput.focus();
      return;
    }

    btn.disabled = true;
    try {
      const response = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Account could not be created');
      emailInput.value = email;
      updateDomainFeedback(emailInput, emailHint);
      form.reset();
      updateDomainFeedback(newEmailInput, newEmailHint);
      status.textContent = 'Account created. Sign in above with your @cliniclivingplus.com email and password.';
      document.getElementById('password').focus();
    } catch (err) {
      status.className = 'register-status err';
      status.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });
</script>
</body>
</html>`;

    return new Response(html, {
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store'
        }
    });
}
