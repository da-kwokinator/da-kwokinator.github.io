(function () {
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

  const SESSION_KEY = "coursesync_session";
  const ACCOUNTS_KEY = "coursesync_accounts_v1";

  const signupModal = qs("#signup-modal");
  const loginModal = qs("#login-modal");
  const toast = qs("#toast");

  let signupStep = 1;
  let loginStep = 1;
  let signupData = {};

  function persistSession(payload) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...payload, at: Date.now() }));
  }

  function getAccounts() {
    try {
      return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function isVerificationRequired() {
    try {
      const app = JSON.parse(localStorage.getItem("coursesync_app_v1") || "{}");
      return app.settings?.requireVerificationCode !== false;
    } catch {
      return true;
    }
  }

  function finishLogin(email) {
    const account = getAccounts()[email] || {};
    let phone = account.phone || "";
    let school = account.school || "";
    try {
      const app = JSON.parse(localStorage.getItem("coursesync_app_v1") || "{}");
      phone = app.profile?.phone || phone;
      school = app.profile?.school || school;
    } catch {
      /* keep account fallbacks */
    }
    closeModal(loginModal);
    persistSession({
      email,
      name: account.name || email.split("@")[0] || "Student",
      phone,
      school,
    });
    showToast("Welcome back—opening your dashboard.");
    publishAuthToServer().finally(() => setTimeout(goToDashboard, 400));
  }

  function saveAccounts(accounts) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  function publishSignupToRegistry(email, profile) {
    const key = "coursesync_registry_v1";
    let reg = {};
    try {
      reg = JSON.parse(localStorage.getItem(key) || "{}");
    } catch {
      reg = {};
    }
    reg[email] = {
      verified: true,
      email,
      displayName: profile.name,
      phoneDigits: (profile.phone || "").replace(/\D/g, ""),
      grade: "",
      gender: "",
      studentType: "",
      school: profile.school,
      bio: "",
      pronouns: "",
      academicLevel: "",
      careerPathway: "",
      avatarPreset: "emerald",
      privacy: {
        schedule: "school",
        activities: "school",
        summer: "friends",
        futurePlan: "school",
        bio: "school",
        grade: "school",
        academicLevel: "school",
        careerPathway: "school",
        pronouns: "school",
        phone: "private",
        gender: "school",
        studentType: "school",
      },
      scheduleSnapshot: [],
      futurePrimary: [],
      futureAlt: [],
      futureByGrade: {},
      activities: [],
      summerCourses: [],
      updatedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(reg));
  }

  async function initLandingSharedSync() {
    const shared = window.CourseSyncSharedStore;
    if (!shared?.enabled) return;
    try {
      await shared.connect();
      shared.startPolling();
      await showLiveServerNote();
    } catch {
      /* server unreachable */
    }
  }

  async function showLiveServerNote() {
    const note = qs("#live-server-note");
    const link = qs("#live-server-url");
    if (!note || !link) return;
    try {
      const res = await fetch("/api/info", { cache: "no-store" });
      if (!res.ok) return;
      const info = await res.json();
      const url = info.urls?.[0] || window.location.origin;
      link.href = url;
      link.textContent = url;
      note.hidden = false;
    } catch {
      /* ignore */
    }
  }

  async function publishAuthToServer() {
    const shared = window.CourseSyncSharedStore;
    if (!shared?.enabled) return;
    try {
      await shared.flush();
    } catch {
      /* offline */
    }
  }

  function requestCode(email) {
    const accounts = getAccounts();
    const key = String(email || "").trim().toLowerCase();
    const code = String(Math.floor(100000 + Math.random() * 900000));
    accounts[key] = { ...(accounts[key] || {}), email: key, code, codeAt: Date.now() };
    saveAccounts(accounts);
    showToast(`Verification code sent to ${key}. Demo code: ${code}`);
    return code;
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
    qsa("[data-password-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const input = btn.closest(".password-field-wrap")?.querySelector("input");
        if (!input) return;
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.textContent = show ? "Hide" : "Show";
      });
    });
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
    ["#open-login", "#open-signup"].forEach((id) => {
      const el = qs(id);
      if (el) el.hidden = true;
    });
    if (nav && !qs("#back-to-main", nav)) {
      const btn = buildButton();
      btn.id = "back-to-main";
      nav.prepend(btn);
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
    const email = signupData.email.trim().toLowerCase();
    const accounts = getAccounts();
    accounts[email] = {
      email,
      password: signupData.password,
      name: signupData.name,
      school: signupData.school,
      phone: signupData.phone,
      verified: true,
      updatedAt: Date.now(),
    };
    saveAccounts(accounts);
    publishSignupToRegistry(email, signupData);
    persistSession({
      email,
      name: signupData.name,
      school: signupData.school,
      phone: signupData.phone,
    });
    publishAuthToServer().then(() => window.CourseSyncSharedStore?.pushNow?.("coursesync_registry_v1")).finally(goToDashboard);
  });

  qs("#signup-back")?.addEventListener("click", () => {
    if (signupStep > 1) {
      signupStep -= 1;
      qs("#signup-error").hidden = true;
      renderSignupStep();
    }
  });

  function renderLoginStep() {
    const needsCode = isVerificationRequired();
    if (!needsCode) loginStep = 1;
    qs("#login-step-indicator").textContent = needsCode ? String(loginStep) : "1";
    qsa("[data-login-step]", loginModal).forEach((el) => {
      const n = Number(el.getAttribute("data-login-step"));
      el.hidden = !needsCode ? n !== 1 : n !== loginStep;
    });
    qs("#login-back").hidden = loginStep === 1 || !needsCode;
    qs("#login-next").textContent = needsCode && loginStep === 2 ? "Verify & enter" : "Continue";
  }

  function flashLoginError(el, message) {
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    el.classList.remove("form-error--flash");
    void el.offsetWidth;
    el.classList.add("form-error--flash");
  }

  qs("#login-next")?.addEventListener("click", () => {
    const err = qs("#login-error");
    err.hidden = true;
    const form = qs("#login-form");

    if (loginStep === 1) {
      const email = qs('input[name="email"]', form);
      const password = qs('input[name="password"]', form);
      if (!email.value.trim().includes("@")) {
        flashLoginError(err, "Enter a valid email address.");
        return;
      }
      if (password.value.length < 8) {
        flashLoginError(err, "Password must be at least 8 characters.");
        return;
      }
      const emailKey = email.value.trim().toLowerCase();
      const account = getAccounts()[emailKey];
      if (!account) {
        flashLoginError(err, "No account was found for that email. Sign up first or request a reset code.");
        return;
      }
      if (account.password !== password.value) {
        flashLoginError(err, "Incorrect password. Try again or use Forgot password.");
        return;
      }
      if (!isVerificationRequired()) {
        finishLogin(emailKey);
        return;
      }
      requestCode(emailKey);
      loginStep = 2;
      renderLoginStep();
      setTimeout(() => qs('input[name="code"]', loginModal)?.focus(), 50);
      return;
    }

    const code = qs('input[name="code"]', form).value.trim();
    if (!/^\d{6}$/.test(code)) {
      flashLoginError(err, "Enter the 6-digit verification code.");
      return;
    }

    const email = qs('input[name="email"]', form).value.trim().toLowerCase();
    const account = getAccounts()[email];
    if (!account || account.code !== code) {
      flashLoginError(err, "That verification code is not correct. Request a new code and try again.");
      return;
    }
    finishLogin(email);
  });

  qs("#request-login-code")?.addEventListener("click", () => {
    const email = qs('input[name="email"]', qs("#login-form"))?.value.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      showToast("Enter your account email first.");
      return;
    }
    if (!getAccounts()[email]) {
      showToast("No account exists for that email yet.");
      return;
    }
    requestCode(email);
  });

  qs("#forgot-password-btn")?.addEventListener("click", () => {
    const email = qs('input[name="email"]', qs("#login-form"))?.value.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      showToast("Enter your email first, then request a reset.");
      return;
    }
    const accounts = getAccounts();
    if (!accounts[email]) {
      showToast("No account exists for that email yet.");
      return;
    }
    const code = requestCode(email);
    accounts[email].resetCode = code;
    saveAccounts(accounts);
    showToast(`Password reset code sent to ${email}. Demo code: ${code}`);
  });

  qs("#login-back")?.addEventListener("click", () => {
    if (loginStep > 1) {
      loginStep = 1;
      qs("#login-error").hidden = true;
      renderLoginStep();
    }
  });

  function wireSiteNav() {
    const toggle = qs("#site-nav-toggle");
    const nav = qs("#site-nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    qsa(".site-nav-link", nav).forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
    document.addEventListener("click", (e) => {
      if (!nav.classList.contains("is-open")) return;
      if (nav.contains(e.target) || toggle.contains(e.target)) return;
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  }

  wireSiteNav();
  wireOpeners();
  renderSignedInOverview();
  renderSignupStep();
  renderLoginStep();
  initLandingSharedSync();
})();
