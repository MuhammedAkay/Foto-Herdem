(() => {
  "use strict";

  const CONFIG = window.FH_CONFIG || {};
  const TOKEN_KEY = "fh_admin_token";
  const ALBUMS_MANIFEST = "../Albümler/albums.json";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = {
    supabase: null,
    albums: [],
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

  const token = () => localStorage.getItem(TOKEN_KEY) || "";

  function fmtDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    return isNaN(d) ? "—" : d.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
  }

  function show(viewName) {
    ["view-setup", "view-login", "view-dashboard"].forEach((id) => {
      $(`#${id}`).hidden = id !== `view-${viewName}`;
    });
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
      const res = await fetch(ALBUMS_MANIFEST, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`albums.json bulunamadı (HTTP ${res.status})`);
      }
      const manifest = await res.json();
      state.albums = Array.isArray(manifest.albums) ? manifest.albums : [];
    } catch (err) {
      state.albums = [];
      hint.textContent =
        "Albümler/fotoğraflar klasöründe albüm bulunamadı veya albums.json üretilmemiş. " +
        "Albümleri klasöre ekledikten sonra: node scripts/build-albums.js";
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

    if (state.albums.length === 0) {
      hint.textContent =
        "Albüm yok. Albümler/fotoğraflar klasörüne albüm klasörleri ekleyin ve " +
        "node scripts/build-albums.js komutunu çalıştırın.";
      list.innerHTML = "";
      return;
    }

    hint.textContent = `${state.albums.length} albüm, Albümler/fotoğraflar klasöründen okundu.`;
    list.innerHTML = state.albums
      .map((album) => {
        const cover = state.photoUrl.get(album.cover) || "../assets/logo-1.png";
        return `
          <article class="admin-album">
            <div class="admin-album-cover">
              <img src="${cover}" alt="" loading="lazy">
              <span class="photo-count">${album.photoCount} fotoğraf</span>
            </div>
            <div class="admin-album-body">
              <h3>${escapeHtml(album.title)}</h3>
              <div class="admin-hint">${escapeHtml(album.path)}</div>
              <button class="btn btn-primary" type="button" data-create-album="${escapeAttr(album.id)}">Link Oluştur</button>
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
    fillAlbumSelect(albumId);
    $("#create-panel").hidden = false;
    $("#create-result").hidden = true;
    $("#create-form").reset();
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
                Oluşturulma: ${fmtDate(s.created_at)} · Bitiş: ${fmtDate(s.expires_at)} ·
                Seçim: ${s.selection_count || 0}
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
      localStorage.setItem(TOKEN_KEY, data.token);
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
    localStorage.removeItem(TOKEN_KEY);
    show("login");
  }

  async function enterDashboard() {
    try {
      const me = await rpc("admin_me", { p_token: token() });
      if (!me) {
        localStorage.removeItem(TOKEN_KEY);
        show("login");
        return;
      }
      $("#admin-who").textContent = me.display_name || me.username;
      show("dashboard");
      $("#admins-panel").hidden = !me.is_main;
      await Promise.all([loadAlbums(), loadSessions(), loadAdminEmail(), loadAdmins()]);
    } catch (_) {
      localStorage.removeItem(TOKEN_KEY);
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
    $("#btn-refresh-albums").addEventListener("click", loadAlbums);
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
