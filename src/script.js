document.addEventListener("DOMContentLoaded", () => {
  setupMobileNav();
  setupSmoothScroll();
  setupLightbox();
  setupFormValidation();
});

function setupMobileNav() {
  const toggle = document.querySelector(".nav-toggle");
  const navList = document.querySelector("nav ul");
  if (!toggle || !navList) return;

  toggle.addEventListener("click", () => {
    const isOpen = navList.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
}

function setupSmoothScroll() {
  const links = document.querySelectorAll('a[href^="#"]');

  links.forEach(link => {
    link.addEventListener("click", event => {
      const targetId = link.getAttribute("href");
      if (!targetId || targetId === "#") return;

      const targetElement = document.querySelector(targetId);
      if (!targetElement) return;

      event.preventDefault();
      targetElement.scrollIntoView({ behavior: "smooth" });
    });
  });
}

function setupLightbox() {
  const images = document.querySelectorAll("#projects img");
  if (!images.length) return;

  const overlay = document.createElement("div");
  overlay.className = "lightbox-overlay";
  overlay.innerHTML = `
    <div class="lightbox-content">
      <img alt="">
    </div>
  `;
  document.body.appendChild(overlay);

  const lightboxImg = overlay.querySelector("img");

  images.forEach(img => {
    img.style.cursor = "zoom-in";
    img.addEventListener("click", () => {
      if (!lightboxImg) return;
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt || "";
      overlay.classList.add("is-visible");
      document.body.style.overflow = "hidden";
    });
  });

  overlay.addEventListener("click", () => {
    overlay.classList.remove("is-visible");
    document.body.style.overflow = "";
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && overlay.classList.contains("is-visible")) {
      overlay.classList.remove("is-visible");
      document.body.style.overflow = "";
    }
  });
}

function setupFormValidation() {
  const form = document.querySelector("#contact form");
  if (!form) return;

  const emailInput = form.querySelector('input[type="email"]');

  if (emailInput) {
    emailInput.addEventListener("input", () => {
      const value = emailInput.value.trim();
      const isValid = value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

      emailInput.style.borderColor = isValid ? "var(--border)" : "red";
    });
  }

  form.addEventListener("submit", event => {
    const name = form.querySelector("#name");
    const email = form.querySelector("#email");
    const message = form.querySelector("#message");

    const missing =
      !name.value.trim() ||
      !email.value.trim() ||
      !message.value.trim();

    if (missing) {
      event.preventDefault();
      alert("Please fill in all required fields before sending.");
      return;
    }

    const emailValue = email.value.trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
    if (!emailValid) {
      event.preventDefault();
      alert("Please enter a valid email address.");
    }
  });
}