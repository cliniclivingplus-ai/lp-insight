export const dynamic = 'force-dynamic';

export async function GET() {
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LP Insight — God View &amp; Mail Center</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #F4F7F5; color: #111815; }
  .wrap { max-width: 1180px; margin: 0 auto; padding: 1.5rem; }
  .header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
  .brand { display: flex; align-items: center; gap: 0.7rem; }
  .logo { width: 38px; height: 38px; border-radius: 10px; background: #25503F; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; }
  h1 { margin: 0; font-size: 1.35rem; font-weight: 800; }
  .sub { font-size: 0.82rem; color: #5C6B63; }
  .btn { padding: 0.58rem 1rem; border-radius: 9px; border: 1px solid #CFD9D3; background: #fff; color: #1D2B25; font-weight: 700; font-size: 0.82rem; cursor: pointer; text-decoration: none; }
  .btn:hover { background: #EEF4F0; }
  .btn-primary { background: #25503F; color: #fff; border-color: #25503F; }
  .btn-primary:hover { background: #1B3D30; }
  .btn-danger { color: #B91C1C; border-color: #FECACA; background: #FEF2F2; }
  .gate { max-width: 420px; margin: 12vh auto; background: #fff; padding: 2rem; border-radius: 18px; border: 1px solid #DCE4DF; box-shadow: 0 12px 32px rgba(17,24,21,0.08); }
  .gate input { width: 100%; padding: 0.72rem 0.9rem; border-radius: 10px; border: 1.5px solid #D3DDD7; font-size: 0.92rem; margin: 0.6rem 0 1rem; }
  .grid-4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
  .kpi { background: #fff; border: 1px solid #DCE4DF; border-radius: 14px; padding: 1.1rem 1.25rem; }
  .kpi-label { font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #5C6B63; }
  .kpi-val { font-size: 1.7rem; font-weight: 800; color: #111815; margin-top: 0.25rem; }
  .kpi-sub { font-size: 0.75rem; color: #6B7C73; margin-top: 0.2rem; }
  .tabs { display: flex; gap: 0.5rem; margin-bottom: 1.2rem; }
  .tab { padding: 0.55rem 1.1rem; border-radius: 999px; border: 1px solid #CFD9D3; background: #fff; font-weight: 700; font-size: 0.84rem; cursor: pointer; }
  .tab.active { background: #25503F; color: #fff; border-color: #25503F; }
  .card { background: #fff; border: 1px solid #DCE4DF; border-radius: 16px; padding: 1.25rem; margin-bottom: 1.25rem; overflow-x: auto; }
  .card h2 { margin: 0 0 0.85rem; font-size: 1.02rem; font-weight: 800; }
  table { width: 100%; border-collapse: collapse; font-size: 0.83rem; }
  th, td { text-align: left; padding: 0.65rem 0.75rem; border-bottom: 1px solid #EDF2EF; vertical-align: top; }
  th { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: #5C6B63; background: #F8FBF9; }
  .pill { display: inline-block; padding: 0.18rem 0.55rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; }
  .pill-ok { background: #ECFDF5; color: #065F46; }
  .pill-err { background: #FEF2F2; color: #B91C1C; }
  .pill-muted { background: #F1F5F3; color: #5C6B63; }
  .row-form { display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: center; margin-bottom: 1rem; }
  .row-form input { padding: 0.56rem 0.8rem; border-radius: 9px; border: 1.5px solid #D3DDD7; font-size: 0.85rem; }
  .msg { font-size: 0.82rem; font-weight: 600; margin: 0.5rem 0; color: #065F46; }
  .msg.err { color: #B91C1C; }
  .hidden { display: none !important; }
</style>
</head>
<body>
<div class="wrap">
  <div id="gate" class="gate">
    <div class="brand" style="margin-bottom:1rem">
      <div class="logo">lp</div>
      <div>
        <h1>LP Insight God View</h1>
        <div class="sub">Admin usage analytics &amp; mail dispatch</div>
      </div>
    </div>
    <label for="adminPass" style="font-size:0.82rem;font-weight:700">Admin Password</label>
    <input id="adminPass" type="password" placeholder="Enter admin password">
    <button id="unlockBtn" class="btn btn-primary" style="width:100%">Unlock God View</button>
    <p id="gateErr" class="msg err"></p>
  </div>

  <div id="app" class="hidden">
    <div class="header">
      <div class="brand">
        <div class="logo">lp</div>
        <div>
          <h1>LP Insight God View</h1>
          <div class="sub">ClinicLivingPlus usage monitor, weekly password &amp; mail audit log</div>
        </div>
      </div>
      <div style="display:flex;gap:0.6rem;align-items:center">
        <button id="refreshBtn" class="btn">Refresh</button>
        <a href="/" class="btn">Open App</a>
      </div>
    </div>

    <div class="grid-4">
      <div class="kpi"><div class="kpi-label">Registered Users</div><div id="kUsers" class="kpi-val">0</div><div class="kpi-sub">@cliniclivingplus.com</div></div>
      <div class="kpi"><div class="kpi-label">Total Chats</div><div id="kChats" class="kpi-val">0</div><div class="kpi-sub">Private saved threads</div></div>
      <div class="kpi"><div class="kpi-label">Questions Asked</div><div id="kQuestions" class="kpi-val">0</div><div class="kpi-sub">Total RAG queries</div></div>
      <div class="kpi"><div class="kpi-label">Emails Sent</div><div id="kMails" class="kpi-val">0</div><div id="kLastMail" class="kpi-sub">No emails sent yet</div></div>
    </div>

    <div class="tabs">
      <button class="tab active" data-tab="usage">User Activity &amp; Questions</button>
      <button class="tab" data-tab="mail">Weekly Password &amp; Mail Center</button>
    </div>

    <div id="tab-usage">
      <div class="card">
        <h2>Users &amp; App Usage</h2>
        <table>
          <thead><tr><th>Email</th><th>Name</th><th>Chats</th><th>Questions</th><th>Last Active</th><th>Last Mail Sent</th></tr></thead>
          <tbody id="usersBody"></tbody>
        </table>
      </div>

      <div class="card">
        <h2>Recent Questions (Latest 40)</h2>
        <table>
          <thead><tr><th>When</th><th>User</th><th>Question</th><th>Status</th></tr></thead>
          <tbody id="activityBody"></tbody>
        </table>
      </div>
    </div>

    <div id="tab-mail" class="hidden">
      <div class="card">
        <h2>Active Weekly Password (Shared with PepTalk)</h2>
        <p class="sub" style="margin:0 0 0.9rem">Set the exact same weekly password used in PepTalk. <strong>Saving here does NOT send any emails.</strong></p>
        <div class="row-form">
          <input id="weeklyPassInput" type="text" placeholder="Active weekly password" style="min-width:240px">
          <input id="weekLabelInput" type="text" placeholder="Week label (e.g. Nov 24 – Nov 30)" style="min-width:220px">
          <button id="savePassBtn" class="btn btn-primary">Save Password Only</button>
        </div>
        <div id="passStatus" class="msg"></div>
      </div>

      <div class="card">
        <h2>Staff Roster &amp; Manual Mail Dispatch</h2>
        <p class="sub" style="margin:0 0 0.9rem">Emails are <strong>never sent automatically</strong>. Select recipients and click Send only when you are ready.</p>
        <div class="row-form">
          <input id="addEmail" type="email" placeholder="doctor@cliniclivingplus.com" style="min-width:240px">
          <input id="addName" type="text" placeholder="Doctor Name" style="min-width:170px">
          <input id="addRole" type="text" placeholder="Role (e.g. Physician)" style="min-width:150px">
          <button id="addMemberBtn" class="btn">Add to Roster</button>
        </div>
        <div style="display:flex;gap:0.6rem;margin-bottom:0.85rem;flex-wrap:wrap;align-items:center">
          <button id="sendSelectedBtn" class="btn btn-primary">Send Weekly Password to Selected</button>
          <span id="providerBadge" class="pill pill-muted"></span>
        </div>
        <div id="mailStatus" class="msg"></div>
        <table>
          <thead><tr><th><input type="checkbox" id="selectAll"></th><th>Email</th><th>Name</th><th>Role</th><th>Last Sent</th><th>Last Week Sent</th><th>Status</th><th></th></tr></thead>
          <tbody id="rosterBody"></tbody>
        </table>
      </div>

      <div class="card">
        <h2>Mail Delivery Audit Log (Who, When, What, Status)</h2>
        <table>
          <thead><tr><th>Sent At</th><th>Recipient</th><th>Week</th><th>Provider</th><th>Status</th><th>Details</th></tr></thead>
          <tbody id="logsBody"></tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<script>
  let adminPassword = sessionStorage.getItem('lp_admin_pass') || '';
  const fmt = ts => ts ? new Date(ts).toLocaleString() : '—';
  const esc = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function api(method, body) {
    const res = await fetch('/api/admin', {
      method,
      headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const data = await res.json();
    if (!res.ok) throw Error(data.error || 'Request failed');
    return data;
  }

  async function loadData() {
    const data = await api('GET');
    document.getElementById('gate').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    document.getElementById('kUsers').textContent = data.summary.totalUsers;
    document.getElementById('kChats').textContent = data.summary.totalChats;
    document.getElementById('kQuestions').textContent = data.summary.totalQuestions;
    document.getElementById('kMails').textContent = data.summary.totalEmailsSent;
    document.getElementById('kLastMail').textContent = data.summary.lastMailAt ? 'Last: ' + fmt(data.summary.lastMailAt) : 'No emails sent yet';
    document.getElementById('providerBadge').textContent = 'Provider: ' + data.summary.mailProvider;

    document.getElementById('weeklyPassInput').value = data.weeklyConfig.password || '';
    document.getElementById('weekLabelInput').value = data.weeklyConfig.weekLabel || '';

    document.getElementById('usersBody').innerHTML = data.users.map(u =>
      '<tr><td><strong>' + esc(u.email) + '</strong></td><td>' + esc(u.name) + '</td><td>' + u.chatCount + '</td><td>' + u.questionCount + '</td><td>' + fmt(u.lastActiveAt) + '</td><td>' + fmt(u.lastMailSentAt) + '</td></tr>'
    ).join('') || '<tr><td colspan="6" class="sub">No users yet.</td></tr>';

    document.getElementById('activityBody').innerHTML = data.recentActivity.map(a =>
      '<tr><td style="white-space:nowrap">' + fmt(a.createdAt) + '</td><td>' + esc(a.userEmail) + '</td><td>' + esc(a.question.slice(0, 220)) + '</td><td><span class="pill pill-muted">' + esc(a.status) + '</span></td></tr>'
    ).join('') || '<tr><td colspan="4" class="sub">No questions asked yet.</td></tr>';

    document.getElementById('rosterBody').innerHTML = data.roster.map(r =>
      '<tr><td><input type="checkbox" class="r-check" value="' + esc(r.email) + '"></td><td><strong>' + esc(r.email) + '</strong></td><td>' + esc(r.name) + '</td><td>' + esc(r.role) + '</td><td>' + fmt(r.lastSentAt) + '</td><td>' + esc(r.lastWeekLabel || '—') + '</td><td>' + (r.lastStatus ? '<span class="pill ' + (r.lastStatus === 'sent' ? 'pill-ok' : 'pill-err') + '">' + esc(r.lastStatus) + '</span>' : '<span class="pill pill-muted">Never sent</span>') + '</td><td><button class="btn btn-danger" onclick="removeMember(\\'' + esc(r.email) + '\\')">Remove</button></td></tr>'
    ).join('') || '<tr><td colspan="8" class="sub">No roster members added yet.</td></tr>';

    document.getElementById('logsBody').innerHTML = data.mailLogs.map(m =>
      '<tr><td style="white-space:nowrap">' + fmt(m.sentAt) + '</td><td>' + esc(m.recipientEmail) + '</td><td>' + esc(m.weekLabel) + '</td><td>' + esc(m.provider) + '</td><td><span class="pill ' + (m.status === 'sent' ? 'pill-ok' : 'pill-err') + '">' + esc(m.status) + '</span></td><td>' + esc(m.errorMessage || 'Delivered') + '</td></tr>'
    ).join('') || '<tr><td colspan="6" class="sub">No emails logged yet.</td></tr>';
  }

  window.removeMember = async email => {
    if (!confirm('Remove ' + email + ' from roster?')) return;
    await api('POST', { action: 'remove_member', email });
    await loadData();
  };

  document.getElementById('unlockBtn').onclick = async () => {
    adminPassword = document.getElementById('adminPass').value;
    document.getElementById('gateErr').textContent = '';
    try {
      await loadData();
      sessionStorage.setItem('lp_admin_pass', adminPassword);
    } catch (e) {
      document.getElementById('gateErr').textContent = e.message;
    }
  };
  document.getElementById('adminPass').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('unlockBtn').click(); });
  document.getElementById('refreshBtn').onclick = loadData;

  document.querySelectorAll('.tab').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-usage').classList.toggle('hidden', btn.dataset.tab !== 'usage');
      document.getElementById('tab-mail').classList.toggle('hidden', btn.dataset.tab !== 'mail');
    };
  });

  document.getElementById('selectAll').onchange = e => {
    document.querySelectorAll('.r-check').forEach(c => { c.checked = e.target.checked; });
  };

  document.getElementById('savePassBtn').onclick = async () => {
    const el = document.getElementById('passStatus');
    el.className = 'msg';
    try {
      await api('POST', {
        action: 'update_password',
        password: document.getElementById('weeklyPassInput').value,
        weekLabel: document.getElementById('weekLabelInput').value
      });
      el.textContent = 'Weekly password saved. No emails were sent.';
      await loadData();
    } catch (e) {
      el.className = 'msg err';
      el.textContent = e.message;
    }
  };

  document.getElementById('addMemberBtn').onclick = async () => {
    const el = document.getElementById('mailStatus');
    el.className = 'msg';
    try {
      await api('POST', {
        action: 'add_member',
        email: document.getElementById('addEmail').value,
        name: document.getElementById('addName').value,
        role: document.getElementById('addRole').value
      });
      document.getElementById('addEmail').value = '';
      document.getElementById('addName').value = '';
      document.getElementById('addRole').value = '';
      el.textContent = 'Member added to roster. No email was sent.';
      await loadData();
    } catch (e) {
      el.className = 'msg err';
      el.textContent = e.message;
    }
  };

  document.getElementById('sendSelectedBtn').onclick = async () => {
    const emails = [...document.querySelectorAll('.r-check:checked')].map(c => c.value);
    const el = document.getElementById('mailStatus');
    el.className = 'msg';
    if (!emails.length) {
      el.className = 'msg err';
      el.textContent = 'Select at least one recipient checkbox first.';
      return;
    }
    if (!confirm('Send the active weekly password email to ' + emails.length + ' recipient(s) now?')) return;
    const btn = document.getElementById('sendSelectedBtn');
    btn.disabled = true;
    el.textContent = 'Sending...';
    try {
      const res = await api('POST', { action: 'send_mail', emails });
      const sent = res.results.filter(r => r.status === 'sent').length;
      const failed = res.results.length - sent;
      el.className = failed ? 'msg err' : 'msg';
      el.textContent = 'Done: ' + sent + ' sent, ' + failed + ' failed. Check the Audit Log below for details.';
      await loadData();
    } catch (e) {
      el.className = 'msg err';
      el.textContent = e.message;
    } finally {
      btn.disabled = false;
    }
  };

  if (adminPassword) loadData().catch(() => { sessionStorage.removeItem('lp_admin_pass'); });
</script>
</body>
</html>`;
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
