(() => {
  "use strict";

  const CONFIG = window.FH_CONFIG || {};
  const ALBUMS_MANIFEST = "../Albümler/albums.json";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = {
    supabase: null,
    albums: [],
    isMain: false,
    albumById: new Map(),
    photoUrl: new Map(),
    sessions: [],
    createAlbumPath: "",
  };

  const PROTECTION_LABELS = {
    0: "Koruma yok",
    1: "Hafif koruma",
    2: "Güçlü koruma",
    3: "Maksimum koruma",
  };

  const STATUS_LABELS = {
    active: { text: "Aktif", cls: "status-active" },
    used: { text: "Kullanıldı", cls: "status-used" },
    expired: { text: "Süresi Doldu", cls: "status-expired" },
    revoked: { text: "İptal", cls: "status-revoked" },
  };

  let currentToken = "";
  const token = () => currentToken;

  function fmtDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    return isNaN(d) ? "—" : d.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
  }

  function show(viewName) {
    ["view-setup", "view-login", "view-dashboard"].forEach((id) => {
      $(`#${id}`).hidden = id !== `view-${viewName}`;
    });
    const ghPanel = $("#github-upload-panel");
    if (ghPanel) ghPanel.hidden = viewName !== "dashboard";
    $("#topbar-actions").hidden = viewName !== "dashboard";
  }

  async function rpc(name, args) {
    const { data, error } = await state.supabase.rpc(name, args);
    if (error) {
      throw new Error(error.message || "Supabase hatası");
    }
    return data;
  }

  function setStatus(form, text, isError = false) {
    const node = form.querySelector("[data-status]");
    if (!node) return;
    node.textContent = text || "";
    node.style.color = isError ? "#a03a2e" : "var(--brand-dark)";
  }

  async function copyText(text, button) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    if (button) {
      const original = button.textContent;
      button.textContent = "Kopyalandı ✓";
      setTimeout(() => {
        button.textContent = original;
      }, 1600);
    }
  }

  function selectionLink(code, password) {
    const base = new URL("../secim.html", location.href);
    base.searchParams.set("kod", formatCode(code));
    if (password) {
      base.searchParams.set("sifre", password);
    }
    return base.href;
  }

  function formatCode(code) {
    const c = String(code || "").trim();
    if (/^\d{6}$/.test(c)) {
      return `${c.slice(0, 3)}-${c.slice(3)}`;
    }
    return c;
  }

  function sessionCopyText(code, password) {
    const baseLink = new URL("../secim.html", location.href).href;
    return [
      "📷 Foto Herdem — Fotoğraf Seçimi",
      "",
      `Seçim Linki: ${baseLink}`,
      `Seçim Kodu: ${formatCode(code)}`,
      `Şifre: ${password || "—"}`,
    ].join("\n");
  }

  // ---------- Albüm manifesti ----------

  async function loadAlbums() {
    const hint = $("#albums-hint");
    const list = $("#albums-list");

    try {
      const { data, error } = await state.supabase
        .from("photo_albums")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      state.albums = (data || []).map((row) => ({
        id: row.folder,
        title: row.title,
        path: `fotoğraflar/${row.folder}`,
        cover: row.cover_path,
        photoCount: row.photo_count,
        photos: row.photos
      }));
    } catch (err) {
      console.warn("loadAlbums:", err.message);
      state.albums = [];
    }

    if (state.albums.length === 0) {
      hint.textContent =
        "Albüm yok. Albümler/fotoğraflar klasörüne albüm klasörleri ekleyin.";
      list.innerHTML = "";
      return;
    }

    state.albumById = new Map(state.albums.map((a) => [a.id, a]));
    state.photoUrl = new Map();
    state.albums.forEach((album) => {
      album.photos.forEach((photo) => {
        state.photoUrl.set(photo, `../Albümler/${encodeURI(photo)}`);
      });
    });

    renderAlbumList();
  }

  function renderAlbumList() {
    const hint = $("#albums-hint");
    const list = $("#albums-list");
    hint.textContent = `${state.albums.length} albüm`;
    list.innerHTML = state.albums
      .map((album) => {
        const cover = state.photoUrl.get(album.cover) || "../assets/logo.webp";
        return `
          <article class="admin-album">
            <div class="admin-album-cover">
              <img src="${cover}" alt="" loading="lazy">
              <span class="photo-count">${album.photoCount} fotoğraf</span>
            </div>
            <div class="admin-album-body">
              <h3>${escapeHtml(album.title)}</h3>
              <div class="admin-hint">${escapeHtml(album.path)}</div>
              <div style="display:flex;gap:8px;">
                <button class="btn btn-primary" type="button" data-create-album="${escapeAttr(album.id)}">Link Oluştur</button>
                <button class="btn btn-secondary" type="button" data-delete-album="${escapeAttr(album.id)}" style="color:#c0392b;">🗑 Sil</button>
              </div>
            </div>
          </article>`;
      })
      .join("");
  }

  // ---------- Link oluşturma ----------

  function fillAlbumSelect(selectedId) {
    const select = $("#create-album");
    select.innerHTML = state.albums
      .map((a) => `<option value="${escapeAttr(a.id)}">${escapeHtml(a.title)}</option>`)
      .join("");
    if (selectedId) {
      select.value = selectedId;
    }
  }

  function openCreatePanel(albumId) {
    const album = state.albumById.get(albumId);
    if (!album) return;
    $("#create-panel").hidden = false;
    $("#create-result").hidden = true;
    $("#create-form").reset();
    fillAlbumSelect(albumId);
    $("#create-password").value = "";
    const max = $("#create-max");
    max.value = album.photoCount < 10 ? String(album.photoCount) : "10";
    const min = $("#create-min");
    min.value = "1";
    const radio = $(`#protection-radios input[value="2"]`);
    if (radio) radio.checked = true;
    $("#create-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    $("#create-password").focus();
  }

  async function createSession(form) {
    const album = state.albumById.get($("#create-album").value);
    if (!album) {
      setStatus(form, "Lütfen bir albüm seçin.", true);
      return;
    }

    const password = form.elements.password.value.trim();
    const maxSelections = parseInt(form.elements.max_selections.value, 10);
    const minSelections = parseInt(form.elements.min_selections.value, 10);
    const protectionLevel = parseInt(form.elements.protection_level.value, 10);
    const expiresRaw = form.elements.expires_at.value;

    if (!password || password.length < 4) {
      setStatus(form, "Müşteri şifresi en az 4 karakter olmalı.", true);
      return;
    }
    if (!Number.isInteger(maxSelections) || maxSelections < 1 || maxSelections > 500) {
      setStatus(form, "Geçerli bir fotoğraf sayısı girin (1-500).", true);
      return;
    }
    if (!Number.isInteger(minSelections) || minSelections < 0 || minSelections > 500) {
      setStatus(form, "Geçerli bir en az seçim sayısı girin (0-500).", true);
      return;
    }
    if (minSelections > maxSelections) {
      setStatus(form, "En az seçim sayısı, en fazla seçim sayısından büyük olamaz.", true);
      return;
    }

    setStatus(form, "Oluşturuluyor…");
    try {
      const data = await rpc("admin_create_session", {
        p_token: token(),
        p_album_path: album.path,
        p_album_title: album.title,
        p_password: password,
        p_max_selections: maxSelections,
        p_min_selections: minSelections,
        p_protection_level: protectionLevel,
        p_expires_at: expiresRaw ? new Date(expiresRaw).toISOString() : null,
      });

      const fullLink = selectionLink(data.code, password);
      const codeOnlyLink = selectionLink(data.code, "");
      const allInfo = sessionCopyText(data.code, password);

      $("#create-result").innerHTML = `
        <h3>Link Oluşturuldu 🎉</h3>
        <div class="link-box">
          <div class="link-line">
            <code>${escapeHtml(fullLink)}</code>
            <button class="btn btn-dark btn-sm" type="button" data-copy="${escapeAttr(fullLink)}">Linki Kopyala</button>
          </div>
          <div class="link-line">
            <code>Kod: ${escapeHtml(formatCode(data.code))}</code>
            <button class="btn btn-secondary btn-sm" type="button" data-copy="${escapeAttr(codeOnlyLink)}">Kodsuz Link</button>
          </div>
          <div class="link-line">
            <code>Şifre: ${escapeHtml(password)}</code>
            <button class="btn btn-secondary btn-sm" type="button" data-copy="${escapeAttr(password)}">Şifreyi Kopyala</button>
          </div>
        </div>
        <div class="admin-actions">
          <button class="btn btn-primary" type="button" data-copy="${escapeAttr(allInfo)}">Tümünü Kopyala (Link + Kod + Şifre)</button>
        </div>
        <p class="admin-warning">
          ⚠️ Şifre ayrıca linkler listesinde gizli olarak saklanır (•••••• üzerine tıklayınca açılır).
          Linki ve şifreyi müşteriye ayrı kanallardan iletmeniz önerilir.
        </p>`;
      $("#create-result").hidden = false;
      setStatus(form, "");
      form.reset();
      await loadSessions();
    } catch (err) {
      setStatus(form, `Hata: ${err.message}`, true);
    }
  }

  // ---------- Linkler ve seçimler ----------

  async function loadSessions() {
    const list = $("#sessions-list");
    try {
      state.sessions = (await rpc("admin_list_sessions", { p_token: token() })) || [];
    } catch (err) {
      list.innerHTML = `<div class="empty-state">Seçim linkleri yüklenemedi: ${escapeHtml(err.message)}</div>`;
      return;
    }

    if (state.sessions.length === 0) {
      list.innerHTML = `<div class="empty-state">Henüz oluşturulmuş seçim linki yok.</div>`;
      return;
    }

    list.innerHTML = state.sessions
      .map((s) => {
        const st = STATUS_LABELS[s.status] || STATUS_LABELS.active;
        const protection = PROTECTION_LABELS[s.protection_level] || "";
        const link = selectionLink(s.code, "");
        const allInfo = sessionCopyText(s.code, s.password || "");
        const hasSelections = (s.selection_count || 0) > 0;
        const rangeTag =
          s.min_selections > 0
            ? `${s.min_selections}–${s.max_selections} seçim`
            : `${s.max_selections} seçim`;
        return `
          <article class="admin-session" data-session-id="${escapeAttr(s.id)}">
            <div class="admin-session-info">
              <h3>${escapeHtml(s.album_title)}</h3>
              <div class="admin-session-meta">
                <span class="tag">Kod: ${escapeHtml(formatCode(s.code))}</span>
                <span class="tag">${rangeTag}</span>
                <span class="tag">${escapeHtml(protection)}</span>
                <span class="status-badge ${st.cls}">${st.text}</span>
              </div>
              <div class="admin-hint">
                Oluşturulma: ${fmtDate(s.created_at)} · Bitiş: ${fmtDate(s.expires_at)}<br>
                İzin Verilen: ${rangeTag} · Yapılan Seçim: ${s.selection_count || 0}
              </div>
              <div class="admin-session-password">
                <span class="tag">Şifre:</span>
                <button class="password-reveal" type="button" data-reveal-password="${escapeAttr(s.password || "")}" aria-label="Şifreyi göster/gizle">••••••</button>
              </div>
            </div>
            <div class="admin-session-actions">
              ${s.status === "active" ? `<button class="btn btn-dark btn-sm" type="button" data-revoke="${escapeAttr(s.id)}">İptal Et</button>` : ""}
              <button class="btn btn-secondary btn-sm" type="button" data-copy-link="${escapeAttr(link)}">Linki Kopyala</button>
              <button class="btn btn-secondary btn-sm" type="button" data-copy-info="${escapeAttr(allInfo)}">Bilgileri Kopyala</button>
              <button class="btn btn-primary btn-sm" type="button" data-selections="${escapeAttr(s.id)}" ${hasSelections ? "" : "disabled"}>Seçimleri Gör</button>
              <button class="btn btn-danger btn-sm" type="button" data-delete="${escapeAttr(s.id)}">Sil</button>
            </div>
          </article>`;
      })
      .join("");
  }

  async function openSelections(sessionId) {
    const session = state.sessions.find((s) => s.id === sessionId);
    const title = $("#selections-title");
    const list = $("#selections-list");

    title.textContent = session ? `${session.album_title} — Seçimler` : "Seçimler";
    $("#selections-panel").hidden = false;
    $("#selections-panel").scrollIntoView({ behavior: "smooth", block: "start" });

    list.innerHTML = `<div class="empty-state">Yükleniyor…</div>`;
    let selections = [];
    try {
      selections = (await rpc("admin_get_selections", { p_token: token(), p_session_id: sessionId })) || [];
    } catch (err) {
      list.innerHTML = `<div class="empty-state">Seçimler yüklenemedi: ${escapeHtml(err.message)}</div>`;
      return;
    }

    if (selections.length === 0) {
      list.innerHTML = `<div class="empty-state">Bu linke henüz seçim yapılmamış.</div>`;
      return;
    }

    list.innerHTML = selections
      .map((sel) => {
        const thumbs = (sel.photo_ids || [])
          .map((photo) => {
            const url = state.photoUrl.get(photo) || `../Albümler/${encodeURI(photo)}`;
            const fileName = photo.split("/").pop();
            return `
              <figure class="selection-thumb">
                <img src="${url}" alt="" loading="lazy">
                <figcaption title="${escapeAttr(photo)}">${escapeHtml(fileName)}</figcaption>
              </figure>`;
          })
          .join("");
        const contact = [sel.contact_name, sel.contact_phone].filter(Boolean).join(" · ");
        return `
          <article class="selection-card">
            <div class="selection-head">
              <strong>${escapeHtml(contact || "İsimsiz seçim")}${sel.note ? ` — ${escapeHtml(sel.note)}` : ""}</strong>
              <span class="selection-meta">${fmtDate(sel.submitted_at)} · ${sel.photo_ids?.length || 0} fotoğraf</span>
            </div>
            <div class="selection-grid">${thumbs}</div>
          </article>`;
      })
      .join("");
  }

  async function revokeSession(sessionId) {
    if (!confirm("Bu seçim linki iptal edilsin mi? Müşteri bir daha giriş yapamaz.")) return;
    try {
      await rpc("admin_revoke_session", { p_token: token(), p_session_id: sessionId });
      await loadSessions();
    } catch (err) {
      alert(`İptal edilemedi: ${err.message}`);
    }
  }

  async function deleteSession(sessionId) {
    if (!confirm("Bu seçim linki ve tüm seçimleri kalıcı olarak silinsin mi? Bu işlem geri alınamaz.")) return;
    try {
      await rpc("admin_delete_session", { p_token: token(), p_session_id: sessionId });
      await loadSessions();
    } catch (err) {
      alert(`Silinemedi: ${err.message}`);
    }
  }

  // ---------- Hesap ----------

  async function changePassword(form) {
    const oldPass = form.elements.old_password.value;
    const newPass = form.elements.new_password.value;
    if (newPass.length < 6) {
      setStatus(form, "Yeni şifre en az 6 karakter olmalı.", true);
      return;
    }
    setStatus(form, "Güncelleniyor…");
    try {
      const ok = await rpc("admin_change_password", {
        p_token: token(),
        p_old_password: oldPass,
        p_new_password: newPass,
      });
      if (ok) {
        setStatus(form, "Şifre güncellendi.");
        form.reset();
      } else {
        setStatus(form, "Mevcut şifre hatalı.", true);
      }
    } catch (err) {
      setStatus(form, `Hata: ${err.message}`, true);
    }
  }

  async function addAdmin(form) {
    const username = form.elements.username.value.trim();
    const password = form.elements.password.value;
    const displayName = form.elements.display_name.value.trim();
    if (username.length < 3) {
      setStatus(form, "Kullanıcı adı en az 3 karakter olmalı.", true);
      return;
    }
    if (password.length < 6) {
      setStatus(form, "Şifre en az 6 karakter olmalı.", true);
      return;
    }
    setStatus(form, "Ekleniyor…");
    try {
      const data = await rpc("admin_create_admin", {
        p_token: token(),
        p_username: username,
        p_password: password,
        p_display_name: displayName || "Admin",
      });
      setStatus(form, `Admin eklendi: ${data.username}`);
      form.reset();
      await loadAdmins();
    } catch (err) {
      setStatus(form, `Hata: ${err.message}`, true);
    }
  }

  async function loadAdmins() {
    const list = $("#admins-list");
    if (!list) return;
    try {
      const admins = (await rpc("admin_list_admins", { p_token: token() })) || [];
      const activeAdmins = admins.filter((a) => a.is_active);
      if (activeAdmins.length === 0) {
        list.innerHTML = `<div class="empty-state">Henüz admin yok.</div>`;
        return;
      }
      list.innerHTML = activeAdmins
        .map((a) => {
          const mainBadge = a.is_main
            ? `<span class="status-badge status-active">Ana Admin</span>`
            : "";
          const deleteBtn = a.is_main
            ? ""
            : `<button class="btn btn-danger btn-sm" type="button" data-delete-admin="${escapeAttr(a.id)}">Sil</button>`;
          return `
            <article class="admin-admin-item">
              <div class="admin-admin-info">
                <strong>${escapeHtml(a.display_name || a.username)}</strong>
                <span class="tag">@${escapeHtml(a.username)}</span>
                ${mainBadge}
              </div>
              <div class="admin-session-actions">${deleteBtn}</div>
            </article>`;
        })
        .join("");
    } catch (err) {
      list.innerHTML = `<div class="empty-state">Adminler yüklenemedi: ${escapeHtml(err.message)}</div>`;
    }
  }

  async function deleteAdmin(adminId) {
    if (!confirm("Bu admin silinsin mi? Silinen admin bir daha giriş yapamaz.")) return;
    try {
      await rpc("admin_delete_admin", { p_token: token(), p_admin_id: adminId });
      await loadAdmins();
    } catch (err) {
      alert(`Silinemedi: ${err.message}`);
    }
  }

  // ---------- Giriş / çıkış ----------

  async function login(form) {
    const username = form.elements.username.value.trim();
    const password = form.elements.password.value;
    if (!username || !password) {
      setStatus(form, "Kullanıcı adı ve şifre girin.", true);
      return;
    }

    setStatus(form, "Giriş yapılıyor…");
    try {
      const data = await rpc("admin_login", { p_username: username, p_password: password });
      if (!data || !data.token) {
        setStatus(form, "Kullanıcı adı veya şifre hatalı.", true);
        return;
      }
      currentToken = data.token;
      $("#admin-who").textContent = data.display_name || data.username;
      setStatus(form, "");
      form.reset();
      await enterDashboard();
    } catch (err) {
      setStatus(form, `Hata: ${err.message}`, true);
    }
  }

  async function logout() {
    try {
      await rpc("admin_logout", { p_token: token() });
    } catch (_) {
      // yerel oturum yine de temizlenir
    }
    currentToken = "";
    $("#admin-who").textContent = "";
    show("login");
  }

  async function enterDashboard() {
    try {
      const me = await rpc("admin_me", { p_token: token() });
      if (!me) {
        currentToken = "";
        show("login");
        return;
      }
      $("#admin-who").textContent = me.display_name || me.username;
      show("dashboard");
      state.isMain = Boolean(me.is_main);
      $("#admins-panel").hidden = !state.isMain;
      $("#email-panel").hidden = !state.isMain;
      // Upload paneli herkese açık, token ayarı sadece ana admin
      const ghTokenSection = document.getElementById("gh-token-details");
      if (ghTokenSection) ghTokenSection.hidden = !state.isMain;
      const tasks = [loadAlbums(), loadSessions()];
      if (state.isMain) {
        tasks.push(loadAdminEmail(), loadAdmins());
      }
      await Promise.all(tasks);
    } catch (_) {
      currentToken = "";
      show("login");
    }
  }

  async function loadAdminEmail() {
    const input = $("#admin-email");
    if (!input) return;
    try {
      const data = await rpc("admin_get_email");
      input.value = data || "";
    } catch (_) {
      input.value = "";
    }
  }

  async function saveEmail(form) {
    const email = form.elements.admin_email.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus(form, "Geçerli bir e-posta adresi girin.", true);
      return;
    }
    setStatus(form, "Kaydediliyor…");
    try {
      await rpc("admin_set_email", { p_token: token(), p_email: email });
      setStatus(form, "Bildirim e-postası kaydedildi ✓");
    } catch (err) {
      setStatus(form, `Hata: ${err.message}`, true);
    }
  }

  async function sendTestEmail() {
    const input = $("#admin-email");
    const email = input ? input.value.trim() : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Önce geçerli bir e-posta adresi girin.");
      return;
    }
    const btn = $("#btn-test-email");
    const original = btn ? btn.textContent : "";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Gönderiliyor…";
    }
    try {
      // Bildirim e-postası seçim sayfasında veritabanından okunuyor:
      // önce buraya kaydedelim ki seçim bildirimleri doğru adrese gitsin.
      await rpc("admin_set_email", { p_token: token(), p_email: email });

      await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(email)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: "📷 Foto Herdem — Test Bildirimi",
          _template: "box",
          Mesaj: "Bu bir test bildirimidir. Bundan sonra müşteri seçim bildirimleri bu adrese iletilecek.",
        }),
      });
      alert(
        "Bildirim e-postası kaydedildi ve test bildirimi gönderildi. " +
          "İlk kullanımda formsubmit.co'dan gelen doğrulama bağlantısına tıklamayı unutmayın."
      );
    } catch (err) {
      alert(`E-posta kaydedilemedi veya test gönderilemedi: ${err.message}`);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = original;
      }
    }
  }

  // ---------- Yardımcılar ----------

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  // ---------- Olaylar ----------

  function bindEvents() {
    $("#login-form").addEventListener("submit", (e) => {
      e.preventDefault();
      login(e.currentTarget);
    });

    $("#btn-logout").addEventListener("click", logout);
    document.querySelectorAll("[data-toggle-password]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const input = document.getElementById(btn.dataset.togglePassword);
        if (!input) return;
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.textContent = show ? "🙈" : "👁";
        btn.setAttribute("aria-label", show ? "Şifreyi gizle" : "Şifreyi göster");
        input.focus();
      });
    });

    $("#albums-list").addEventListener("click", (e) => {
      const delBtn = e.target.closest("[data-delete-album]");
      if (delBtn) {
        deleteAlbumFromGithub(delBtn.dataset.deleteAlbum);
      }
    });

    $("#btn-refresh-albums").addEventListener("click", loadAlbums);

    $("#gh-upload-form").addEventListener("submit", (e) => {
      e.preventDefault();
      handleGithubUpload(e.currentTarget);
    });

    $("#gh-files").addEventListener("change", (e) => {
      const count = e.target.files ? e.target.files.length : 0;
      const info = $("#gh-file-info");
      if (info) info.textContent = count > 0 ? `${count} dosya seçildi` : "";
    });

    $("#btn-save-gh-token").addEventListener("click", async () => {
      const val = $("#gh-token-input").value.trim();
      if (!val) { alert("Token boş olamaz."); return; }
      try {
        await saveGhToken(val);
        alert("✅ Token veritabanına kaydedildi.");
        $("#gh-token-input").value = "";
      } catch (err) {
        alert("Kayıt hatası: " + err.message);
      }
    });
    $("#btn-refresh-sessions").addEventListener("click", loadSessions);
    $("#btn-close-selections").addEventListener("click", () => {
      $("#selections-panel").hidden = true;
    });

    $("#albums-list").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-create-album]");
      if (btn) openCreatePanel(btn.dataset.createAlbum);
    });

    $("#create-form").addEventListener("submit", (e) => {
      e.preventDefault();
      createSession(e.currentTarget);
    });

    $("#btn-cancel-create").addEventListener("click", () => {
      $("#create-panel").hidden = true;
      $("#create-result").hidden = true;
    });

    $("#sessions-list").addEventListener("click", (e) => {
      const revoke = e.target.closest("[data-revoke]");
      if (revoke) {
        revokeSession(revoke.dataset.revoke);
        return;
      }
      const reveal = e.target.closest("[data-reveal-password]");
      if (reveal) {
        const password = reveal.dataset.revealPassword;
        if (reveal.dataset.open === "1") {
          reveal.textContent = "••••••";
          reveal.dataset.open = "0";
        } else {
          reveal.textContent = password || "—";
          reveal.dataset.open = "1";
        }
        return;
      }
      const copy = e.target.closest("[data-copy-link]");
      if (copy) {
        copyText(copy.dataset.copyLink, copy);
        return;
      }
      const copyInfo = e.target.closest("[data-copy-info]");
      if (copyInfo) {
        copyText(copyInfo.dataset.copyInfo, copyInfo);
        return;
      }
      const selections = e.target.closest("[data-selections]");
      if (selections) {
        openSelections(selections.dataset.selections);
        return;
      }
      const del = e.target.closest("[data-delete]");
      if (del) {
        deleteSession(del.dataset.delete);
      }
    });

    $("#create-result").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-copy]");
      if (btn) copyText(btn.dataset.copy, btn);
    });

    $("#password-form").addEventListener("submit", (e) => {
      e.preventDefault();
      changePassword(e.currentTarget);
    });

    $("#email-form").addEventListener("submit", (e) => {
      e.preventDefault();
      saveEmail(e.currentTarget);
    });

    $("#btn-test-email").addEventListener("click", sendTestEmail);

    $("#admin-form").addEventListener("submit", (e) => {
      e.preventDefault();
      addAdmin(e.currentTarget);
    });

    $("#admins-list").addEventListener("click", (e) => {
      const del = e.target.closest("[data-delete-admin]");
      if (del) {
        deleteAdmin(del.dataset.deleteAdmin);
      }
    });

    document.querySelectorAll("[data-year]").forEach((node) => {
      node.textContent = new Date().getFullYear();
    });
  }


  // ---------- GitHub Fotoğraf Yükleme / Silme ----------

  const GH_REPO_OWNER = "MuhammedAkay";
  const GH_REPO_NAME = "Foto-Herdem";
  const GH_BRANCH = "main";

  async function getGhToken() {
    const { data, error } = await state.supabase
      .from("app_settings")
      .select("value")
      .eq("key", "github_token")
      .single();
    return (!error && data) ? data.value : "";
  }

  async function saveGhToken(token) {
    const { error } = await state.supabase
      .from("app_settings")
      .upsert({ key: "github_token", value: token }, { on_conflict: "key" });
    if (error) throw error;
  }

  async function ghApi(path, options = {}) {
    const token = await getGhToken();
    if (!token) throw new Error("GitHub token ayarlanmamış. Önce token girin.");
    const res = await fetch(`https://api.github.com${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        ...options.headers
      }
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `GitHub API hatası: ${res.status}`);
    }
    return res.json();
  }

  function slugifyFolder(name) {
    return name.trim().toLowerCase()
      .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
      .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  async function convertToWebP(file, maxBytes = 20 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
      if (file.type === "image/webp" && file.size <= maxBytes) {
        resolve(file);
        return;
      }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let quality = 0.85;
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        function tryEncode() {
          canvas.toBlob((blob) => {
            if (!blob) { reject(new Error("WebP dönüşümü başarısız")); return; }
            if (blob.size <= maxBytes || quality <= 0.3) {
              const webpFile = new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
              resolve(webpFile);
            } else {
              quality -= 0.15;
              tryEncode();
            }
          }, "image/webp", quality);
        }
        tryEncode();
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Görsel okunamadı")); };
      img.src = url;
    });
  }

  async function uploadToGithub(filePath, contentBase64, message) {
    // Check if file exists to get SHA (for update)
    let sha = undefined;
    try {
      const existing = await ghApi(`/repos/${GH_REPO_OWNER}/${GH_REPO_NAME}/contents/${encodeURIComponent(filePath)}?ref=${GH_BRANCH}`);
      sha = existing.sha;
    } catch (_) { /* doesn't exist yet */ }

    await ghApi(`/repos/${GH_REPO_OWNER}/${GH_REPO_NAME}/contents/${encodeURIComponent(filePath)}`, {
      method: "PUT",
      body: JSON.stringify({
        message,
        content: contentBase64,
        branch: GH_BRANCH,
        ...(sha ? { sha } : {})
      })
    });
  }

  async function deleteFromGithub(filePath) {
    let sha;
    try {
      const existing = await ghApi(`/repos/${GH_REPO_OWNER}/${GH_REPO_NAME}/contents/${encodeURIComponent(filePath)}?ref=${GH_BRANCH}`);
      sha = existing.sha;
    } catch (_) {
      return; // already gone
    }
    await ghApi(`/repos/${GH_REPO_OWNER}/${GH_REPO_NAME}/contents/${encodeURIComponent(filePath)}`, {
      method: "DELETE",
      body: JSON.stringify({ message: `Silindi: ${filePath}`, branch: GH_BRANCH, sha })
    });
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  async function handleGithubUpload(form) {
    const albumName = form.querySelector("#gh-album-name").value.trim();
    const fileInput = form.querySelector("#gh-files");
    const files = Array.from(fileInput.files || []);

    if (!albumName) { setStatus(form, "Albüm adı girin.", true); return; }
    if (!files.length) { setStatus(form, "En az bir fotoğraf seçin.", true); return; }
    const ghTok = await getGhToken();
    if (!ghTok) { setStatus(form, "GitHub token ayarlanmamış.", true); return; }

    const folder = slugifyFolder(albumName);
    const progressWrap = $("#gh-progress-wrap");
    const progressBar = $("#gh-progress-bar");
    const statusText = $("#gh-status-text");

    progressWrap.hidden = false;
    setStatus(form, "");

    try {
      const photoPaths = [];

      for (let i = 0; i < files.length; i++) {
        statusText.textContent = `${files[i].name} → WebP dönüşümü…`;
        const webpFile = await convertToWebP(files[i]);

        statusText.textContent = `${webpFile.name} yükleniyor (${i + 1}/${files.length})…`;
        const buffer = await webpFile.arrayBuffer();
        const base64 = arrayBufferToBase64(buffer);
        const path = `Albümler/fotoğraflar/${folder}/${webpFile.name}`;

        await uploadToGithub(path, base64, `📷 ${albumName}: ${webpFile.name}`);
        photoPaths.push(`fotoğraflar/${folder}/${webpFile.name}`);

        progressBar.style.width = `${Math.round(((i + 1) / files.length) * 100)}%`;
        setStatus(form, `${i + 1}/${files.length} tamamlandı`);
      }

      // Supabase'e albüm kaydet
      statusText.textContent = "Veritabanına kaydediliyor…";
      const { error: dbError } = await state.supabase.from("photo_albums").upsert({
        title: albumName,
        folder: folder,
        cover_path: photoPaths[0],
        photo_count: photoPaths.length,
        photos: photoPaths
      }, { on_conflict: "folder" });
      
      if (dbError) throw new Error("DB hatası: " + dbError.message);

      setStatus(form, "");
      form.reset();
      $("#gh-file-info").textContent = "";

      // Yeni albümü doğrudan state'e ekle (server fetch beklemeden)
      const albumId = folder;
      const existingIdx = state.albums.findIndex(a => a.id === albumId);
      const newAlbum = {
        id: albumId,
        title: albumName,
        path: `fotoğraflar/${folder}`,
        cover: photoPaths[0],
        photoCount: photoPaths.length,
        photos: [...photoPaths]
      };
      if (existingIdx >= 0) {
        state.albums[existingIdx] = newAlbum;
      } else {
        state.albums.unshift(newAlbum);
      }
      state.albumById.set(albumId, newAlbum);
      state.photoUrl = state.photoUrl || new Map();
      newAlbum.photos.forEach(p => {
        state.photoUrl.set(p, `../Albümler/${encodeURI(p)}`);
      });

      alert(`✅ ${photoPaths.length} fotoğraf yüklendi!`);
      renderAlbumList();

    } catch (err) {
      console.error(err);
      setStatus(form, err.message || "Yükleme hatası", true);
    } finally {
      setTimeout(() => { progressWrap.hidden = true; }, 3000);
    }
  }

  async function deleteAlbumFromGithub(albumId) {
    if (!confirm(`"${albumId}" albümündeki tüm fotoğraflar silinecek. Emin misiniz?`)) return;

    try {
      // Albümün dosyalarını bul
      const album = state.albumById.get(albumId);
      if (!album || !album.photos?.length) {
        alert("Albüm bulunamadı.");
        return;
      }

      for (const photo of album.photos) {
        const filePath = `Albümler/${photo}`;
        try {
          await deleteFromGithub(filePath);
        } catch (_) { /* skip */ }
      }

      // Supabase'den sil
      const { error: dbErr } = await state.supabase
        .from("photo_albums")
        .delete()
        .eq("folder", albumId);
      if (dbErr) throw dbErr;

      state.albums = state.albums.filter(a => a.id !== albumId);
      state.albumById.delete(albumId);
      alert("✅ Albüm ve fotoğraflar silindi.");
      renderAlbumList();
    } catch (err) {
      alert("Silme hatası: " + err.message);
    }
  }


  // ---------- Başlangıç ----------


  function init() {
    bindEvents();
    const hasConfig = Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);

    if (!hasConfig) {
      show("setup");
      return;
    }

    state.supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

    if (token()) {
      enterDashboard();
    } else {
      show("login");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
