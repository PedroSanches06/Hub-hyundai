// app.js - Single-file SPA to handle login + dashboard + admin view
// Works with endpoints:
// POST  {API_BASE}/auth/login (credentials include)
// GET   {API_BASE}/auth/me
// POST  {API_BASE}/auth/logout
// GET   {API_BASE}/admin/me
// Optional: GET {API_BASE}/admin/users  (if implemented on backend)

const API = (window.API_BASE || "") ; // "" means same origin
const root = document.getElementById("root");

// ---------- helpers ----------
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const k in props) {
    if (k.startsWith("on") && typeof props[k] === "function") node.addEventListener(k.slice(2).toLowerCase(), props[k]);
    else if (k === "html") node.innerHTML = props[k];
    else node.setAttribute(k, props[k]);
  }
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (!c) return;
    node.append(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return node;
}

function showToast(msg, type = "info") {
  const t = el("div", { class: "card small", style: "position:fixed;right:20px;bottom:20px;z-index:9999;min-width:200px" }, msg);
  document.body.appendChild(t);
  setTimeout(() => t.style.opacity = "0.0", 3000);
  setTimeout(() => t.remove(), 3500);
}

// ---------- Auth helpers ----------
async function postLogin(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json().catch(()=>({}));
  return { ok: res.ok, status: res.status, data };
}

async function postLogout() {
  await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
}

async function getMe() {
  const res = await fetch(`${API}/auth/me`, { credentials: "include" });
  if (!res.ok) return null;
  const { user } = await res.json();
  return user;
}

async function getAdminMe() {
  const res = await fetch(`${API}/admin/me`, { credentials: "include" });
  if (!res.ok) return null;
  const j = await res.json();
  return j.user;
}

