(function () {
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

  const SESSION_KEY = "coursesync_session";

  const signupModal = qs("#signup-modal");
  const loginModal = qs("#login-modal");
  const toast = qs("#toast");

  let signupStep = 1;
  let loginStep = 1;
  let signupData = {};

  function persistSession(payload) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...payload, at: Date.now() }));
  }

  function getSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  }

  function goToDashboard() {
    window.location.href = "main.html";
  }

  function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toast.hidden = true;
    }, 2800);
  }

  function openModal(modal) {
    modal.hidden = false;
    const closeBtn = qs("[data-close-modal]", modal);
    (closeBtn || modal).focus?.();
  }

  function closeModal(modal) {
    modal.hidden = true;
  }

  function closeAllModals() {
    closeModal(signupModal);
    closeModal(loginModal);
  }

  function trapFocus(e, modal) {
    if (e.key !== "Tab") return;
    const focusables = qsa(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      modal
    ).filter((el) => !el.disabled && el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllModals();
    if (!signupModal.hidden) trapFocus(e, signupModal);
    if (!loginModal.hidden) trapFocus(e, loginModal);
  });

  qsa("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.closest("#signup-modal")) closeModal(signupModal);
      if (btn.closest("#login-modal")) closeModal(loginModal);
    });
  });

  [signupModal, loginModal].forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal(overlay);
    });
  });

  function wireOpeners() {
    const openSignup = () => {
      signupStep = 1;
      signupData = {};
      qs("#signup-form").reset();
      qs("#signup-error").hidden = true;
      renderSignupStep();
      openModal(signupModal);
      setTimeout(() => qs('input[name="email"]', signupModal)?.focus(), 50);
    };

    const openLogin = () => {
      loginStep = 1;
      qs("#login-form").reset();
      qs("#login-error").hidden = true;
      renderLoginStep();
      openModal(loginModal);
      setTimeout(() => qs('input[name="email"]', loginModal)?.focus(), 50);
    };

    qs("#open-signup")?.addEventListener("click", openSignup);
    qs("#open-login")?.addEventListener("click", openLogin);
    qs("#hero-signup")?.addEventListener("click", openSignup);
    qs("#hero-login")?.addEventListener("click", openLogin);
  }

  function renderSignedInOverview() {
    const session = getSession();
    if (!session) return;

    const buildButton = (sizeClass = "") => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `btn btn-primary${sizeClass ? ` ${sizeClass}` : ""}`;
      btn.textContent = "Back to Main";
      btn.addEventListener("click", goToDashboard);
      return btn;
    };

    const nav = qs(".nav-actions");
    if (nav && !qs("#back-to-main", nav)) {
      const btn = buildButton();
      btn.id = "back-to-main";
      nav.prepend(btn);
    }

    const heroCtas = qs(".hero-ctas");
    if (heroCtas && !qs("#hero-back-to-main", heroCtas)) {
      const btn = buildButton("btn-lg");
      btn.id = "hero-back-to-main";
      heroCtas.prepend(btn);
    }
  }

  function renderSignupStep() {
    qs("#signup-step-indicator").textContent = String(signupStep);
    qsa("[data-signup-step]", signupModal).forEach((el) => {
      const n = Number(el.getAttribute("data-signup-step"));
      el.hidden = n !== signupStep;
    });
    const back = qs("#signup-back");
    const next = qs("#signup-next");
    back.hidden = signupStep === 1;
    next.textContent = signupStep === 3 ? "Finish & go to app" : "Continue";
  }

  function validateSignupStep() {
    const err = qs("#signup-error");
    err.hidden = true;
    const form = qs("#signup-form");

    if (signupStep === 1) {
      const email = qs('input[name="email"]', form);
      const password = qs('input[name="password"]', form);
      if (!email.value.trim().includes("@")) {
        err.textContent = "Enter a valid email address.";
        err.hidden = false;
        return false;
      }
      if (password.value.length < 8) {
        err.textContent = "Password must be at least 8 characters.";
        err.hidden = false;
        return false;
      }
      signupData.email = email.value.trim();
      signupData.password = password.value;
    }

    if (signupStep === 2) {
      const name = qs('input[name="name"]', form);
      const school = qs('select[name="school"]', form);
      const phoneInput = qs('input[name="phone"]', form);
      const nearby = qs('input[name="nearby"]', form);
      if (!name.value.trim()) {
        err.textContent = "Please enter your name.";
        err.hidden = false;
        return false;
      }
      if (!school.value) {
        err.textContent = "Please select Emerald High School or Fallon Middle School.";
        err.hidden = false;
        return false;
      }
      const phoneDigits = (phoneInput.value || "").replace(/\D/g, "");
      if (phoneDigits.length < 10) {
        err.textContent = "Enter a valid mobile number (at least 10 digits).";
        err.hidden = false;
        return false;
      }
      signupData.name = name.value.trim();
      signupData.school = school.value;
      signupData.phone = phoneInput.value.trim();
      signupData.nearby = nearby.checked;
    }

    return true;
  }

  function fillSignupReview() {
    const dl = qs("#signup-review");
    dl.innerHTML = "";
    const rows = [
      ["Email", signupData.email],
      ["Name", signupData.name],
      ["School", signupData.school],
      ["Phone", signupData.phone],
      ["Nearby discovery", signupData.nearby ? "Enabled (invite-only)" : "Off"],
    ];
    rows.forEach(([k, v]) => {
      const dt = document.createElement("dt");
      dt.textContent = k;
      const dd = document.createElement("dd");
      dd.textContent = v;
      dl.append(dt, dd);
    });
  }

  qs("#signup-next")?.addEventListener("click", () => {
    if (!validateSignupStep()) return;

    if (signupStep < 3) {
      signupStep += 1;
      if (signupStep === 3) fillSignupReview();
      renderSignupStep();
      return;
    }

    closeModal(signupModal);
    persistSession({
      email: signupData.email.trim().toLowerCase(),
      name: signupData.name,
      school: signupData.school,
      phone: signupData.phone,
    });
    goToDashboard();
  });

  qs("#signup-back")?.addEventListener("click", () => {
    if (signupStep > 1) {
      signupStep -= 1;
      qs("#signup-error").hidden = true;
      renderSignupStep();
    }
  });

  function renderLoginStep() {
    qs("#login-step-indicator").textContent = String(loginStep);
    qsa("[data-login-step]", loginModal).forEach((el) => {
      const n = Number(el.getAttribute("data-login-step"));
      el.hidden = n !== loginStep;
    });
    qs("#login-back").hidden = loginStep === 1;
    qs("#login-next").textContent = loginStep === 2 ? "Verify & enter" : "Continue";
  }

  qs("#login-next")?.addEventListener("click", () => {
    const err = qs("#login-error");
    err.hidden = true;
    const form = qs("#login-form");

    if (loginStep === 1) {
      const email = qs('input[name="email"]', form);
      const password = qs('input[name="password"]', form);
      if (!email.value.trim().includes("@")) {
        err.textContent = "Enter a valid email address.";
        err.hidden = false;
        return;
      }
      if (password.value.length < 8) {
        err.textContent = "Password must be at least 8 characters.";
        err.hidden = false;
        return;
      }
      loginStep = 2;
      renderLoginStep();
      setTimeout(() => qs('input[name="code"]', loginModal)?.focus(), 50);
      return;
    }

    const code = qs('input[name="code"]', form).value.trim();
    if (!/^\d{6}$/.test(code)) {
      err.textContent = "Enter the 6-digit verification code.";
      err.hidden = false;
      return;
    }

    const email = qs('input[name="email"]', form).value.trim().toLowerCase();
    let phone = "";
    let school = "";
    try {
      const app = JSON.parse(localStorage.getItem("coursesync_app_v1") || "{}");
      phone = app.profile?.phone || "";
      school = app.profile?.school || "";
    } catch {
      phone = "";
      school = "";
    }
    closeModal(loginModal);
    persistSession({
      email,
      name: email.split("@")[0] || "Student",
      phone,
      school,
    });
    showToast("Welcome back—opening your dashboard.");
    setTimeout(goToDashboard, 600);
  });

  qs("#login-back")?.addEventListener("click", () => {
    if (loginStep > 1) {
      loginStep = 1;
      qs("#login-error").hidden = true;
      renderLoginStep();
    }
  });

  wireOpeners();
  renderSignedInOverview();
  renderSignupStep();
  renderLoginStep();
})();
