document.addEventListener("DOMContentLoaded", () => {
  const navToggle = document.querySelector("[data-nav-toggle]");
  const navLinks = document.querySelector("[data-nav-links]");
  const yearNodes = document.querySelectorAll("[data-year]");
 
  yearNodes.forEach((node) => {
    node.textContent = new Date().getFullYear();
  });
 
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      navLinks.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(navLinks.classList.contains("open")));
    });
 
    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }
 
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
 
  document.querySelectorAll("form.form").forEach((form) => {
    const status = form.querySelector("[data-form-status]");

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      if (status) {
        status.textContent = "Mesajınız demo olarak alındı. Gerçek gönderim için backend bağlamak gerekir.";
      }
      form.reset();
    });
  });

   const currentPath = window.location.pathname.split("/").pop() || "index.html";