async function getAdminUsers() {
  // optional backend endpoint - if not implemented returns null or error
  try {
    const res = await fetch(`${API}/admin/users`, { credentials: "include" });
    if (!res.ok) return { ok: false, status: res.status };
    const j = await res.json();
    return { ok: true, users: j.users || j };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ---------- UI pieces ----------
function loginView() {
  const card = el("div", { class: "card fade-in" }, [
    el("h1", {}, "Entrar"),
    el("p", { class: "small" }, "Acesse sua conta para gerenciar arquivos sensíveis."),
    el("form", { onsubmit: onLoginSubmit }, [
      el("label", {}, "E-mail"),
      el("input", { type: "email", id: "email", required: true, autocomplete: "email", style: "width:100%;padding:10px;margin-top:6px;border-radius:8px;border:1px solid rgba(255,255,255,0.03);" }),
      el("label", { style: "margin-top:10px" }, "Senha"),
      el("div", { style: "display:flex;gap:8px;margin-top:6px" }, [
        el("input", { type: "password", id: "pwd", required: true, autocomplete: "current-password", style: "flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.03);" }),
        el("button", { type: "button", onclick: togglePwd, class: "btn ghost" }, "Mostrar")
      ]),
      el("div", { style: "margin-top:12px;display:flex;gap:8px;align-items:center" }, [
        el("button", { type: "submit", class: "btn" }, "Entrar"),
        el("a", { href: "/register.html", class: "small", style: "color:var(--muted);text-decoration:none;padding:6px 8px;border-radius:8px" }, "Criar conta"),
        el("a", { href: "/forgot.html", class: "small", style: "color:var(--muted);text-decoration:none;padding:6px 8px;border-radius:8px" }, "Esqueci a senha")
      ]),
      el("div", { id: "loginError", role: "alert", style: "color:#fb7185;margin-top:12px;display:none" })
    ])
  ]);
  root.innerHTML = "";
  root.appendChild(card);
  function togglePwd(e) {
    const input = document.getElementById("pwd");
    input.type = input.type === "password" ? "text" : "password";
    e.target.textContent = input.type === "password" ? "Mostrar" : "Ocultar";
  }
  async function onLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("pwd").value;
    const errEl = document.getElementById("loginError");
    errEl.style.display = "none";
    if (!email || !password) {
      errEl.textContent = "Preencha e-mail e senha.";
      errEl.style.display = "block";
      return;
    }
    if (password.length < 12) {
      errEl.textContent = "Senha muito curta (mínimo 12 caracteres).";
      errEl.style.display = "block";
      return;
    }
    const btn = e.submitter;
    btn.disabled = true;
    btn.textContent = "Entrando...";
    const r = await postLogin(email, password);
    btn.disabled = false;
    btn.textContent = "Entrar";
    if (!r.ok) {
      errEl.textContent = r.data?.error || `Erro (${r.status})`;
      errEl.style.display = "block";
      return;
    }
    showToast("Login bem-sucedido", "success");
    await loadApp(); // render dashboard
  }
}

function buildShell(user, isAdmin = false) {
  // topbar for mobile
  const topbar = el("div", { class: "topbar" }, [
    el("button", { class: "btn ghost", onclick: toggleSidebar }, "☰"),
    el("div", {}, el("strong", {}, "Secure File Store")),
    el("div", {}, el("button", { class: "btn", onclick: doLogout }, "Sair"))
  ]);
  // sidebar
  const sidebar = el("aside", { class: "sidebar card slide-up", id: "sidebar" }, [
    el("div", { class: "brand" }, [
      el("div", { class: "logo" }, "SF"),
      el("div", {}, [ el("h2", {}, "Secure File Store"), el("div", { class: "small" }, "Painel") ])
    ]),
    el("nav", { class: "nav" }, [
      el("button", { onclick: () => showSection('dashboard'), id: "nav-dashboard", class: "active" }, "Dashboard"),
      el("button", { onclick: () => showSection('users'), id: "nav-users" }, "Usuários"),
      el("button", { onclick: () => showSection('files'), id: "nav-files" }, "Arquivos"),
      (isAdmin ? el("button", { onclick: () => showSection('admin'), id: "nav-admin" }, "Admin") : null),
      el("div", { style: "height:8px" }),
      el("button", { onclick: doLogout, class: "btn ghost" }, "Logout")
    ])
  ]);

  const content = el("main", { class: "content card", id: "mainContent" }, [
    el("div", { id: "section-dashboard", class: "section" }, dashboardSection(user)),
    el("div", { id: "section-users", class: "section", style: "display:none" }, usersSection(isAdmin)),
    el("div", { id: "section-files", class: "section", style: "display:none" }, filesSection()),
    el("div", { id: "section-admin", class: "section", style: "display:none" }, adminSection()),
  ]);

  const shell = el("div", { class: "app-shell fade-in" }, [sidebar, content]);
  const wrapper = el("div", {}, [topbar, shell, el("div", { class: "overlay", id: "overlay", onclick: closeSidebar })]);
  return wrapper;

  // ---------- inner helpers ----------
  function toggleSidebar() {
    const sb = document.getElementById("sidebar");
    sb.classList.toggle("open");
    document.getElementById("overlay").classList.toggle("show");
  }
  function closeSidebar() {
    const sb = document.getElementById("sidebar");
    sb.classList.remove("open");
    document.getElementById("overlay").classList.remove("show");
  }
  function showSection(name) {
    ["dashboard","users","files","admin"].forEach(n => {
      const el = document.getElementById("section-" + n);
      if (!el) return;
      el.style.display = (n === name) ? "block" : "none";
      const btn = document.getElementById("nav-" + n);
      if (btn) btn.classList.toggle("active", n === name);
    });
    // close sidebar on mobile after choosing
    closeSidebar();
  }
}

function dashboardSection(user) {
  return el("div", {}, [
    el("h2", {}, `Olá, ${user.email}`),
    el("p", { class: "small" }, "Resumo rápido"),
    el("div", { class: "grid", style: "margin-top:12px" }, [
      el("div", { class: "card" }, [
        el("h3", {}, "Perfil"),
        el("p", {}, [`Email: ${user.email}`]),
        el("p", { class: "small" }, `Verificado: ${user.emailVerified ? "Sim" : "Não"}`),
        el("p", { class: "small" }, `Administrador: ${user.isAdmin ? "Sim" : "Não"}`)
      ]),
      el("div", { class: "card" }, [
        el("h3", {}, "Atividade"),
        el("p", { class: "small" }, "Nenhuma atividade recente (placeholder).")
      ])
    ])
  ]);
}

function usersSection(isAdmin) {
  const container = el("div", {}, [
    el("h2", {}, "Usuários"),
    el("p", { class: "small" }, isAdmin ? "Lista de usuários (admin only)." : "Você não tem acesso a lista de usuários."),
    el("div", { id: "usersList", style: "margin-top:12px" }, "Carregando...")
  ]);
  // attempt load
  (async () => {
    if (!isAdmin) {
      document.getElementById("usersList").textContent = "Somente administradores podem ver essa lista.";
      return;
    }
    const res = await getAdminUsers();
    const listEl = document.getElementById("usersList");
    listEl.innerHTML = "";
    if (!res.ok) {
      listEl.textContent = res.status === 404 ? "API /admin/users não está implementada no backend." : `Erro ao buscar usuários (${res.status || res.error}).`;
      return;
    }
    if (!res.users || res.users.length === 0) {
      listEl.textContent = "Nenhum usuário encontrado.";
      return;
    }
    const ul = el("div", { class: "user-list" });
    res.users.forEach(u => {
      ul.appendChild(el("div", { class: "user" }, [
        el("div", { class: "avatar" }, (u.email || "U").slice(0,2).toUpperCase()),
        el("div", {}, [ el("div", {}, u.email), el("div", { class: "small" }, `Verificado: ${u.emailVerified ? "Sim" : "Não"} • Admin: ${u.isAdmin ? "Sim" : "Não"}`) ])
      ]));
    });
    listEl.appendChild(ul);
  })();
  return container;
}

function filesSection() {
  return el("div", {}, [
    el("h2", {}, "Arquivos"),
    el("p", { class: "small" }, "Lista de arquivos e ações (upload/download) estarão aqui. Para tornar funcional, implemente endpoints de listagem de arquivos no backend."),
    el("div", { style: "margin-top:12px" }, [
      el("button", { class: "btn", onclick: () => showUploadModal() }, "Enviar arquivo (presigned upload)")
    ])
  ]);
}

function adminSection() {
  return el("div", {}, [
    el("h2", {}, "Admin"),
    el("p", { class: "small" }, "Operações administrativas."),
    el("div", { style: "margin-top:12px" }, [
      el("button", { class: "btn ghost", onclick: () => showToast('Ação administrativa (placeholder)') }, "Ação rápida"),
    ])
  ]);
}

// ---------- actions ----------
async function doLogout() {
  await postLogout();
  location.href = "/";
}

function showUploadModal() {
  showToast("Fluxo de upload: solicitar presigned URL no backend e enviar para S3. (Implementar)");
}

// ---------- App boot ----------
async function loadApp() {
  // attempt to load current user
  const user = await getMe();
  if (!user) {
    loginView();
    return;
  }
  // check admin flag (safest to call admin/me to verify backend permission)
  const adminCheck = await getAdminMe();
  const isAdmin = !!(adminCheck && adminCheck.isAdmin);
  // render shell
  root.innerHTML = "";
  const shell = buildShell(user, isAdmin);
  root.appendChild(shell);

  // animations: small entrance
  setTimeout(() => document.querySelectorAll(".card").forEach((c,i)=> c.classList.add("fade-in")), 50);
}

// start
document.addEventListener("DOMContentLoaded", () => {
  loadApp();
});
