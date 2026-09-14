document.addEventListener("DOMContentLoaded", () => {
  /* ---- Tema (açık / karanlık) ---- */
  const themeToggle = document.querySelector("[data-theme-toggle]");
  const themeStorageKey = "fh-theme";

  const getSystemTheme = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

  const updateThemeUI = (theme) => {
    const isDark = theme === "dark";

    if (themeToggle) {
      const icon = themeToggle.querySelector(".theme-toggle-icon");
      themeToggle.setAttribute("aria-label", isDark ? "Açık moda geç" : "Karanlık moda geç");
      themeToggle.setAttribute("title", isDark ? "Açık moda geç" : "Karanlık moda geç");
      if (icon) icon.textContent = isDark ? "☀️" : "🌙";
    }

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute("content", isDark ? "#14100c" : "#8d5c3b");
  };

  const applyTheme = (theme, persist) => {
    document.documentElement.dataset.theme = theme;
    if (persist) {
      try { localStorage.setItem(themeStorageKey, theme); } catch (e) { /* gizli mod: yoksay */ }
    }
    updateThemeUI(theme);
  };

  if (themeToggle) {
    updateThemeUI(document.documentElement.dataset.theme || getSystemTheme());

    themeToggle.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(next, true);
    });
  }

  const systemDarkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemThemeChange = (event) => {
    let saved = null;
    try { saved = localStorage.getItem(themeStorageKey); } catch (e) { /* yoksay */ }
    if (saved === "light" || saved === "dark") return;
    applyTheme(event.matches ? "dark" : "light", false);
  };
  if (typeof systemDarkQuery.addEventListener === "function") {
    systemDarkQuery.addEventListener("change", onSystemThemeChange);
  } else if (typeof systemDarkQuery.addListener === "function") {
    systemDarkQuery.addListener(onSystemThemeChange);
  }

  const navToggle = document.querySelector("[data-nav-toggle]");
  const navLinks = document.querySelector("[data-nav-links]");
  const yearNodes = document.querySelectorAll("[data-year]");
  const mobileQuery = window.matchMedia("(max-width: 760px)");

  const syncNavState = () => {
    if (!navToggle || !navLinks) return;

    if (mobileQuery.matches) {
      const isOpen = navLinks.classList.contains("open");
      navLinks.hidden = !isOpen;
      navToggle.setAttribute("aria-expanded", String(isOpen));
      navToggle.setAttribute("aria-label", isOpen ? "Menüyü kapat" : "Menüyü aç");
      return;
    }

    navLinks.hidden = false;
    navLinks.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Menüyü aç");
  };

  yearNodes.forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

  if (navToggle && navLinks) {
    syncNavState();

    navToggle.addEventListener("click", () => {
      navLinks.classList.toggle("open");
      const isOpen = navLinks.classList.contains("open");
      navLinks.hidden = !isOpen;
      navToggle.setAttribute("aria-expanded", String(isOpen));
      navToggle.setAttribute("aria-label", isOpen ? "Menüyü kapat" : "Menüyü aç");
    });

    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("open");
        navLinks.hidden = mobileQuery.matches;
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.setAttribute("aria-label", "Menüyü aç");
      });
    });

    document.addEventListener("click", (event) => {
      if (!navLinks.classList.contains("open")) return;
      if (navLinks.contains(event.target) || navToggle.contains(event.target)) return;

      navLinks.classList.remove("open");
      navLinks.hidden = true;
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Menüyü aç");
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      navLinks.classList.remove("open");
      navLinks.hidden = true;
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Menüyü aç");
    });

    mobileQuery.addEventListener("change", syncNavState);
  }

  document.querySelectorAll("form.form").forEach((form) => {
    const status = form.querySelector("[data-form-status]");
    const whatsappNumber = form.getAttribute("data-whatsapp-number") || "";
    const isWhatsappForm = form.hasAttribute("data-whatsapp-form");
    const servicePicker = form.querySelector("[data-service-picker]");
    const serviceSummary = form.querySelector("[data-service-summary]");
    const serviceInput = form.querySelector("[data-service-input]");

    if (servicePicker && serviceSummary && serviceInput) {
      servicePicker.querySelectorAll("[data-service-option]").forEach((option) => {
        option.addEventListener("click", () => {
          const value = option.getAttribute("value") || option.textContent || "";
          serviceInput.value = value;
          serviceSummary.textContent = value || "Seçiniz";
          servicePicker.removeAttribute("open");
        });
      });
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      if (isWhatsappForm) {
        const name = form.elements.name?.value?.trim() || "";
        const eventDate = form.elements.event_date?.value || "";
        const service = form.elements.service?.value?.trim() || "";
        const message = form.elements.message?.value?.trim() || "";

        if (servicePicker && serviceSummary && serviceInput && !service) {
          if (status) {
            status.textContent = "Lütfen ilgilendiğiniz hizmeti seçin.";
          }
          servicePicker.setAttribute("open", "");
          return;
        }

        const lines = [
          "Merhaba Foto Herdem, teklif almak istiyorum.",
          "",
          `Ad Soyad: ${name}`,
        ];

        if (eventDate) {
          lines.push(`Çekim Tarihi: ${eventDate}`);
        }

        if (service) {
          lines.push(`Hizmet: ${service}`);
        }

        lines.push(`Mesaj: ${message}`);

        const text = lines.join("\n");

        const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
        window.open(url, "_blank", "noopener,noreferrer");

        if (status) {
          status.textContent = "WhatsApp sohbeti açılıyor.";
        }
        form.reset();
        if (serviceSummary) {
          serviceSummary.textContent = "Seçiniz";
        }
        if (serviceInput) {
          serviceInput.value = "";
        }
        return;
      }

      if (status) {
        status.textContent = "Mesajınız demo olarak alındı. Gerçek gönderim için backend bağlamak gerekir.";
      }

      form.reset();
    });

    form.addEventListener("reset", () => {
      if (serviceSummary) {
        serviceSummary.textContent = "Seçiniz";
      }
      if (serviceInput) {
        serviceInput.value = "";
      }
      if (servicePicker) {
        servicePicker.removeAttribute("open");
      }
    });
  });

  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;

    const target = href.split("/").pop();
    const isHome =
      currentPath === "index.html" &&
      (target === "index.html" || target === "./" || target === "");

    if (target === currentPath || isHome) {
      link.classList.add("active");
    }
  });
});
