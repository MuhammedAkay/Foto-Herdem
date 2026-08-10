(() => {
  "use strict";

  const CONFIG = window.FH_CONFIG || {};
  const ALBUMS_MANIFEST = "Albümler/albums.json";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = {
    supabase: null,
    session: null,
    album: null,
    selected: new Map(), // photoPath -> sıra
    maxSelections: 10,
    minSelections: 0,
    photoUrl: new Map(),
    lightboxIndex: 0,
    submitted: false,
  };

  const MESSAGES = {
    not_found: "Böyle bir seçim kodu bulunamadı. Kodu kontrol edip tekrar deneyin.",
    wrong_password: "Şifre hatalı. Lütfen tekrar deneyin.",
    already_used: "Bu kodla daha önce seçim yapılmış. Tek kullanımlık linkler yalnızca bir kez kullanılabilir.",
    expired: "Bu seçim linkinin süresi dolmuş. Lütfen Foto Herdem ile iletişime geçin.",
    revoked: "Bu seçim linki iptal edilmiş. Lütfen Foto Herdem ile iletişime geçin.",
    too_few: "Seçtiğiniz fotoğraf sayısı yetersiz. En az gerekli sayıda fotoğraf seçmelisiniz.",
  };

  function fmtDate(value) {
    if (!value) return "";
    const d = new Date(value);
    return isNaN(d) ? "" : ` — Bitiş: ${d.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}`;
  }

  function setStatus(text, isError = false) {
    const node = $("#secim-login-form [data-status]");
    if (!node) return;
    node.textContent = text || "";
    node.style.color = isError ? "#a03a2e" : "var(--brand-dark)";
  }

  function showMessage(title, text) {
    $("#secim-login").hidden = true;
    $("#secim-picker").hidden = true;
    $("#secim-success").hidden = true;
    $("#secim-msg-title").textContent = title;
    $("#secim-msg-text").textContent = text;
    $("#secim-message").hidden = false;
  }

  function showSuccess(text) {
    $("#secim-login").hidden = true;
    $("#secim-picker").hidden = true;
    $("#secim-message").hidden = true;
    $("#secim-success-text").textContent = text;
    $("#secim-success").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toast(text) {
    let node = $("#secim-toast");
    if (!node) {
      node = document.createElement("p");
      node.id = "secim-toast";
      node.className = "secim-hint";
      $("#secim-head").appendChild(node);
    }
    node.textContent = text;
    node.style.color = "#a03a2e";
    clearTimeout(node._t);
    node._t = setTimeout(() => {
      node.textContent = "";
    }, 2800);
  }

  function updateCounter() {
    const count = state.selected.size;
    const min = state.minSelections || 0;

    $("#secim-count").textContent = String(count);
    $("#secim-min").textContent = String(min);
    const showMin = min > 0;
    $("#secim-min").style.display = showMin ? "" : "none";
    $("#secim-dash").style.display = showMin ? "" : "none";

    const minHint = $("#secim-min-hint");
    const needMore = count > 0 && count < min;
    if (minHint) {
      minHint.hidden = !needMore;
      minHint.textContent = needMore ? `En az ${min} fotoğraf seçmelisiniz.` : "";
    }

    $("#secim-submit").disabled = count === 0 || count < min || state.submitted;
    $("#secim-submit").textContent = state.submitted ? "Gönderiliyor…" : "Seçimimi Gönder";
  }

  function togglePhoto(figure) {
    if (state.submitted) return;
    const photo = figure.dataset.photo;

    if (state.selected.has(photo)) {
      state.selected.delete(photo);
      figure.classList.remove("is-selected");
      updateCounter();
      renumber();
      return;
    }

    if (state.selected.size >= state.maxSelections) {
      toast(`En fazla ${state.maxSelections} fotoğraf seçebilirsiniz.`);
      return;
    }

    state.selected.set(photo, state.selected.size + 1);
    figure.classList.add("is-selected");
    updateCounter();
    renumber();
  }

  function renumber() {
    let order = 0;
    $$("#secim-gallery .secim-photo").forEach((fig) => {
      const num = fig.querySelector(".num");
      fig.setAttribute("aria-checked", String(fig.classList.contains("is-selected")));
      if (!fig.classList.contains("is-selected")) {
        num.textContent = "";
        return;
      }
      order += 1;
      num.textContent = `${order}. seçim`;
    });
  }

  // ---------- Koruma ----------

  function applyProtection(level) {
    document.body.dataset.protection = String(level);
    if (level < 1) return;

    document.addEventListener("contextmenu", (e) => e.preventDefault());

    document.addEventListener("dragstart", (e) => {
      if (e.target.closest(".secim-photo, .secim-lb-figure")) e.preventDefault();
    });

    document.addEventListener("auxclick", (e) => {
      if (e.button === 1 && e.target.closest(".secim-photo, .secim-lb-figure")) e.preventDefault();
    });

    document.addEventListener("click", (e) => {
      const el = e.target.closest("img");
      if (!el) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
        e.preventDefault();
      }
    });

    if (level >= 2) {
      document.addEventListener("keydown", (e) => {
        const isDevtools =
          e.key === "F12" ||
          (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key)) ||
          (e.ctrlKey && e.key === "u") ||
          (e.ctrlKey && e.key === "U");
        const isPrint = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p";

        if (isDevtools || isPrint) {
          e.preventDefault();
        }
      });

      window.print = () => {
        /* yazdırma engellendi */
      };
    }

    if (level >= 3) {
      const dim = () => document.body.classList.add("is-dimmed");
      const undim = () => document.body.classList.remove("is-dimmed");

      window.addEventListener("blur", dim);
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) dim();
        else undim();
      });
    }
  }

  // ---------- Galeri ----------

  async function loadAlbumManifest() {
    const res = await fetch(ALBUMS_MANIFEST, { cache: "no-store" });
    if (!res.ok) throw new Error("albums.json bulunamadı");
    const manifest = await res.json();
    return Array.isArray(manifest.albums) ? manifest.albums : [];
  }

  function renderGallery() {
    const gallery = $("#secim-gallery");
    gallery.innerHTML = state.album.photos
      .map((photo, index) => {
        const url = state.photoUrl.get(photo) || `Albümler/${encodeURI(photo)}`;
        return `
          <figure class="secim-photo" data-photo="${escapeAttr(photo)}" tabindex="0" role="checkbox" aria-checked="false" aria-label="Fotoğraf ${index + 1}">
            <img src="${url}" alt="" loading="lazy">
            <button class="secim-zoom" type="button" data-zoom="${index}" aria-label="Fotoğrafı büyüt">🔍</button>
            <span class="check">✓</span>
            <span class="num"></span>
          </figure>`;
      })
      .join("");

    gallery.addEventListener("click", (e) => {
      const zoom = e.target.closest("[data-zoom]");
      if (zoom) {
        e.preventDefault();
        openLightbox(Number(zoom.dataset.zoom));
        return;
      }
      const figure = e.target.closest(".secim-photo");
      if (figure) togglePhoto(figure);
    });

    gallery.addEventListener("keydown", (e) => {
      const figure = e.target.closest(".secim-photo");
      if (!figure) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        togglePhoto(figure);
      }
    });
  }

  // ---------- Tam ekran büyütme ----------

  function ensureLightbox() {
    let box = $("#secim-lightbox");
    if (box) return box;

    box = document.createElement("div");
    box.className = "secim-lightbox";
    box.id = "secim-lightbox";
    box.hidden = true;
    box.innerHTML = `
      <button class="secim-lb-close" type="button" aria-label="Kapat">×</button>
      <button class="secim-lb-nav secim-lb-prev" type="button" aria-label="Önceki fotoğraf">‹</button>
      <figure class="secim-lb-figure">
        <img alt="">
        <figcaption class="secim-lb-caption"></figcaption>
      </figure>
      <button class="secim-lb-nav secim-lb-next" type="button" aria-label="Sonraki fotoğraf">›</button>`;
    document.body.appendChild(box);

    box.addEventListener("click", (e) => {
      if (e.target === box) closeLightbox();
    });
    box.querySelector(".secim-lb-close").addEventListener("click", closeLightbox);
    box.querySelector(".secim-lb-prev").addEventListener("click", (e) => {
      e.stopPropagation();
      showLightboxPhoto(state.lightboxIndex - 1);
    });
    box.querySelector(".secim-lb-next").addEventListener("click", (e) => {
      e.stopPropagation();
      showLightboxPhoto(state.lightboxIndex + 1);
    });

    document.addEventListener("keydown", (e) => {
      if (box.hidden) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") showLightboxPhoto(state.lightboxIndex - 1);
      if (e.key === "ArrowRight") showLightboxPhoto(state.lightboxIndex + 1);
    });

    return box;
  }

  function showLightboxPhoto(index) {
    const photos = state.album.photos;
    if (!photos.length) return;
    const count = photos.length;
    state.lightboxIndex = (index + count) % count;

    const photo = photos[state.lightboxIndex];
    const url = state.photoUrl.get(photo) || `Albümler/${encodeURI(photo)}`;
    const box = $("#secim-lightbox");
    const img = box.querySelector("img");
    img.src = url;
    img.alt = `Fotoğraf ${state.lightboxIndex + 1}`;
    box.querySelector(".secim-lb-caption").textContent = `${state.lightboxIndex + 1} / ${count}`;
  }

  function openLightbox(index) {
    if (!state.album || !state.album.photos.length) return;
    ensureLightbox();
    showLightboxPhoto(index);
    $("#secim-lightbox").hidden = false;
    document.body.classList.add("has-lightbox");
  }

  function closeLightbox() {
    const box = $("#secim-lightbox");
    if (!box) return;
    box.hidden = true;
    box.querySelector("img").src = "";
    document.body.classList.remove("has-lightbox");
  }

  function enterPicker(session) {
    state.session = session;
    state.maxSelections = session.max_selections;
    state.minSelections = session.min_selections || 0;

    $("#secim-album-title").textContent = session.album_title;
    const limitText =
      state.minSelections > 0
        ? `en az ${state.minSelections}, en fazla ${session.max_selections} fotoğraf`
        : `${session.max_selections} fotoğraf`;
    $("#secim-album-info").textContent =
      `${state.album.photoCount} fotoğraf arasından ${limitText} seçebilirsiniz.` +
      fmtDate(session.expires_at);

    $("#secim-min").textContent = String(state.minSelections);
    $("#secim-max").textContent = String(session.max_selections);
    $("#secim-login").hidden = true;
    $("#secim-message").hidden = true;
    $("#secim-success").hidden = true;
    $("#secim-picker").hidden = false;

    renderGallery();
    updateCounter();
    applyProtection(session.protection_level || 0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function login(form) {
    const code = form.elements.code.value.trim();
    const password = form.elements.password.value;

    if (!code || !password) {
      setStatus("Kod ve şifre girin.", true);
      return;
    }

    setStatus("Kontrol ediliyor…");
    try {
      const data = await state.supabase.rpc("customer_login", {
        p_code: code,
        p_password: password,
      });

      const result = data?.data ?? data;
      if (!result || !result.ok) {
        const err = result?.error || "not_found";
        showMessage("Giriş Yapılamadı", MESSAGES[err] || MESSAGES.not_found);
        return;
      }

      const albums = await loadAlbumManifest();
      state.album = albums.find((a) => a.path === result.album_path);
      if (!state.album) {
        showMessage("Albüm Bulunamadı", "Bu linke ait albüm klasörü bulunamadı. Lütfen Foto Herdem ile iletişime geçin.");
        return;
      }

      state.photoUrl = new Map();
      state.album.photos.forEach((photo) => {
        state.photoUrl.set(photo, `Albümler/${encodeURI(photo)}`);
      });

      enterPicker(result);
    } catch (err) {
      setStatus(`Bağlantı hatası: ${err.message}`, true);
    }
  }

  async function submitSelection() {
    if (state.submitted || state.selected.size === 0) return;
    if (state.selected.size < state.minSelections) {
      toast(`En az ${state.minSelections} fotoğraf seçmelisiniz.`);
      return;
    }

    state.submitted = true;
    updateCounter();

    const contactForm = $("#secim-contact-form");
    const payload = {
      p_session_id: state.session.session_id,
      p_photo_ids: Array.from(state.selected.keys()),
      p_contact_name: contactForm.elements.contact_name.value.trim() || null,
      p_contact_phone: contactForm.elements.contact_phone.value.trim() || null,
      p_note: contactForm.elements.note.value.trim() || null,
    };

    try {
      const data = await state.supabase.rpc("customer_submit_selection", payload);
      const result = data?.data ?? data;
      if (!result || !result.ok) {
        const err = result?.error || "not_found";
        state.submitted = false;
        updateCounter();
        showMessage("Seçim Kaydedilemedi", MESSAGES[err] || "Bilinmeyen bir hata oluştu. Lütfen tekrar deneyin.");
        return;
      }
      showSuccess(`Seçtiğiniz ${result.count} fotoğraf kaydedildi. Foto Herdem ekibi en kısa sürede sizinle iletişime geçecek.`);
    } catch (err) {
      state.submitted = false;
      updateCounter();
      showMessage("Gönderim Hatası", `Bağlantı hatası oluştu: ${err.message}. Lütfen tekrar deneyin.`);
    }
  }

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

  function init() {
    document.querySelectorAll("[data-year]").forEach((node) => {
      node.textContent = new Date().getFullYear();
    });

    const hasConfig = Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
    if (!hasConfig) {
      showMessage(
        "Bağlantı Kurulmamış",
        "Bu sayfa henüz yapılandırılmamış. Admin sayfasındaki kurulum adımlarını tamamlayın."
      );
      return;
    }

    state.supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

    const params = new URLSearchParams(location.search);
    if (params.get("kod")) {
      $("#secim-code").value = params.get("kod");
    }
    if (params.get("sifre")) {
      $("#secim-password").value = params.get("sifre");
    }

    $("#secim-login-form").addEventListener("submit", (e) => {
      e.preventDefault();
      login(e.currentTarget);
    });

    $("#secim-submit").addEventListener("click", submitSelection);

    $("#secim-contact").hidden = false;

    if (params.get("kod") && params.get("sifre")) {
      $("#secim-login-form").requestSubmit();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
