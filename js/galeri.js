document.addEventListener("DOMContentLoaded", () => {
  const filters = document.querySelectorAll(".gallery-filter");
  const grid = document.getElementById("gallery-grid");
  const placeholders = document.getElementById("gallery-placeholders");
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const lightboxClose = document.querySelector("[data-lightbox-close]");
  const lightboxPrev = document.querySelector("[data-lightbox-prev]");
  const lightboxNext = document.querySelector("[data-lightbox-next]");

  if (!grid || !filters.length) return;

  const getVisiblePhotos = () =>
    Array.from(grid.querySelectorAll(".gallery-card:not(.empty)")).filter(
      (item) => !item.classList.contains("is-hidden")
    );

  const applyFilter = (filterValue, activeButton) => {
    filters.forEach((btn) => {
      const isActive = btn === activeButton;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", String(isActive));
    });

    grid.querySelectorAll(".gallery-card").forEach((item) => {
      const match = filterValue === "all" || item.dataset.category === filterValue;
      item.classList.toggle("is-hidden", !match);
    });

    if (placeholders) {
      placeholders.hidden = filterValue !== "ozel";
    }

    closeLightbox();
  };

  filters.forEach((btn) => {
    btn.addEventListener("click", () => {
      applyFilter(btn.dataset.filter || "all", btn);
    });
  });

  const openLightbox = (photo) => {
    const img = photo.querySelector("img");
    const overlay = photo.querySelector(".overlay");
    if (!img || !lightbox) return;

    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt || "";
    lightboxCaption.textContent = overlay ? overlay.textContent.trim() : "";
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.hidden = true;
    lightboxImg.src = "";
    document.body.style.overflow = "";
  };

  const stepLightbox = (direction) => {
    const photos = getVisiblePhotos();
    if (!photos.length || !lightboxImg.src) return;

    const currentIndex = photos.findIndex(
      (photo) => photo.querySelector("img")?.src === lightboxImg.src
    );
    const nextIndex = (currentIndex + direction + photos.length) % photos.length;
    openLightbox(photos[nextIndex]);
  };

  grid.addEventListener("click", (event) => {
    const photo = event.target.closest(".gallery-card:not(.empty)");
    if (photo) openLightbox(photo);
  });

  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightboxPrev) lightboxPrev.addEventListener("click", () => stepLightbox(-1));
  if (lightboxNext) lightboxNext.addEventListener("click", () => stepLightbox(1));

  if (lightbox) {
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (!lightbox || lightbox.hidden) return;
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") stepLightbox(-1);
    if (event.key === "ArrowRight") stepLightbox(1);
  });
});
