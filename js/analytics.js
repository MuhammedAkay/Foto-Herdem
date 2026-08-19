/**
 * Google Analytics (GA4) — Foto Herdem
 * Tüm sayfalarda doğrudan yüklenir, çerez onayından bağımsızdır.
 */
(function () {
  "use strict";

  var GA_ID = "G-FQ8TDHPLV0";

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }

  gtag("js", new Date());
  gtag("config", GA_ID, {
    anonymize_ip: true,
    send_page_view: true
  });

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
  document.head.appendChild(s);
})();
