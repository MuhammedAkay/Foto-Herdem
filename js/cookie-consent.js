/**
 * Çerez Onay Bannerı — Foto Herdem
 * GDPR/ePrivacy uyumlu, minimal çerez onay sistemi.
 * Kabul edilirse GTM yüklenir; edilmezse hiç yüklenmez.
 */
(function () {
  "use strict";

  var CONSENT_KEY = "fh_cookie_consent";
  var GTM_ID = "GTM-T2BXVG9G";

  /* Zaten onay verilmiş mi? */
  function hasConsent() {
    try { return localStorage.getItem(CONSENT_KEY) === "accepted"; }
    catch (e) { return false; }
  }

  /* Onay kaydet */
  function saveConsent() {
    try { localStorage.setItem(CONSENT_KEY, "accepted"); } catch (e) {}
  }

  /* GTM yükle */
  function loadGTM() {
    if (window._gtmLoaded) return;
    window._gtmLoaded = true;

    window.dataLayer = window.dataLayer || [];
    function gtm() { dataLayer.push(arguments); }
    gtm("js", new Date());
    gtm("config", GTM_ID);

    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtm.js?id=" + GTM_ID;
    document.head.appendChild(s);

    /* noscript iframe */
    var iframe = document.createElement("iframe");
    iframe.src = "https://www.googletagmanager.com/ns.html?id=" + GTM_ID;
    iframe.height = "0";
    iframe.width = "0";
    iframe.style.display = "none";
    iframe.style.visibility = "hidden";
    document.body.insertBefore(iframe, document.body.firstChild);

  }


  /* Banner stilleri enjekte et */
  function injectStyles() {
    if (document.getElementById("cc-styles")) return;
    var style = document.createElement("style");
    style.id = "cc-styles";
    style.textContent =
      "#cc-banner{" +
        "position:fixed;bottom:0;left:0;right:0;z-index:10000;" +
        "padding:18px 20px;" +
        "background:rgba(251,247,242,.96);" +
        "backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);" +
        "border-top:1px solid rgba(71,54,43,.1);" +
        "box-shadow:0 -8px 30px rgba(53,35,26,.08);" +
        "display:flex;align-items:center;justify-content:center;gap:16px;" +
        "flex-wrap:wrap;font-family:Inter,'Segoe UI',Arial,sans-serif;" +
        "opacity:0;transform:translateY(100%);transition:opacity .4s,transform .4s;" +
      "}" +
      "#cc-banner.cc-visible{opacity:1;transform:translateY(0);}" +
      "#cc-text{" +
        "max-width:600px;font-size:.88rem;color:#6f6258;line-height:1.6;" +
      "}" +
      "#cc-text a{color:#8d5c3b;text-decoration:underline;}" +
      "#cc-actions{display:flex;gap:10px;flex-shrink:0;}" +
      ".cc-btn{" +
        "display:inline-flex;align-items:center;justify-content:center;" +
        "min-height:40px;padding:0 20px;border:none;border-radius:999px;" +
        "font-size:.85rem;font-weight:600;cursor:pointer;" +
        "transition:transform .15s,box-shadow .15s;" +
      "}" +
      ".cc-btn:hover{transform:translateY(-1px);}" +
      ".cc-accept{" +
        "color:#fff;background:linear-gradient(135deg,#8d5c3b,#b37a52);" +
        "box-shadow:0 8px 20px rgba(141,92,59,.25);" +
      "}" +
      ".cc-decline{" +
        "color:#6f6258;background:rgba(255,255,255,.7);" +
        "border:1px solid rgba(71,54,43,.12);" +
      "}" +
      "@media(max-width:500px){" +
        "#cc-banner{flex-direction:column;text-align:center;padding:16px;}"+
        "#cc-actions{width:100%;justify-content:center;}" +
        ".cc-btn{flex:1 1 120px;}" +
      "}";
    document.head.appendChild(style);
  }

  /* Banner oluştur */
  function createBanner() {
    if (document.getElementById("cc-banner")) return;

    var banner = document.createElement("div");
    banner.id = "cc-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Çerez Onayı");

    banner.innerHTML =
      '<div id="cc-text">' +
        'Bu site, deneyiminizi geliştirmek ve trafiği analiz etmek için çerezler kullanır. ' +
        'Daha fazla bilgi için <a href="/sayfalar/cerez-politikasi.html">Çerez Politikamız</a> sayfamızdan detaylı bilgi alabilirsiniz.' +
      '</div>' +
      '<div id="cc-actions">' +
        '<button class="cc-btn cc-decline" type="button" id="cc-decline">Reddet</button>' +
        '<button class="cc-btn cc-accept" type="button" id="cc-accept">Kabul Et</button>' +
      '</div>';

    document.body.appendChild(banner);

    /* Kısa gecikmeyle göster */
    requestAnimationFrame(function () {
      setTimeout(function () { banner.classList.add("cc-visible"); }, 80);
    });

    /* Buton olayları */
    document.getElementById("cc-accept").addEventListener("click", function () {
      saveConsent();
      loadGTM();
      hideBanner(banner);
    });

    document.getElementById("cc-decline").addEventListener("click", function () {
      hideBanner(banner);
    });
  }

  function hideBanner(banner) {
    banner.classList.remove("cc-visible");
    setTimeout(function () {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
    }, 450);
  }

  /* Başlat */
  function init() {
    if (hasConsent()) {
      loadGTM();
      return;
    }
    injectStyles();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", createBanner);
    } else {
      createBanner();
    }
  }

  init();
})();
