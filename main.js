(function () {
  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => [...r.querySelectorAll(s)];

  const SESSION_KEY = "coursesync_session";
  const STORAGE_KEY = "coursesync_app_v1";
  const NETWORK_KEY = "coursesync_network_v1";
  const DM_KEY = "coursesync_dm_v1";
  const REGISTRY_KEY = "coursesync_registry_v1";
  const ENROLL_KEY = "coursesync_enroll_v1";
  const RATING_AGG_KEY = "coursesync_rating_agg_v1";
  const FEED_KEY = "coursesync_feed_v1";
  const NOTES_KEY = "coursesync_private_notes_v1";
  const DISCUSSION_KEY = "coursesync_discussions_v1";
  const STARRED_COURSES_KEY = "coursesync_starred_courses_v1";
  const REACTIONS_KEY = "coursesync_reactions_v2";
  const RECOMMENDATIONS_KEY = "coursesync_recommendations_v1";
  const NOTIFICATIONS_KEY = "coursesync_notifications_v1";
  const NOTIFICATION_READ_KEY = "coursesync_notification_read_v1";
  const NOTIFICATION_CLEARED_KEY = "coursesync_notification_cleared_at_v1";
  const ACCOUNTS_KEY = "coursesync_accounts_v1";
  const INVITES_KEY = "coursesync_invites_v1";
  const DELETED_ACCOUNTS_KEY = "coursesync_deleted_accounts_v1";
  const ADMIN_EMAIL = "calvin.kwok888@gmail.com";

  const LEVEL_ORDER = ["AP", "Honors", "Accelerated", "CP", "College Prep", "Elective"];
  const BELL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const SCHEDULE_VIEW_TABS = ["Main", ...BELL_DAYS];
  const SEMESTERS = [
    { key: "s1", label: "Semester 1" },
    { key: "s2", label: "Semester 2" },
  ];
  const GRADE_KEYS = ["6", "7", "8", "9", "10", "11", "12"];
  const ACTIVITY_PAGE_SIZE = 4;
  let discussionEditorInstance = null;

  const HIGH_SCHOOL_FACTS = [
    "The concept of numbered grade levels (9–12) became common in U.S. high schools in the early 1900s as enrollments grew.",
    "Study breaks and sleep often improve retention more than last-minute cramming—the brain consolidates memory during rest.",
    "Many colleges recalculate GPA using only core academic subjects, so steady effort in English, math, science, and history pays off.",
    "AP and honors courses can strengthen your transcript, but balance and well-being matter: sustainable pacing beats burnout.",
    "Extracurriculars help you explore careers and build teamwork skills; depth in a few activities often tells a clearer story than a long list.",
    "Office hours and quick questions after class are one of the fastest ways to clear confusion before it snowballs.",
    "Dual enrollment and summer programs can preview college rigor—always confirm credit rules with your counselor.",
  ];

  const PRIVACY_FIELDS = [
    { key: "schedule", label: "Current Classes" },
    { key: "activities", label: "Activities" },
    { key: "summer", label: "Summer Courses" },
    { key: "futurePlan", label: "Future Course Lists" },
    { key: "futureNotes", label: "Future Course Notes" },
    { key: "gradReq", label: "Graduation Requirements" },
    { key: "networking", label: "Networking Activity" },
    { key: "bio", label: "Bio" },
    { key: "grade", label: "Grade" },
    { key: "academicLevel", label: "Academic Level" },
    { key: "careerPathway", label: "Career Pathway" },
    { key: "pronouns", label: "Pronouns" },
    { key: "phone", label: "Phone Number" },
    { key: "contactEmail", label: "Email" },
    { key: "socialLinks", label: "Links" },
    { key: "gender", label: "Gender" },
  ];

  function loadSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  }

  function requireAuth() {
    if (!loadSession()) window.location.href = "index.html";
  }

  requireAuth();
  const session = loadSession() || {};

  function defaultPrivacy() {
    return {
      schedule: "friends",
      activities: "friends",
      summer: "friends",
      futurePlan: "friends",
      futureNotes: "friends",
      gradReq: "friends",
      networking: "friends",
      bio: "school",
      grade: "school",
      academicLevel: "school",
      careerPathway: "school",
      pronouns: "school",
      phone: "private",
      contactEmail: "friends",
      socialLinks: "friends",
      gender: "school",
      studentType: "school",
    };
  }

  function emptyWeek() {
    const o = {};
    BELL_DAYS.forEach((d) => {
      o[d] = [];
    });
    return o;
  }

  function emptySemesterSchedule() {
    return { s1: emptyWeek(), s2: emptyWeek() };
  }

  function emptyFutureSlot() {
    return { primary: [""], alternatives: [""], primaryNotes: "", alternativeNotes: "", notes: "" };
  }

  function defaultFutureByGrade() {
    const o = {};
    GRADE_KEYS.forEach((g) => {
      o[g] = emptyFutureSlot();
    });
    return o;
  }

  let activeCardCustomizationTab = "general";

  const UPDATE_LOG_ENTRIES = [
    {
      date: "August 1",
      title: "Back-to-school home update",
      bullets: [
        "Added a welcoming home-page section for the start of the school year.",
        "Made it easier to update your grade, open your current schedule, and save the previous one.",
      ],
    },
    {
      date: "July 31",
      title: "Settings and networking polish",
      bullets: [
        "Privacy and Card Customization now sit side by side in Settings for quicker scanning.",
        "The networking composer is more compact and easier to read while you post updates.",
        "The update log is now a clickable summary that opens a scrollable details view.",
      ],
    },
    {
      date: "July 30",
      title: "Profile and visibility refinements",
      bullets: [
        "Added clearer personal information fields and improved the save flow.",
        "Improved visibility controls so profile details are easier to manage.",
      ],
    },
  ];

  function renderUpdateLogPreview() {
    const trigger = qs("#sidebar-update-log-trigger");
    if (!trigger) return;
    const latest = UPDATE_LOG_ENTRIES[0] || { date: "Recent", title: "Update log" };
    const summary = qs(".sidebar-update-log-summary", trigger);
    if (summary) summary.textContent = `${latest.date}: ${latest.title}.`;
    trigger.setAttribute("aria-label", `Update Log. Latest update: ${latest.date} ${latest.title}`);
  }

  function renderUpdateLogModal() {
    const host = qs("#update-log-modal-body");
    if (!host) return;
    host.innerHTML = UPDATE_LOG_ENTRIES.map(
      (entry) => `
        <article class="update-log-entry">
          <div class="update-log-entry-head">
            <strong>${escapeHtml(entry.title)}</strong>
            <span>${escapeHtml(entry.date)}</span>
          </div>
          <ul>
            ${entry.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}
          </ul>
        </article>
      `
    ).join("");
  }

  function openUpdateLogModal() {
    const modal = qs("#update-log-modal");
    if (!modal) return;
    modal.hidden = false;
    renderUpdateLogModal();
    qs("#update-log-close", modal)?.focus();
  }

  function closeUpdateLogModal() {
    const modal = qs("#update-log-modal");
    if (!modal) return;
    modal.hidden = true;
  }

  const defaultState = () => ({
    profile: {
      displayName: "",
      phone: "",
      school: "Emerald High School",
      grade: "",
      gender: "",
      studentType: "",
      academicLevel: "",
      careerPathway: "",
      directoryLabel: "",
      bio: "",
      pronouns: "",
      avatarDataUrl: "",
      avatarOptions: [],
      avatarPreset: "emerald",
      contactEmail: "",
      socialLinks: "",
      accent: "#2d6a4f",
      privacy: defaultPrivacy(),
    },
    settings: {
      theme: "light",
      scheduleLayout: "semester",
      courseDisplay: "unique",
      showEmptyDays: false,
      fontFamily: "source",
      textScale: "normal",
      textColor: "charcoal",
      requireVerificationCode: true,
      networkingFilters: {
        boardSubject: "",
        boardAge: "all",
        messages: "everyone",
        boardMode: "general",
      },
      featureVisibility: {
        schedule: true,
        future: true,
        courses: true,
        classes: true,
        community: true,
        snapshot: true,
        explore: true,
        access: true,
        friends: true,
        networking: true,
        gradReq: true,
        resourceLinks: true,
        communityActivity: true,
        trending: true,
        explorer: true,
        careerOutline: true,
        dailyMotivation: true,
      },
      notifications: {
        friendRequests: true,
        messages: true,
        courseRecommendations: true,
        networkingPosts: true,
        communityChanges: true,
        newClassmates: true,
        trending: true,
        appUpdates: true,
      },
      viewpoint: {
        about: true,
        grade: true,
        gender: true,
        academicLevel: true,
        careerPathway: true,
        phone: true,
        mutualFriends: true,
        mutualCourses: true,
        schedule: true,
        activities: true,
        achievements: true,
        futurePlan: true,
        summerWork: true,
      },
      cardCustomization: {
        showGrade: true,
        showGender: true,
        showAcademicLevel: true,
        showStarredMatches: true,
        showMutualFriends: true,
        showDirectoryLabel: true,
        showVisibilityNote: true,
      },
    },
    scheduleSchool: "Emerald High School",
    scheduleBellDay: "Monday",
    myClassesDayTab: "Monday",
    myClassesViewTab: "Main",
    myClassesSemester: "s1",
    scheduleByWeekday: emptyWeek(),
    scheduleByCommunity: {},
    activities: [],
    summerCourses: [],
    futureByGrade: defaultFutureByGrade(),
    activeCommunitySchool: "",
    followedCommunities: [],
    emeraldBackup: null,
    pastSchedules: [],
    accessSessions: [],
    classNews: {},
  });

  function migrateState(parsed) {
    const d = defaultState();
    if (!parsed) return d;
    const out = {
      ...d,
      ...parsed,
      profile: { ...d.profile, ...parsed.profile, privacy: { ...defaultPrivacy(), ...parsed.profile?.privacy } },
      settings: {
        ...d.settings,
        ...parsed.settings,
        featureVisibility: { ...d.settings.featureVisibility, ...parsed.settings?.featureVisibility },
        notifications: { ...d.settings.notifications, ...parsed.settings?.notifications },
        viewpoint: { ...d.settings.viewpoint, ...parsed.settings?.viewpoint },
        cardCustomization: { ...d.settings.cardCustomization, ...parsed.settings?.cardCustomization },
        networkingFilters: {
          ...d.settings.networkingFilters,
          ...parsed.settings?.networkingFilters,
          boardSubject: parsed.settings?.networkingFilters?.boardSubject ?? "",
          boardAge: parsed.settings?.networkingFilters?.boardAge || "all",
          messages: parsed.settings?.networkingFilters?.messages || "everyone",
          boardMode: parsed.settings?.networkingFilters?.boardMode || "general",
        },
        requireVerificationCode:
          parsed.settings?.requireVerificationCode !== undefined
            ? parsed.settings.requireVerificationCode
            : d.settings.requireVerificationCode,
      },
      scheduleByWeekday: { ...emptyWeek(), ...parsed.scheduleByWeekday },
      scheduleByCommunity: parsed.scheduleByCommunity || {},
    };
    BELL_DAYS.forEach((day) => {
      if (!out.scheduleByWeekday[day]) out.scheduleByWeekday[day] = [];
    });
    if (!out.profile.phone && session?.phone) out.profile.phone = session.phone;
    if (!out.summerCourses) out.summerCourses = [];
    if (!out.scheduleBellDay) out.scheduleBellDay = "Monday";
    if (!out.myClassesDayTab) out.myClassesDayTab = "Monday";
    if (!out.myClassesViewTab) out.myClassesViewTab = "Main";
    if (!out.myClassesSemester) out.myClassesSemester = "s1";
    if (!out.scheduleByCommunity || typeof out.scheduleByCommunity !== "object") out.scheduleByCommunity = {};
    Object.keys(out.scheduleByCommunity).forEach((school) => {
      out.scheduleByCommunity[school] = normalizeSemesterSchedule(out.scheduleByCommunity[school]);
    });
    if (parsed.classes?.length && !parsed.scheduleByWeekday) {
      const mon = [];
      parsed.classes.forEach((c) => {
        mon.push({
          period: c.period,
          room: c.room || "",
          teacher: c.teacher,
          courseLabel: c.courseLabel,
          courseKey: c.courseKey || "",
          start: c.start || "",
          end: c.end || "",
          rating: c.rating ?? 5,
          comment: c.comment || "",
        });
      });
      out.scheduleByWeekday.Monday = mon;
    }
    if (parsed.futurePlanSlots && (!parsed.futurePrimaryCourses || !parsed.futurePrimaryCourses.length)) {
      const filled = parsed.futurePlanSlots.filter(Boolean);
      out.futurePrimaryCourses = filled.length ? filled : [""];
    }
    if (!out.futureByGrade || typeof out.futureByGrade !== "object") out.futureByGrade = defaultFutureByGrade();
    GRADE_KEYS.forEach((g) => {
      if (!out.futureByGrade[g] || typeof out.futureByGrade[g] !== "object") out.futureByGrade[g] = emptyFutureSlot();
      const slot = out.futureByGrade[g];
      if (!Array.isArray(slot.primary) || !slot.primary.length) slot.primary = [""];
      if (!Array.isArray(slot.alternatives) || !slot.alternatives.length) slot.alternatives = [""];
      if (slot.notes === undefined) slot.notes = "";
      if (slot.primaryNotes === undefined) slot.primaryNotes = "";
      if (slot.alternativeNotes === undefined) slot.alternativeNotes = slot.notes || "";
    });
    if (!parsed.futureByGrade) {
      const priFromParsed = parsed.futurePrimaryCourses;
      const priFromOut = out.futurePrimaryCourses;
      const pri =
        Array.isArray(priFromParsed) && priFromParsed.length
          ? [...priFromParsed]
          : Array.isArray(priFromOut) && priFromOut.length
          ? [...priFromOut]
          : null;
      if (pri) {
        const g = String(out.profile.grade || "12");
        out.futureByGrade[g] = {
          primary: pri,
          alternatives:
            parsed.futureAlternatives && parsed.futureAlternatives.length ? [...parsed.futureAlternatives] : [""],
          primaryNotes: "",
          alternativeNotes: parsed.futureAltNotes || "",
          notes: parsed.futureAltNotes || "",
        };
      }
    }
    if (!Array.isArray(out.followedCommunities)) out.followedCommunities = [];
    if (out.activeCommunitySchool === undefined || out.activeCommunitySchool === null) out.activeCommunitySchool = "";
    if (out.emeraldBackup === undefined) out.emeraldBackup = null;
    const school = out.profile?.school || "Emerald High School";
    out.profile.school = school;
    out.scheduleSchool = school;
    out.activeCommunitySchool = school;
    out.followedCommunities = [school];
    if (out.scheduleByCommunity && typeof out.scheduleByCommunity === "object") {
      const bucket = out.scheduleByCommunity[school] || normalizeSemesterSchedule(out.scheduleByWeekday);
      out.scheduleByCommunity = { [school]: normalizeSemesterSchedule(bucket) };
    } else {
      out.scheduleByCommunity = { [school]: normalizeSemesterSchedule(out.scheduleByWeekday) };
    }
    out.emeraldBackup = null;
    if (!Array.isArray(out.profile.avatarOptions)) out.profile.avatarOptions = [];
    if (!Array.isArray(out.pastSchedules)) out.pastSchedules = [];
    out.pastSchedules = out.pastSchedules.map(normalizePastScheduleRecord);
    if (!Array.isArray(out.accessSessions)) out.accessSessions = [];
    if (!out.classNews || typeof out.classNews !== "object") out.classNews = {};
    if (!out.profile.gender) out.profile.gender = "";
    if (!out.profile.studentType) out.profile.studentType = "";
    if (!out.profile.careerPathway) out.profile.careerPathway = "";
    delete out.futurePrimaryCourses;
    delete out.futureAlternatives;
    delete out.futureAltNotes;
    return out;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return migrateState(JSON.parse(raw));
    } catch {
      return defaultState();
    }
  }

  function saveState(s) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  let state = loadState();

  (function migrateRegistryEmailKeys() {
    try {
      const raw = localStorage.getItem(REGISTRY_KEY);
      if (!raw) return;
      const reg = JSON.parse(raw);
      if (!reg || typeof reg !== "object") return;
      const out = {};
      let changed = false;
      Object.entries(reg).forEach(([k, v]) => {
        const nk = String(k).trim().toLowerCase();
        if (!nk) {
          changed = true;
          return;
        }
        if (nk !== k) changed = true;
        const prev = out[nk];
        if (!prev || (v?.updatedAt || 0) >= (prev?.updatedAt || 0)) out[nk] = v;
      });
      if (changed) localStorage.setItem(REGISTRY_KEY, JSON.stringify(out));
    } catch {
      /* ignore corrupt registry */
    }
  })();

  function normalizeSemesterSchedule(value) {
    if (value?.s1 || value?.s2) {
      return { s1: { ...emptyWeek(), ...value.s1 }, s2: { ...emptyWeek(), ...value.s2 } };
    }
    return { s1: { ...emptyWeek(), ...(value || {}) }, s2: emptyWeek() };
  }

  function normalizePastScheduleRecord(record) {
    const rows = Array.isArray(record?.rows)
      ? record.rows
      : Array.isArray(record?.schedule)
      ? record.schedule
      : [];
    return {
      id: record?.id || `${record?.grade || "past"}-${record?.savedAt || Date.now()}-${Math.random().toString(16).slice(2)}`,
      school: record?.school || "Emerald High School",
      grade: String(record?.grade || ""),
      savedAt: record?.savedAt || Date.now(),
      completionDate: record?.completionDate || "",
      rows,
      activities: Array.isArray(record?.activities) ? record.activities : [],
      summerCourses: Array.isArray(record?.summerCourses) ? record.summerCourses : [],
    };
  }

  function scheduleBucket(school = state.scheduleSchool) {
    if (!state.scheduleByCommunity) state.scheduleByCommunity = {};
    if (!state.scheduleByCommunity[school]) {
      state.scheduleByCommunity[school] = normalizeSemesterSchedule(school === state.scheduleSchool ? state.scheduleByWeekday : null);
    }
    state.scheduleByCommunity[school] = normalizeSemesterSchedule(state.scheduleByCommunity[school]);
    return state.scheduleByCommunity[school];
  }

  function currentWeek(semester = state.myClassesSemester, school = state.scheduleSchool) {
    return scheduleBucket(school)[semester] || emptyWeek();
  }

  function allScheduleRowsForSchool(school = state.scheduleSchool) {
    const bucket = scheduleBucket(school);
    const rows = [];
    SEMESTERS.forEach(({ key }) => {
      BELL_DAYS.forEach((day) => {
        (bucket[key]?.[day] || []).forEach((entry) => rows.push({ semester: key, weekday: day, ...entry }));
      });
    });
    return rows.sort(compareScheduleRows);
  }
  function applyAppearance() {
    document.documentElement.style.setProperty("--user-accent", state.profile.accent || "#2d6a4f");
    const textColorMap = {
      charcoal: "#1c1b19",
      navy: "#1d3557",
      forest: "#1b4332",
      plum: "#4a1942",
      rust: "#7c2d12",
      slate: "#334155",
    };
    const ink = textColorMap[state.settings?.textColor] || textColorMap.charcoal;
    if (state.settings?.theme === "dark") {
      document.documentElement.style.removeProperty("--ink");
      document.documentElement.style.removeProperty("--user-text");
    } else {
      document.documentElement.style.setProperty("--ink", ink);
      document.documentElement.style.setProperty("--user-text", ink);
    }
    const fontMap = {
      source: '"Source Sans 3", system-ui, sans-serif',
      system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      serif: 'Georgia, "Times New Roman", serif',
      mono: '"SFMono-Regular", Consolas, monospace',
    };
    const scaleMap = { compact: "0.95rem", normal: "1.05rem", large: "1.15rem", xl: "1.25rem" };
    document.documentElement.style.setProperty("--font-sans", fontMap[state.settings?.fontFamily] || fontMap.source);
    document.documentElement.style.setProperty("--app-text-size", scaleMap[state.settings?.textScale] || scaleMap.normal);
    document.body?.classList.toggle("theme-dark", state.settings?.theme === "dark");
  }
  applyAppearance();

  if (session?.school && !state.profile.displayName) {
    state.profile.displayName = session.name || session.email?.split("@")[0] || "Student";
    state.profile.school = session.school;
    state.scheduleSchool = session.school;
    if (session.phone) state.profile.phone = session.phone;
    saveState(state);
  } else if (session?.name && !state.profile.displayName) {
    state.profile.displayName = session.name;
    if (session.phone) state.profile.phone = session.phone;
    saveState(state);
  } else if (session?.phone && !state.profile.phone) {
    state.profile.phone = session.phone;
    saveState(state);
  }

  const catalog = window.COURSE_CATALOG || {};
  const emeraldDays = window.EMERALD_SCHEDULE_BY_DAY || {};
  const schoolSchedules = window.SCHOOL_SCHEDULES || {};
  const getCourseMeta = window.getCourseMeta || (() => ({ overview: "", difficulty: "—" }));

  function gradRequirementFor(subject, title = "") {
    const text = `${subject} ${title}`.toLowerCase();
    if (/history|government|economics|civics|geography|social|psychology|sociology/.test(text)) return "History/Social Science";
    if (/english|literature|writing|erwc/.test(text)) return "English";
    if (/algebra|geometry|precalculus|calculus|statistics|trigonometry|math/.test(text)) return "Mathematics";
    if (/biology|chemistry|physics|environmental|anatomy|physiology|science/.test(text)) return "Science";
    if (/spanish|french|german|mandarin|chinese|japanese|latin|language/.test(text)) return "World Language";
    if (/visual|performing|art|drama|theater|music|band|choir|dance|cte|career tech|applied art|design/.test(text)) return "VAPA / CTE";
    if (/physical education|p\.?e\.?|fitness|weights|sports pe/.test(text)) return "Physical Education";
    if (/ethnic studies/.test(text)) return "Ethnic Studies";
    if (/financial literacy|personal finance/.test(text)) return "Financial Literacy";
    if (/health/.test(text)) return "Health";
    return "Elective";
  }

  const GRAD_REQUIREMENTS = [
    {
      key: "History/Social Science",
      credits: 30,
      dusd: "30 credits",
      uc: "A. History: 2 years",
      detail: "10th World History, 11th U.S. History, Civics, and one-semester Economics.",
      slots: [
        { label: "World History (Grade 10)", required: ["World History"], alternatives: ["AP World History", "World History Honors"] },
        { label: "U.S. History (Grade 11)", required: ["U.S. History", "US History"], alternatives: ["AP U.S. History", "AP US History"] },
        { label: "Civics / Government", required: ["Civics", "Government", "American Government"], alternatives: ["AP Government", "AP U.S. Government"] },
        { label: "Economics (one semester)", required: ["Economics"], alternatives: ["AP Microeconomics", "AP Macroeconomics"] },
      ],
    },
    {
      key: "English",
      credits: 40,
      dusd: "40 credits",
      uc: "B. English: 4 years",
      detail: "English 1, English 2, English 3, English 4, or equivalent college-prep English courses with writing and literature.",
      slots: [
        { label: "English 1", required: ["English 1", "English I"], alternatives: ["Honors English 1", "ERWC"] },
        { label: "English 2", required: ["English 2", "English II"], alternatives: ["Honors English 2", "AP English Language"] },
        { label: "English 3", required: ["English 3", "English III"], alternatives: ["Honors English 3", "AP English Literature"] },
        { label: "English 4", required: ["English 4", "English IV"], alternatives: ["Honors English 4", "ERWC"] },
      ],
    },
    {
      key: "Mathematics",
      credits: 20,
      dusd: "20 credits",
      uc: "C. Mathematics: 3 years, 4 recommended",
      detail: "Algebra I or Integrated Math I, plus one additional math course. UC/CSU expects Algebra I, Geometry, and Algebra II or integrated equivalents.",
      slots: [
        { label: "Algebra I / Integrated Math I", required: ["Algebra I", "Algebra 1", "Integrated Math I", "Integrated Math 1"], alternatives: ["Honors Algebra I", "Accelerated Algebra I"] },
        { label: "Geometry / Integrated Math II", required: ["Geometry", "Integrated Math II", "Integrated Math 2"], alternatives: ["Honors Geometry"] },
        { label: "Algebra II / Integrated Math III", required: ["Algebra II", "Algebra 2", "Integrated Math III", "Integrated Math 3"], alternatives: ["Honors Algebra II", "Precalculus"] },
      ],
    },
    {
      key: "Science",
      credits: 20,
      dusd: "20 credits",
      uc: "D. Science: 2 years, 3-4 recommended",
      detail: "One biological science and one physical science. UC/CSU science may include computer science, engineering, or applied science as the third year.",
      slots: [
        { label: "Biological science", required: ["Biology", "Living Earth", "Environmental Science"], alternatives: ["AP Biology", "Honors Biology", "Anatomy"] },
        { label: "Physical science", required: ["Chemistry", "Physics", "Physical Science"], alternatives: ["AP Chemistry", "AP Physics", "Honors Chemistry"] },
        { label: "Additional lab science (recommended)", required: ["Chemistry", "Physics", "AP Environmental Science"], alternatives: ["AP Biology", "Engineering", "Computer Science Principles"] },
      ],
    },
    {
      key: "World Language",
      credits: 20,
      dusd: "10-20 credits",
      uc: "E. Language Other Than English: 2 years",
      detail: "Two levels of the same language. Middle-school language may satisfy part of DUSD when approved; a third year is recommended for UC/CSU.",
      slots: [
        { label: "Language Level 1 (same language)", required: ["Spanish 1", "French 1", "Mandarin 1", "Chinese 1"], alternatives: ["Spanish I", "French I", "Japanese 1", "Latin 1"] },
        { label: "Language Level 2 (same language)", required: ["Spanish 2", "French 2", "Mandarin 2", "Chinese 2"], alternatives: ["Spanish II", "French II", "Japanese 2", "Latin 2"] },
        { label: "Language Level 3 (optional / UC recommended)", required: ["Spanish 3", "French 3", "AP Spanish"], alternatives: ["Spanish III", "AP French", "Honors Spanish 3"] },
      ],
    },
    {
      key: "VAPA / CTE",
      credits: 10,
      dusd: "10 credits",
      uc: "F. Visual and Performing Arts: 1 year",
      detail: "One year-long visual/performing arts or career tech/applied arts course. UC/CSU F courses include dance, drama/theater, music, or visual arts.",
      slots: [
        { label: "Visual / performing arts year", required: ["Art", "Visual Arts", "Drawing", "Painting"], alternatives: ["Band", "Choir", "Orchestra", "Drama", "Theater", "Dance", "Photography"] },
        { label: "CTE / applied arts alternative", required: ["CTE", "Career Technical"], alternatives: ["Digital Media", "Graphic Design", "Engineering Design", "Video Production"] },
      ],
    },
    {
      key: "Physical Education",
      credits: 20,
      dusd: "20 credits",
      uc: "N/A",
      detail: "Freshman P.E. plus one additional full-year course or two semesters. Students may apply for an exemption of up to one year of P.E. when eligible.",
      slots: [
        { label: "Freshman P.E.", required: ["Physical Education", "P.E.", "PE 9", "Freshman PE"], alternatives: ["Fitness", "Weights", "Team Sports"] },
        { label: "Additional P.E. year or two semesters", required: ["Physical Education", "P.E.", "PE 10", "PE 11"], alternatives: ["Athletics", "Dance PE", "Lifetime Fitness"] },
      ],
    },
    {
      key: "Ethnic Studies",
      credits: 5,
      dusd: "5 credits",
      uc: "Satisfies UC elective C courses",
      detail: "Required beginning with seniors graduating in 2028, subject to DUSD implementation and funding.",
      slots: [{ label: "Ethnic Studies course", required: ["Ethnic Studies"], alternatives: ["Ethnic Studies Honors", "Social Justice"] }],
    },
    {
      key: "Financial Literacy",
      credits: 5,
      dusd: "5 credits",
      uc: "Satisfies UC elective C courses",
      detail: "Personal Finance requirement beginning with seniors graduating in 2031.",
      slots: [{ label: "Personal Finance / Financial Literacy", required: ["Personal Finance", "Financial Literacy"], alternatives: ["Economics of Personal Finance", "Business Finance"] }],
    },
    {
      key: "Health",
      credits: 5,
      dusd: "5 credits",
      uc: "N/A",
      detail: "Contemporary Health. Ten credits may be earned in the district-required Contemporary Health course sequence.",
      slots: [{ label: "Contemporary Health", required: ["Health", "Contemporary Health"], alternatives: ["Health Education", "Wellness"] }],
    },
    {
      key: "Elective",
      credits: 60,
      dusd: "60-80 credits",
      uc: "G. College-Preparatory Elective: 1 year / 2 semesters",
      detail: "Additional credits and UC/CSU A-F subjects beyond the minimum, or approved UC elective G courses.",
      slots: [
        {
          label: "Elective credits (flexible)",
          placeholder: "Any district-approved elective that fits your pathway—use Course Info or your counselor plan when no fixed title applies.",
        },
        {
          label: "UC/CSU elective G (if applicable)",
          placeholder: "Approved college-prep elective beyond A–F minimum—confirm with counseling if you are on a UC/CSU track.",
        },
      ],
    },
  ];

  function gradReqMeta(key) {
    const req = GRAD_REQUIREMENTS.find((r) => r.key === key);
    if (!req) return { key: key || "Elective", letter: "G", short: "Elective" };
    const letterMatch = String(req.uc || "").match(/^([A-G])\./);
    const letter = letterMatch ? letterMatch[1] : req.uc === "N/A" ? "—" : "•";
    const short = req.key.split("/")[0].trim();
    return { key: req.key, letter, short };
  }

  function gradReqMetaForRow(row) {
    const parsed = parseCourseKey(row.courseKey || "");
    const key = row.requirement || gradRequirementFor(parsed.subject || row.courseLabel, parsed.title || row.courseLabel);
    return gradReqMeta(key);
  }

  function gradCourseIdentity(row) {
    return (row.courseKey || normalizeText(row.courseLabel || "")).trim();
  }

  function gradRowTitle(row) {
    return formatCourseTitle(row.courseKey || row.courseLabel || "");
  }

  function gradTitleMatchesList(title, names = []) {
    const t = normalizeText(title);
    return names.some((name) => {
      const n = normalizeText(name);
      return n && (t === n || t.includes(n) || n.includes(t));
    });
  }

  function gradSlotSatisfied(slot, rows = []) {
    if (slot.placeholder && !slot.required?.length) return false;
    const names = [...(slot.required || []), ...(slot.alternatives || [])];
    return rows.some((r) => gradTitleMatchesList(gradRowTitle(r), names));
  }

  function groupGradRowsByCourse(rows) {
    const map = new Map();
    rows.forEach((r) => {
      const grade = r.grade || "current";
      const id = gradCourseIdentity(r);
      const key = `${grade}::${id}`;
      if (!map.has(key)) {
        map.set(key, { grade, id, title: gradRowTitle(r), rows: [], summer: !!r.summer });
      }
      const g = map.get(key);
      g.rows.push(r);
      if (r.summer) g.summer = true;
    });
    return [...map.values()].map((g) => {
      const semKeys = [...new Set(g.rows.map((r) => r.semester || "s1"))];
      const semLabels = semKeys
        .map((k) => {
          if (k === "summer-a" || k === "summer-b") return k === "summer-b" ? "Full Year Part 2" : "Full Year Part 1";
          if (k === "summer") return "Summer";
          return SEMESTERS.find((s) => s.key === k)?.label || "Semester";
        })
        .filter((v, i, a) => a.indexOf(v) === i);
      const credits = semKeys.length * 5;
      const hasCurrent = g.rows.some((r) => !r.past && !r.summer && !r.outsideSchool);
      const hasOutside = g.rows.some((r) => r.summer || r.outsideSchool);
      const hasOutsideFinished = g.rows.some(
        (r) => (r.summer || r.outsideSchool) && (r.completionDate || r.completed || r.past)
      );
      const hasInProgress = g.rows.some((r) => !r.past && !r.completionDate && !r.completed);
      const where = hasOutsideFinished
        ? "Outside school course finished"
        : hasOutside && hasInProgress
        ? "Outside school course in progress"
        : hasOutside
        ? "Outside school course"
        : hasCurrent
        ? "Currently taking"
        : `Grade ${g.grade}`;
      const semText =
        semLabels.length > 1 ? semLabels.join(" & ") : semLabels[0] || "Semester";
      let statusClass = "is-complete";
      if (hasOutsideFinished) statusClass = "is-outside";
      else if (hasCurrent || (hasOutside && hasInProgress)) statusClass = "is-current";
      return { ...g, credits, where, semText, hasCurrent, hasOutside, hasOutsideFinished, hasInProgress, statusClass };
    });
  }

  function buildGradCountedListItems(rows) {
    return groupGradRowsByCourse(rows)
      .sort((a, b) => String(a.grade).localeCompare(String(b.grade)) || a.title.localeCompare(b.title))
      .map(
        (g) =>
          `<li class="${g.statusClass}"><strong>${escapeHtml(g.title)}</strong><span>${escapeHtml(g.where)} · ${escapeHtml(g.semText)} · ${g.credits} credits</span></li>`
      );
  }

  function buildGradStillNeededHtml(byReq, requiredCredits) {
    return `<div class="grad-still-pathways">${GRAD_REQUIREMENTS.map((req) => {
      const got = byReq[req.key]?.credits || 0;
      const need = requiredCredits[req.key] || 0;
      const complete = got >= need;
      const remaining = Math.max(0, need - got);
      const rows = byReq[req.key]?.rows || [];
      const slots = req.slots || [{ label: req.key, placeholder: "See counseling for approved courses in this area." }];
      const status = complete
        ? "Complete"
        : `${remaining.toFixed(1)} credits still needed`;
      const courseLines = slots
        .map((slot) => {
          const satisfied =
            slot.placeholder && !slot.required?.length ? complete : gradSlotSatisfied(slot, rows);
          const reqLine = slot.required?.length
            ? `<span class="grad-slot-required">Required: ${escapeHtml(slot.required.join(" or "))}</span>`
            : "";
          const altLine = slot.alternatives?.length
            ? `<span class="grad-slot-alt muted small">Alternatives: ${escapeHtml(slot.alternatives.join(" · "))}</span>`
            : "";
          const phLine = slot.placeholder ? `<span class="grad-slot-placeholder muted small">${escapeHtml(slot.placeholder)}</span>` : "";
          return `<li class="grad-required-course${satisfied ? " grad-req-complete" : ""}">
            <strong>${escapeHtml(slot.label)}</strong>
            ${reqLine}
            ${altLine}
            ${phLine}
          </li>`;
        })
        .join("");
      return `<section class="grad-still-pathway${complete ? " is-complete" : ""}">
        <div class="grad-still-pathway-head">
          <h4>${escapeHtml(req.key)}</h4>
          <span class="grad-still-pathway-status${complete ? " is-complete" : ""}">${escapeHtml(status)}</span>
        </div>
        <ul class="grad-required-course-list">${courseLines}</ul>
      </section>`;
    }).join("")}</div>`;
  }

  function userId() {
    return (session.email || "").trim().toLowerCase();
  }

  const undoStack = [];
  const UNDO_MAX = 25;
  function pushUndoSnapshot() {
    undoStack.push(
      JSON.stringify({
        scheduleByWeekday: state.scheduleByWeekday,
        scheduleByCommunity: state.scheduleByCommunity,
        myClassesDayTab: state.myClassesDayTab,
        myClassesViewTab: state.myClassesViewTab,
        activities: state.activities,
        summerCourses: state.summerCourses,
        futureByGrade: state.futureByGrade,
        activeCommunitySchool: state.activeCommunitySchool,
        followedCommunities: state.followedCommunities,
      })
    );
    while (undoStack.length > UNDO_MAX) undoStack.shift();
  }

  function applyUndo() {
    const raw = undoStack.pop();
    if (!raw) return false;
    const snap = JSON.parse(raw);
    state.scheduleByWeekday = snap.scheduleByWeekday;
    state.scheduleByCommunity = snap.scheduleByCommunity || state.scheduleByCommunity || {};
    state.myClassesDayTab = snap.myClassesDayTab || state.myClassesDayTab || "Monday";
    state.myClassesViewTab = snap.myClassesViewTab || state.myClassesViewTab || "Main";
    state.activities = snap.activities;
    state.summerCourses = snap.summerCourses;
    state.futureByGrade = snap.futureByGrade || defaultFutureByGrade();
    state.activeCommunitySchool = snap.activeCommunitySchool ?? "";
    state.followedCommunities = snap.followedCommunities || [];
    saveState(state);
    return true;
  }

  function getRegistry() {
    try {
      const reg = JSON.parse(localStorage.getItem(REGISTRY_KEY) || "{}");
      const deleted = new Set([...deletedAccountSet(), ...Object.keys(reg.__deletedAccounts || {})]);
      deleted.forEach((id) => delete reg[id]);
      delete reg.__deletedAccounts;
      return reg;
    } catch {
      return {};
    }
  }

  function setRegistry(reg) {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg));
    void window.CourseSyncSharedStore?.pushNow?.(REGISTRY_KEY);
  }

  function getRegistryUser(id) {
    const key = String(id || "").trim().toLowerCase();
    if (!key) return null;
    return getRegistry()[key] || null;
  }

  function ensureCommunitySeeds() {
    const marker = "coursesync_seed_profiles_v2";
    const reg = getRegistry();
    const now = Date.now();
    const seedRows = [
      {
        id: "maya.chen@emerald.example",
        displayName: "Maya Chen",
        school: "Emerald High School",
        grade: "11",
        academicLevel: "AP / Advanced Coursework",
        gender: "Female",
        studentType: "Student",
        careerPathway: "Computer Science / Technology",
        bio: "Building a schedule around AP Computer Science, math, and design projects.",
        updatedAt: now - 2 * 60 * 60 * 1000,
        scheduleSnapshot: [
          { semester: "s1", weekday: "Monday", period: "Period 1", courseKey: courseKey("Career & Technical Education", { level: "AP", title: "AP Computer Science Principles" }), courseLabel: "AP Computer Science Principles", teacher: "Patel", room: "B-204", rating: 5, comment: "Good mix of projects and concept checks." },
          { semester: "s1", weekday: "Tuesday", period: "Period 2", courseKey: courseKey("Mathematics", { level: "Honors", title: "Precalculus Honors" }), courseLabel: "Precalculus Honors", teacher: "Nguyen", room: "C-118", rating: 4, comment: "Fast pace, but clear practice helps." },
        ],
      },
      {
        id: "leo.ramirez@emerald.example",
        displayName: "Leo Ramirez",
        school: "Emerald High School",
        grade: "10",
        academicLevel: "Mixed CP and Honors",
        gender: "Male",
        studentType: "Student Athlete",
        careerPathway: "Health / Medicine",
        bio: "Balancing science, basketball, and a possible sports medicine path.",
        updatedAt: now - 26 * 60 * 60 * 1000,
        scheduleSnapshot: [
          { semester: "s1", weekday: "Monday", period: "Period 3", courseKey: courseKey("Science", { level: "CP", title: "Biology" }), courseLabel: "Biology", teacher: "Sato", room: "D-12", rating: 4, comment: "Labs make the units easier to remember." },
          { semester: "s2", weekday: "Wednesday", period: "Period 4", courseKey: courseKey("English", { level: "CP", title: "English 2" }), courseLabel: "English 2", teacher: "Cole", room: "A-9", rating: 4, comment: "" },
        ],
      },
      {
        id: "aisha.khan@fallon.example",
        displayName: "Aisha Khan",
        school: "Fallon Middle School",
        grade: "8",
        academicLevel: "Exploring / Building Skills",
        gender: "Female",
        studentType: "Student",
        careerPathway: "Arts / Media / Design",
        bio: "Interested in art, leadership, and getting ready for high-school electives.",
        updatedAt: now - 4 * 60 * 60 * 1000,
        scheduleSnapshot: [
          { semester: "s1", weekday: "Monday", period: "Block A", courseKey: "", courseLabel: "English 8", teacher: "Martin", room: "22", rating: 5, comment: "Discussion days are helpful." },
          { semester: "s1", weekday: "Tuesday", period: "Block B", courseKey: "", courseLabel: "Art 8", teacher: "Kim", room: "41", rating: 5, comment: "Lots of room for portfolio ideas." },
        ],
      },
    ];
    let changed = false;
    const deleted = deletedAccountSet();
    seedRows.forEach((s) => {
      if (deleted.has(s.id)) return;
      if (reg[s.id]) return;
      reg[s.id] = {
        verified: true,
        email: s.id,
        displayName: s.displayName,
        phoneDigits: "",
        grade: s.grade,
        gender: s.gender,
        studentType: s.studentType,
        school: s.school,
        bio: s.bio,
        pronouns: "",
        academicLevel: s.academicLevel,
        careerPathway: s.careerPathway,
        avatarPreset: "emerald",
        privacy: { ...defaultPrivacy(), schedule: "school", activities: "school", futurePlan: "school" },
        scheduleSnapshot: s.scheduleSnapshot,
        futurePrimary: [],
        futureAlt: [],
        futureByGrade: {},
        activities: s.studentType.includes("Athlete") ? [{ name: "Basketball", kind: "Sport", when: "After School" }] : [],
        summerCourses: [],
        updatedAt: s.updatedAt,
      };
      changed = true;
    });
    if (changed || localStorage.getItem(marker) !== "done") {
      setRegistry(reg);
      localStorage.setItem(marker, "done");
      rebuildEnrollmentAndRatings();
    }
  }

  /** School label used to bucket a board post (handles older posts missing `school`). */
  function discussionPostSchool(p) {
    if (p.school) return p.school;
    const aid = String(p.authorId || "").trim().toLowerCase();
    if (aid) return getRegistryUser(aid)?.school || "";
    return "";
  }

  function flattenScheduleForPublish() {
    return allScheduleRowsForSchool(state.profile.school || state.scheduleSchool);
  }

  function mergeFutureListsForPublish() {
    const prim = [];
    const alt = [];
    const seenP = new Set();
    const seenA = new Set();
    Object.values(state.futureByGrade || {}).forEach((slot) => {
      (slot.primary || []).forEach((k) => {
        if (k && !seenP.has(k)) {
          seenP.add(k);
          prim.push(k);
        }
      });
      (slot.alternatives || []).forEach((k) => {
        if (k && !seenA.has(k)) {
          seenA.add(k);
          alt.push(k);
        }
      });
    });
    return { futurePrimary: prim, futureAlt: alt };
  }

  function getActiveCommunitySchool() {
    return state.profile.school || "Emerald High School";
  }

  function getCatalogGradeForSchool(school = getActiveCommunitySchool()) {
    return school === state.profile.school ? state.profile.grade : "";
  }

  function getCatalogSchool() {
    return getActiveCommunitySchool();
  }

  function getUpcomingGradeNums() {
    const g = parseInt(state.profile.grade, 10);
    const all = schoolTypeFor(state.profile.school) === "middle" ? [6, 7, 8] : [9, 10, 11, 12];
    if (!Number.isFinite(g)) return all;
    return all.filter((x) => x > g);
  }

  function getFutureSlot() {
    return state.futureByGrade[activeFutureGrade] || emptyFutureSlot();
  }

  function classMatchKey(row) {
    const t = String(row.teacher || "")
      .trim()
      .toLowerCase();
    return `${row.weekday || ""}|${String(row.period || "").trim()}|${t}`;
  }

  function rowCourseSubject(row) {
    if (row.courseKey) return parseCourseKey(row.courseKey).subject;
    const label = String(row.courseLabel || "");
    return label.includes(" — ") ? label.split(" — ")[0] : "";
  }

  function sameClassBlock(a, b) {
    if ((a.semester || "") && (b.semester || "") && a.semester !== b.semester) return false;
    if (normalizedPeriod(a.period) !== normalizedPeriod(b.period)) return false;
    if (rowCourseSubject(a) && rowCourseSubject(b) && rowCourseSubject(a) !== rowCourseSubject(b)) return false;
    if (normalizeText(a.room) && normalizeText(b.room) && normalizeText(a.room) !== normalizeText(b.room)) return false;
    const ta = normalizeText(a.teacher);
    const tb = normalizeText(b.teacher);
    return ta && tb && (ta === tb || ta.includes(tb) || tb.includes(ta));
  }

  function gatherCourseComments(courseKey) {
    const reg = getRegistry();
    const out = [];
    Object.values(reg).forEach((u) => {
      if (!u.verified || !u.scheduleSnapshot || u.school !== getActiveCommunitySchool()) return;
      u.scheduleSnapshot.forEach((row) => {
        if ((row.courseKey || "") !== courseKey) return;
        const c = (row.comment || "").trim();
        const r = row.rating;
        if (!c && (r === undefined || r === null || r === "")) return;
        out.push({
          name: u.displayName || u.email || "Student",
          rating: r !== undefined && r !== null && r !== "" ? String(r) : "—",
          comment: c || "—",
          weekday: row.weekday || "",
        });
      });
    });
    return out;
  }

  function courseCommunityStats(courseKey, school = getActiveCommunitySchool(), range = "") {
    const reg = getRegistry();
    let count = 0;
    let ratingSum = 0;
    let ratingCount = 0;
    Object.values(reg).forEach((u) => {
      if (!u.verified || !u.scheduleSnapshot || u.school !== school) return;
      if (range && !inTrendRange(u.updatedAt || Date.now(), range)) return;
      u.scheduleSnapshot.forEach((row) => {
        if ((row.courseKey || "") !== courseKey) return;
        count += 1;
        if (row.rating !== undefined && row.rating !== null && row.rating !== "") {
          ratingSum += Number(row.rating);
          ratingCount += 1;
        }
      });
    });
    return { count, avg: ratingCount ? ratingSum / ratingCount : null, ratingCount };
  }

  function mutualCoursesRows(peerId) {
    const me = userId();
    const peer = getRegistryUser(peerId);
    if (!peer?.scheduleSnapshot) return [];
    const priv = peer.privacy || defaultPrivacy();
    if (!canViewField(me, peerId, "schedule", priv)) return [];
    const myRows = flattenScheduleForPublish();
    const keys = new Set();
    myRows.forEach((r) => {
      if (r.courseKey) keys.add(r.courseKey);
    });
    const shared = [];
    const seen = new Set();
    peer.scheduleSnapshot.forEach((r) => {
      if (!r.courseKey || !keys.has(r.courseKey)) return;
      if (seen.has(r.courseKey)) return;
      seen.add(r.courseKey);
      shared.push(r);
    });
    return shared;
  }

  function getPrivateNotesMap() {
    try {
      return JSON.parse(localStorage.getItem(NOTES_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function getPrivateNote(peerId) {
    return getPrivateNotesMap()[peerId] || "";
  }

  function savePrivateNote(peerId, text) {
    const m = getPrivateNotesMap();
    m[peerId] = text;
    localStorage.setItem(NOTES_KEY, JSON.stringify(m));
  }

  function rebuildEnrollmentAndRatings() {
    const reg = getRegistry();
    const enroll = {};
    const ratingAgg = {};
    Object.values(reg).forEach((u) => {
      if (!u.verified || !u.scheduleSnapshot) return;
      u.scheduleSnapshot.forEach((row) => {
        const k = row.courseKey || "";
        if (k) enroll[k] = (enroll[k] || 0) + 1;
        if (k && row.rating) {
          if (!ratingAgg[k]) ratingAgg[k] = { sum: 0, n: 0 };
          ratingAgg[k].sum += Number(row.rating);
          ratingAgg[k].n += 1;
        }
      });
    });
    localStorage.setItem(ENROLL_KEY, JSON.stringify(enroll));
    localStorage.setItem(RATING_AGG_KEY, JSON.stringify(ratingAgg));
  }

  function pushFeed(actorId, name, type, detail) {
    const aid = String(actorId || "").trim().toLowerCase();
    const feed = JSON.parse(localStorage.getItem(FEED_KEY) || "[]");
    feed.unshift({ actorId: aid, name, type, detail, at: Date.now() });
    localStorage.setItem(FEED_KEY, JSON.stringify(feed.slice(0, 150)));
  }

  /** Verified directory member in the active community (for shared activity feeds). */
  function isVerifiedCommunityMember(actorId, school = getActiveCommunitySchool()) {
    const aid = String(actorId || "").trim().toLowerCase();
    if (!aid) return false;
    const u = getRegistryUser(aid);
    return !!(u && u.verified && u.school === school);
  }

  function publishToRegistry(message) {
    const id = userId();
    if (!id) return;
    const reg = getRegistry();
    const merged = mergeFutureListsForPublish();
    reg[String(id).trim().toLowerCase()] = {
      verified: true,
      displayName: state.profile.displayName,
      email: id,
      phoneDigits: (state.profile.phone || "").replace(/\D/g, ""),
      grade: state.profile.grade,
      gender: state.profile.gender,
      studentType: state.profile.studentType,
      school: state.profile.school,
      bio: state.profile.bio,
      pronouns: state.profile.pronouns,
      academicLevel: state.profile.academicLevel,
      careerPathway: state.profile.careerPathway,
      avatarPreset: state.profile.avatarPreset,
      privacy: state.profile.privacy,
      scheduleSnapshot: flattenScheduleForPublish(),
      futurePrimary: merged.futurePrimary,
      futureAlt: merged.futureAlt,
      futureByGrade: state.futureByGrade,
      activities: state.activities,
      summerCourses: state.summerCourses,
      updatedAt: Date.now(),
    };
    setRegistry(reg);
    rebuildEnrollmentAndRatings();
    pushFeed(id, state.profile.displayName, "saved_profile", "Updated schedule and profile in the directory.");
    const st = qs("#save-status");
    if (st) {
      st.textContent = message || "Saved to profile and directory.";
      setTimeout(() => {
        st.textContent = "";
      }, 3500);
    }
    renderFriendActivity();
    if (qs("#course-info-grid")) renderCourseInfo();
  }

  function levelRank(level) {
    const i = LEVEL_ORDER.indexOf(level);
    return i === -1 ? 99 : i;
  }

  function sortedSubjects(grade = state.profile.grade, school = state.scheduleSchool || state.profile.school) {
    return Object.keys(catalog)
      .filter((subject) => (catalog[subject] || []).some((c) => courseAllowed(c, grade, school)))
      .sort((a, b) => a.localeCompare(b));
  }

  function courseKey(subject, c) {
    return `${subject}::${c.level}::${c.title}`;
  }

  function parseCourseKey(key) {
    const [subject, level, ...rest] = key.split("::");
    const title = rest.join("::");
    return { subject, level: /^AP\b/.test(title) || /\bAP\b/.test(title) ? "AP" : level, title };
  }

  function teachersForCourse(subject, title) {
    const found = (catalog[subject] || []).find((c) => c.title === title);
    return found?.teachers?.length ? found.teachers : ["Other / Not Listed"];
  }

  function schoolTypeFor(name = state.profile.school) {
    return String(name).toLowerCase().includes("middle") ? "middle" : "high";
  }

  function courseAllowed(c, grade = state.profile.grade, school = state.scheduleSchool || state.profile.school) {
    const schoolType = schoolTypeFor(school);
    if (c.schoolTypes?.length && !c.schoolTypes.includes(schoolType)) return false;
    if (schoolType !== "high" && grade && c.grades?.length && !c.grades.map(String).includes(String(grade))) return false;
    return true;
  }

  function formatCourseTitle(keyOrLabel) {
    if (!keyOrLabel) return "";
    if (String(keyOrLabel).includes("::")) return parseCourseKey(keyOrLabel).title;
    const parts = String(keyOrLabel).split(" — ");
    return parts[parts.length - 1] || keyOrLabel;
  }

  function normalizeText(v) {
    return String(v || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function normalizedPeriod(v) {
    const m = String(v || "").match(/\d+/);
    return m ? `Period ${m[0]}` : String(v || "").replace(/\s*\(.*?\)\s*/g, "").trim();
  }

  function periodSortValue(v) {
    const text = String(v || "").toLowerCase();
    const n = Number((text.match(/\d+/) || ["999"])[0]);
    if (text.includes("zero") || text.includes("period 0")) return 0;
    if (text.includes("access") || text.includes("advisory")) return 6.5;
    if (Number.isFinite(n)) return n;
    return 999;
  }

  function compareScheduleRows(a, b) {
    return (
      periodSortValue(a.period) - periodSortValue(b.period) ||
      String(a.weekday || a.day || "").localeCompare(String(b.weekday || b.day || "")) ||
      formatCourseTitle(a.courseKey || a.courseLabel).localeCompare(formatCourseTitle(b.courseKey || b.courseLabel))
    );
  }

  function uniqueScheduleRows(rows, includeDay = false) {
    const seen = new Set();
    return [...(rows || [])].sort(compareScheduleRows).filter((r) => {
      const key = [
        includeDay ? r.weekday || r.day || "" : "",
        normalizedPeriod(r.period),
        r.courseKey || normalizeText(r.courseLabel),
        normalizeText(r.teacher),
        normalizeText(r.room),
      ].join("::");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function getStarredCourses() {
    try {
      return JSON.parse(localStorage.getItem(STARRED_COURSES_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function setStarredCourses(list) {
    localStorage.setItem(STARRED_COURSES_KEY, JSON.stringify([...new Set(list)]));
  }

  function isStarredCourse(key) {
    return getStarredCourses().includes(key);
  }

  function toggleStarredCourse(key) {
    const stars = getStarredCourses();
    if (stars.includes(key)) setStarredCourses(stars.filter((x) => x !== key));
    else setStarredCourses([...stars, key]);
  }

  function courseKeyAllowed(key, grade = state.profile.grade, school = state.scheduleSchool || state.profile.school) {
    const { subject, title } = parseCourseKey(key);
    const found = (catalog[subject] || []).find((c) => c.title === title);
    return found ? courseAllowed(found, grade, school) : false;
  }

  function getJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }

  function setJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function deletedAccountSet() {
    return new Set(getJson(DELETED_ACCOUNTS_KEY, []).map((id) => String(id || "").trim().toLowerCase()).filter(Boolean));
  }

  /** Per-target: each signed-in user contributes at most once per emoji (toggle). Multiple emojis allowed. */
  function getReactionBucket(targetId) {
    const all = getJson(REACTIONS_KEY, {});
    return all[targetId] || null;
  }

  function getReactionCountsForTarget(targetId) {
    const b = getReactionBucket(targetId);
    if (!b?.byUser) return {};
    const counts = {};
    Object.values(b.byUser).forEach((arr) => {
      (Array.isArray(arr) ? arr : []).forEach((emoji) => {
        counts[emoji] = (counts[emoji] || 0) + 1;
      });
    });
    return counts;
  }

  function currentUserReactionList(targetId) {
    const me = userId();
    if (!me) return [];
    const b = getReactionBucket(targetId);
    const mine = b?.byUser?.[me];
    return Array.isArray(mine) ? mine : [];
  }

  function toggleReaction(targetId, emoji) {
    const me = userId();
    if (!me || !targetId || !emoji) return;
    const all = getJson(REACTIONS_KEY, {});
    if (!all[targetId]) all[targetId] = { byUser: {} };
    const cur = new Set(all[targetId].byUser[me] || []);
    if (cur.has(emoji)) cur.delete(emoji);
    else cur.add(emoji);
    const next = [...cur];
    if (next.length) all[targetId].byUser[me] = next;
    else delete all[targetId].byUser[me];
    if (!Object.keys(all[targetId].byUser).length) delete all[targetId];
    setJson(REACTIONS_KEY, all);
  }

  function getReactions(id) {
    return getReactionCountsForTarget(id);
  }

  const REACTION_EMOJIS = ["👍", "🔥", "❤️", "😂"];

  function reactionHtml(id) {
    const cur = getReactionCountsForTarget(id);
    const mine = new Set(currentUserReactionList(id));
    return `<div class="reaction-row" data-react-target="${escapeHtml(id)}">${REACTION_EMOJIS.map(
      (e) =>
        `<button type="button" class="reaction-btn${mine.has(e) ? " reaction-btn-active" : ""}" data-react="${e}" aria-pressed="${mine.has(e) ? "true" : "false"}">${e} <span class="reaction-count">${cur[e] || 0}</span></button>`
    ).join("")}</div>`;
  }

  function wireReactions(root = document, after = () => {}) {
    qsa("[data-react-target]", root).forEach((wrap) => {
      qsa("[data-react]", wrap).forEach((btn) => {
        btn.addEventListener("click", () => {
          toggleReaction(wrap.getAttribute("data-react-target"), btn.getAttribute("data-react"));
          after();
        });
      });
    });
  }

  const APP_UPDATE_NOTICE = {
    id: "app-update:2026-05-28",
    text: "May 28: requests and recommend layout, font color options, richer trending empty states, message improvements, and expanded notification filters.",
    at: new Date("2026-05-28T08:00:00").getTime(),
  };

  function pushNotification(text, type = "update") {
    const map = {
      request: "friendRequests",
      message: "messages",
      recommendation: "courseRecommendations",
      networking: "networkingPosts",
      community: "communityChanges",
      classmate: "newClassmates",
      trending: "trending",
      update: "appUpdates",
    };
    const settingKey = map[type];
    if (settingKey && state.settings?.notifications?.[settingKey] === false) return;
    const list = getJson(NOTIFICATIONS_KEY, []);
    list.unshift({ text, type, at: Date.now(), read: false });
    setJson(NOTIFICATIONS_KEY, list.slice(0, 60));
    renderNotifications();
  }

  let knownIncomingRequestKeys = new Set();

  function snapshotIncomingRequestKeys() {
    const me = userId();
    knownIncomingRequestKeys = new Set(
      getNetwork()
        .requests.filter((r) => r.to === me)
        .map((r) => `${r.from}|${r.to}|${r.at}`)
    );
  }

  function notifyNewIncomingRequests() {
    const me = userId();
    getNetwork()
      .requests.filter((r) => r.to === me)
      .forEach((r) => {
        const key = `${r.from}|${r.to}|${r.at}`;
        if (knownIncomingRequestKeys.has(key)) return;
        knownIncomingRequestKeys.add(key);
        const name = getRegistryUser(r.from)?.displayName || r.from;
        pushNotification(`${name} sent you a friend request.`, "request");
      });
  }

  function refreshAfterSharedSync(changedKeys = []) {
    state = loadState();
    if (changedKeys.includes(NETWORK_KEY) || changedKeys.includes(DM_KEY)) {
      notifyNewIncomingRequests();
    }
    rebuildEnrollmentAndRatings();
    renderTopbarUser();
    renderNotifications();
    const panel = qs(".sidebar-link[aria-current='page']")?.dataset.panel || "home";
    showPanel(panel);
  }

  async function initSharedCommunityData() {
    const shared = window.CourseSyncSharedStore;
    if (!shared?.enabled) {
      showSharedStoreBanner(false);
      ensureCommunitySeeds();
      return;
    }
    showSharedStoreBanner(false);
    try {
      const changed = await shared.connect();
      ensureCommunitySeeds();
      await shared.flush();
      const id = userId();
      if (id) {
        const reg = getRegistryUser(id);
        if (!reg?.verified) publishToRegistry("Your profile is now visible in the live community directory.");
        else if (state.profile.displayName && state.profile.gender && state.profile.grade) publishToRegistry();
      }
      snapshotIncomingRequestKeys();
      refreshAfterSharedSync(changed);
      shared.startPolling();
    } catch {
      ensureCommunitySeeds();
      showSharedStoreBanner(false);
    }
  }

  function showSharedStoreBanner() {
    const el = qs("#shared-live-banner");
    if (el) el.remove();
  }

  document.addEventListener("coursesync:shared-updated", (e) => {
    refreshAfterSharedSync(e.detail?.keys || []);
  });

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function lookupEmeraldTime(day, periodVal) {
    const rows = emeraldDays[day]?.rows || [];
    const needle = periodVal.replace(/\s*\(.*?\)\s*/g, "").trim();
    const row = rows.find((r) => {
      const rp = r.period.replace(/[()]/g, "").trim();
      return rp === needle || (needle && rp.includes(needle)) || (needle.includes("Period") && rp.includes(needle.split(" ")[0] + " " + (needle.match(/\d/) || [""])[0]));
    });
    if (!row) return { start: "—", end: "—" };
    return { start: row.start, end: row.end };
  }

  function lookupFallonTime(periodId) {
    const periods = schoolSchedules["Fallon Middle School"]?.periods || [];
    const p = periods.find((x) => x.id === periodId);
    if (!p) return { start: "—", end: "—" };
    const parts = p.time.split(/[–-]/);
    return { start: parts[0]?.trim() || p.time, end: parts[1]?.trim() || "—" };
  }

  function resolveTimesForEntry(day, period, school) {
    if (school === "Emerald High School") return lookupEmeraldTime(day, period);
    return lookupFallonTime(period);
  }

  /* ---------- Network ---------- */
  function normalizeNetworkId(id) {
    return String(id || "").trim().toLowerCase();
  }

  function normalizeNetwork(n) {
    const normReq = (r) => ({
      ...r,
      from: normalizeNetworkId(r.from),
      to: normalizeNetworkId(r.to),
      at: r.at || 0,
    });
    const normFriend = (f) => ({
      ...f,
      a: normalizeNetworkId(f.a),
      b: normalizeNetworkId(f.b),
      since: f.since || 0,
    });
    return {
      requests: (n.requests || []).map(normReq),
      friends: (n.friends || []).map(normFriend),
      closeRequests: (n.closeRequests || []).map(normReq),
      closeFriends: (n.closeFriends || []).map(normFriend),
      declined: (n.declined || []).map(normReq),
      declinedClose: (n.declinedClose || []).map(normReq),
      updatedAt: n.updatedAt || 0,
    };
  }

  function recordNetworkDecline(n, from, to, bucket = "declined") {
    const entry = { from: normalizeNetworkId(from), to: normalizeNetworkId(to), at: Date.now() };
    const key = `${entry.from}|${entry.to}`;
    const list = n[bucket] || [];
    if (!list.some((d) => `${d.from}|${d.to}` === key)) list.push(entry);
    n[bucket] = list;
  }

  function getNetwork() {
    try {
      return normalizeNetwork(JSON.parse(localStorage.getItem(NETWORK_KEY) || "{}"));
    } catch {
      return normalizeNetwork({});
    }
  }

  function saveNetwork(n) {
    const normalized = normalizeNetwork(n);
    normalized.updatedAt = Date.now();
    localStorage.setItem(NETWORK_KEY, JSON.stringify(normalized));
    void window.CourseSyncSharedStore?.pushNow?.(NETWORK_KEY);
  }

  function friendPair(a, b) {
    return [a, b].sort().join("|||");
  }

  function addFriendPair(a, b) {
    if (!a || !b || a === b) return;
    const n = getNetwork();
    if (!n.friends.some((f) => friendPair(f.a, f.b) === friendPair(a, b))) {
      n.friends.push({ a, b, since: Date.now(), via: "invite" });
      n.requests = n.requests.filter((r) => friendPair(r.from, r.to) !== friendPair(a, b));
      saveNetwork(n);
    }
  }

  function acceptPendingInviteForSession() {
    const me = userId();
    if (!me) return;
    const invites = getJson(INVITES_KEY, []);
    let changed = false;
    invites.forEach((invite) => {
      if (String(invite.to || "").toLowerCase() !== me || invite.acceptedAt) return;
      invite.acceptedAt = Date.now();
      addFriendPair(invite.from, me);
      changed = true;
    });
    if (changed) {
      setJson(INVITES_KEY, invites);
      pushNotification("Invite accepted. You and your inviter are now friends.", "request");
    }
  }

  function isFriend(peerId) {
    const me = userId();
    if (!me || !peerId || peerId === me) return false;
    return getNetwork().friends.some((f) => friendPair(f.a, f.b) === friendPair(me, peerId));
  }

  function getFriendsOf(uid) {
    return getNetwork()
      .friends.filter((f) => f.a === uid || f.b === uid)
      .map((f) => (f.a === uid ? f.b : f.a));
  }

  function mutualCount(a, b) {
    const fa = new Set(getFriendsOf(a));
    let n = 0;
    getFriendsOf(b).forEach((x) => {
      if (x !== a && x !== b && fa.has(x)) n++;
    });
    return n;
  }

  function requestFriend(peerId) {
    const me = userId();
    const target = normalizeNetworkId(peerId);
    if (!me || !target || target === me) return;
    const n = getNetwork();
    if (isFriend(target)) return;
    if (n.requests.some((r) => r.from === me && r.to === target)) return;
    n.requests.push({ from: me, to: target, at: Date.now() });
    saveNetwork(n);
    pushNotification(`Friend request sent to ${getRegistryUser(target)?.displayName || target}.`, "request");
  }

  function acceptFriend(peerId) {
    const me = userId();
    const from = normalizeNetworkId(peerId);
    const n = getNetwork();
    n.requests = n.requests.filter((r) => !(r.from === from && r.to === me));
    if (!n.friends.some((f) => friendPair(f.a, f.b) === friendPair(me, from))) {
      n.friends.push({ a: me, b: from, since: Date.now() });
    }
    saveNetwork(n);
    pushNotification(`You are now friends with ${getRegistryUser(from)?.displayName || from}.`, "request");
  }

  function declineFriend(peerId) {
    const me = userId();
    const from = normalizeNetworkId(peerId);
    const n = getNetwork();
    n.requests = n.requests.filter((r) => !(r.from === from && r.to === me));
    recordNetworkDecline(n, from, me);
    saveNetwork(n);
  }

  function cancelOutgoing(peerId) {
    const me = userId();
    const target = normalizeNetworkId(peerId);
    const n = getNetwork();
    n.requests = n.requests.filter((r) => !(r.from === me && r.to === target));
    recordNetworkDecline(n, me, target);
    saveNetwork(n);
  }

  function listFriendIds() {
    const me = userId();
    return getNetwork()
      .friends.filter((f) => f.a === me || f.b === me)
      .map((f) => (f.a === me ? f.b : f.a));
  }

  function isCloseFriend(peerId) {
    const me = userId();
    if (!me || !peerId || peerId === me) return false;
    return getNetwork().closeFriends.some((f) => friendPair(f.a, f.b) === friendPair(me, peerId));
  }

  function hasClosePendingTo(peerId) {
    const me = userId();
    return getNetwork().closeRequests.some((r) => r.from === me && r.to === peerId);
  }

  function hasClosePendingFrom(peerId) {
    const me = userId();
    return getNetwork().closeRequests.some((r) => r.from === peerId && r.to === me);
  }

  function requestCloseFriend(peerId) {
    const me = userId();
    if (!me || peerId === me || !isFriend(peerId) || isCloseFriend(peerId)) return;
    const n = getNetwork();
    if (n.closeRequests.some((r) => r.from === me && r.to === peerId)) return;
    n.closeRequests.push({ from: me, to: peerId, at: Date.now() });
    saveNetwork(n);
  }

  function acceptCloseFriend(peerId) {
    const me = userId();
    const n = getNetwork();
    n.closeRequests = n.closeRequests.filter((r) => !(r.from === peerId && r.to === me));
    if (!n.closeFriends.some((f) => friendPair(f.a, f.b) === friendPair(me, peerId))) {
      n.closeFriends.push({ a: me, b: peerId, since: Date.now() });
    }
    saveNetwork(n);
  }

  function declineCloseFriend(peerId) {
    const me = userId();
    const from = normalizeNetworkId(peerId);
    const n = getNetwork();
    n.closeRequests = n.closeRequests.filter((r) => !(r.from === from && r.to === me));
    recordNetworkDecline(n, from, me, "declinedClose");
    saveNetwork(n);
  }

  function cancelCloseOutgoing(peerId) {
    const me = userId();
    const target = normalizeNetworkId(peerId);
    const n = getNetwork();
    n.closeRequests = n.closeRequests.filter((r) => !(r.from === me && r.to === target));
    recordNetworkDecline(n, me, target, "declinedClose");
    saveNetwork(n);
  }

  function removeCloseFriend(peerId) {
    const me = userId();
    const n = getNetwork();
    const pair = friendPair(me, peerId);
    n.closeFriends = n.closeFriends.filter((f) => friendPair(f.a, f.b) !== pair);
    saveNetwork(n);
  }

  function getDM() {
    try {
      return JSON.parse(localStorage.getItem(DM_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveDM(obj) {
    localStorage.setItem(DM_KEY, JSON.stringify(obj));
    void window.CourseSyncSharedStore?.pushNow?.(DM_KEY);
  }

  function getThread(peerId) {
    return getDM()[friendPair(userId(), peerId)] || [];
  }

  function sendDm(peerId, body) {
    const me = userId();
    if (!isFriend(peerId) || !body.trim()) return;
    const k = friendPair(me, peerId);
    const all = getDM();
    if (!all[k]) all[k] = [];
    all[k].push({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, from: me, body: body.trim(), t: Date.now() });
    saveDM(all);
    pushNotification(`Message sent to ${getRegistryUser(peerId)?.displayName || peerId}.`, "message");
  }

  function canViewField(viewerId, targetId, fieldKey, targetPrivacy) {
    if (!targetId || viewerId === targetId) return true;
    const level = targetPrivacy?.[fieldKey] || "friends";
    if (level === "private") return false;
    if (level === "school") return true;
    if (level === "friends") return isFriend(targetId);
    return false;
  }

  /* ---------- Nav ---------- */
  const panelIds = ["home", "snapshot", "explore", "schedule", "access", "future", "grad", "courses", "classes", "community", "discussion", "friends", "profile", "settings"];
  const panelTitles = {
    home: "Home",
    snapshot: "My Snapshot",
    explore: "Explore",
    schedule: "Current Schedule",
    access: "Access Sessions",
    future: "Future Courses",
    grad: "Grad Requirements",
    courses: "Course Info",
    classes: "Classes",
    community: "Community",
    discussion: "Networking",
    friends: "Friends & Messages",
    profile: "Profile & Security",
    settings: "Settings",
  };

  let activeFuturePrimary = 0;
  let activeFutureAlt = 0;
  let activeFutureGrade = "12";
  let futurePickTarget = "primary";
  let courseInfoSort = "popular";
  let courseInfoLevelFilter = "";
  let courseInfoSubjectFilter = "";
  let courseInfoGradFilter = "";
  let courseInfoPage = 1;
  let exploreSameClassOnly = false;
  const explorerFilters = {
    home: { course: "all", person: "all", fact: "all" },
    explore: { course: "all", person: "all", fact: "all" },
  };
  const EXPLORER_GRAD_LABELS = {
    "History/Social Science": "History / Social Science",
    English: "ELA",
    Mathematics: "Math",
    Science: "Science",
    "World Language": "World Language",
    "VAPA / CTE": "VAPA / CTE",
    "Physical Education": "PE",
    "Ethnic Studies": "Ethnic Studies",
    "Financial Literacy": "Financial Literacy",
    Health: "Health",
    Elective: "Elective",
  };
  const EXPLORER_LEVEL_FILTERS = [
    { value: "level:AP", label: "AP" },
    { value: "level:Honors", label: "Honors" },
    { value: "level:ROP", label: "ROP" },
    { value: "level:SAI", label: "SAI" },
    { value: "level:CP", label: "CP" },
  ];
  let careerFactCursor = 0;
  let commentsTarget = null;
  let activityFeedPage = 0;
  const trendingModes = { home: "course", explore: "course" };
  const trendingRanges = { home: "today", explore: "today" };
  let suggestionsPage = 0;
  let contactMatchPage = 0;
  let selectedContactId = "";
  let dismissedSuggestionIds = new Set();
  let gradPanelMode = "requirements";
  let activePastGrade = "9";
  let classesPanelTab = "current";

  function syncClassesPanelView() {
    const isCurrent = classesPanelTab === "current";
    qs("#classes-tab-current")?.classList.toggle("active", isCurrent);
    qs("#classes-tab-past")?.classList.toggle("active", !isCurrent);
    if (qs("#classes-content")) qs("#classes-content").hidden = !isCurrent;
    if (qs("#past-classes-content")) qs("#past-classes-content").hidden = isCurrent;
    const intro = qs("#classes-view-intro");
    if (intro) {
      intro.textContent = isCurrent
        ? "Your current courses appear as clickable class cards. Open a class to see details, classmates, and class news."
        : "Schedules saved when you start a New Schedule appear here for previous years or semesters.";
    }
  }
  let snapshotSemester = "s1";
  let snapshotScheduleView = "Main";
  let requestMode = "friends";

  function featureEnabled(key) {
    return state.settings?.featureVisibility?.[key] !== false;
  }

  function viewpointEnabled(key) {
    return state.settings?.viewpoint?.[key] !== false;
  }

  const VIEWPOINT_TABS = [
    { id: "profile", label: "Profile" },
    { id: "planning", label: "Planning" },
    { id: "social", label: "Social" },
  ];

  const VIEWPOINT_TOGGLES = {
    profile: [
      { key: "about", label: "About & bio", desc: "Bio and intro text on a classmate profile." },
      { key: "privateNotes", label: "Your notes", desc: "Your private notes box on classmate profiles." },
      { key: "personalInfo", label: "Personal information", desc: "Email, links, and other contact details when shared." },
      { key: "grade", label: "Grade", desc: "Current grade level when their privacy allows." },
      { key: "gender", label: "Gender", desc: "Gender field from their published profile." },
      { key: "academicLevel", label: "Academic level", desc: "Honors/AP mix and academic profile label." },
      { key: "careerPathway", label: "Career pathway", desc: "Pathway or goal they selected." },
      { key: "phone", label: "Phone", desc: "Phone digits when shared beyond friends-only." },
    ],
    planning: [
      { key: "schedule", label: "Classes & schedule", desc: "Period, course, teacher, and room rows." },
      { key: "futurePlan", label: "Future courses", desc: "Grade-by-grade primary and backup picks." },
      { key: "futureNotes", label: "Future notes", desc: "Primary and alternative planning notes when shared." },
      { key: "gradReq", label: "Grad requirements", desc: "Graduation progress summary when shared." },
      { key: "summerWork", label: "Summer / online work", desc: "Outside-school courses they saved." },
      { key: "activities", label: "Activities", desc: "Clubs, sports, and extracurriculars." },
    ],
    social: [
      { key: "mutualFriends", label: "Mutual friends", desc: "How many friends you share in common." },
      { key: "mutualCourses", label: "Mutual courses", desc: "Overlapping classes in visible schedules." },
      { key: "achievements", label: "Achievements", desc: "Badges earned from verified profile activity." },
      { key: "networking", label: "Networking", desc: "Visible board and community context sections." },
    ],
  };

  let activeViewpointTab = "profile";

  function applyFeatureVisibility() {
    const features = state.settings?.featureVisibility || {};
    const panelFeatureMap = {
      schedule: "schedule",
      future: "future",
      courses: "courses",
      classes: "classes",
      community: "community",
      snapshot: "snapshot",
      explore: "explore",
      access: "access",
      friends: "friends",
      discussion: "networking",
      grad: "gradReq",
    };
    qsa(".sidebar-link[data-panel]").forEach((link) => {
      const panel = link.dataset.panel;
      const featureKey = panelFeatureMap[panel];
      let hidden = false;
      if (panel === "grad") hidden = schoolTypeFor(getActiveCommunitySchool()) !== "high" || features.gradReq === false;
      else if (featureKey) hidden = features[featureKey] === false;
      link.hidden = hidden;
    });
    qs(".community-links-card")?.toggleAttribute("hidden", features.resourceLinks === false);
    const current = qs(".sidebar-link[aria-current='page']")?.dataset.panel;
    const currentFeature = panelFeatureMap[current];
    if (current === "grad" && (features.gradReq === false || schoolTypeFor(getActiveCommunitySchool()) !== "high")) showPanel("home");
    else if (currentFeature && features[currentFeature] === false) showPanel("home");
  }

  function showPanel(id) {
    if (id === "grad" && schoolTypeFor(getActiveCommunitySchool()) !== "high") id = "home";
    if (id === "grad" && !featureEnabled("gradReq")) id = "home";
    const routeFeature = {
      schedule: "schedule",
      future: "future",
      courses: "courses",
      classes: "classes",
      community: "community",
      snapshot: "snapshot",
      explore: "explore",
      access: "access",
      friends: "friends",
      discussion: "networking",
    };
    if (routeFeature[id] && !featureEnabled(routeFeature[id])) id = "home";
    applyFeatureVisibility();
    panelIds.forEach((pid) => {
      const el = qs(`#panel-${pid}`);
      if (el) el.hidden = pid !== id;
    });
    qsa(".sidebar-link").forEach((btn) => {
      btn.setAttribute("aria-current", btn.dataset.panel === id ? "page" : "false");
    });
    const top = qs("#topbar-title");
    if (top) top.textContent = panelTitles[id] || "CourseSync";
    qs(".app-sidebar")?.classList.remove("open");
    if (qs("#user-menu-dropdown")) qs("#user-menu-dropdown").hidden = true;
    qs("#user-menu-trigger")?.setAttribute("aria-expanded", "false");

    if (id === "schedule") renderSchedulePanel();
    if (id === "access") renderAccessSessions();
    if (id === "future") renderFuturePanel();
    if (id === "grad") renderGradRequirementsPanel();
    if (id === "courses") renderCourseInfo();
    if (id === "classes") renderClassesPanel();
    if (id === "community") renderCommunityPanel();
    if (id === "discussion") renderDiscussionPanel();
    if (id === "friends") renderFriendsPanel();
    if (id === "profile") renderProfilePanel();
    if (id === "settings") renderSettingsPanel();
    if (id === "snapshot") renderSnapshotPanel();
    if (id === "home") renderHomePanel();
    if (id === "explore") renderExplorePanel();
  }

  qsa(".sidebar-link").forEach((btn) => {
    btn.addEventListener("click", () => showPanel(btn.dataset.panel));
  });

  qs("#classes-tab-current")?.addEventListener("click", () => {
    classesPanelTab = "current";
    syncClassesPanelView();
  });
  qs("#classes-tab-past")?.addEventListener("click", () => {
    classesPanelTab = "past";
    syncClassesPanelView();
  });

  qs("#sidebar-toggle")?.addEventListener("click", () => qs(".app-sidebar")?.classList.toggle("open"));

  qs("#nav-main")?.addEventListener("click", () => showPanel("home"));
  qs("#menu-open-profile")?.addEventListener("click", () => showPanel("profile"));
  qs("#nav-profile")?.addEventListener("click", () => showPanel("snapshot"));
  qs("#snapshot-open-profile")?.addEventListener("click", () => showPanel("profile"));
  qs("#profile-open-snapshot")?.addEventListener("click", () => showPanel("snapshot"));
  qs("#menu-sign-out")?.addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = "index.html";
  });

  const userTrigger = qs("#user-menu-trigger");
  const userDrop = qs("#user-menu-dropdown");
  userTrigger?.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = userDrop.hidden;
    userDrop.hidden = !open;
    userTrigger.setAttribute("aria-expanded", open ? "true" : "false");
  });
  document.addEventListener("click", () => {
    if (userDrop) userDrop.hidden = true;
    if (qs("#notification-dropdown")) qs("#notification-dropdown").hidden = true;
    userTrigger?.setAttribute("aria-expanded", "false");
  });

  const AV_PRESETS = [
    { id: "emerald", color: "#2d6a4f" },
    { id: "ocean", color: "#1d3557" },
    { id: "sunrise", color: "#e76f51" },
    { id: "violet", color: "#6a4c93" },
    { id: "gold", color: "#bc6c25" },
    { id: "slate", color: "#457b9d" },
    { id: "rose", color: "#b23a48" },
    { id: "teal", color: "#007f7f" },
    { id: "plum", color: "#7b2d5b" },
    { id: "forest", color: "#31572c" },
    { id: "cobalt", color: "#2454a6" },
    { id: "clay", color: "#9c6644" },
  ];

  function renderTopbarUser() {
    const nameEl = qs("#topbar-name");
    const av = qs("#topbar-avatar");
    if (nameEl) nameEl.textContent = state.profile.displayName || "Account";
    if (!av) return;
    if (state.profile.avatarDataUrl) {
      av.innerHTML = `<img src="${state.profile.avatarDataUrl}" alt="" />`;
    } else {
      const pr = AV_PRESETS.find((p) => p.id === state.profile.avatarPreset) || AV_PRESETS[0];
      const L = (state.profile.displayName || "S").trim().charAt(0).toUpperCase();
      av.innerHTML = `<span style="background:${pr.color}">${escapeHtml(L)}</span>`;
    }
  }

  function renderCurrentDate() {
    const el = qs("#current-date-pill");
    if (!el) return;
    el.textContent = new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }

  function renderNotifications() {
    const list = getJson(NOTIFICATIONS_KEY, []);
    const clearedAt = Number(localStorage.getItem(NOTIFICATION_CLEARED_KEY) || 0);
    const readIds = new Set(getJson(NOTIFICATION_READ_KEY, []));
    const auto = buildCommunityNotifications(clearedAt).map((n) => ({ ...n, read: readIds.has(n.id) }));
    const merged = [...auto, ...list.filter((n) => Number(n.at || 0) > clearedAt)]
      .filter((n) => Number.isFinite(Number(n.at || 0)))
      .sort((a, b) => Number(b.at || 0) - Number(a.at || 0) || String(b.id || "").localeCompare(String(a.id || "")))
      .slice(0, 10);
    const unread = merged.filter((n) => !n.read).length;
    const count = qs("#notification-count");
    const box = qs("#notification-list");
    if (count) count.textContent = String(unread);
    if (!box) return;
    if (!merged.length) {
      box.innerHTML = '<p class="muted small">No alerts right now.</p>';
      return;
    }
    const groups = new Map();
    merged.forEach((n) => {
      const date = new Date(n.at || Date.now());
      const key = date.toISOString().slice(0, 10);
      const label = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      if (!groups.has(key)) groups.set(key, { label, rows: [] });
      groups.get(key).rows.push(n);
    });
    box.innerHTML = [...groups.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(
        ([, group]) => `<div class="notification-date-group"><h4>${escapeHtml(group.label)}</h4>${group.rows
          .map((n) => {
            const label = n.type === "notice" ? "CourseSync" : String(n.type || "Alert").replace(/(^|\s)\w/g, (m) => m.toUpperCase());
            const time = new Date(n.at || Date.now()).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
            return `<div class="notification-item notification-type-${escapeHtml(n.type || "alert")}"><strong>${escapeHtml(label)}</strong><span class="muted small notification-time">${escapeHtml(time)}</span><p>${escapeHtml(n.text)}</p></div>`;
          })
          .join("")}</div>`
      )
      .join("");
  }

  function buildCommunityNotifications(clearedAt = 0) {
    const notes = [];
    const school = getActiveCommunitySchool();
    const me = userId();
    if (state.settings?.notifications?.communityActivity !== false) {
      const latestPost = getDiscussions()
        .filter((p) => discussionPostSchool(p) === school && (p.visibility || "public") === "public" && String(p.authorId || "").toLowerCase() !== me)
        .sort((a, b) => Number(b.at || 0) - Number(a.at || 0))[0];
      if (latestPost && Number(latestPost.at || 0) > clearedAt) {
        notes.push({
          id: `discussion:${latestPost.id}`,
          text: `New community Networking post: ${latestPost.title || latestPost.category || "Board post"}.`,
          at: latestPost.at || Date.now(),
          type: "community",
        });
      }
      const latestPeer = listVerifiedPeers()
        .filter((p) => p.school === school && p.id !== me)
        .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))[0];
      if (latestPeer && Number(latestPeer.updatedAt || 0) > clearedAt) {
        notes.push({
          id: `peer:${latestPeer.id}:${latestPeer.updatedAt || 0}`,
          text: `${latestPeer.displayName || latestPeer.email} updated their community profile.`,
          at: latestPeer.updatedAt || Date.now(),
          type: "community",
        });
      }
    }
    if (state.settings?.notifications?.friendRequests !== false) {
      getNetwork()
        .requests.filter((r) => r.to === me && Number(r.at || 0) > clearedAt)
        .forEach((r) => {
          notes.push({
            id: `request:${r.from}:${r.at || 0}`,
            text: `${getRegistryUser(r.from)?.displayName || r.from} sent you a friend request.`,
            at: r.at || Date.now(),
            type: "request",
          });
        });
    }
    if (state.settings?.notifications?.newClassmates !== false) {
      listVerifiedPeers()
        .filter((p) => p.school === school && p.id !== me && Number(p.updatedAt || 0) > clearedAt)
        .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
        .slice(0, 4)
        .forEach((p) => {
          notes.push({
            id: `classmate:${p.id}:${p.updatedAt || 0}`,
            text: `${p.displayName || p.email} joined or updated their profile in ${school}.`,
            at: p.updatedAt || Date.now(),
            type: "classmate",
          });
        });
    }
    if (state.settings?.notifications?.trending !== false) {
      const dayKey = new Date().toISOString().slice(0, 10);
      ["course", "person", "discussion"].forEach((mode) => {
        const top = trendingItems(mode, "today")[0];
        if (!top) return;
        notes.push({
          id: `trend:${mode}:${dayKey}:${school}`,
          text:
            mode === "course"
              ? `Trending course: ${top.title} — ${top.why}`
              : mode === "person"
              ? `Trending profile: ${top.title} — ${top.why}`
              : `Trending discussion: ${top.title} — ${top.why}`,
          at: Date.now(),
          type: "trending",
        });
      });
    }
    if (state.settings?.notifications?.appUpdates !== false && APP_UPDATE_NOTICE.at > clearedAt) {
      notes.push({
        id: APP_UPDATE_NOTICE.id,
        text: APP_UPDATE_NOTICE.text,
        at: APP_UPDATE_NOTICE.at,
        type: "update",
      });
    }
    return notes;
  }

  function markNotificationsRead() {
    const list = getJson(NOTIFICATIONS_KEY, []);
    const clearedAt = Number(localStorage.getItem(NOTIFICATION_CLEARED_KEY) || 0);
    const readIds = new Set(getJson(NOTIFICATION_READ_KEY, []));
    buildCommunityNotifications(clearedAt).forEach((n) => readIds.add(n.id));
    setJson(NOTIFICATION_READ_KEY, [...readIds].slice(-80));
    if (list.length) setJson(NOTIFICATIONS_KEY, list.map((n) => ({ ...n, read: true })));
  }

  qs("#notification-trigger")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const drop = qs("#notification-dropdown");
    if (!drop) return;
    drop.hidden = !drop.hidden;
    if (!drop.hidden) {
      markNotificationsRead();
      renderNotifications();
    }
    qs("#notification-trigger")?.setAttribute("aria-expanded", drop.hidden ? "false" : "true");
  });

  qs("#notifications-clear-all")?.addEventListener("click", () => {
    localStorage.setItem(NOTIFICATION_CLEARED_KEY, String(Date.now()));
    setJson(NOTIFICATIONS_KEY, []);
    setJson(NOTIFICATION_READ_KEY, []);
    renderNotifications();
  });

  function renderHomePanel() {
    acceptPendingInviteForSession();
    const features = state.settings?.featureVisibility || {};
    populateExplorerCourseFilterSelects();
    qs(".home-explorer-section")?.toggleAttribute("hidden", features.explorer === false);
    qs(".trending-section")?.toggleAttribute("hidden", features.trending === false);
    qs(".friend-activity-card")?.toggleAttribute("hidden", features.communityActivity === false);
    qs("#career-outline-card")?.toggleAttribute("hidden", features.careerOutline === false);
    qs(".home-networking-section")?.toggleAttribute("hidden", features.networking === false);
    qs("#daily-motivation-card")?.toggleAttribute("hidden", features.dailyMotivation === false);
    qsa("#ehs-doc-link, #course-info-doc-btn").forEach((el) => el?.toggleAttribute("hidden", features.resourceLinks === false));
    qs("#home-greeting").textContent = `Hi, ${state.profile.displayName || "There"}`;
    qs("#home-school-pill").textContent = getActiveCommunitySchool();
    const gp = qs("#home-grade-pill");
    if (gp) {
      if (state.profile.grade) {
        gp.hidden = false;
        gp.textContent = `Grade ${state.profile.grade}`;
      } else gp.hidden = true;
    }
    renderTopbarUser();
    renderCurrentDate();
    renderNotifications();
    activityFeedPage = 0;
    if (features.communityActivity !== false) renderFriendActivity();
    renderDailyMotivation();
    renderAugustWelcome();
    if (features.explorer !== false) showExploreCard("course", "#home-explore-panel-body");
    renderCareerOutline();
    if (features.trending !== false) renderTrending("home");
    if (features.networking !== false) renderDiscussionBoard("home");
  }

  function countUserChatMessagesSent() {
    const me = userId();
    if (!me) return 0;
    let total = 0;
    Object.values(getDM()).forEach((thread) => {
      (thread || []).forEach((m) => {
        if (m.from === me) total += 1;
      });
    });
    return total;
  }

  function networkingFilterAllowsAuthor(authorId, mode) {
    const author = String(authorId || "").trim().toLowerCase();
    const me = userId();
    if (!author) return false;
    if (mode === "friends") return author === me || isFriend(author);
    if (mode === "close") return author === me || isCloseFriend(author);
    return true;
  }

  function getNetworkingFilters() {
    const d = defaultState().settings.networkingFilters;
    const merged = { ...d, ...(state.settings?.networkingFilters || {}) };
    return {
      boardSubject: merged.boardSubject || "",
      boardAge: merged.boardAge || "all",
      messages: merged.messages || "everyone",
      boardMode: merged.boardMode || "general",
    };
  }

  function syncNetworkingBoardModeUi() {
    const mode = getNetworkingFilters().boardMode || "general";
    qsa("[data-board-mode-option]").forEach((btn) => {
      const active = btn.getAttribute("data-board-mode-option") === mode;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function setNetworkingBoardMode(mode) {
    const nextMode = mode === "classes" ? "classes" : "general";
    if (!state.settings.networkingFilters) state.settings.networkingFilters = {};
    state.settings.networkingFilters.boardMode = nextMode;
    saveState(state);
    syncNetworkingBoardModeUi();
    renderDiscussionBoard("discussion");
    renderDiscussionBoard("home");
  }

  function discussionSubjectOptions() {
    const school = getCatalogSchool();
    const grade = getCatalogGradeForSchool(school);
    return ["General", ...sortedSubjects(grade, school)];
  }

  function populateDiscussionSubjectSelects() {
    const opts = discussionSubjectOptions()
      .map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)
      .join("");
    const postSel = qs("#discussion-subject");
    if (postSel) postSel.innerHTML = opts;
    const filterSel = qs("#networking-board-subject-filter");
    if (filterSel) {
      const cur = getNetworkingFilters().boardSubject || "";
      filterSel.innerHTML = `<option value="">All Subjects</option>${opts}`;
      filterSel.value = [...filterSel.options].some((o) => o.value === cur) ? cur : "";
    }
  }

  function fillDiscussionFriendRecipientsSelect() {
    const sel = qs("#discussion-friend-recipients");
    if (!sel) return;
    const friends = listFriendIds();
    sel.innerHTML = friends.length
      ? friends
          .map((fid) => {
            const u = getRegistryUser(fid);
            return `<option value="${escapeHtml(fid)}">${escapeHtml(u?.displayName || fid)}</option>`;
          })
          .join("")
      : '<option value="" disabled>No friends yet</option>';
  }

  function syncDiscussionComposeVisibility() {
    const vis = qs("#discussion-visibility")?.value || "public";
    if (qs("#discussion-specific-wrap")) qs("#discussion-specific-wrap").hidden = vis !== "specific";
    if (qs("#discussion-hide-board-wrap")) qs("#discussion-hide-board-wrap").hidden = vis !== "public";
  }

  function responseWindowExpiresAt(window, at = Date.now()) {
    if (!window || window === "Anytime") return null;
    const start = Number(at || Date.now());
    if (window === "Today") {
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return end.getTime();
    }
    if (window === "Few Days") return start + 3 * 24 * 60 * 60 * 1000;
    if (window === "This Week") return start + 7 * 24 * 60 * 60 * 1000;
    if (window === "This Month") return start + 30 * 24 * 60 * 60 * 1000;
    return null;
  }

  function discussionPostMatchesAge(post, ageFilter = "all") {
    if (!ageFilter || ageFilter === "all") return true;
    const at = Number(post.at || 0);
    const now = Date.now();
    if (ageFilter === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return at >= start.getTime();
    }
    if (ageFilter === "few-days") return now - at <= 3 * 24 * 60 * 60 * 1000;
    if (ageFilter === "week") return now - at <= 7 * 24 * 60 * 60 * 1000;
    if (ageFilter === "month") return now - at <= 30 * 24 * 60 * 60 * 1000;
    return true;
  }

  function discussionPlainText(text = "", html = "") {
    if (html) {
      const el = document.createElement("div");
      el.innerHTML = html;
      return (el.textContent || "").trim();
    }
    return String(text || "");
  }

  function sanitizeDiscussionHtml(raw = "") {
    const tpl = document.createElement("template");
    tpl.innerHTML = String(raw || "");
    const allowed = new Set(["BR", "P", "DIV", "SPAN"]);
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType !== Node.ELEMENT_NODE) return;
        if (!allowed.has(child.tagName)) {
          const frag = document.createDocumentFragment();
          while (child.firstChild) frag.appendChild(child.firstChild);
          child.replaceWith(frag);
          walk(node);
          return;
        }
        [...child.attributes].forEach((a) => child.removeAttribute(a.name));
        walk(child);
      });
    };
    walk(tpl.content);
    return tpl.innerHTML;
  }

  function formatDiscussionText(text = "") {
    return escapeHtml(String(text || "")).replace(/\n/g, "<br>");
  }

  function renderDiscussionBody(content) {
    if (content && typeof content === "object") {
      if (content.textHtml) return sanitizeDiscussionHtml(content.textHtml);
      return formatDiscussionText(content.text || "");
    }
    return formatDiscussionText(content || "");
  }

  function initDiscussionEditor() {
    const editor = qs("#discussion-text");
    if (!editor) return;
    editor.classList.add("discussion-editor-ready");
    editor.setAttribute("data-placeholder", "Is there any ways to actually underline or bold the words, or not?");
  }

  function getDiscussionEditorContent(editor) {
    if (!editor) return { plain: "", html: "" };
    const html = sanitizeDiscussionHtml(editor.value || "");
    const plain = discussionPlainText(editor.value || "", html);
    return { plain, html };
  }

  function clearDiscussionEditor(editor) {
    if (!editor) return;
    editor.value = "";
  }

  function isAugustWelcomeSeason() {
    const now = new Date();
    return now.getMonth() === 7 && now.getDate() >= 1;
  }

  function augustGradeOptions() {
    return schoolTypeFor(state.profile.school) === "middle" ? ["6", "7", "8"] : ["9", "10", "11", "12"];
  }

  function augustYearInfo(grade) {
    const g = Number(grade);
    const school = getActiveCommunitySchool();
    const isMiddle = schoolTypeFor(school) === "middle";
    const yearLabel = `${new Date().getFullYear()}–${new Date().getFullYear() + 1}`;
    if (isMiddle) {
      if (g === 6) return `Welcome to ${school} for ${yearLabel}. Sixth grade is about building routines, meeting teachers, and trying electives that show what you enjoy.`;
      if (g === 7) return `Seventh grade in ${yearLabel} adds more choice. Use CourseSync to compare electives and see what classmates are planning.`;
      if (g === 8) return `Eighth grade is your launch year before high school. Save last year’s schedule, then build a schedule that reflects the courses you want to carry forward.`;
      return `Middle school year ${yearLabel}: update your grade, archive last year, and start fresh when classes are posted.`;
    }
    if (g === 9) return `Freshman year (${yearLabel}) sets your foundation. Prioritize English, math, science, and a world language while leaving room for electives you want to explore.`;
    if (g === 10) return `Sophomore year (${yearLabel}) is a good time to add rigor thoughtfully—Honors or AP only where you have support and genuine interest.`;
    if (g === 11) return `Junior year (${yearLabel}) matters for planning and balance. Save your sophomore schedule, update your grade, and use Grad Requirements to spot gaps early.`;
    if (g === 12) return `Senior year (${yearLabel}): finalize graduation requirements, keep a backup schedule, and use Past Classes to keep a clean record of what you finished.`;
    return `New school year ${yearLabel} at ${school}. Update your grade, archive your previous schedule, and rebuild your plan when the new catalog is ready.`;
  }

  function archiveCurrentScheduleToPast(gradeOverride = "") {
    const rows = flattenScheduleForPublish();
    if (!rows.length && !state.activities.length && !state.summerCourses.length) return false;
    const completionDate = new Date().toISOString().slice(0, 10);
    state.pastSchedules.unshift({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      school: state.scheduleSchool,
      grade: gradeOverride || state.profile.grade,
      savedAt: Date.now(),
      completionDate,
      rows: rows.map((row) => ({ ...row, completionDate })),
      activities: [...state.activities],
      summerCourses: [...state.summerCourses],
    });
    state.pastSchedules = state.pastSchedules.slice(0, 6);
    state.scheduleByCommunity[state.scheduleSchool] = emptySemesterSchedule();
    state.scheduleByWeekday = emptyWeek();
    state.activities = [];
    state.summerCourses = [];
    commentsTarget = null;
    return true;
  }

  function renderAugustWelcome() {
    const card = qs("#home-august-welcome");
    if (!card) return;
    const show = isAugustWelcomeSeason();
    card.hidden = !show;
    if (!show) return;
    const yearLine = qs("#august-welcome-year-line");
    const info = qs("#august-welcome-info");
    const sel = qs("#august-grade-select");
    const status = qs("#august-welcome-status");
    const grades = augustGradeOptions();
    if (sel) {
      sel.innerHTML = grades.map((g) => `<option value="${g}">${g}${schoolTypeFor(state.profile.school) === "middle" ? "th" : "th"} Grade</option>`).join("");
      if (state.profile.grade && grades.includes(String(state.profile.grade))) sel.value = String(state.profile.grade);
    }
    const yearLabel = `${new Date().getFullYear()}–${new Date().getFullYear() + 1}`;
    if (yearLine) yearLine.textContent = `${getActiveCommunitySchool()} · ${yearLabel} school year`;
    if (info) info.textContent = augustYearInfo(sel?.value || state.profile.grade || grades[0]);
    if (status && !status.dataset.pinned) status.textContent = "August check-in: confirm your new grade, save last year if needed, and add your new schedule for the year ahead.";
    if (sel && !sel.dataset.augustBound) {
      sel.addEventListener("change", () => {
        if (info) info.textContent = augustYearInfo(sel.value);
      });
      sel.dataset.augustBound = "1";
    }
  }

  function pruneExpiredDiscussions() {
    const now = Date.now();
    const posts = getDiscussionsRaw().filter((p) => {
      const expires = p.expiresAt ?? responseWindowExpiresAt(p.responseWindow, p.at);
      return !expires || Number(expires) > now;
    });
    if (posts.length !== getDiscussionsRaw().length) saveDiscussions(posts);
  }

  function renderNetworkingFilters() {
    const filters = getNetworkingFilters();
    populateDiscussionSubjectSelects();
    if (qs("#networking-board-subject-filter")) qs("#networking-board-subject-filter").value = filters.boardSubject || "";
    if (qs("#networking-board-age-filter")) qs("#networking-board-age-filter").value = filters.boardAge || "all";
    if (qs("#networking-message-filter")) qs("#networking-message-filter").value = filters.messages || "everyone";
    syncNetworkingBoardModeUi();
  }

  function saveNetworkingFiltersFromUi() {
    if (!state.settings.networkingFilters) state.settings.networkingFilters = {};
    state.settings.networkingFilters.boardSubject = qs("#networking-board-subject-filter")?.value || "";
    state.settings.networkingFilters.boardAge = qs("#networking-board-age-filter")?.value || "all";
    state.settings.networkingFilters.messages = qs("#networking-message-filter")?.value || "everyone";
    state.settings.networkingFilters.boardMode = getNetworkingFilters().boardMode || "general";
    saveState(state);
  }

  function renderDailyMotivation() {
    const box = qs("#daily-motivation-message");
    if (!box) return;
    const messages = [
      "Today, pick one useful action: clarify a class, ask one question, or make one schedule choice easier for your future self.",
      "A strong plan is built in small revisions. Save what you know, leave room for what changes, and keep moving.",
      "Your schedule is not just a list of classes. It is a map of effort, curiosity, rest, and the people who help you stay steady.",
      "Progress can be quiet: one honest rating, one better backup course, one message to someone who has context.",
    ];
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const idx = Number(stamp) % messages.length;
    box.textContent = messages[idx];
  }

  function renderCareerOutline() {
    const box = qs("#career-outline-content");
    if (!box) return;
    const career = state.profile.careerPathway || "Exploring Options";
    const facts = {
      "Computer Science / Technology": [
        "Build a visible portfolio: one web app, one data or automation project, and one collaborative project will teach more than only watching tutorials.",
        "Choose math and CS courses that force algorithmic thinking, then document debugging decisions so you can explain how you solved problems.",
        "Look for robotics, hackathons, app clubs, or teacher assistant roles where you practice shipping, testing, and communicating technical tradeoffs.",
        "Use AP Computer Science, statistics, and writing courses together: strong technical people still need to explain decisions clearly.",
        "Try one project that helps a real person or club. Useful software teaches prioritization better than polished demos alone.",
        "Track bugs you fix and features you cut. Those notes become strong interview stories because they show judgment under constraints.",
        "Pair CS with statistics or economics if you might work on data-heavy products; knowing how to question numbers prevents bad features.",
        "Ask teachers for feedback on code readability, not just correctness. Maintainable code is a professional skill, not a bonus.",
        "Use version control for school projects when allowed. Commit messages and branch choices show how you collaborate.",
      ],
      "STEM / Engineering": [
        "Prioritize math sequencing and lab science: calculus readiness, physics, chemistry, and design projects make engineering pathways easier to enter.",
        "Keep an engineering notebook for projects: requirements, sketches, failed tests, revisions, and final evidence are exactly how engineers think.",
        "Join a build-focused activity such as robotics, Science Olympiad, research, or maker projects where iteration matters more than perfect first attempts.",
        "Choose at least one course or activity where you build, test, measure, and revise instead of only studying finished answers.",
        "Physics, calculus, computer science, and technical writing all support engineering because design choices need math and communication.",
        "Collect evidence of problem solving: sketches, lab data, prototypes, competition logs, and what changed after feedback.",
        "Learn one CAD, coding, or simulation tool deeply enough to explain your workflow to someone outside your team.",
        "Document safety habits in labs and builds. Engineering credibility includes reliability, not just clever ideas.",
        "Connect math homework to physical intuition: units, estimates, and sanity checks matter in every design review.",
      ],
      "Health / Medicine": [
        "Take biology and chemistry seriously, then add anatomy, psychology, sports medicine, or health pathway courses when available.",
        "Build service habits early: volunteering, tutoring, caregiving, or clinic-adjacent experiences help test whether patient-centered work fits you.",
        "Practice precise notes, calm communication, and ethical decision-making; medicine rewards consistency and trust as much as academic strength.",
        "Balance rigor with sustainability. Health pathways reward stamina, sleep, and reliable routines as much as a packed transcript.",
        "Try roles that involve listening, privacy, and responsibility so you learn whether patient-facing work feels meaningful.",
        "Use science electives to compare interests: body systems, lab research, public health, psychology, and medical technology all feel different.",
        "Practice explaining medical or health topics in plain language. Patients and families need clarity, not jargon.",
        "Shadow or interview people in different health roles—nursing, research, therapy, public health—to test fit early.",
        "Keep a log of ethical dilemmas you notice in coursework or volunteering; reflective judgment is part of the pathway.",
      ],
      "Business / Entrepreneurship": [
        "Pair business electives with statistics, economics, writing, and leadership because strong founders understand people, numbers, and persuasion.",
        "Start small: sell a product, run an event budget, build a club sponsorship plan, or analyze a local business problem with real data.",
        "Track outcomes and lessons learned; a thoughtful failure with numbers and reflection is more useful than a vague success story.",
        "Take courses that sharpen decision-making: statistics, economics, financial literacy, design, and public speaking all transfer well.",
        "Practice pitching with evidence. A clear customer problem, simple budget, and measured result beats a broad idea.",
        "Look for leadership where you own a real constraint: money, attendance, deadlines, inventory, or communication.",
        "Study one local business or school club budget line by line. Margin, cost, and tradeoffs become real quickly.",
        "Practice writing one-page proposals: problem, audience, plan, budget, and how you will measure success.",
        "Take a role that requires follow-through after the launch—operations teaches more than brainstorming alone.",
      ],
      "Arts / Media / Design": [
        "Create a process portfolio: sketches, drafts, critiques, revisions, and finished work show growth better than final images alone.",
        "Choose courses and clubs that create deadlines for publishing, performing, editing, or presenting because creative careers depend on delivery.",
        "Study audience and constraints: design is strongest when you can explain who it serves, why choices were made, and what changed after feedback.",
        "Mix craft and context: art, media, English, history, business, and technology courses can all strengthen creative work.",
        "Save early drafts. Reviewers often care about how your thinking changed, not just whether the final piece looks finished.",
        "Try one collaborative creative role, such as editor, stage crew, designer, producer, or social media lead, to practice real deadlines.",
        "Build a reel or portfolio site early, even if the work is rough. Curating your own growth is part of the craft.",
        "Study one artist or creator you admire and list five specific choices they make—composition, pacing, color, structure, audience.",
        "Pair studio courses with writing or media literacy so you can defend creative decisions with evidence, not taste alone.",
      ],
      "Education / Public Service": [
        "Look for tutoring, mentoring, leadership, peer support, or service roles where you practice explaining ideas to different kinds of people.",
        "Take courses that strengthen writing, psychology, history, government, and communication because public service depends on context and trust.",
        "Keep examples of impact: who you helped, what changed, and what you learned about responsibility, patience, and fairness.",
        "Notice where you naturally clarify confusion. Good educators and public servants translate systems for people under pressure.",
        "Choose experiences with accountability: attendance, planning, confidentiality, conflict resolution, or public speaking.",
        "Build cultural and historical context through humanities courses so service decisions are grounded, not generic.",
        "Practice facilitating a small group: agenda, time limits, and making space for quieter voices are core skills.",
        "Volunteer in settings with paperwork or logistics—food drives, events, tutoring signup—because systems work is public service too.",
        "Reflect after each service block: who benefited, what was hard, and what you would change next time.",
      ],
      "Humanities / Law": [
        "Build a reading-and-writing routine: annotate evidence, write arguments, revise for clarity, and practice explaining both sides of an issue.",
        "Debate, journalism, mock trial, student government, and history courses help you practice persuasion with evidence instead of volume.",
        "Learn to ask sharper questions; law and humanities reward people who can define the real issue before arguing a position.",
        "Take writing-heavy courses seriously because clear structure is a career skill, not just an English assignment.",
        "Practice distinguishing evidence, interpretation, and opinion. That habit helps in law, policy, research, and media.",
        "Collect examples of analysis: essays, speeches, debate briefs, articles, and projects where you changed your view after evidence.",
        "Read primary sources when possible—statutes, speeches, letters, data tables—so arguments start from evidence.",
        "Practice summarizing long readings in three sentences. Lawyers, journalists, and researchers all compress complexity.",
        "Join activities that force live response: debate, mock trial, Model UN, or student journalism.",
      ],
      "Exploring Options": [
        "Try a balanced mix: one rigorous academic course, one creative or technical elective, and one activity where other people depend on you.",
        "Notice what kind of hard work feels meaningful. Interest is not always easy; sometimes the signal is that you keep returning to it.",
        "Use future planning to test hypotheses: choose courses that reveal whether you like building, helping, analyzing, creating, leading, or explaining.",
        "Run small experiments: shadow someone, interview a student, try a club for a month, or take one elective outside your usual lane.",
        "Compare energy after the work, not only during it. Some interests feel challenging in the moment but satisfying afterward.",
        "Avoid locking yourself in too early. A strong exploratory schedule still has rigor, variety, and room to revise.",
        "Ask adults in different fields what their Tuesday looks like—daily rhythm reveals fit better than job titles.",
        "Keep a short list of courses that surprised you, positively or negatively. Patterns matter more than one great week.",
        "Revisit your pathway label each semester. Exploring is active revision, not indecision.",
      ],
    };
    const rec = facts[career] || facts["Exploring Options"];
    const idx = careerFactCursor % rec.length;
    const extra = [
      "Course signal: pair one challenging class with one practical elective so your transcript shows both readiness and direction.",
      "Experience signal: clubs, service, part-time work, shadowing, projects, and competitions all count when they connect to a clear story.",
      "Reflection signal: write down what gave you energy, what drained you, and which problems you wanted to keep solving after class ended.",
    ];
    box.innerHTML = `<div class="career-outline-block career-outline-grid">
      <section class="career-mini-card career-pathway-card">
        <h4 class="career-box-title">Pathway Set</h4>
        <ul class="career-fact-list">${extra.map((fact) => `<li>${escapeHtml(fact)}</li>`).join("")}</ul>
      </section>
      <section class="career-mini-card career-shuffle-card">
        <h4 class="career-box-title">Shuffle Fact</h4>
        <p class="career-shuffle-career"><strong>${escapeHtml(career)}</strong></p>
        <p class="career-shuffle-fact">${escapeHtml(rec[idx])}</p>
        <button type="button" class="btn btn-outline btn-sm" id="career-shuffle-btn">Shuffle Fact</button>
      </section>
    </div>`;
    qs("#career-shuffle-btn")?.addEventListener("click", () => {
      careerFactCursor += 1;
      renderCareerOutline();
    });
  }

  qs("#invite-friend-btn")?.addEventListener("click", () => {
    const email = qs("#invite-email")?.value.trim().toLowerCase();
    const out = qs("#invite-output");
    if (!out) return;
    if (!email || !email.includes("@")) {
      out.textContent = "Add a valid email first.";
      return;
    }
    const accounts = getJson(ACCOUNTS_KEY, {});
    const reg = getRegistry();
    if (accounts[email]?.verified || reg[email]?.verified) {
      out.className = "invite-result muted small";
      out.innerHTML = `<strong>${escapeHtml(email)} already has a verified account.</strong><br />Use Friends & Messages or the Community directory to send a request instead.`;
      return;
    }
    const invites = getJson(INVITES_KEY, []);
    const code = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    invites.unshift({ code, from: userId(), fromName: state.profile.displayName || userId(), to: email, school: state.profile.school, at: Date.now() });
    setJson(INVITES_KEY, invites.slice(0, 100));
    const url = `${location.origin}${location.pathname.replace(/main\.html$/, "index.html")}?invite=${encodeURIComponent(code)}`;
    const subject = `Join me on CourseSync`;
    const body = `Hi,\n\nI invited you to join CourseSync for ${state.profile.school}. Use this link to sign up:\n\n${url}\n\nAfter you create and verify your profile, CourseSync will automatically connect us as friends so we can compare schedules, course plans, and recommendations.\n\n- ${state.profile.displayName || "Your classmate"}`;
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    out.className = "invite-result";
    out.innerHTML = `<strong>Invite prepared for ${escapeHtml(email)}.</strong>
      <span>Your email app should open with a ready-to-send message. Once they sign up with the invite, CourseSync will automatically add you as friends.</span>
      <span>Invites are only prepared for emails that are not verified yet.</span>`;
  });

  function renderSnapshotPanel() {
    const box = qs("#snapshot-content");
    if (!box) return;
    const rows = flattenScheduleForPublish();
    const scheduleRowsForSemester = rows.filter((r) => (r.semester || "s1") === snapshotSemester);
    const snapshotRowsForView =
      snapshotScheduleView === "Main"
        ? scheduleRowsForSemester
        : scheduleRowsForSemester.filter((r) => (r.weekday || "") === snapshotScheduleView);
    const seenSchedule = new Set();
    const compactRows = uniqueScheduleRows(snapshotRowsForView, snapshotScheduleView !== "Main" && state.settings?.courseDisplay === "meetings").filter((r) => {
      if (snapshotScheduleView !== "Main" && state.settings?.courseDisplay === "meetings") return true;
      const key = `${r.courseKey || normalizeText(r.courseLabel)}:${r.teacher || ""}:${r.period || ""}`;
      if (seenSchedule.has(key)) return false;
      seenSchedule.add(key);
      return true;
    });
    const scheduleHtml = rows.length
      ? `<div class="snapshot-tab-stack">
          <div class="snapshot-semester-tabs day-tabs" role="tablist" aria-label="Snapshot semester">
            ${SEMESTERS.map((s) => `<button type="button" class="day-tab ${snapshotSemester === s.key ? "active" : ""}" data-snapshot-semester="${s.key}" data-snapshot-view="${snapshotScheduleView}">${s.label}</button>`).join("")}
          </div>
          <div class="semester-view-tabs" role="tablist" aria-label="Snapshot schedule view">
            ${SCHEDULE_VIEW_TABS.map((view) => {
              const active = snapshotScheduleView === view;
              return `<button type="button" class="day-tab semester-view-tab ${active ? "active" : ""}" data-snapshot-semester="${snapshotSemester}" data-snapshot-view="${view}" title="${escapeHtml(view === "Main" ? "Main semester schedule" : view)}">${escapeHtml(view === "Main" ? "Main" : view.slice(0, 3))}</button>`;
            }).join("")}
          </div>
        </div>
        ${
          compactRows.length
            ? snapshotScheduleView === "Main"
              ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Period</th><th>Room</th><th>Course</th><th>Teacher</th></tr></thead><tbody>${compactRows
                  .map((r) => `<tr><td>${escapeHtml(normalizedPeriod(r.period))}</td><td>${escapeHtml(r.room || "—")}</td><td>${escapeHtml(formatCourseTitle(r.courseKey || r.courseLabel))}</td><td>${escapeHtml(r.teacher || "")}</td></tr>`)
                  .join("")}</tbody></table></div>`
              : `<div class="table-wrap"><table class="data-table"><thead><tr><th>Period</th><th>Start</th><th>End</th><th>Room</th><th>Course</th><th>Teacher</th></tr></thead><tbody>${compactRows
                  .map((r) => `<tr><td>${escapeHtml(normalizedPeriod(r.period))}</td><td>${escapeHtml(r.start || "—")}</td><td>${escapeHtml(r.end || "—")}</td><td>${escapeHtml(r.room || "—")}</td><td>${escapeHtml(formatCourseTitle(r.courseKey || r.courseLabel))}</td><td>${escapeHtml(r.teacher || "")}</td></tr>`)
                  .join("")}</tbody></table></div>`
            : `<p class="muted">No courses saved for this ${snapshotScheduleView === "Main" ? "semester" : "day"} yet.</p>`
        }`
      : '<p class="muted">No current classes saved yet.</p>';
    const future = Object.entries(state.futureByGrade || {})
      .map(([g, slot]) => ({ g, picks: [...(slot.primary || []), ...(slot.alternatives || [])].filter(Boolean) }))
      .filter((x) => x.picks.length);
    const futureHtml = future.length
      ? future
          .map(
            ({ g, picks }) => {
              const slot = state.futureByGrade?.[g] || {};
              const notes = canViewField(userId(), userId(), "futureNotes", state.profile.privacy)
                ? [slot.primaryNotes && `Primary notes: ${slot.primaryNotes}`, (slot.alternativeNotes || slot.notes) && `Alternative notes: ${slot.alternativeNotes || slot.notes}`].filter(Boolean)
                : [];
              return `<h4>Grade ${escapeHtml(g)}</h4><ul>${picks
                .map((k) => {
                  const { level, title } = parseCourseKey(k);
                  return `<li>${escapeHtml(level)} ${escapeHtml(title)}</li>`;
                })
                .join("")}</ul>${notes.map((n) => `<p class="future-summary-note muted small">${escapeHtml(n)}</p>`).join("")}`;
            }
          )
          .join("")
      : '<p class="muted">No future courses planned yet.</p>';
    const summerHtml = state.summerCourses.length
      ? `<div class="snapshot-card-head">
          <h3 class="card-title">Summer / Online Courses</h3>
          <button type="button" class="btn btn-outline btn-sm" id="snapshot-completion-dates">Completion Dates</button>
        </div>
        <ul class="summer-list">${state.summerCourses.map((s) => `<li class="summer-item">${summerCourseCardHtml(s, { showCompletion: true })}</li>`).join("")}</ul>`
      : '<h3 class="card-title">Summer / Online Courses</h3><p class="muted">No summer or online courses saved yet.</p>';
    const gradHtml = schoolTypeFor(state.profile.school || state.scheduleSchool) === "high"
      ? `<div class="snapshot-grad-list">${GRAD_REQUIREMENTS.map((req) => {
          const counted = [
            ...allScheduleRowsForSchool(state.profile.school || "Emerald High School"),
            ...(state.pastSchedules || []).flatMap((g) => (g.rows || []).map((r) => ({ ...r, past: true }))),
            ...(state.summerCourses || [])
              .filter((s) => s.completed || s.completionDate)
              .map((s) => {
                const parsed = s.courseKey ? parseCourseKey(s.courseKey) : { subject: "", title: s.title || "" };
                return { courseKey: s.courseKey, courseLabel: s.title, requirement: s.requirement || gradRequirementFor(parsed.subject, parsed.title), summer: true };
              }),
          ].filter((r) => {
            const parsed = parseCourseKey(r.courseKey || "");
            return (r.requirement || gradRequirementFor(parsed.subject || r.courseLabel, parsed.title || r.courseLabel)) === req.key;
          });
          const credits = counted.length * 5;
          return `<div class="snapshot-grad-row"><strong>${escapeHtml(req.key)}</strong><span>${credits.toFixed(0)}/${Number(req.credits || 0).toFixed(0)} credits</span></div>`;
        }).join("")}</div>`
      : '<p class="muted">Grad requirements are shown for high school profiles.</p>';
    box.innerHTML = `
      <article class="card"><h3 class="card-title">Current Schedule</h3>${scheduleHtml}</article>
      <article class="card"><h3 class="card-title">Future Courses</h3>${futureHtml}</article>
      <article class="card snapshot-summer-card">${summerHtml}</article>
      <article class="card"><h3 class="card-title">Grad Requirements</h3>${gradHtml}</article>`;
    qsa("[data-snapshot-semester]", box).forEach((btn) => {
      btn.addEventListener("click", () => {
        snapshotSemester = btn.getAttribute("data-snapshot-semester") || "s1";
        snapshotScheduleView = btn.getAttribute("data-snapshot-view") || "Main";
        renderSnapshotPanel();
      });
    });
    qs("#snapshot-completion-dates")?.addEventListener("click", () => {
      state.summerCourses = (state.summerCourses || []).map((course) => {
        const title = course.title || formatCourseTitle(course.courseKey) || "Summer course";
        const date = prompt(`Completion date for ${title} (YYYY-MM-DD):`, course.completionDate || "");
        if (date === null) return course;
        return { ...course, completionDate: date.trim(), completed: !!date.trim() };
      });
      saveState(state);
      renderSnapshotPanel();
      if (qs("#grad-requirements-content")) renderGradRequirementsPanel();
    });
  }

  function renderFriendActivity() {
    const ul = qs("#friend-activity-list");
    const loadBtn = qs("#friend-activity-load-more");
    const filterEl = qs("#activity-filter-days");
    if (!ul) return;
    const me = userId();
    const friends = new Set(listFriendIds().map((id) => String(id).trim().toLowerCase()));
    const feed = JSON.parse(localStorage.getItem(FEED_KEY) || "[]");
    const sevenOnly = filterEl ? filterEl.value === "7" : true;
    const cutoff = sevenOnly ? Date.now() - 7 * 24 * 60 * 60 * 1000 : 0;
    const filtered = feed.filter((e) => {
      const aid = String(e.actorId || "").trim().toLowerCase();
      if (!aid || aid === me || e.at < cutoff) return false;
      return friends.has(aid) || isVerifiedCommunityMember(aid);
    });
    const total = (activityFeedPage + 1) * ACTIVITY_PAGE_SIZE;
    const slice = filtered.slice(0, total);
    const lines = slice.map((e) => {
      const t = new Date(e.at).toLocaleString();
      let msg = "";
      if (e.type === "saved_profile") msg = `${escapeHtml(e.name)} updated their schedule in the directory.`;
      else if (e.type === "rated") msg = `${escapeHtml(e.name)} rated a course.`;
      else if (e.type === "added_class") msg = `${escapeHtml(e.name)} added a class.`;
      else msg = `${escapeHtml(e.name)} ${escapeHtml(e.detail || "did something new")}.`;
      return `<li><div class="activity-dot" aria-hidden="true"></div><div><span class="activity-time">${escapeHtml(t)}</span><p>${msg}</p></div></li>`;
    });
    ul.innerHTML = lines.length
      ? lines.join("")
      : '<li class="activity-empty"><div><strong>No community activity yet</strong><p class="muted small">When friends or verified classmates at your school save profiles, rate courses, or update schedules, it will show here.</p></div></li>';
    if (loadBtn) {
      const more = filtered.length > slice.length;
      loadBtn.hidden = !more;
      loadBtn.textContent = more ? `Load more (${filtered.length - slice.length} hidden)` : "Load more";
    }
  }

  qs("#activity-filter-days")?.addEventListener("change", () => {
    activityFeedPage = 0;
    renderFriendActivity();
  });
  qs("#friend-activity-load-more")?.addEventListener("click", () => {
    activityFeedPage += 1;
    renderFriendActivity();
  });

  /* ---------- Bell ---------- */
  function renderBellDayTabs() {
    const wrap = qs("#emerald-day-wrap");
    const tabs = qs("#bell-day-tabs");
    if (!wrap || !tabs) return;
    const em = state.scheduleSchool === "Emerald High School";
    wrap.hidden = !em;
    tabs.innerHTML = "";
    if (!em) return;
    BELL_DAYS.forEach((day) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "day-tab" + (state.scheduleBellDay === day ? " active" : "");
      b.textContent = day.slice(0, 3);
      b.title = day;
      b.addEventListener("click", () => {
        state.scheduleBellDay = day;
        saveState(state);
        renderBellDayTabs();
        renderBellScheduleTable();
      });
      tabs.appendChild(b);
    });
  }

  function renderBellScheduleTable() {
    const box = qs("#bell-schedule");
    if (!box) return;
    const sch = state.scheduleSchool;
    if (sch === "Emerald High School") {
      const now = new Date();
      const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const finals = {
        "2026-06-01": "Periods 1 and 2 Finals",
        "2026-06-02": "Periods 3 and 4 Finals",
        "2026-06-03": "Periods 5 and 6 Finals",
      };
      if (finals[todayIso]) {
        box.innerHTML = `<div class="schedule-alert">
          <h3 class="card-title">Emerald Finals Schedule Today</h3>
          <p class="muted small">${escapeHtml(finals[todayIso])}. Regular bell times are replaced by the finals block schedule.</p>
          <img class="schedule-reference-img" src="assets/emerald-finals-2026.png" alt="Emerald High School 2026 finals bell schedule" />
        </div>`;
        return;
      }
      const day = emeraldDays[state.scheduleBellDay];
      if (!day) {
        box.innerHTML = "<p>No schedule for this day.</p>";
        return;
      }
      box.innerHTML = `
        <h3 class="card-title">${escapeHtml(day.title)}</h3>
        ${day.note ? `<p class="muted small">${escapeHtml(day.note)}</p>` : ""}
        <div class="table-wrap bell-table-wrap">
          <table class="data-table bell-table">
            <thead><tr><th>Period</th><th>Start</th><th>End</th><th>Length</th></tr></thead>
            <tbody>
              ${day.rows
                .map(
                  (r) =>
                    `<tr><td>${escapeHtml(r.period)}</td><td>${escapeHtml(r.start)}</td><td>${escapeHtml(r.end)}</td><td>${escapeHtml(r.length)}</td></tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>`;
      return;
    }
    const data = schoolSchedules[sch];
    if (!data || data.type !== "flat") {
      box.innerHTML = "<p>Select a school.</p>";
      return;
    }
    if (sch === "Fallon Middle School") {
      box.innerHTML = `<h3 class="card-title">Fallon Middle — 2025-2026 Bell Schedule</h3>
        <p class="muted small">Reference schedule from the provided school image, including regular, Wednesday, and minimum-day times.</p>
        <img class="schedule-reference-img" src="assets/fallon-bell-schedule.png" alt="Fallon Middle School 2025-2026 bell schedule" />`;
      return;
    }
    box.innerHTML = `<h3 class="card-title">${escapeHtml(data.label)}</h3>
      <ul class="bell-list">${data.periods.map((p) => `<li><strong>${escapeHtml(p.id)}</strong> <span>${escapeHtml(p.time)}</span></li>`).join("")}</ul>`;
  }

  function renderMyClassesDayTabs() {
    const tabs = qs("#my-classes-day-tabs");
    if (!tabs) return;
    tabs.innerHTML = "";
    tabs.hidden = true;
  }

  function renderMyClassesSemesterTabs() {
    const tabs = qs("#my-classes-semester-tabs");
    if (!tabs) return;
    tabs.innerHTML = "";
    SEMESTERS.forEach((sem) => {
      const group = document.createElement("div");
      group.className = "semester-schedule-group" + (state.myClassesSemester === sem.key ? " active" : "");
      const b = document.createElement("button");
      b.type = "button";
      b.className = "day-tab" + (state.myClassesSemester === sem.key ? " active" : "");
      b.textContent = sem.label;
      b.addEventListener("click", () => {
        state.myClassesSemester = sem.key;
        saveState(state);
        renderMyClassesSemesterTabs();
        renderClassRows();
      });
      group.appendChild(b);

      const views = document.createElement("div");
      views.className = "semester-view-tabs";
      SCHEDULE_VIEW_TABS.forEach((view) => {
        const v = document.createElement("button");
        v.type = "button";
        const active = state.myClassesSemester === sem.key && state.myClassesViewTab === view;
        v.className = "day-tab semester-view-tab" + (active ? " active" : "");
        v.textContent = view === "Main" ? "Main" : view.slice(0, 3);
        v.title = view === "Main" ? `${sem.label} main schedule` : `${sem.label} ${view}`;
        v.addEventListener("click", () => {
          state.myClassesSemester = sem.key;
          state.myClassesViewTab = view;
          if (view !== "Main") state.myClassesDayTab = view;
          saveState(state);
          renderMyClassesSemesterTabs();
          renderClassRows();
        });
        views.appendChild(v);
      });
      group.appendChild(views);
      tabs.appendChild(group);
    });
  }

  function fillPeriodSelect() {
    const sel = qs("#add-class-period");
    if (!sel) return;
    const em = state.scheduleSchool === "Emerald High School";
    qs("#period-hint-emerald").hidden = !em;
    qs("#period-hint-fallon").hidden = em;
    const label = qs("#period-field-label");
    if (label) label.textContent = em ? "Period" : "Block / Period";
    const cur = sel.value;
    sel.innerHTML = '<option value="">Choose…</option>';
    if (em) {
      [
        "Period 0 (optional)",
        "Period 1",
        "Period 2",
        "Period 3",
        "Period 4",
        "Period 5",
        "Period 6",
        "Period 7 (optional)",
      ].forEach((p) => {
        const o = document.createElement("option");
        o.value = p;
        o.textContent = p;
        sel.appendChild(o);
      });
    } else {
      (schoolSchedules["Fallon Middle School"]?.periods || []).forEach((p) => {
        const o = document.createElement("option");
        o.value = p.id;
        o.textContent = p.id;
        sel.appendChild(o);
      });
    }
    if (cur && [...sel.options].some((o) => o.value === cur)) sel.value = cur;
  }

  function buildCourseBrowserHTML(filterText, grade = state.profile.grade, school = state.scheduleSchool || state.profile.school) {
    const ft = (filterText || "").trim().toLowerCase();
    let html = "";
    sortedSubjects(grade, school).forEach((subject) => {
      const courses = [...(catalog[subject] || [])].filter((c) => courseAllowed(c, grade, school)).sort(
        (a, b) => levelRank(a.level) - levelRank(b.level) || a.title.localeCompare(b.title)
      );
      const byLevel = {};
      courses.forEach((c) => {
        const req = gradRequirementFor(subject, c.title);
        if (!byLevel[c.level]) byLevel[c.level] = [];
        const key = courseKey(subject, c);
        const line = `${c.title} — ${subject}`;
        if (ft && !line.toLowerCase().includes(ft) && !subject.toLowerCase().includes(ft)) return;
        byLevel[c.level].push({ key, title: c.title, subject, req });
      });
      const levels = LEVEL_ORDER.filter((lv) => byLevel[lv]?.length);
      if (!levels.length) return;
      html += `<details class="subject-accordion" ${ft ? "open" : ""}><summary>${escapeHtml(subject)}</summary><div class="level-accordions">`;
      levels.forEach((lv) => {
        const items = byLevel[lv];
        if (!items.length) return;
        html += `<details class="level-nested" ${ft ? "open" : ""}><summary class="level-summary">${escapeHtml(lv)} <span class="count-badge">${items.length}</span></summary><div class="course-chip-grid">`;
        items.forEach((it) => {
          html += `<button type="button" class="course-chip" data-course-key="${encodeURIComponent(it.key)}">${escapeHtml(it.title)} <span class="chip-req">${escapeHtml(it.req)}</span></button>`;
        });
        html += `</div></details>`;
      });
      html += `</div></details>`;
    });
    return html || '<p class="muted">No courses match that search.</p>';
  }

  function wireCourseBrowser(container, onPick) {
    qsa(".course-chip", container).forEach((btn) => {
      btn.addEventListener("click", () => {
        onPick(decodeURIComponent(btn.getAttribute("data-course-key") || ""));
      });
    });
  }

  function mountCourseBrowserBody(container, filterText, grade, school, onPick) {
    if (!container) return;
    container.innerHTML = buildCourseBrowserHTML(filterText, grade, school);
    wireCourseBrowser(container, onPick);
  }

  function clearScheduleRowFeedback(row) {
    if (!row) return;
    delete row.rating;
    delete row.comment;
  }

  function renderAddClassBrowser() {
    const box = qs("#course-browser-add");
    if (!box) return;
    box.innerHTML = buildCourseBrowserHTML(qs("#add-course-filter")?.value || "");
    wireCourseBrowser(box, (key) => {
      qs("#add-class-course-value").value = key;
      const { title } = parseCourseKey(key);
      qs("#add-class-course-label").textContent = title;
    });
  }

  function renderMyClassesGradStrip(rows, showMain) {
    const strip = qs("#my-classes-grad-strip");
    if (!strip) return;
    const isHigh = schoolTypeFor(state.profile.school) === "high";
    if (!showMain || !isHigh) {
      strip.hidden = true;
      strip.innerHTML = "";
      return;
    }
    const metas = rows.map(({ row }) => gradReqMetaForRow(row));
    const unique = [...new Map(metas.map((m) => [m.key, m])).values()].sort((a, b) => {
      const order = "ABCDEFG—•";
      return order.indexOf(a.letter) - order.indexOf(b.letter) || a.key.localeCompare(b.key);
    });
    if (!unique.length) {
      strip.hidden = true;
      strip.innerHTML = "";
      return;
    }
    strip.hidden = false;
    strip.innerHTML = `<p class="my-classes-grad-strip-label muted small">Graduation areas this semester (UC/CSU A–G letters)</p>
      <div class="my-classes-grad-strip-pills">${unique
        .map(
          (m) =>
            `<span class="grad-req-strip-item" title="${escapeHtml(m.key)}"><span class="grad-req-area-badge"><span class="grad-req-area-badge-label">Department</span><span class="grad-req-letter-pill">${escapeHtml(m.letter)}</span></span><span>${escapeHtml(m.short)}</span></span>`
        )
        .join("")}</div>`;
  }

  function renderClassRows() {
    const tbody = qs("#classes-tbody");
    if (!tbody) return;
    const table = tbody.closest("table");
    const view = state.myClassesViewTab || "Main";
    const showMain = view === "Main";
    const showGrad = showMain && schoolTypeFor(state.profile.school) === "high";
    if (table) {
      const headRow = table.querySelector("thead tr");
      if (headRow) {
        headRow.innerHTML = showMain
          ? showGrad
            ? "<th>Period</th><th>Room</th><th>Course</th><th>Teacher</th><th>Grad Req</th><th>Notes</th><th></th>"
            : "<th>Period</th><th>Room</th><th>Course</th><th>Teacher</th><th>Notes</th><th></th>"
          : "<th>Period</th><th>Start</th><th>End</th><th>Room</th><th>Course</th><th>Teacher</th><th>Notes</th><th></th>";
      }
    }
    tbody.innerHTML = "";
    const mainSourceRows = BELL_DAYS.flatMap((day) => (currentWeek()[day] || []).map((row, idx) => ({ day, weekday: day, row, idx, ...row })));
    const rows = showMain
      ? uniqueScheduleRows(mainSourceRows).map((entry) => {
          const match = mainSourceRows.find((src) => src.row === entry.row || ((src.courseKey || src.courseLabel) === (entry.courseKey || entry.courseLabel) && src.teacher === entry.teacher && normalizedPeriod(src.period) === normalizedPeriod(entry.period)));
          return { day: match?.day || entry.day || "Monday", row: entry.row || entry, idx: match?.idx ?? 0, identity: `${entry.courseKey || normalizeText(entry.courseLabel)}::${entry.teacher || ""}::${normalizedPeriod(entry.period)}` };
        })
      : (currentWeek()[view] || []).map((row, idx) => ({ day: view, row, idx, ...row })).sort(compareScheduleRows).map(({ day, row, idx }) => ({ day, row, idx }));
    if (!rows.length) {
      renderMyClassesGradStrip([], showMain);
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="${showMain ? (showGrad ? 7 : 6) : 8}" class="muted">No classes saved for this ${showMain ? "semester" : "day"} yet.</td>`;
      tbody.appendChild(tr);
      return;
    }
    renderMyClassesGradStrip(rows, showMain);
    rows.forEach(({ day, row, idx, identity }) => {
      const tr = document.createElement("tr");
      const times = row.start && row.end ? { start: row.start, end: row.end } : resolveTimesForEntry(day, row.period, state.scheduleSchool);
      const rowKey = showMain ? `${state.myClassesSemester}::ALL::${encodeURIComponent(identity || `${row.courseKey || normalizeText(row.courseLabel)}::${row.teacher || ""}::${normalizedPeriod(row.period)}`)}` : `${state.myClassesSemester}::${day}::${idx}`;
      const gradCell = showGrad
        ? (() => {
            const meta = gradReqMetaForRow(row);
            return `<td class="grad-req-cell"><span class="grad-req-area-badge" title="${escapeHtml(meta.key)}"><span class="grad-req-area-badge-label">Department</span><span class="grad-req-letter-pill">${escapeHtml(meta.letter)}</span></span><span class="grad-req-cell-label">${escapeHtml(meta.short)}</span></td>`;
          })()
        : "";
      tr.innerHTML = showMain
        ? `
          <td>${escapeHtml(normalizedPeriod(row.period))}</td>
          <td>${escapeHtml(row.room || "—")}</td>
          <td>${escapeHtml(formatCourseTitle(row.courseKey || row.courseLabel))}</td>
          <td>${escapeHtml(row.teacher)}</td>
          ${gradCell}
          <td><button type="button" class="btn btn-sm btn-outline" data-comment="${rowKey}">Comments</button></td>
          <td><button type="button" class="btn btn-ghost btn-sm" data-rc="${rowKey}">Remove</button></td>`
        : `
          <td>${escapeHtml(normalizedPeriod(row.period))}</td>
          <td>${escapeHtml(times.start)}</td>
          <td>${escapeHtml(times.end)}</td>
          <td>${escapeHtml(row.room || "—")}</td>
          <td>${escapeHtml(formatCourseTitle(row.courseKey || row.courseLabel))}</td>
          <td>${escapeHtml(row.teacher)}</td>
          <td><button type="button" class="btn btn-sm btn-outline" data-comment="${rowKey}">Comments</button></td>
          <td><button type="button" class="btn btn-ghost btn-sm" data-rc="${rowKey}">Remove</button></td>`;
      tbody.appendChild(tr);
    });
    qsa("[data-rc]", tbody).forEach((btn) => {
      btn.addEventListener("click", () => {
        const parts = btn.getAttribute("data-rc").split("::");
        const sem = parts[0];
        const d = parts[1];
        const i = parts.slice(2).join("::");
        pushUndoSnapshot();
        if (d === "ALL") {
          const identity = decodeURIComponent(i || "");
          BELL_DAYS.forEach((day) => {
            currentWeek(sem)[day] = (currentWeek(sem)[day] || []).filter((row) => {
              const key = `${row.courseKey || normalizeText(row.courseLabel)}::${row.teacher || ""}::${normalizedPeriod(row.period)}`;
              if (key === identity) {
                clearScheduleRowFeedback(row);
                return false;
              }
              return true;
            });
          });
        } else {
          const row = currentWeek(sem)[d]?.[Number(i)];
          clearScheduleRowFeedback(row);
          currentWeek(sem)[d].splice(Number(i), 1);
        }
        saveState(state);
        publishToRegistry();
        commentsTarget = null;
        renderCommentsPanel();
        renderClassRows();
      });
    });
    qsa("[data-comment]", tbody).forEach((btn) => {
      btn.addEventListener("click", () => {
        const parts = btn.getAttribute("data-comment").split("::");
        const sem = parts[0];
        const d = parts[1];
        const i = parts.slice(2).join("::");
        if (d === "ALL") {
          alert("Open a weekday view to rate the specific class meeting you are currently taking.");
          return;
        }
        commentsTarget = { semester: sem, day: d, index: Number(i) };
        renderCommentsPanel();
      });
    });
  }

  function renderCommentsPanel() {
    const empty = qs("#comments-empty");
    const ed = qs("#comments-editor");
    const ctx = qs("#comments-context");
    if (!commentsTarget) {
      empty.hidden = false;
      ed.hidden = true;
      return;
    }
    const row = currentWeek(commentsTarget.semester || state.myClassesSemester)[commentsTarget.day][commentsTarget.index];
    if (!row) {
      commentsTarget = null;
      renderCommentsPanel();
      return;
    }
    empty.hidden = true;
    ed.hidden = false;
    ctx.textContent = `${SEMESTERS.find((s) => s.key === (commentsTarget.semester || state.myClassesSemester))?.label || "Semester"} · ${commentsTarget.day} · ${row.period} · ${formatCourseTitle(row.courseKey || row.courseLabel)}`;
    const ratingEl = qs("#comments-rating");
    if (ratingEl) {
      ratingEl.disabled = false;
      ratingEl.value = String(row.rating ?? 5);
    }
    qs("#comments-text").value = row.comment || "";
    const saveBtn = qs("#comments-save-btn");
    if (saveBtn) saveBtn.disabled = false;
  }

  qs("#comments-save-btn")?.addEventListener("click", () => {
    if (!commentsTarget || commentsTarget.day === "ALL") {
      alert("Open a weekday row to rate a class you are currently taking.");
      return;
    }
    pushUndoSnapshot();
    const row = currentWeek(commentsTarget.semester || state.myClassesSemester)[commentsTarget.day]?.[commentsTarget.index];
    if (!row) {
      commentsTarget = null;
      renderCommentsPanel();
      return;
    }
    row.rating = Number(qs("#comments-rating").value);
    row.comment = qs("#comments-text").value.trim();
    saveState(state);
    publishToRegistry();
    pushFeed(userId(), state.profile.displayName, "rated", `Rated ${formatCourseTitle(row.courseKey || row.courseLabel)}`);
    renderClassRows();
    renderCommentsPanel();
  });

  function renderSummerList() {
    const ul = qs("#summer-list");
    if (!ul) return;
    ul.innerHTML = "";
    state.summerCourses.forEach((s, i) => {
      const li = document.createElement("li");
      li.className = "summer-item";
      li.innerHTML = `${summerCourseCardHtml(s)}<button type="button" class="btn btn-ghost btn-sm" data-rs="${i}">Remove</button>`;
      ul.appendChild(li);
    });
    qsa("[data-rs]", ul).forEach((b) => {
      b.addEventListener("click", () => {
        pushUndoSnapshot();
        state.summerCourses.splice(Number(b.getAttribute("data-rs")), 1);
        saveState(state);
        renderSummerList();
        if (qs("#snapshot-content")) renderSnapshotPanel();
        if (qs("#grad-requirements-content")) renderGradRequirementsPanel();
      });
    });
  }

  function summerCourseCardHtml(s, { showCompletion = false } = {}) {
    const key = s.courseKey || "";
    const parsed = key ? parseCourseKey(key) : { subject: "", level: "", title: s.title || "" };
    const req = s.requirement || (key ? gradRequirementFor(parsed.subject, parsed.title) : "");
    return `<div>
      <strong>${escapeHtml(s.title || parsed.title || "Summer Course")}</strong>
      <div class="summer-item-meta muted small">
        <span>${escapeHtml(s.where || "Location not listed")}</span>
        ${parsed.subject ? `<span>${escapeHtml(parsed.subject)}</span>` : ""}
      </div>
      <div class="summer-card-badges">
        <span>${escapeHtml(s.format || "Online")}</span>
        <span>${escapeHtml(s.length || "Semester")} based</span>
        ${req ? `<span>${escapeHtml(req)}</span>` : ""}
        ${showCompletion && s.completionDate ? `<span>Finished ${escapeHtml(new Date(`${s.completionDate}T00:00:00`).toLocaleDateString())}</span>` : ""}
      </div>
    </div>`;
  }

  function renderSummerCourseBrowser() {
    const box = qs("#summer-course-browser");
    if (!box) return;
    mountCourseBrowserBody(box, qs("#summer-course-filter")?.value || "", "", state.profile.school, (key) => {
      const title = formatCourseTitle(key);
      qs("#summer-course-key").value = key;
      qs("#summer-course-label").textContent = title;
      qs("#summer-title").value = title;
    });
  }

  function renderActivityRows() {
    const tbody = qs("#activities-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    state.activities.forEach((row, idx) => {
      const tr = document.createElement("tr");
      const cal = row.date
        ? `<div class="calendar-mini"><strong>${escapeHtml(new Date(`${row.date}T00:00:00`).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }))}</strong><span>${escapeHtml([row.startTime, row.endTime].filter(Boolean).join(" - ") || "Time TBD")}</span></div>`
        : '<span class="muted small">No date</span>';
      const detailBits = [row.when, row.season, row.trainingTime].filter(Boolean);
      tr.innerHTML = `<td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.kind)}</td><td>${escapeHtml(detailBits.join(" · ") || "—")}</td><td>${cal}</td><td><button type="button" class="btn btn-ghost btn-sm" data-ra="${idx}">Remove</button></td>`;
      tbody.appendChild(tr);
    });
    qsa("[data-ra]", tbody).forEach((btn) => {
      btn.addEventListener("click", () => {
        pushUndoSnapshot();
        state.activities.splice(Number(btn.getAttribute("data-ra")), 1);
        saveState(state);
        renderActivityRows();
      });
    });
  }

  function renderSchedulePanel() {
    state.scheduleSchool = state.profile.school || state.scheduleSchool;
    if (qs("#schedule-save-grade")) qs("#schedule-save-grade").value = state.profile.grade || "";
    renderBellDayTabs();
    renderBellScheduleTable();
    renderMyClassesSemesterTabs();
    renderMyClassesDayTabs();
    fillPeriodSelect();
    qs("#add-class-course-value").value = "";
    qs("#add-class-course-label").textContent = "— None —";
    renderAddClassBrowser();
    renderClassRows();
    renderActivityRows();
    renderSummerList();
    renderSummerCourseBrowser();
    renderCommentsPanel();
    if (qs("#sports-fields")) qs("#sports-fields").hidden = qs("#act-kind")?.value !== "Sport";
    const doc = window.EHS_COURSE_LIST_URL;
    qsa("#ehs-doc-link, #course-info-doc-btn").forEach((el) => {
      if (el && doc) el.href = doc;
    });
  }

  qs("#act-kind")?.addEventListener("change", () => {
    const sports = qs("#sports-fields");
    if (sports) sports.hidden = qs("#act-kind").value !== "Sport";
  });

  qs("#summer-course-filter")?.addEventListener("input", () => renderSummerCourseBrowser());
  qs("#add-course-filter")?.addEventListener("input", () => renderAddClassBrowser());

  qs("#add-class-btn")?.addEventListener("click", () => {
    const weekday = "All";
    const semesterPick = qs("#add-class-semester")?.value || "both";
    const period = qs("#add-class-period").value;
    const room = qs("#add-class-room").value.trim();
    const courseVal = qs("#add-class-course-value").value;
    const teacher = qs("#add-class-teacher").value.trim();
    if (!period || !courseVal || !teacher) {
      alert("Choose a period, course, and teacher.");
      return;
    }
    const { subject, level, title } = parseCourseKey(courseVal);
    pushUndoSnapshot();
    const days = weekday === "All" ? BELL_DAYS : [weekday];
    const semesters = semesterPick === "both" ? ["s1", "s2"] : [semesterPick];
    semesters.forEach((sem) => {
      days.forEach((day) => {
        const times = resolveTimesForEntry(day, period, state.scheduleSchool);
        const rows = scheduleBucket(state.scheduleSchool)[sem][day];
        const samePeriod = normalizedPeriod(period);
        const existing = rows.findIndex((r) => normalizedPeriod(r.period) === samePeriod);
        if (existing >= 0) rows.splice(existing, 1);
        rows.push({
          period,
          room,
          courseLabel: title,
          courseKey: courseVal,
          teacher,
          start: times.start,
          end: times.end,
          comment: "",
        });
        rows.sort(compareScheduleRows);
      });
    });
    saveState(state);
    qs("#add-class-room").value = "";
    qs("#add-class-period").value = "";
    qs("#add-class-teacher").value = "";
    qs("#add-class-course-value").value = "";
    qs("#add-class-course-label").textContent = "— None —";
    renderAddClassBrowser();
    renderClassRows();
    pushFeed(userId(), state.profile.displayName, "added_class", `Added ${title} to ${weekday === "All" ? "all weekdays" : weekday}`);
  });

  qs("#add-activity-btn")?.addEventListener("click", () => {
    const name = qs("#act-name").value.trim();
    const kind = qs("#act-kind").value;
    const sport = qs("#act-sport")?.value || "";
    const trainingTime = qs("#act-training-time")?.value.trim() || "";
    let when = qs("#act-when").value.trim();
    if (kind === "Sport") {
      if (!sport) {
        alert("For sports, choose the sport.");
        return;
      }
      if (!when && !trainingTime) {
        alert("Add a day or training time for this sport.");
        return;
      }
      when = [when, trainingTime].filter(Boolean).join(" · ");
    }
    const detailWhen = [when, trainingTime].filter(Boolean).join(" · ");
    if (!name || !detailWhen) {
      alert("Add activity name and when it meets.");
      return;
    }
    pushUndoSnapshot();
    state.activities.push({ name: kind === "Sport" && sport ? `${sport}: ${name}` : name, kind, when: detailWhen, sport, trainingTime });
    saveState(state);
    qs("#act-name").value = "";
    qs("#act-when").value = "";
    if (qs("#act-sport")) qs("#act-sport").value = "";
    if (qs("#act-training-time")) qs("#act-training-time").value = "";
    renderActivityRows();
  });

  qs("#add-summer-btn")?.addEventListener("click", () => {
    const courseKeyValue = qs("#summer-course-key")?.value || "";
    const title = qs("#summer-title").value.trim() || formatCourseTitle(courseKeyValue);
    const where = qs("#summer-where").value.trim();
    if (!title || !where) {
      alert("Choose or type the course name and where you are taking it.");
      return;
    }
    const parsed = courseKeyValue ? parseCourseKey(courseKeyValue) : { subject: "", title };
    pushUndoSnapshot();
    state.summerCourses.push({
      title,
      where,
      courseKey: courseKeyValue,
      format: qs("#summer-format")?.value || "Online",
      length: qs("#summer-length")?.value || "Semester",
      completionDate: "",
      requirement: courseKeyValue ? gradRequirementFor(parsed.subject, parsed.title) : "",
    });
    saveState(state);
    qs("#summer-course-key").value = "";
    qs("#summer-course-label").textContent = "— None —";
    qs("#summer-course-filter").value = "";
    qs("#summer-title").value = "";
    qs("#summer-where").value = "";
    renderSummerCourseBrowser();
    renderSummerList();
    if (qs("#grad-requirements-content")) renderGradRequirementsPanel();
  });

  qs("#btn-undo-schedule")?.addEventListener("click", () => {
    if (applyUndo()) {
      renderSchedulePanel();
      renderFuturePanel();
      qs("#save-status").textContent = "Reverted last change.";
    } else {
      qs("#save-status").textContent = "Nothing to undo.";
    }
  });

  qs("#btn-save-all")?.addEventListener("click", () => {
    const saveGrade = qs("#schedule-save-grade")?.value || "";
    if (saveGrade) state.profile.grade = saveGrade;
    saveState(state);
    publishToRegistry("Schedule, activities, summer, and future lists saved to your profile.");
  });

  qs("#btn-new-year")?.addEventListener("click", () => {
    const rows = flattenScheduleForPublish();
    if (!rows.length && !state.activities.length && !state.summerCourses.length) {
      qs("#save-status").textContent = "Current year is already empty.";
      return;
    }
    const ok = confirm("Start a new school year? Your current schedule, activities, and summer courses will move to Past Classes and the current schedule will be cleared.");
    if (!ok) return;
    const completionDate = prompt("Completion date for the schedule you are finishing (YYYY-MM-DD):", new Date().toISOString().slice(0, 10)) || "";
    pushUndoSnapshot();
    state.pastSchedules.unshift({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      school: state.scheduleSchool,
      grade: qs("#schedule-save-grade")?.value || state.profile.grade,
      savedAt: Date.now(),
      completionDate,
      rows: rows.map((row) => ({ ...row, completionDate })),
      activities: [...state.activities],
      summerCourses: [...state.summerCourses],
    });
    state.pastSchedules = state.pastSchedules.slice(0, 6);
    state.scheduleByCommunity[state.scheduleSchool] = emptySemesterSchedule();
    state.scheduleByWeekday = emptyWeek();
    state.activities = [];
    state.summerCourses = [];
    commentsTarget = null;
    saveState(state);
    renderSchedulePanel();
    qs("#save-status").textContent = "New year started. Previous classes moved to Past Classes.";
  });

  /* ---------- Future ---------- */
  function renderFutureGradeTabs() {
    const wrap = qs("#future-grade-tabs");
    if (!wrap) return;
    const nums = getUpcomingGradeNums();
    if (!nums.length) {
      wrap.innerHTML = "";
      const hint = qs("#future-grade-hint");
      if (hint) hint.textContent = state.profile.grade ? "No future grade remains after your current grade." : "Add your current grade in Profile to plan upcoming years.";
      return;
    }
    const cur = parseInt(activeFutureGrade, 10);
    if (!nums.includes(cur)) activeFutureGrade = String(nums[0]);
    wrap.innerHTML = "";
    nums.forEach((n) => {
      const g = String(n);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "day-tab" + (activeFutureGrade === g ? " active" : "");
      b.textContent = `Grade ${g}`;
      b.addEventListener("click", () => {
        activeFutureGrade = g;
        activeFuturePrimary = 0;
        activeFutureAlt = 0;
        renderFutureGradeTabs();
        renderFuturePrimaryList();
        renderFutureAltList();
        renderFutureCatalog();
        syncFutureNotesField();
      });
      wrap.appendChild(b);
    });
    const hint = qs("#future-grade-hint");
    if (hint) {
      hint.textContent = `Editing plans for grade ${activeFutureGrade}. Each grade keeps its own primary list, alternatives, and notes.`;
    }
  }

  function syncFutureNotesField() {
    const slot = getFutureSlot();
    const primary = qs("#future-primary-notes");
    const alt = qs("#future-alt-notes");
    if (primary) primary.value = slot.primaryNotes || "";
    if (alt) alt.value = slot.alternativeNotes || slot.notes || "";
  }

  function renderFuturePrimaryList() {
    const ul = qs("#future-primary-list");
    if (!ul) return;
    const slot = getFutureSlot();
    ul.innerHTML = "";
    slot.primary.forEach((key, idx) => {
      const li = document.createElement("li");
      li.className = "future-row" + (activeFuturePrimary === idx ? " active" : "");
      if (!key) li.innerHTML = `<span class="muted">Empty Row ${idx + 1}</span>`;
      else {
        const { subject, level, title } = parseCourseKey(key);
        li.innerHTML = `<strong>${escapeHtml(level)}</strong> ${escapeHtml(title)} <span class="muted small">${escapeHtml(subject)}</span>`;
      }
      li.addEventListener("click", () => {
        activeFuturePrimary = idx;
        renderFuturePrimaryList();
      });
      ul.appendChild(li);
    });
  }

  function renderFutureAltList() {
    const ul = qs("#future-alt-list");
    if (!ul) return;
    const slot = getFutureSlot();
    ul.innerHTML = "";
    slot.alternatives.forEach((key, idx) => {
      const li = document.createElement("li");
      li.className = "future-row" + (activeFutureAlt === idx ? " active" : "");
      if (!key) li.innerHTML = `<span class="muted">Empty Alt ${idx + 1}</span>`;
      else {
        const { subject, level, title } = parseCourseKey(key);
        li.innerHTML = `<strong>${escapeHtml(level)}</strong> ${escapeHtml(title)} <span class="muted small">${escapeHtml(subject)}</span>`;
      }
      li.addEventListener("click", () => {
        activeFutureAlt = idx;
        renderFutureAltList();
      });
      ul.appendChild(li);
    });
  }

  function syncFutureTargetButtons() {
    qs("#target-primary")?.classList.toggle("active-target", futurePickTarget === "primary");
    qs("#target-alt")?.classList.toggle("active-target", futurePickTarget === "alt");
  }

  function renderFutureCatalog() {
    const box = qs("#future-catalog");
    const ft = qs("#course-filter-future")?.value || "";
    if (!box) return;
    if (!getUpcomingGradeNums().length) {
      box.innerHTML = `<p class="muted">${state.profile.grade ? "No future grade remains after your current grade." : "Set your grade in Profile to use the catalog here."}</p>`;
      return;
    }
    box.innerHTML =
      buildCourseBrowserHTML(ft, activeFutureGrade, state.profile.school) +
      `<p class="muted small target-hint">Add to:
        <button type="button" class="btn btn-ghost btn-sm" id="target-primary">Primary</button>
        <button type="button" class="btn btn-ghost btn-sm" id="target-alt">Alternatives</button></p>`;
    qs("#target-primary")?.addEventListener("click", () => {
      futurePickTarget = "primary";
      syncFutureTargetButtons();
    });
    qs("#target-alt")?.addEventListener("click", () => {
      futurePickTarget = "alt";
      syncFutureTargetButtons();
    });
    syncFutureTargetButtons();
    wireCourseBrowser(box, (key) => {
      const slot = getFutureSlot();
      if (futurePickTarget === "primary") {
        const pri = slot.primary;
        if (pri.includes(key) && pri[activeFuturePrimary] !== key) {
          alert("Already in primary list for this grade.");
          return;
        }
        pushUndoSnapshot();
        pri[activeFuturePrimary] = key;
      } else {
        const alt = slot.alternatives;
        if (alt.includes(key) && alt[activeFutureAlt] !== key) {
          alert("Already in alternatives for this grade.");
          return;
        }
        pushUndoSnapshot();
        alt[activeFutureAlt] = key;
      }
      saveState(state);
      renderFuturePrimaryList();
      renderFutureAltList();
      renderFutureByGradeSummary();
      renderFutureRecommendations();
    });
  }

  function renderFutureByGradeSummary() {
    const box = qs("#future-by-grade-summary");
    if (!box) return;
    const nums = getUpcomingGradeNums();
    if (!nums.length) {
      box.innerHTML = '<p class="muted">Set your grade in Profile to see a summary.</p>';
      return;
    }
    box.innerHTML = nums
      .map((n) => {
        const g = String(n);
        const s = state.futureByGrade[g] || emptyFutureSlot();
        const p = (s.primary || []).filter(Boolean);
        const a = (s.alternatives || []).filter(Boolean);
        const pHtml = p.length
          ? `<ul class="future-summary-ul">${p
              .map((k) => {
                const { level, title } = parseCourseKey(k);
                return `<li><strong>${escapeHtml(level)}</strong> ${escapeHtml(title)}</li>`;
              })
              .join("")}</ul>`
          : '<p class="muted small">No primary picks yet.</p>';
        const aHtml = a.length
          ? `<ul class="future-summary-ul muted small">${a
              .map((k) => {
                const { level, title } = parseCourseKey(k);
                return `<li>${escapeHtml(level)} ${escapeHtml(title)}</li>`;
              })
              .join("")}</ul>`
          : "";
        const note = [s.primaryNotes && `Primary: ${s.primaryNotes}`, (s.alternativeNotes || s.notes) && `Alternatives: ${s.alternativeNotes || s.notes}`].filter(Boolean).join(" ");
        return `<article class="future-summary-card"><h4>Grade ${escapeHtml(g)}</h4>${pHtml}${
          aHtml ? `<p class="small"><strong>Alternatives:</strong></p>${aHtml}` : ""
        }${note ? `<p class="future-summary-note"><em>${escapeHtml(note)}</em></p>` : ""}</article>`;
      })
      .join("");
  }

  function scoreCourseRecommendation(key) {
    const { subject, level, title } = parseCourseKey(key);
    const txt = `${subject} ${level} ${title}`.toLowerCase();
    let score = 0;
    const reasons = [];
    const academic = state.profile.academicLevel || "";
    const career = state.profile.careerPathway || "";
    const current = new Set(flattenScheduleForPublish().map((r) => r.courseKey).filter(Boolean));
    const planned = new Set(Object.values(state.futureByGrade || {}).flatMap((slot) => [...(slot.primary || []), ...(slot.alternatives || [])]).filter(Boolean));
    if (current.has(key) || planned.has(key)) score -= 20;
    if (academic.includes("AP") && level === "AP") {
      score += 8;
      reasons.push("matches advanced coursework");
    } else if (academic.includes("Honors") && (level === "Honors" || level === "AP")) {
      score += 6;
      reasons.push("fits an honors-focused plan");
    } else if (academic.includes("Mixed") && ["Honors", "CP"].includes(level)) {
      score += 5;
      reasons.push("balances CP and Honors");
    } else if (academic.includes("College Prep") && level === "CP") {
      score += 5;
      reasons.push("steady CP fit");
    } else if (academic.includes("Exploring") && ["CP", "Elective"].includes(level)) {
      score += 5;
      reasons.push("good exploration option");
    }
    const pathways = [
      ["Computer Science / Technology", /computer|programming|web|data|robotics|engineering/],
      ["STEM / Engineering", /calculus|physics|chemistry|biology|engineering|robotics|statistics/],
      ["Health / Medicine", /biology|chemistry|anatomy|physiology|psychology|sports medicine|health/],
      ["Business / Entrepreneurship", /business|marketing|accounting|economics|entrepreneurship|statistics/],
      ["Arts / Media / Design", /art|design|media|photography|music|theater|dance|journalism/],
      ["Education / Public Service", /leadership|peer|psychology|sociology|government|service|child development/],
      ["Humanities / Law", /english|literature|history|government|law|speech|debate|ethnic/],
    ];
    const match = pathways.find(([name]) => name === career);
    if (match && match[1].test(txt)) {
      score += 9;
      reasons.push(`supports ${career}`);
    }
    const ratingAgg = JSON.parse(localStorage.getItem(RATING_AGG_KEY) || "{}");
    const agg = ratingAgg[key];
    if (agg?.n) {
      const avg = agg.sum / agg.n;
      score += avg;
      reasons.push(`${avg.toFixed(1)} average rating`);
    }
    const enroll = JSON.parse(localStorage.getItem(ENROLL_KEY) || "{}");
    if (enroll[key]) {
      score += Math.min(4, enroll[key]);
      reasons.push(`${enroll[key]} community member${enroll[key] === 1 ? "" : "s"} enrolled`);
    }
    if (!reasons.length) reasons.push("broad catalog fit");
    return { key, score, reasons: reasons.slice(0, 3) };
  }

  function renderFutureRecommendations() {
    const box = qs("#future-recommendations");
    if (!box) return;
    const all = [];
    sortedSubjects().forEach((subject) => {
      (catalog[subject] || []).filter((c) => courseAllowed(c, activeFutureGrade, state.profile.school)).forEach((c) => all.push(scoreCourseRecommendation(courseKey(subject, c))));
    });
    const picks = all.sort((a, b) => b.score - a.score).slice(0, 6);
    box.innerHTML = picks.length
      ? picks
          .map((r) => {
            const { subject, level, title } = parseCourseKey(r.key);
            return `<article class="recommendation-item">
              <div><strong>${escapeHtml(title)}</strong><span class="muted small">${escapeHtml(subject)} · ${escapeHtml(level)}</span></div>
              <p class="muted small">Compatibility ${Math.max(0, Math.round(r.score * 8))}% · ${escapeHtml(r.reasons.join(", "))}</p>
              <button type="button" class="btn btn-outline btn-sm" data-rec-pick="${encodeURIComponent(r.key)}">Add To Primary</button>
            </article>`;
          })
          .join("")
      : '<p class="muted">Add your academic level and career pathway in Profile to get recommendations.</p>';
    qsa("[data-rec-pick]", box).forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = decodeURIComponent(btn.getAttribute("data-rec-pick"));
        const slot = getFutureSlot();
        pushUndoSnapshot();
        const empty = slot.primary.findIndex((x) => !x);
        if (empty >= 0) slot.primary[empty] = key;
        else slot.primary.push(key);
        saveState(state);
        renderFuturePrimaryList();
        renderFutureByGradeSummary();
        renderFutureRecommendations();
      });
    });
  }

  qs("#future-add-row")?.addEventListener("click", () => {
    if (!getUpcomingGradeNums().length) return;
    pushUndoSnapshot();
    const slot = getFutureSlot();
    slot.primary.push("");
    activeFuturePrimary = slot.primary.length - 1;
    saveState(state);
    renderFuturePrimaryList();
    renderFutureByGradeSummary();
  });

  qs("#future-remove-active")?.addEventListener("click", () => {
    if (!getUpcomingGradeNums().length) return;
    pushUndoSnapshot();
    const slot = getFutureSlot();
    if (slot.primary.length > 1) {
      slot.primary.splice(activeFuturePrimary, 1);
      activeFuturePrimary = Math.max(0, activeFuturePrimary - 1);
    } else slot.primary[0] = "";
    saveState(state);
    renderFuturePrimaryList();
    renderFutureByGradeSummary();
  });

  qs("#future-clear-primary")?.addEventListener("click", () => {
    if (!getUpcomingGradeNums().length) return;
    if (confirm("Clear all primary picks for this grade?")) {
      pushUndoSnapshot();
      getFutureSlot().primary = [""];
      activeFuturePrimary = 0;
      saveState(state);
      renderFuturePrimaryList();
      renderFutureByGradeSummary();
    }
  });

  qs("#future-add-alt-row")?.addEventListener("click", () => {
    if (!getUpcomingGradeNums().length) return;
    pushUndoSnapshot();
    const slot = getFutureSlot();
    slot.alternatives.push("");
    activeFutureAlt = slot.alternatives.length - 1;
    saveState(state);
    renderFutureAltList();
    renderFutureByGradeSummary();
  });

  qs("#future-remove-alt-active")?.addEventListener("click", () => {
    if (!getUpcomingGradeNums().length) return;
    pushUndoSnapshot();
    const slot = getFutureSlot();
    if (slot.alternatives.length > 1) {
      slot.alternatives.splice(activeFutureAlt, 1);
      activeFutureAlt = Math.max(0, activeFutureAlt - 1);
    } else slot.alternatives[0] = "";
    saveState(state);
    renderFutureAltList();
    renderFutureByGradeSummary();
  });

  qs("#course-filter-future")?.addEventListener("input", () => renderFutureCatalog());

  function renderFuturePanel() {
    renderFutureGradeTabs();
    syncFutureNotesField();
    renderFuturePrimaryList();
    renderFutureAltList();
    renderFutureCatalog();
    renderFutureByGradeSummary();
    renderFutureRecommendations();
  }

  qs("#future-alt-notes")?.addEventListener("input", () => {
    const slot = getFutureSlot();
    slot.alternativeNotes = qs("#future-alt-notes").value;
    slot.notes = slot.alternativeNotes;
    saveState(state);
    renderFutureByGradeSummary();
  });

  qs("#future-primary-notes")?.addEventListener("input", () => {
    getFutureSlot().primaryNotes = qs("#future-primary-notes").value;
    saveState(state);
    renderFutureByGradeSummary();
  });

  qs("#btn-save-future")?.addEventListener("click", () => {
    saveState(state);
    publishToRegistry("Future course lists saved to your profile.");
  });

  function renderGradRequirementsPanel() {
    const box = qs("#grad-requirements-content");
    if (!box) return;
    if (schoolTypeFor(getActiveCommunitySchool()) !== "high") {
      box.innerHTML = '<div class="empty-state"><p>Grad Requirements are only shown for high school communities.</p></div>';
      return;
    }
    state.pastSchedules = (state.pastSchedules || []).map(normalizePastScheduleRecord);
    const currentRows = allScheduleRowsForSchool(state.profile.school || "Emerald High School");
    const pastRows = (state.pastSchedules || []).flatMap((g) => (g.rows || []).map((r) => ({ ...r, school: g.school, grade: g.grade, past: true })));
    const completedSummerRows = (state.summerCourses || [])
      .filter((s) => s.completionDate)
      .flatMap((s) => {
        const key = s.courseKey || "";
        const title = s.title || formatCourseTitle(key);
        const semesters = s.length === "Full Year" ? ["summer-a", "summer-b"] : ["summer"];
        return semesters.map((sem) => ({
          semester: sem,
          grade: state.profile.grade || "current",
          period: "Summer",
          teacher: s.where || "",
          courseLabel: title,
          courseKey: key,
          requirement: s.requirement || (key ? gradRequirementFor(parseCourseKey(key).subject, parseCourseKey(key).title) : "Elective"),
          summer: true,
          outsideSchool: true,
          completed: true,
          completionDate: s.completionDate || "",
          past: true,
        }));
      });
    const inProgressSummerRows = (state.summerCourses || [])
      .filter((s) => !s.completionDate)
      .flatMap((s) => {
        const key = s.courseKey || "";
        const title = s.title || formatCourseTitle(key);
        const semesters = s.length === "Full Year" ? ["summer-a", "summer-b"] : ["summer"];
        return semesters.map((sem) => ({
          semester: sem,
          grade: state.profile.grade || "current",
          period: "Summer",
          teacher: s.where || "",
          courseLabel: title,
          courseKey: key,
          requirement: s.requirement || (key ? gradRequirementFor(parseCourseKey(key).subject, parseCourseKey(key).title) : "Elective"),
          summer: true,
          outsideSchool: true,
        }));
      });
    const rows = [...currentRows, ...pastRows, ...completedSummerRows, ...inProgressSummerRows];
    const byReq = {};
    const creditSeen = new Set();
    GRAD_REQUIREMENTS.forEach((r) => (byReq[r.key] = { rows: [], credits: 0 }));
    rows.forEach((r) => {
      const parsed = parseCourseKey(r.courseKey || "");
      const req = r.requirement || gradRequirementFor(parsed.subject || r.courseLabel, parsed.title || r.courseLabel);
      if (byReq[req]) {
        byReq[req].rows.push(r);
        const creditKey = `${req}:${r.grade || "current"}:${r.semester || "s1"}:${gradCourseIdentity(r)}`;
        if (!creditSeen.has(creditKey)) {
          creditSeen.add(creditKey);
          const inProgressOutside = (r.summer || r.outsideSchool) && !r.completionDate && !r.completed;
          if (!inProgressOutside) byReq[req].credits += 5;
        }
      }
    });
    const requiredCredits = Object.fromEntries(GRAD_REQUIREMENTS.map((req) => [req.key, req.credits || 0]));
    const grade = Number(state.profile.grade || 12);
    const missingGrades = Number.isFinite(grade)
      ? ["9", "10", "11"].filter((g) => Number(g) < grade && !(state.pastSchedules || []).some((p) => String(p.grade) === g))
      : [];
    const countedByReq = GRAD_REQUIREMENTS.map((req) => ({
      req,
      items: buildGradCountedListItems(byReq[req.key]?.rows || []),
    }));
    const pastByGrade = ["9", "10", "11", "12"].map((g) => ({
      grade: g,
      bucket: state.pastSchedules.find((p) => String(p.grade) === g) || { grade: g, rows: [] },
    }));
    if (!["9", "10", "11", "12"].includes(activePastGrade)) activePastGrade = "9";
    const activePastBucket = pastByGrade.find((x) => x.grade === activePastGrade)?.bucket || { rows: [] };
    const activePastRows = activePastBucket.rows || [];
    const tabs = `<div class="segmented-control grad-tabs" role="tablist" aria-label="Grad Requirements View">
      <button type="button" class="day-tab ${gradPanelMode === "requirements" ? "active" : ""}" data-grad-mode="requirements">Graduation Requirements</button>
      <button type="button" class="day-tab ${gradPanelMode === "past" ? "active" : ""}" data-grad-mode="past">Past Schedule Crafter</button>
    </div>`;
    if (gradPanelMode === "past") {
      box.innerHTML =
        tabs +
        `<div class="card grad-card-wide">
          <h3>Past Schedule Crafter</h3>
          <p class="muted small">Build a saved schedule for each completed grade. These rows are grouped as grade schedules, then used for credit progress without turning them into standalone current courses.</p>
          <div class="schedule-form-grid">
            <label class="field"><span>Grade</span><select id="past-grade">${["9", "10", "11", "12"].map((g) => `<option value="${g}">${g}th</option>`).join("")}</select></label>
            <label class="field"><span>Semester</span><select id="past-semester"><option value="both">Both Semesters</option><option value="s1">Semester 1</option><option value="s2">Semester 2</option></select></label>
            <label class="field"><span>Period</span><input type="text" id="past-period" placeholder="e.g. Period 3" /></label>
            <label class="field"><span>Teacher</span><input type="text" id="past-teacher" placeholder="Teacher name" /></label>
            <label class="field"><span>Requirement</span><select id="past-req">${GRAD_REQUIREMENTS.map((r) => `<option value="${escapeHtml(r.key)}">${escapeHtml(r.key)}</option>`).join("")}</select></label>
            <label class="field"><span>Completion Date</span><input type="date" id="past-completion-date" /></label>
            <input type="hidden" id="past-course-key" value="" />
            <p class="selected-course-line">Selected: <strong id="past-course-label">— None —</strong></p>
          </div>
          <div class="past-catalog-box">
            <label class="field"><span>Catalog</span>
              <div class="course-browser-shell course-browser-shell-tall">
                <input type="search" id="past-course-filter" class="course-search course-browser-search" placeholder="Search past courses..." />
                <div id="past-course-browser" class="course-browser-body" aria-label="Past course catalog"></div>
              </div>
            </label>
          </div>
          <div class="settings-actions">
            <button type="button" class="btn btn-primary" id="past-add-course">Add To Grade Schedule</button>
            <button type="button" class="btn btn-outline" id="past-save-schedule">Save Grade Schedule</button>
          </div>
          <div class="segmented-control past-grade-tabs" role="tablist" aria-label="Past grade schedule">
            ${pastByGrade.map(({ grade }) => `<button type="button" class="day-tab ${activePastGrade === grade ? "active" : ""}" data-past-grade-view="${grade}">Grade ${grade}</button>`).join("")}
          </div>
          <article class="past-grade-schedule">
                <h4>Grade ${escapeHtml(activePastGrade)} Schedule</h4>
                ${
                  activePastRows.length
                    ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Semester</th><th>Period</th><th>Course</th><th>Teacher</th><th>Requirement</th><th>Completed</th><th></th></tr></thead><tbody>${activePastRows
                        .map(
                          (r, idx) =>
                            `<tr><td>${escapeHtml(SEMESTERS.find((s) => s.key === r.semester)?.label || "")}</td><td>${escapeHtml(r.period || "—")}</td><td>${escapeHtml(formatCourseTitle(r.courseKey || r.courseLabel))}</td><td>${escapeHtml(r.teacher || "—")}</td><td>${escapeHtml(r.requirement || "")}</td><td>${escapeHtml(r.completionDate ? new Date(`${r.completionDate}T00:00:00`).toLocaleDateString() : activePastBucket.completionDate ? new Date(`${activePastBucket.completionDate}T00:00:00`).toLocaleDateString() : "—")}</td><td><button type="button" class="btn btn-ghost btn-sm user-menu-danger" data-remove-past-row="${idx}">Remove</button></td></tr>`
                        )
                        .join("")}</tbody></table></div>`
                    : '<p class="muted small">No rows saved for this grade yet.</p>'
                }
          </article>
        </div>`;
    } else {
      box.innerHTML =
        tabs +
        `<div class="grad-card-wide card">
          <h3>Graduation Requirements</h3>
          ${missingGrades.length ? `<p class="warning-note">Missing grade ${escapeHtml(missingGrades.join(", "))} schedule data. Open Past Schedule Crafter to add earlier schedules before trusting totals.</p>` : ""}
          <div class="grad-requirement-list">${GRAD_REQUIREMENTS.map((req) => `<article class="grad-req-row"><h4>${escapeHtml(req.key)}</h4><p><strong>DUSD:</strong> ${escapeHtml(req.dusd)}<br /><strong>UC/CSU:</strong> ${escapeHtml(req.uc)}</p><p>${escapeHtml(req.detail)}</p></article>`).join("")}</div>
        </div>
        <div class="grad-card-wide card">
          <h3>Track Record</h3>
          <div class="track-record-legend" aria-label="Track record color reference">
            <span><i class="legend-dot is-current"></i> Currently taking / in progress</span>
            <span><i class="legend-dot is-complete"></i> Completed (in-school)</span>
            <span><i class="legend-dot is-outside"></i> Outside school course finished</span>
          </div>
          <div class="grad-track-counted-grid">${GRAD_REQUIREMENTS.map((req) => {
            const got = byReq[req.key]?.credits || 0;
            const need = requiredCredits[req.key] || 0;
            const complete = got >= need;
            const items = countedByReq.find((x) => x.req.key === req.key)?.items || [];
            return `<article class="grad-req-combined">
              <div class="grad-req-combined-head">
                <h4>${escapeHtml(req.key)}</h4>
                <p class="grad-credit-pill${complete ? " is-complete" : ""}"><strong>${got.toFixed(1)}/${need.toFixed(1)}</strong> credits</p>
              </div>
              ${items.length ? `<ul class="grad-detail-list">${items.join("")}</ul>` : '<p class="muted small">No completed past courses counted here yet.</p>'}
            </article>`;
          }).join("")}</div>
        </div>
        <div class="grad-card-wide card">
          <h3>Still Needed</h3>
          <p class="muted small">Each graduation area lists required courses (with alternatives). Completed courses are highlighted in green when they appear in your saved schedules.</p>
          ${buildGradStillNeededHtml(byReq, requiredCredits)}
        </div>`;
    }
    qsa("[data-grad-mode]", box).forEach((btn) => {
      btn.addEventListener("click", () => {
        gradPanelMode = btn.getAttribute("data-grad-mode") || "requirements";
        renderGradRequirementsPanel();
      });
    });
    qsa("[data-past-grade-view]", box).forEach((btn) => {
      btn.addEventListener("click", () => {
        activePastGrade = btn.getAttribute("data-past-grade-view") || "9";
        const sel = qs("#past-grade");
        if (sel) sel.value = activePastGrade;
        renderGradRequirementsPanel();
      });
    });
    const pastGradeSelect = qs("#past-grade");
    if (pastGradeSelect) {
      pastGradeSelect.value = activePastGrade;
      pastGradeSelect.addEventListener("change", () => {
        activePastGrade = pastGradeSelect.value;
        renderGradRequirementsPanel();
      });
    }
    const pastBrowser = qs("#past-course-browser");
    const renderPastCourseBrowser = () => {
      if (!pastBrowser) return;
      pastBrowser.innerHTML = buildCourseBrowserHTML(qs("#past-course-filter")?.value || "", "", state.profile.school);
      wireCourseBrowser(pastBrowser, (key) => {
        qs("#past-course-key").value = key;
        qs("#past-course-label").textContent = formatCourseTitle(key);
        const { subject, title } = parseCourseKey(key);
        const req = gradRequirementFor(subject, title);
        if (qs("#past-req")) qs("#past-req").value = req;
      });
    };
    renderPastCourseBrowser();
    qs("#past-course-filter")?.addEventListener("input", renderPastCourseBrowser);
    qs("#past-add-course")?.addEventListener("click", () => {
      const key = qs("#past-course-key")?.value || "";
      if (!key) {
        alert("Choose a course from the catalog.");
        return;
      }
      const title = formatCourseTitle(key);
      const gradeVal = qs("#past-grade").value;
      const period = qs("#past-period")?.value.trim() || "";
      const teacher = qs("#past-teacher")?.value.trim() || "";
      const completionDate = qs("#past-completion-date")?.value || "";
      activePastGrade = gradeVal;
      const semesters = qs("#past-semester").value === "both" ? ["s1", "s2"] : [qs("#past-semester").value];
      let bucket = state.pastSchedules.find((p) => String(p.grade) === String(gradeVal));
      if (!bucket) {
        bucket = normalizePastScheduleRecord({ grade: gradeVal, school: state.profile.school, rows: [] });
        state.pastSchedules.push(bucket);
      }
      bucket.school = state.profile.school || bucket.school;
      bucket.savedAt = Date.now();
      semesters.forEach((sem) => {
        const idx = bucket.rows.findIndex((r) => r.semester === sem && (r.courseKey === key || normalizeText(r.courseLabel) === normalizeText(title)));
        const row = { semester: sem, grade: gradeVal, period, teacher, courseLabel: title, courseKey: key, requirement: qs("#past-req").value, completionDate };
        if (idx >= 0) bucket.rows.splice(idx, 1, row);
        else bucket.rows.push(row);
      });
      saveState(state);
      renderGradRequirementsPanel();
    });
    qsa("[data-remove-past-row]", box).forEach((btn) => {
      btn.addEventListener("click", () => {
        const bucket = state.pastSchedules.find((p) => String(p.grade) === String(activePastGrade));
        if (!bucket) return;
        bucket.rows.splice(Number(btn.getAttribute("data-remove-past-row")), 1);
        bucket.savedAt = Date.now();
        saveState(state);
        renderGradRequirementsPanel();
      });
    });
    qs("#past-save-schedule")?.addEventListener("click", () => {
      const gradeVal = qs("#past-grade")?.value || "";
      let bucket = state.pastSchedules.find((p) => String(p.grade) === String(gradeVal));
      if (!bucket) {
        bucket = normalizePastScheduleRecord({ grade: gradeVal, rows: [] });
        state.pastSchedules.push(bucket);
      }
      bucket.completionDate = qs("#past-completion-date")?.value || bucket.completionDate || "";
      bucket.rows = (bucket.rows || []).map((row) => ({ ...row, completionDate: row.completionDate || bucket.completionDate }));
      bucket.savedAt = Date.now();
      saveState(state);
      renderGradRequirementsPanel();
    });
  }

  /* ---------- Course info ---------- */
  function renderCourseInfo() {
    const grid = qs("#course-info-grid");
    if (!grid) return;
    fillCourseInfoSubjectFilter();
    const viewSchool = getCatalogSchool();
    const viewGrade = "";
    const docBtn = qs("#course-info-doc-btn");
    if (docBtn) {
      const high = schoolTypeFor(viewSchool) === "high";
      docBtn.hidden = !high;
      if (window.EHS_COURSE_LIST_URL) docBtn.href = window.EHS_COURSE_LIST_URL;
      docBtn.textContent = high ? "Open EHS Registration Resources (Google Doc)" : "";
    }
    const gradFilterEl = qs("#course-info-grad-filter");
    if (gradFilterEl) gradFilterEl.closest("label").hidden = schoolTypeFor(viewSchool) !== "high";
    const search = (qs("#course-info-search")?.value || "").toLowerCase();
    const starred = new Set(getStarredCourses());
    const catalogKeys = [];
    sortedSubjects(viewGrade, viewSchool).forEach((subject) => {
      (catalog[subject] || []).filter((c) => courseAllowed(c, viewGrade, viewSchool)).forEach((c) => catalogKeys.push(courseKey(subject, c)));
    });
    let entries = [...new Set(catalogKeys)]
      .map((k) => {
        const stats = courseCommunityStats(k, viewSchool);
        const meta = getCourseMeta(k, parseCourseKey(k).title);
        const label = parseCourseKey(k);
        const subjectEntries = catalog[label.subject] || [];
        const entry = subjectEntries.find((c) => c.title === label.title && c.level === label.level);
        const grades = (entry?.grades || []).filter(Boolean).map(String);
        const gradeLabel = grades.length ? grades.join(", ") : "Varies";
        return {
          key: k,
          count: stats.count,
          avg: stats.avg === null ? "—" : stats.avg.toFixed(2),
          meta,
          label,
          gradReq: gradRequirementFor(label.subject, label.title),
          starred: starred.has(k),
          gradeLabel,
        };
      })
      .filter((e) => {
        const text = `${e.label.title} ${e.label.subject} ${e.label.level}`.toLowerCase();
        if (courseInfoSubjectFilter && e.label.subject !== courseInfoSubjectFilter) return false;
        if (courseInfoGradFilter && e.gradReq !== courseInfoGradFilter) return false;
        if (courseInfoLevelFilter === "AP" && e.label.level !== "AP") return false;
        if (courseInfoLevelFilter === "advanced" && !["AP", "Honors"].includes(e.label.level)) return false;
        return !search || text.includes(search);
      });
    if (courseInfoSort === "popular") entries.sort((a, b) => b.count - a.count || a.label.title.localeCompare(b.label.title));
    else if (courseInfoSort === "starred") entries.sort((a, b) => Number(b.starred) - Number(a.starred) || a.label.title.localeCompare(b.label.title));
    else entries.sort((a, b) => a.label.title.localeCompare(b.label.title));
    const totalPages = Math.max(1, Math.ceil(entries.length / 20));
    if (courseInfoPage > totalPages) courseInfoPage = totalPages;
    if (courseInfoPage < 1) courseInfoPage = 1;
    const pageEntries = entries.slice((courseInfoPage - 1) * 20, courseInfoPage * 20);
    if (!entries.length) {
      grid.innerHTML = `<div class="empty-state">
        <p>No courses match that search for ${escapeHtml(viewSchool)}.</p>
        <button type="button" class="btn btn-outline" id="course-info-open-schedule">Open Schedule</button>
      </div>`;
      qs("#course-info-open-schedule")?.addEventListener("click", () => showPanel("schedule"));
      return;
    }
    const pager =
      totalPages > 1
        ? `<div class="course-info-pager">${Array.from({ length: totalPages }, (_, i) => i + 1)
            .map((p) => `<button type="button" class="day-tab ${p === courseInfoPage ? "active" : ""}" data-course-page="${p}">${p}</button>`)
            .join("")}</div>`
        : "";
    grid.innerHTML =
      pageEntries
      .map((e) => {
        const { subject, level, title } = e.label;
        const enc = encodeURIComponent(e.key);
        const apExamNote = level === "AP" ? " AP exam planning should include the College Board exam window, practice free-response work, and a realistic study calendar." : " No AP exam is attached by default, but students can still use the rigor notes to compare workload.";
        const rigorNote = ["AP", "Honors"].includes(level)
          ? "Expect faster pacing, more independent reading or problem solving, and assessments that reward explanation over memorization."
          : "Expect core skill-building, steady practice, and content meant to prepare you for the next course in the sequence.";
        return `<details class="course-info-card">
          <summary><span>${escapeHtml(title)}</span><span class="level-tag" aria-hidden="true">${escapeHtml(level)}</span></summary>
          <div class="course-info-head"><button type="button" class="enroll-badge enroll-badge-button" data-enrollment-open="${enc}">${e.count} student${e.count === 1 ? "" : "s"}</button><span class="level-tag" aria-hidden="true">${escapeHtml(e.gradReq)}</span></div>
          <p class="muted small">${escapeHtml(subject)}</p>
          <p class="course-info-grades">Typical grades: ${escapeHtml(e.gradeLabel)}</p>
          <p><strong>Difficulty:</strong> ${escapeHtml(e.meta.difficulty)}</p>
          <p>${escapeHtml(e.meta.overview)} This course currently maps to <strong>${escapeHtml(e.gradReq)}</strong> for planning filters, so you can compare it against graduation and A-G progress. ${escapeHtml(rigorNote)}${escapeHtml(apExamNote)} Content depth may include major units, projects, labs, essays, performances, or cumulative finals depending on the department.</p>
          <p class="rating-line"><strong>Avg. rating:</strong> ${escapeHtml(String(e.avg))} ${e.avg !== "—" ? "(from saved schedules)" : ""}</p>
          <button type="button" class="btn btn-ghost btn-sm course-star-btn" data-course-star="${enc}" aria-pressed="${e.starred ? "true" : "false"}">${e.starred ? "★ Starred" : "☆ Star"}</button>
          <button type="button" class="btn btn-outline btn-sm" data-cc-open="${enc}">View all comments</button>
        </details>`;
      })
      .join("") +
      pager;
    qsa("[data-course-page]", grid).forEach((btn) => {
      btn.addEventListener("click", () => {
        courseInfoPage = Number(btn.getAttribute("data-course-page")) || 1;
        renderCourseInfo();
      });
    });
    qsa("[data-course-star]", grid).forEach((btn) => {
      btn.addEventListener("click", () => {
        toggleStarredCourse(decodeURIComponent(btn.getAttribute("data-course-star")));
        renderCourseInfo();
      });
    });
    qsa("[data-cc-open]", grid).forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = decodeURIComponent(btn.getAttribute("data-cc-open"));
        openCourseCommentsModal(key);
      });
    });
    qsa("[data-enrollment-open]", grid).forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openEnrollmentModal(decodeURIComponent(btn.getAttribute("data-enrollment-open")));
      });
    });
  }

  function fillCourseInfoSubjectFilter() {
    const sel = qs("#course-info-subject-filter");
    if (!sel) return;
    const cur = sel.value || courseInfoSubjectFilter;
    sel.innerHTML = '<option value="">All Subjects</option>';
    const viewSchool = getCatalogSchool();
    sortedSubjects("", viewSchool).forEach((s) => {
      const o = document.createElement("option");
      o.value = s;
      o.textContent = s;
      if (s === cur) o.selected = true;
      sel.appendChild(o);
    });
  }

  function openCourseCommentsModal(courseKey) {
    const modal = qs("#course-comments-modal");
    const body = qs("#course-comments-body");
    const t = qs("#cc-modal-title");
    const { title } = parseCourseKey(courseKey);
    if (t) t.textContent = `Comments · ${title}`;
    const rows = gatherCourseComments(courseKey);
    body.innerHTML = rows.length
      ? `<ul class="cc-list">${rows
          .map(
            (r) =>
              `<li class="cc-item"><div class="cc-meta"><strong>${escapeHtml(r.name)}</strong> · ${escapeHtml(
                r.weekday || "—"
              )} · Rating ${escapeHtml(r.rating)}</div><p class="cc-text">${escapeHtml(r.comment)}</p>${reactionHtml(`course:${courseKey}:${r.name}:${r.weekday}`)}</li>`
          )
          .join("")}</ul>`
      : '<p class="muted">No comments or ratings published for this course yet.</p>';
    wireReactions(body, () => openCourseCommentsModal(courseKey));
    if (modal) modal.hidden = false;
  }

  qs("#course-comments-close")?.addEventListener("click", () => {
    if (qs("#course-comments-modal")) qs("#course-comments-modal").hidden = true;
  });
  qs("#course-comments-modal")?.addEventListener("click", (e) => {
    if (e.target === qs("#course-comments-modal")) qs("#course-comments-modal").hidden = true;
  });
  qs("#course-info-search")?.addEventListener("input", () => {
    courseInfoPage = 1;
    renderCourseInfo();
  });
  qs("#course-info-sort")?.addEventListener("change", (e) => {
    courseInfoSort = e.target.value;
    courseInfoPage = 1;
    renderCourseInfo();
  });
  qs("#course-info-level-filter")?.addEventListener("change", (e) => {
    courseInfoLevelFilter = e.target.value;
    courseInfoPage = 1;
    renderCourseInfo();
  });
  qs("#course-info-subject-filter")?.addEventListener("change", (e) => {
    courseInfoSubjectFilter = e.target.value;
    courseInfoPage = 1;
    renderCourseInfo();
  });
  qs("#course-info-grad-filter")?.addEventListener("change", (e) => {
    courseInfoGradFilter = e.target.value;
    courseInfoPage = 1;
    renderCourseInfo();
  });
  qs("#btn-sort-starred")?.addEventListener("click", () => {
    courseInfoSort = "starred";
    renderCourseInfo();
  });

  qs("#btn-sort-popular")?.addEventListener("click", () => {
    courseInfoSort = "popular";
    renderCourseInfo();
  });
  qs("#btn-sort-alpha")?.addEventListener("click", () => {
    courseInfoSort = "alpha";
    renderCourseInfo();
  });

  /* ---------- Community & directory ---------- */
  function resetUserProgress(opts = {}) {
    const id = userId();
    const phone = (state.profile.phone || session?.phone || "").trim();
    const school = opts.newSchool || state.profile.school || "Emerald High School";
    const keepSettings = { ...state.settings };
    const fresh = defaultState();

    state.profile = {
      ...fresh.profile,
      phone,
      school,
      displayName: session?.name || id.split("@")[0] || "Student",
    };
    state.settings = keepSettings;
    state.scheduleSchool = school;
    state.scheduleBellDay = "Monday";
    state.myClassesDayTab = "Monday";
    state.myClassesViewTab = "Main";
    state.myClassesSemester = "s1";
    state.scheduleByWeekday = emptyWeek();
    state.scheduleByCommunity = { [school]: emptySemesterSchedule() };
    state.activities = [];
    state.summerCourses = [];
    state.pastSchedules = [];
    state.futureByGrade = defaultFutureByGrade();
    state.activeCommunitySchool = school;
    state.followedCommunities = [school];
    state.emeraldBackup = null;
    state.classNews = {};
    state.accessSessions = [];
    undoStack.length = 0;
    saveState(state);

    localStorage.removeItem(NOTES_KEY);
    localStorage.removeItem(STARRED_COURSES_KEY);
    const key = id;
    setJson(
      DISCUSSION_KEY,
      getJson(DISCUSSION_KEY, []).filter((p) => String(p.authorId || "").trim().toLowerCase() !== key)
    );
    setJson(FEED_KEY, getJson(FEED_KEY, []).filter((e) => String(e.actorId || "").trim().toLowerCase() !== key));

    if (opts.newSchool && session) {
      session.school = school;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    const accounts = getJson(ACCOUNTS_KEY, {});
    if (accounts[id]) {
      accounts[id].phone = phone;
      if (opts.newSchool) accounts[id].school = school;
      setJson(ACCOUNTS_KEY, accounts);
    }

    publishToRegistry(
      opts.newSchool
        ? "School switched. Your email and phone were kept; previous-school progress was cleared."
        : "Progress reset. Your email, phone, and login were kept."
    );
    rebuildEnrollmentAndRatings();
  }

  function refreshDashboardAfterProgressReset() {
    renderTopbarUser();
    renderHomePanel();
    renderProfilePanel();
    renderUpdateLogPreview();
  renderSettingsPanel();
    renderSchedulePanel();
    renderClassesPanel();
    renderCommunityPanel();
    renderSnapshotPanel();
    renderFuturePanel();
    renderDiscussionPanel();
    if (qs("#grad-requirements-content")) renderGradRequirementsPanel();
    if (qs("#course-info-grid")) renderCourseInfo();
    renderFriendsPanel();
    renderNotifications();
    applyFeatureVisibility();
  }

  function renderCommunityHeader() {
    const school = getActiveCommunitySchool();
    const meta = window.COMMUNITY_SCHOOLS?.[school];
    const logo = qs("#community-logo");
    const title = qs("#community-school-title");
    const sm = qs("#community-school-meta");
    const premise = qs("#community-premise");
    const countEl = qs("#community-member-count");
    const reg = getRegistry();
    const n = Object.values(reg).filter((u) => u.verified && u.school === school).length;
    if (title) title.textContent = school;
    if (logo && meta) {
      logo.src = meta.logo || "";
      logo.alt = school;
    } else if (logo) {
      logo.src = "";
      logo.alt = "";
    }
    if (sm && meta) sm.textContent = `${meta.type} · Grades ${meta.grades} · ${meta.location}`;
    else if (sm) sm.textContent = "";
    if (premise && meta) {
      premise.textContent = `${meta.premise} Your school community controls which directory members, course options, posts, and schedule choices appear across CourseSync.`;
    } else if (premise) {
      premise.textContent = "Connect with verified students in the directory below. Switch schools from Settings if your school changes.";
    }
    if (countEl) countEl.textContent = String(n);
  }

  function renderCommunityPanel() {
    renderCommunityHeader();
    renderCommunityLinks();
    renderDirectory();
    renderAdminTools();
  }

  function renderCommunityLinks() {
    const card = qs(".community-links-card");
    if (card) card.hidden = !featureEnabled("resourceLinks");
    const box = qs("#community-links");
    if (!box) return;
    const school = getActiveCommunitySchool();
    const hs = schoolTypeFor(school) === "high";
    const links = hs
      ? [
          ["Registration Resources", "#"],
          ["School Calendar", "#"],
          ["Athletics", "#"],
          ["Counseling", "#"],
        ]
      : [
          ["Bell Schedule", "#"],
          ["Student Handbook", "#"],
          ["Activities", "#"],
          ["Counseling", "#"],
        ];
    box.innerHTML = links.map(([label, href]) => `<a class="resource-link" href="${href}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`).join("");
  }

  function listVerifiedPeers(opts = {}) {
    const me = userId();
    const reg = getRegistry();
    let entries = Object.entries(reg).filter(([, u]) => u && u.verified);
    if (!opts.includeSelf) entries = entries.filter(([id]) => id !== me);
    return entries.map(([id, u]) => ({ id, ...u }));
  }

  function directoryCircleRank(peerId) {
    if (isCloseFriend(peerId)) return 0;
    if (isFriend(peerId)) return 1;
    const u = getRegistryUser(peerId);
    if (u && u.school === state.profile.school) return 2;
    return 3;
  }

  function peerStarredCourseCount(peer) {
    const stars = new Set(getStarredCourses());
    if (!stars.size || !peer) return 0;
    const keys = new Set([
      ...(peer.scheduleSnapshot || []).map((r) => r.courseKey).filter(Boolean),
      ...(peer.futurePrimary || []),
      ...(peer.futureAlt || []),
    ]);
    return [...keys].filter((k) => stars.has(k)).length;
  }

  function renderDirectory() {
    const grid = qs("#directory-grid");
    const empty = qs("#directory-empty");
    if (!grid) return;
    const q = (qs("#directory-search")?.value || "").toLowerCase();
    const fg = qs("#filter-grade")?.value || "";
    const fgen = qs("#filter-gender")?.value || "";
    const fa = qs("#filter-academic")?.value || "";
    const sortMode = qs("#directory-sort")?.value || "circle";
    const commSchool = getActiveCommunitySchool();
    let peers = listVerifiedPeers({ includeSelf: true }).filter((p) => {
      if (p.school !== commSchool) return false;
      if (q && !p.displayName?.toLowerCase().includes(q) && !p.email?.toLowerCase().includes(q)) return false;
      if (fg && String(p.grade) !== fg) return false;
      if (fgen && p.gender !== fgen) return false;
      if (fa && (p.academicLevel || "") !== fa) return false;
      return true;
    });
    if (sortMode === "name") peers.sort((a, b) => (a.displayName || a.email || "").localeCompare(b.displayName || b.email || ""));
    else if (sortMode === "starred")
      peers.sort((a, b) => peerStarredCourseCount(b) - peerStarredCourseCount(a) || (a.displayName || a.email || "").localeCompare(b.displayName || b.email || ""));
    else
      peers.sort((a, b) => {
        const ra = directoryCircleRank(a.id);
        const rb = directoryCircleRank(b.id);
        if (ra !== rb) return ra - rb;
        return (a.displayName || a.email || "").localeCompare(b.displayName || b.email || "");
      });
    grid.innerHTML = "";
    if (!peers.length) {
      empty?.classList.remove("hidden");
      if (empty) {
        const hasAny = listVerifiedPeers({ includeSelf: true }).some((p) => p.school === getActiveCommunitySchool());
        empty.innerHTML = `<p>${hasAny ? "No verified students match these filters right now. Try clearing search or changing grade, gender, or academic filters." : "No verified students are visible in this community yet. Save your profile to publish yourself, or add classmates through Friends."}</p>
          <button type="button" class="btn btn-outline" id="directory-open-profile">Open Profile</button>`;
        qs("#directory-open-profile")?.addEventListener("click", () => showPanel("profile"));
      }
      return;
    }
    empty?.classList.add("hidden");
    peers.forEach((p) => {
      const isSelf = p.id === userId();
      const card = document.createElement("article");
      card.className = "directory-card" + (isCloseFriend(p.id) ? " directory-card-close" : "");
      const fr = isFriend(p.id);
      const pend = hasPendingTo(p.id);
      const inc = hasPendingFrom(p.id);
      let btn = "";
      if (isSelf) btn = `<span class="badge-ok">You</span>`;
      else if (fr) btn = `<span class="badge-ok">Friends</span>`;
      else if (pend) btn = `<span class="badge-wait">Requested</span>`;
      else if (inc) btn = `<button type="button" class="btn btn-sm btn-primary" data-acc="${escapeHtml(p.id)}">Accept</button>`;
      else btn = `<button type="button" class="btn btn-sm btn-outline" data-req="${escapeHtml(p.id)}">Add Friend</button>`;
      const mut = isSelf ? 0 : mutualCount(userId(), p.id);
      const starCourseCount = peerStarredCourseCount(p);
      const star = isCloseFriend(p.id) ? `<span class="close-star" title="Close friend">★</span>` : "";
      const cardCustomization = state.settings?.cardCustomization || {};
      const showGrade = cardCustomization.showGrade !== false;
      const showGender = cardCustomization.showGender !== false;
      const showAcademicLevel = cardCustomization.showAcademicLevel !== false;
      const showStarredMatches = cardCustomization.showStarredMatches !== false;
      const showMutualFriends = cardCustomization.showMutualFriends !== false;
      const showDirectoryLabel = cardCustomization.showDirectoryLabel !== false;
      const showVisibilityNote = cardCustomization.showVisibilityNote !== false;
      const tier = isSelf
        ? (isSelf && showDirectoryLabel && p.directoryLabel ? p.directoryLabel : "Your directory entry")
        : isCloseFriend(p.id)
        ? "Close friend"
        : fr
        ? "Friend"
        : p.school === state.profile.school
        ? "Classmate"
        : "Member";
      const detailParts = [];
      if (showGrade) detailParts.push(`Grade ${String(p.grade || "—")}`);
      if (showGender && p.gender) detailParts.push(p.gender);
      if (showAcademicLevel) detailParts.push(p.academicLevel || "—");
      const detailLine = detailParts.length ? `<p class="muted small">${escapeHtml(detailParts.join(" · "))}</p>` : "";
      const mutualLine = !isSelf && showMutualFriends ? `<p class="muted small">${mut} mutual friend${mut === 1 ? "" : "s"}</p>` : "";
      const visibilityLine = isSelf && showVisibilityNote ? `<p class="muted small">Visible to classmates in this community</p>` : "";
      const starredLine = showStarredMatches ? `<p class="muted small">${starCourseCount} starred course match${starCourseCount === 1 ? "" : "es"}</p>` : "";
      card.innerHTML = `
        ${star}
        <div class="directory-avatar">${escapeHtml((p.displayName || "?").charAt(0).toUpperCase())}</div>
        <h3>${escapeHtml(p.displayName || p.email)}</h3>
        <p class="muted small tier-pill">${escapeHtml(tier)}</p>
        ${detailLine}
        ${mutualLine}
        ${visibilityLine}
        ${starredLine}
        <div class="directory-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-view="${escapeHtml(p.id)}">Full Profile</button>
          ${btn}
        </div>`;
      grid.appendChild(card);
    });
    qsa("[data-req]", grid).forEach((b) => {
      b.addEventListener("click", () => {
        requestFriend(b.getAttribute("data-req"));
        renderDirectory();
        renderFriendsPanel();
      });
    });
    qsa("[data-acc]", grid).forEach((b) => {
      b.addEventListener("click", () => {
        acceptFriend(b.getAttribute("data-acc"));
        renderDirectory();
        renderFriendsPanel();
      });
    });
    qsa("[data-view]", grid).forEach((b) => {
      b.addEventListener("click", () => openPeerModal(b.getAttribute("data-view")));
    });
  }

  function hasPendingTo(peerId) {
    const me = userId();
    return getNetwork().requests.some((r) => r.from === me && r.to === peerId);
  }

  function hasPendingFrom(peerId) {
    const me = userId();
    return getNetwork().requests.some((r) => r.from === peerId && r.to === me);
  }

  qsa("#directory-search, #filter-grade, #filter-gender, #filter-academic, #directory-sort").forEach((el) => {
    el?.addEventListener("input", () => renderDirectory());
    el?.addEventListener("change", () => renderDirectory());
  });

  function isAdmin() {
    return userId() === ADMIN_EMAIL;
  }

  function purgeAccountFromCommunity(accountId) {
    const key = String(accountId || "").trim().toLowerCase();
    if (!key) return;
    setJson(DELETED_ACCOUNTS_KEY, [...deletedAccountSet(), key]);

    const reg = JSON.parse(localStorage.getItem(REGISTRY_KEY) || "{}");
    reg.__deletedAccounts = { ...(reg.__deletedAccounts || {}), [key]: Date.now() };
    delete reg[key];
    setRegistry(reg);

    const accounts = getJson(ACCOUNTS_KEY, {});
    accounts.__deletedAccounts = { ...(accounts.__deletedAccounts || {}), [key]: Date.now() };
    delete accounts[key];
    setJson(ACCOUNTS_KEY, accounts);

    const n = getNetwork();
    n.requests = (n.requests || []).filter((r) => r.from !== key && r.to !== key);
    n.friends = (n.friends || []).filter((f) => f.a !== key && f.b !== key);
    n.closeRequests = (n.closeRequests || []).filter((r) => r.from !== key && r.to !== key);
    n.closeFriends = (n.closeFriends || []).filter((f) => f.a !== key && f.b !== key);
    n.declined = (n.declined || []).filter((r) => r.from !== key && r.to !== key);
    n.declinedClose = (n.declinedClose || []).filter((r) => r.from !== key && r.to !== key);
    saveNetwork(n);

    setJson(
      DISCUSSION_KEY,
      getJson(DISCUSSION_KEY, []).filter((p) => String(p.authorId || "").trim().toLowerCase() !== key)
    );
    const dm = getJson(DM_KEY, {});
    Object.keys(dm).forEach((threadKey) => {
      if (threadKey.includes(key)) delete dm[threadKey];
    });
    setJson(DM_KEY, dm);
    setJson(FEED_KEY, getJson(FEED_KEY, []).filter((e) => String(e.actorId || "").trim().toLowerCase() !== key));
    setJson(
      RECOMMENDATIONS_KEY,
      getJson(RECOMMENDATIONS_KEY, []).filter(
        (r) => String(r.from || "").trim().toLowerCase() !== key && String(r.to || "").trim().toLowerCase() !== key
      )
    );
    setJson(
      INVITES_KEY,
      getJson(INVITES_KEY, []).filter(
        (i) => String(i.from || "").trim().toLowerCase() !== key && String(i.to || "").trim().toLowerCase() !== key
      )
    );
    const reactions = getJson(REACTIONS_KEY, {});
    Object.keys(reactions).forEach((targetId) => {
      if (reactions[targetId]?.byUser?.[key]) {
        delete reactions[targetId].byUser[key];
        if (!Object.keys(reactions[targetId].byUser || {}).length) delete reactions[targetId];
      }
    });
    setJson(REACTIONS_KEY, reactions);
    setJson(NOTIFICATIONS_KEY, getJson(NOTIFICATIONS_KEY, []).filter((n) => !String(n.text || "").toLowerCase().includes(key)));

    if (key === userId()) {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    }

    void window.CourseSyncSharedStore?.flush?.();
  }

  function deleteAccount(accountId) {
    if (!isAdmin() || !accountId) return;
    const key = String(accountId).trim().toLowerCase();
    if (!key || key === userId()) return;
    purgeAccountFromCommunity(key);
  }

  function renderAdminTools() {
    const wrap = qs("#admin-account-tools");
    const list = qs("#admin-account-list");
    if (!wrap || !list) return;
    wrap.hidden = !isAdmin();
    if (!isAdmin()) return;
    const reg = getRegistry();
    const entries = Object.entries(reg).filter(([id]) => id !== userId());
    list.innerHTML = entries.length
      ? entries
          .map(
            ([id, u]) =>
              `<div class="admin-account-row"><span><strong>${escapeHtml(u.displayName || id)}</strong><small>${escapeHtml(id)}</small></span><button type="button" class="btn btn-sm btn-ghost user-menu-danger" data-admin-delete="${escapeHtml(id)}">Delete Account</button></div>`
          )
          .join("")
      : '<p class="muted">No other published accounts are present.</p>';
    qsa("[data-admin-delete]", list).forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-admin-delete");
        if (confirm(`Delete ${id} from the community? This removes their profile, login, messages, and posts.`)) {
          deleteAccount(id);
          rebuildEnrollmentAndRatings();
          renderCommunityPanel();
          renderHomePanel();
          renderFriendsPanel();
          pushNotification(`${id} was removed from the community.`, "community");
        }
      });
    });
  }

  function getDiscussionsRaw() {
    try {
      return JSON.parse(localStorage.getItem(DISCUSSION_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function getDiscussions() {
    pruneExpiredDiscussions();
    return getDiscussionsRaw();
  }

  function saveDiscussions(posts) {
    localStorage.setItem(DISCUSSION_KEY, JSON.stringify(posts));
    void window.CourseSyncSharedStore?.pushNow?.(DISCUSSION_KEY);
  }

  function renderDiscussionBoard(prefix = "discussion") {
    const root = prefix === "home" ? "home-discussion" : "discussion";
    const feed = qs(`#${root}-feed`);
    if (!feed) return;
    const school = getActiveCommunitySchool();
    const title = qs(`#${root}-feed-title`);
    const me = userId();
    const net = getNetworkingFilters();
    const posts = getDiscussions()
      .filter((p) => {
        if (discussionPostSchool(p) !== school) return false;
        const author = String(p.authorId || "").trim().toLowerCase();
        const postMode = String(p.boardMode || "").trim().toLowerCase();
        const isClassThread = postMode === "classes" || String(p.category || "").toLowerCase() === "coursework" || String(p.subject || "").trim().toLowerCase() !== "general";
        const modeMatches = net.boardMode === "classes" ? isClassThread : postMode !== "classes";
        if (!modeMatches) return false;
        if (author !== me) {
          if (p.hiddenFromBoard && (p.visibility || "public") === "public") return false;
          const subject = p.subject || "General";
          if (net.boardSubject && subject !== net.boardSubject) return false;
          if (!discussionPostMatchesAge(p, net.boardAge)) return false;
        }
        if (author === me) return true;
        const vis = p.visibility || "public";
        if (vis === "public") return true;
        if (vis === "private") return false;
        if (vis === "friends") return isFriend(author);
        if (vis === "close") return isCloseFriend(author);
        if (vis === "specific")
          return (p.specificPeople || []).some((x) => String(x).trim().toLowerCase() === me);
        return false;
      })
      .sort((a, b) => b.at - a.at);
    if (prefix === "home") posts.splice(2);
    if (!posts.length && prefix === "discussion") {
      posts.push({
        id: "sample-post",
        title: "Sample board post",
        author: "Maya",
        subject: "Study Group",
        category: "Study Group",
        responseWindow: "This Week",
        visibility: "public",
        at: Date.now(),
        text: "Looking for a calm study spot before finals? I’m sharing a quick checklist and a few reminders for staying organized this week.",
      });
    }
    if (title) title.textContent = posts[0]?.title ? `Board · ${posts[0].title}` : "Board";
    if (prefix === "home") {
      const slots = [posts[0] || null, posts[1] || null];
      feed.innerHTML = slots
        .map((p) =>
          p
            ? `<article class="discussion-post home-post-slot"><div class="discussion-post-head"><strong>${escapeHtml(p.title || p.category || "Post")}</strong><span>${escapeHtml(p.subject || "General")} · ${escapeHtml(p.category)} · ${escapeHtml(p.responseWindow || "Anytime")}</span></div><p class="muted small">By ${escapeHtml(p.author)}</p><p class="home-post-excerpt">${escapeHtml(discussionPlainText(p.text, p.textHtml))}</p></article>`
            : `<article class="discussion-post home-post-slot home-post-slot-empty" aria-hidden="false">
                <p class="home-post-empty-title muted">Open slot</p>
                <p class="muted small">Another networking post can appear here. Open Networking to start a thread or reply.</p>
                <button type="button" class="btn btn-outline btn-sm" data-panel="discussion">Open Networking</button>
              </article>`
        )
        .join("");
      qsa("[data-panel]", feed).forEach((btn) => {
        btn.addEventListener("click", () => showPanel(btn.getAttribute("data-panel")));
      });
      return;
    }
    feed.innerHTML = posts.length
      ? posts
          .map(
            (p) =>
              `<article class="discussion-post"><div class="discussion-post-head"><strong>${escapeHtml(p.title || p.category || "Post")}</strong><span>${escapeHtml(p.subject || "General")} · ${escapeHtml(p.category)} · ${escapeHtml(p.responseWindow || "Anytime")} · ${escapeHtml(p.visibility || "public")}${p.hiddenFromBoard ? " · hidden" : ""} · ${escapeHtml(new Date(p.at).toLocaleString())}</span></div><p class="muted small">By ${escapeHtml(p.author)}${p.expiresAt ? ` · expires ${escapeHtml(new Date(p.expiresAt).toLocaleString())}` : ""}</p><div class="discussion-post-body">${renderDiscussionBody(p)}</div>${reactionHtml(`post:${p.id}`)}
              <div class="thread-comments">${(p.comments || []).map((c, i) => `<div class="thread-comment"><strong>${escapeHtml(c.author)}</strong><div class="discussion-post-body">${renderDiscussionBody(c.textHtml ? c : c.text)}</div>${reactionHtml(`post:${p.id}:comment:${i}`)}</div>`).join("")}</div>
              <div class="thread-reply"><input type="text" placeholder="Comment on this thread…" data-thread-input="${escapeHtml(p.id)}" /><button type="button" class="btn btn-sm btn-outline" data-thread-reply="${escapeHtml(p.id)}">Reply</button></div></article>`
          )
          .join("")
      : `<div class="empty-state empty-state-compact">
          <p>${prefix === "home" ? "No current networking posts are visible yet. Open Networking when you are ready to start one." : "No board posts yet. Create a public post to start the community board."}</p>
        </div>`;
    wireReactions(feed, () => renderDiscussionBoard(prefix));
    qsa("[data-thread-reply]", feed).forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-thread-reply");
        const input = qs(`[data-thread-input="${CSS.escape(id)}"]`, feed);
        const text = input?.value.trim();
        if (!text) return;
        const all = getDiscussions();
        const post = all.find((p) => p.id === id);
        if (!post) return;
        if (!Array.isArray(post.comments)) post.comments = [];
        post.comments.push({ author: state.profile.displayName || userId(), authorId: userId(), text, at: Date.now() });
        saveDiscussions(all);
        renderDiscussionBoard(prefix);
        renderDiscussionBoard(prefix === "home" ? "discussion" : "home");
        renderTrending("home");
        renderNotifications();
      });
    });
  }

  function renderDiscussionPanel() {
    populateDiscussionSubjectSelects();
    fillDiscussionFriendRecipientsSelect();
    syncDiscussionComposeVisibility();
    renderNetworkingFilters();
    renderDiscussionBoard("discussion");
  }

  function renderAccessSessions() {
    const box = qs("#access-session-list");
    if (!box) return;
    const sessions = state.accessSessions || [];
    box.innerHTML = sessions.length
      ? sessions
          .map(
            (s, idx) => `<article class="access-session-card">
              <div><strong>${escapeHtml(s.day)}</strong><p>${escapeHtml(s.topic)}</p><span class="muted small">${escapeHtml(s.location || "Location TBD")}</span></div>
              <button type="button" class="btn btn-ghost btn-sm" data-remove-access="${idx}">Remove</button>
            </article>`
          )
          .join("")
      : `<div class="empty-state empty-state-compact">
          <p>No access sessions saved yet. Add tutoring, retakes, lab help, or counselor meetings here.</p>
        </div>`;
    qsa("[data-remove-access]", box).forEach((btn) => {
      btn.addEventListener("click", () => {
        state.accessSessions.splice(Number(btn.getAttribute("data-remove-access")), 1);
        saveState(state);
        renderAccessSessions();
      });
    });
  }

  qs("#access-add-btn")?.addEventListener("click", () => {
    const day = qs("#access-day")?.value || "Monday";
    const topic = qs("#access-topic")?.value.trim();
    const location = qs("#access-location")?.value.trim();
    if (!topic) {
      alert("Add a topic for this access session.");
      return;
    }
    state.accessSessions = [{ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, day, topic, location, at: Date.now() }, ...(state.accessSessions || [])];
    saveState(state);
    qs("#access-topic").value = "";
    qs("#access-location").value = "";
    renderAccessSessions();
  });

  function submitDiscussionPost() {
    const editor = qs("#discussion-text");
    const { plain, html } = getDiscussionEditorContent(editor);
    if (!plain) {
      alert("Write a discussion message first.");
      return;
    }
    const visibility = qs("#discussion-visibility")?.value || "public";
    const friendRecipients = visibility === "specific"
      ? [...(qs("#discussion-friend-recipients")?.selectedOptions || [])].map((o) => o.value).filter(Boolean)
      : [];
    if (visibility === "specific" && !friendRecipients.length) {
      alert("Select at least one friend for this post.");
      return;
    }
    const responseWindow = qs("#discussion-response-window")?.value || "This Week";
    const at = Date.now();
    const posts = getDiscussions();
    posts.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: qs("#discussion-title")?.value.trim() || qs("#discussion-category")?.value || "Board post",
      author: state.profile.displayName || userId(),
      authorId: userId(),
      school: getActiveCommunitySchool(),
      subject: qs("#discussion-subject")?.value || "General",
      category: qs("#discussion-category")?.value || "Coursework",
      responseWindow,
      expiresAt: responseWindowExpiresAt(responseWindow, at),
      visibility,
      specificPeople: friendRecipients,
      hiddenFromBoard: visibility === "public" && !!qs("#discussion-hide-board")?.checked,
      boardMode: getNetworkingFilters().boardMode || "general",
      text: plain,
      textHtml: html,
      at,
    });
    saveDiscussions(posts);
    pushNotification("Your Networking post was added to the board.", "networking");
    qs("#discussion-title").value = "";
    clearDiscussionEditor(editor);
    if (qs("#discussion-hide-board")) qs("#discussion-hide-board").checked = false;
    renderDiscussionBoard("discussion");
    renderDiscussionBoard("home");
    renderTrending("home");
    renderNotifications();
  }

  initDiscussionEditor();
  if (typeof window.Quill !== "function") {
    qs("#discussion-text")?.addEventListener("focus", () => {
      qs("#discussion-text")?.classList.add("is-focused");
    });
    qs("#discussion-text")?.addEventListener("blur", () => {
      qs("#discussion-text")?.classList.remove("is-focused");
    });
  }

  qsa("[data-board-mode-option]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setNetworkingBoardMode(btn.getAttribute("data-board-mode-option") || "general");
    });
  });
  qs("#discussion-post-btn")?.addEventListener("click", () => submitDiscussionPost());
  qs("#discussion-visibility")?.addEventListener("change", () => syncDiscussionComposeVisibility());
  qs("#discussion-settings-btn")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const btn = qs("#discussion-settings-btn");
    const panel = qs("#discussion-settings-panel");
    if (!btn || !panel) return;
    const expanded = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!expanded));
    panel.hidden = expanded;
    if (!panel.hidden) {
      const rect = btn.getBoundingClientRect();
      const panelWidth = Math.min(360, window.innerWidth - 24);
      panel.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - 220)}px`;
      panel.style.left = `${Math.max(12, Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - 12))}px`;
    }
  });
  document.addEventListener("click", (event) => {
    const btn = qs("#discussion-settings-btn");
    const panel = qs("#discussion-settings-panel");
    if (!btn || !panel || panel.hidden) return;
    if (event.target === btn || btn.contains(event.target)) return;
    if (event.target === panel || panel.contains(event.target)) return;
    btn.setAttribute("aria-expanded", "false");
    panel.hidden = true;
  });
  qs("#directory-filter-toggle")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const btn = qs("#directory-filter-toggle");
    const panel = qs("#directory-filter-panel");
    if (!btn || !panel) return;
    const expanded = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!expanded));
    panel.hidden = expanded;
    if (!panel.hidden) {
      const rect = btn.getBoundingClientRect();
      const panelWidth = Math.min(360, window.innerWidth - 24);
      panel.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - 220)}px`;
      panel.style.left = `${Math.max(12, Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - 12))}px`;
    }
  });
  document.addEventListener("click", (event) => {
    const btn = qs("#directory-filter-toggle");
    const panel = qs("#directory-filter-panel");
    if (!btn || !panel || panel.hidden) return;
    if (event.target === btn || btn.contains(event.target)) return;
    if (event.target === panel || panel.contains(event.target)) return;
    btn.setAttribute("aria-expanded", "false");
    panel.hidden = true;
  });

  qs("#august-save-grade-btn")?.addEventListener("click", () => {
    const next = qs("#august-grade-select")?.value;
    const status = qs("#august-welcome-status");
    if (!next) return;
    state.profile.grade = next;
    saveState(state);
    publishToRegistry("Grade updated for the new school year.");
    if (status) {
      status.dataset.pinned = "1";
      status.textContent = `Grade updated to ${next}. Your profile and planning views now use this grade.`;
    }
    renderHomePanel();
    renderProfilePanel();
    renderSnapshotPanel();
  });

  qs("#august-open-schedule-btn")?.addEventListener("click", () => {
    showPanel("schedule");
  });

  qs("#august-archive-schedule-btn")?.addEventListener("click", () => {
    const status = qs("#august-welcome-status");
    const archiveGrade = state.profile.grade || qs("#august-grade-select")?.value || "";
    const ok = confirm(
      `Save your Grade ${archiveGrade || "current"} schedule to Past Classes and clear the active schedule for a fresh start?`
    );
    if (!ok) return;
    pushUndoSnapshot();
    const saved = archiveCurrentScheduleToPast(archiveGrade);
    if (!saved) {
      if (status) status.textContent = "Nothing to archive yet—add classes to your schedule first.";
      return;
    }
    saveState(state);
    publishToRegistry("Previous grade schedule archived to Past Classes.");
    if (status) {
      status.dataset.pinned = "1";
      status.textContent = `Grade ${archiveGrade || "previous"} schedule saved to Past Classes. Your active schedule is cleared—rebuild it when new classes are posted.`;
    }
    renderSchedulePanel();
    renderClassesPanel();
    if (qs("#grad-requirements-content")) renderGradRequirementsPanel();
    renderSnapshotPanel();
  });

  /* ---------- Classes (same period / teacher) ---------- */
  function classKeyForRow(row, fallback = "") {
    return `${row.courseKey || normalizeText(row.courseLabel || fallback)}::${normalizedPeriod(row.period)}::${normalizeText(row.teacher || "")}::${normalizeText(row.room || "")}`;
  }

  function timeAgo(ts) {
    const diff = Math.max(0, Date.now() - Number(ts || Date.now()));
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  function pruneClassNews() {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    Object.keys(state.classNews || {}).forEach((key) => {
      state.classNews[key] = (state.classNews[key] || []).filter((n) => Number(n.at || 0) >= cutoff);
      if (!state.classNews[key].length) delete state.classNews[key];
    });
  }

  function renderClassesPanel() {
    const box = qs("#classes-content");
    if (!box) return;
    const me = userId();
    const reg = getRegistry();
    const mySchool = state.profile.school;
    pruneClassNews();
    const rows = uniqueScheduleRows(flattenScheduleForPublish().filter((r) => r.period && r.teacher));
    saveState(state);
    if (!rows.length) {
      box.innerHTML = `<div class="empty-state">
        <p>Add classes with a period and teacher to your schedule, then save, to find classmates here.</p>
        <button type="button" class="btn btn-outline" id="classes-open-schedule">Open Schedule</button>
      </div>`;
      qs("#classes-open-schedule")?.addEventListener("click", () => showPanel("schedule"));
    } else {
      const articles = [];
      rows.forEach((row) => {
        const matches = [];
        Object.entries(reg).forEach(([id, u]) => {
          if (!u.verified || id === me || u.school !== mySchool) return;
          if (!(u.scheduleSnapshot || []).some((r) => sameClassBlock(row, r))) return;
          matches.push(id);
        });
        const payload = encodeURIComponent(JSON.stringify(row));
        articles.push(`<article class="class-match-card class-click-card" role="button" tabindex="0" data-open-class="${payload}">
          <div class="class-match-head">
            <h4>${escapeHtml(formatCourseTitle(row.courseKey || row.courseLabel) || "Class")}</h4>
            <span class="pill pill-soft">${escapeHtml(normalizedPeriod(row.period))}</span>
          </div>
          <p class="muted small">${escapeHtml(row.start || "—")}–${escapeHtml(row.end || "—")} · ${escapeHtml(
          row.teacher || ""
        )}${row.room ? ` · Room ${escapeHtml(row.room)}` : ""}</p>
          <p class="small"><strong>${matches.length}</strong> classmate${matches.length === 1 ? "" : "s"} with this subject, room, period, and teacher:</p>
          <span class="class-card-action">Open details</span>
        </article>`);
      });
      box.innerHTML = `<div class="class-match-grid">${articles.join("")}</div>`;
      qsa("[data-open-class]", box).forEach((card) => {
        const open = () => openClassDetail(JSON.parse(decodeURIComponent(card.getAttribute("data-open-class") || "{}")), false);
        card.addEventListener("click", open);
        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        });
      });
    }
    renderPastClasses();
    syncClassesPanelView();
  }

  function renderPastClasses() {
    const box = qs("#past-classes-content");
    if (!box) return;
    const rows = state.pastSchedules || [];
    const cards = rows.flatMap((year, yearIdx) =>
      (year.rows || year.schedule || []).map((row, rowIdx) => ({ year, yearIdx, row, rowIdx }))
    );
    box.innerHTML = cards.length
      ? `<div class="class-match-grid">${cards
          .map(({ year, yearIdx, row, rowIdx }) => {
            const completionDate = row.completionDate || year.completionDate || "";
            const payload = encodeURIComponent(JSON.stringify({ ...row, completionDate, grade: row.grade || year.grade, school: year.school, savedAt: year.savedAt }));
            const sem = SEMESTERS.find((s) => s.key === row.semester)?.label || "Semester";
            return `<article class="class-match-card class-click-card past-course-card" role="button" tabindex="0" data-open-past="${yearIdx}:${rowIdx}" data-past-row="${payload}">
              <div class="class-match-head">
                <h4>${escapeHtml(formatCourseTitle(row.courseKey || row.courseLabel) || "Past Class")}</h4>
                <span class="pill pill-soft">Grade ${escapeHtml(String(row.grade || year.grade || "—"))}</span>
              </div>
              <p class="muted small">${escapeHtml(normalizedPeriod(row.period || "Period not listed"))} · ${escapeHtml(row.teacher || "Teacher not listed")} · ${escapeHtml(sem)}</p>
              <p class="small">${escapeHtml(row.requirement || "Requirement not set")} · Completed ${escapeHtml(completionDate ? new Date(`${completionDate}T00:00:00`).toLocaleDateString() : "not listed")}</p>
              <div class="past-card-actions">
                <span class="class-card-action">Open details</span>
                <button type="button" class="btn btn-ghost btn-sm user-menu-danger" data-remove-past-row-card="${yearIdx}:${rowIdx}">Remove</button>
              </div>
            </article>`;
          })
          .join("")}</div>`
      : `<div class="empty-state empty-state-compact">
          <p>No past classes saved yet. Start a new schedule from Settings when your school year or semester changes.</p>
        </div>`;
    qsa("[data-open-past]", box).forEach((card) => {
      const open = (e) => {
        if (e.target.closest("button")) return;
        openClassDetail(JSON.parse(decodeURIComponent(card.getAttribute("data-past-row") || "{}")), true);
      };
      card.addEventListener("click", open);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open(e);
        }
      });
    });
    qsa("[data-remove-past-row-card]", box).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const [yearIdx, rowIdx] = btn.getAttribute("data-remove-past-row-card").split(":").map(Number);
        if (!confirm("Remove this past class?")) return;
        const bucket = state.pastSchedules[yearIdx];
        if (!bucket) return;
        if (!bucket.rows && bucket.schedule) bucket.rows = bucket.schedule;
        bucket.rows.splice(rowIdx, 1);
        if (!bucket.rows.length) state.pastSchedules.splice(yearIdx, 1);
        saveState(state);
        rebuildEnrollmentAndRatings();
        renderPastClasses();
        if (qs("#grad-requirements-content")) renderGradRequirementsPanel();
      });
    });
  }

  function classmatesForRow(row) {
    const me = userId();
    return Object.entries(getRegistry())
      .filter(([id, u]) => u?.verified && id !== me && u.school === state.profile.school && (u.scheduleSnapshot || []).some((r) => sameClassBlock(row, r)))
      .map(([id]) => id);
  }

  function enrolledStudentsForCourse(courseKeyValue, school = getCatalogSchool()) {
    const key = String(courseKeyValue || "");
    return Object.entries(getRegistry())
      .filter(([, u]) => u?.verified && u.school === school && (u.scheduleSnapshot || []).some((r) => r.courseKey === key))
      .map(([id, u]) => ({ id, user: u }))
      .sort((a, b) => String(a.user.displayName || a.id).localeCompare(String(b.user.displayName || b.id)));
  }

  function openEnrollmentModal(courseKeyValue) {
    const modal = qs("#peer-modal");
    const title = qs("#peer-modal-title");
    const body = qs("#peer-modal-body");
    const parsed = parseCourseKey(courseKeyValue);
    const students = enrolledStudentsForCourse(courseKeyValue);
    if (title) title.textContent = `${parsed.title} Enrollment`;
    if (!body) return;
    const grades = [...new Set(students.map((s) => String(s.user.grade || "").trim()).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
    const levels = [...new Set(students.map((s) => String(s.user.academicLevel || "").trim()).filter(Boolean))].sort();
    body.innerHTML = `
      <div class="enrollment-filter-row">
        <label class="field"><span>Search Students</span><input type="search" id="enrollment-search" class="course-search" placeholder="Name, email, or pathway..." /></label>
        <label class="field"><span>Grade</span><select id="enrollment-grade"><option value="">All grades</option>${grades.map((g) => `<option value="${escapeHtml(g)}">Grade ${escapeHtml(g)}</option>`).join("")}</select></label>
        <label class="field"><span>Academic Level</span><select id="enrollment-level"><option value="">All levels</option>${levels.map((l) => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join("")}</select></label>
      </div>
      <div id="enrollment-list" class="directory-grid"></div>`;
    const render = () => {
      const search = normalizeText(qs("#enrollment-search")?.value || "");
      const grade = qs("#enrollment-grade")?.value || "";
      const level = qs("#enrollment-level")?.value || "";
      const filtered = students.filter(({ id, user }) => {
        const hay = normalizeText(`${user.displayName || ""} ${id} ${user.careerPathway || ""} ${user.academicLevel || ""}`);
        if (grade && String(user.grade || "") !== grade) return false;
        if (level && String(user.academicLevel || "") !== level) return false;
        return !search || hay.includes(search);
      });
      qs("#enrollment-list").innerHTML = filtered.length
        ? filtered
            .map(({ id, user }) => `<article class="directory-card"><div class="directory-avatar">${escapeHtml((user.displayName || id).charAt(0).toUpperCase())}</div><h3>${escapeHtml(user.displayName || id)}</h3><p class="muted small">Grade ${escapeHtml(user.grade || "—")} · ${escapeHtml(user.academicLevel || "Profile")}</p><p class="muted small">${escapeHtml(user.careerPathway || "No pathway listed")}</p><button type="button" class="btn btn-outline btn-sm" data-view-classmate="${escapeHtml(id)}">Open Profile</button></article>`)
            .join("")
        : '<div class="empty-state empty-state-compact"><p>No enrolled students match these filters.</p></div>';
      qsa("[data-view-classmate]", body).forEach((btn) => btn.addEventListener("click", () => openPeerModal(btn.getAttribute("data-view-classmate"))));
    };
    ["#enrollment-search", "#enrollment-grade", "#enrollment-level"].forEach((sel) => qs(sel)?.addEventListener("input", render));
    qs("#enrollment-grade")?.addEventListener("change", render);
    qs("#enrollment-level")?.addEventListener("change", render);
    render();
    if (modal) modal.hidden = false;
  }

  function openClassDetail(row, past = false) {
    const modal = qs("#class-detail-modal");
    const title = qs("#class-detail-title");
    const body = qs("#class-detail-body");
    if (!modal || !body) return;
    const key = classKeyForRow(row);
    const classmates = classmatesForRow(row);
    const friendSet = new Set(listFriendIds());
    const news = (state.classNews?.[key] || []).filter((n) => Date.now() - Number(n.at || 0) < 7 * 24 * 60 * 60 * 1000);
    if (title) title.textContent = formatCourseTitle(row.courseKey || row.courseLabel) || "Class Details";
    body.innerHTML = `<div class="class-detail-layout">
      <section class="class-detail-summary">
        <p><strong>Period:</strong> ${escapeHtml(normalizedPeriod(row.period))}</p>
        <p><strong>Teacher:</strong> ${escapeHtml(row.teacher || "Not listed")}</p>
        <p><strong>Room:</strong> ${escapeHtml(row.room || "Not listed")}</p>
        ${row.grade ? `<p><strong>Grade:</strong> ${escapeHtml(String(row.grade))}</p>` : ""}
        ${row.requirement ? `<p><strong>Requirement:</strong> ${escapeHtml(row.requirement)}</p>` : ""}
        ${row.semester ? `<p><strong>Semester:</strong> ${escapeHtml(SEMESTERS.find((s) => s.key === row.semester)?.label || row.semester)}</p>` : ""}
        ${past ? `<p><strong>Completion date:</strong> ${escapeHtml(row.completionDate ? new Date(`${row.completionDate}T00:00:00`).toLocaleDateString() : "Not listed")}</p>` : ""}
        <p><strong>Time:</strong> ${escapeHtml([row.start, row.end].filter(Boolean).join(" - ") || "Varies by day")}</p>
        ${row.comment ? `<p><strong>Your note:</strong> ${escapeHtml(row.comment)}</p>` : ""}
        ${row.rating ? `<p><strong>Your rating:</strong> ${escapeHtml(String(row.rating))}/5</p>` : ""}
      </section>
      ${past ? "" : `<section>
        <div class="section-row-head"><h3 class="card-title">Classmates</h3><label class="field compact-field"><span>Filter</span><select id="classmate-filter"><option value="all">All classmates</option><option value="friends">Friends only</option></select></label></div>
        <div id="classmate-detail-list" class="directory-grid"></div>
      </section>`}
      <section>
        <h3 class="card-title">Class News</h3>
        ${past ? '<div class="class-news-compose is-disabled"><input type="text" placeholder="Past class news is closed" disabled /><button type="button" class="btn btn-primary btn-sm" disabled>Post News</button></div>' : `<div class="class-news-compose class-news-compose-rich"><label class="field"><span>Header</span><input type="text" id="class-news-title" placeholder="Quiz reminder, project update..." /></label><label class="field"><span>Category</span><select id="class-news-category"><option>General</option><option>Homework</option><option>Test / Quiz</option><option>Project</option><option>Study Group</option><option>Teacher Note</option></select></label><label class="field class-news-message"><span>Message</span><textarea id="class-news-text" rows="3" placeholder="Share an update for classmates..."></textarea></label><button type="button" class="btn btn-primary btn-sm" id="class-news-add">Post News</button></div>`}
        <div id="class-news-list" class="class-news-list">${news.length ? news.map((n) => `<article class="class-news-item"><div class="class-news-item-head"><span class="class-news-category">${escapeHtml(n.category || "General")}</span><strong>${escapeHtml(n.title || "Class update")}</strong></div><p>${escapeHtml(n.text)}</p><span class="muted small">${escapeHtml(n.author || "Classmate")} · ${escapeHtml(timeAgo(n.at))}</span></article>`).join("") : '<div class="empty-state empty-state-compact"><p>No class news from the last 7 days.</p></div>'}</div>
      </section>
    </div>`;
    const renderMates = () => {
      const filtered = qs("#classmate-filter")?.value === "friends" ? classmates.filter((id) => friendSet.has(id)) : classmates;
      qs("#classmate-detail-list").innerHTML = filtered.length
        ? filtered.map((id) => {
            const u = getRegistryUser(id);
            return `<article class="directory-card"><div class="directory-avatar">${escapeHtml((u?.displayName || id).charAt(0).toUpperCase())}</div><h3>${escapeHtml(u?.displayName || id)}</h3><p class="muted small">Grade ${escapeHtml(u?.grade || "—")} · ${escapeHtml(u?.academicLevel || "Profile")}</p><button type="button" class="btn btn-outline btn-sm" data-view-classmate="${escapeHtml(id)}">Open Profile</button></article>`;
          }).join("")
        : '<div class="empty-state empty-state-compact"><p>No classmates match this filter yet.</p></div>';
      qsa("[data-view-classmate]", body).forEach((btn) => btn.addEventListener("click", () => openPeerModal(btn.getAttribute("data-view-classmate"))));
    };
    qs("#classmate-filter")?.addEventListener("change", renderMates);
    if (!past) renderMates();
    qs("#class-news-add")?.addEventListener("click", () => {
      const input = qs("#class-news-text");
      const titleInput = qs("#class-news-title");
      const category = qs("#class-news-category")?.value || "General";
      const text = input?.value.trim();
      if (!text) return;
      if (!state.classNews[key]) state.classNews[key] = [];
      state.classNews[key].unshift({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, title: titleInput?.value.trim() || category, category, text, author: state.profile.displayName || userId(), authorId: userId(), at: Date.now() });
      state.classNews[key] = state.classNews[key].slice(0, 20);
      saveState(state);
      openClassDetail(row, false);
    });
    modal.hidden = false;
  }

  function openClassmatesModal(ids) {
    const modal = qs("#peer-modal");
    const title = qs("#peer-modal-title");
    const body = qs("#peer-modal-body");
    if (title) title.textContent = "All Classmates";
    if (body) {
      body.innerHTML = ids.length
        ? `<div class="directory-grid">${ids.map((id) => {
            const u = getRegistryUser(id);
            return `<article class="directory-card"><div class="directory-avatar">${escapeHtml((u?.displayName || id).charAt(0).toUpperCase())}</div><h3>${escapeHtml(u?.displayName || id)}</h3><p class="muted small">Grade ${escapeHtml(u?.grade || "—")} · ${escapeHtml(u?.academicLevel || "Profile")}</p><button type="button" class="btn btn-outline btn-sm" data-view-classmate="${escapeHtml(id)}">Open Profile</button></article>`;
          }).join("")}</div>`
        : '<p class="muted">No classmates to show yet.</p>';
      qsa("[data-view-classmate]", body).forEach((btn) => btn.addEventListener("click", () => openPeerModal(btn.getAttribute("data-view-classmate"))));
    }
    if (modal) modal.hidden = false;
  }

  /* ---------- Explore ---------- */
  function buildExplorerCourseFilterOptions() {
    const gradOpts = GRAD_REQUIREMENTS.map(
      (req) => `<option value="grad:${escapeHtml(req.key)}">${escapeHtml(EXPLORER_GRAD_LABELS[req.key] || req.key)}</option>`
    ).join("");
    const levelOpts = EXPLORER_LEVEL_FILTERS.map((opt) => `<option value="${escapeHtml(opt.value)}">${escapeHtml(opt.label)}</option>`).join("");
    return `<option value="all">All Courses</option>
      <optgroup label="Graduation Requirement">${gradOpts}</optgroup>
      <optgroup label="Course Level">${levelOpts}</optgroup>`;
  }

  function populateExplorerCourseFilterSelects() {
    const html = buildExplorerCourseFilterOptions();
    [
      ["#home-explorer-course-filter", "home"],
      ["#explorer-course-filter", "explore"],
    ].forEach(([selId, scope]) => {
      const sel = qs(selId);
      if (!sel) return;
      const keep = explorerFilters[scope]?.course || sel.value || "all";
      sel.innerHTML = html;
      sel.value = [...sel.options].some((o) => o.value === keep) ? keep : "all";
      if (explorerFilters[scope]) explorerFilters[scope].course = sel.value;
    });
  }

  function courseLevelTag(c, sub = "") {
    const level = c?.level || "";
    const title = c?.title || "";
    if (level === "AP" || /\bAP\b/i.test(title)) return "AP";
    if (level === "Honors" || /Honors/i.test(title)) return "Honors";
    if (sub === "ROP") return "ROP";
    if (level === "SAI" || sub === "SAI" || /\bSAI\b|Specialized Academic/i.test(title)) return "SAI";
    if (level === "CP" || level === "College Prep") return "CP";
    return level || "Elective";
  }

  function courseMatchesExplorerCourseFilter(c, sub, filter = "all") {
    if (!filter || filter === "all") return true;
    if (filter.startsWith("grad:")) {
      return gradRequirementFor(sub, c.title) === filter.slice(5);
    }
    if (filter.startsWith("level:")) {
      const level = filter.slice(6);
      const title = c.title || "";
      if (level === "AP") return c.level === "AP" || /\bAP\b/i.test(title);
      if (level === "Honors") return c.level === "Honors" || /Honors/i.test(title);
      if (level === "ROP") return sub === "ROP";
      if (level === "SAI") return c.level === "SAI" || sub === "SAI" || /\bSAI\b|Specialized Academic/i.test(title);
      if (level === "CP") return c.level === "CP" || c.level === "College Prep";
      return true;
    }
    return true;
  }

  function explorerSubjectsForFilter(filter, viewGrade, viewSchool) {
    const all = sortedSubjects(viewGrade, viewSchool);
    if (filter === "level:ROP") return all.includes("ROP") ? ["ROP"] : all;
    if (filter.startsWith("grad:")) {
      const reqKey = filter.slice(5);
      const matched = all.filter((sub) =>
        (catalog[sub] || []).some(
          (c) => courseAllowed(c, viewGrade, viewSchool) && gradRequirementFor(sub, c.title) === reqKey
        )
      );
      return matched.length ? matched : all;
    }
    return all;
  }

  function explorerFilterLabel(filter = "all") {
    if (!filter || filter === "all") return "All Courses";
    if (filter.startsWith("grad:")) return EXPLORER_GRAD_LABELS[filter.slice(5)] || filter.slice(5);
    const level = EXPLORER_LEVEL_FILTERS.find((opt) => opt.value === filter);
    return level ? level.label : filter;
  }

  function pickExploreCourse(scope = "explore") {
    const viewSchool = getCatalogSchool();
    const viewGrade = getCatalogGradeForSchool(viewSchool);
    const filter = explorerFilters[scope]?.course || "all";
    const subs = explorerSubjectsForFilter(filter, viewGrade, viewSchool);
    for (let tries = 0; tries < 80; tries++) {
      const sub = subs[Math.floor(Math.random() * subs.length)];
      const courses = (catalog[sub] || [])
        .filter((c) => courseAllowed(c, viewGrade, viewSchool))
        .filter((c) => courseMatchesExplorerCourseFilter(c, sub, filter));
      if (!courses.length) continue;
      const c = courses[Math.floor(Math.random() * courses.length)];
      return { key: courseKey(sub, c), sub, c, filterLabel: explorerFilterLabel(filter) };
    }
    return {
      key: "Planning::Elective::Study Skills Workshop",
      sub: viewSchool,
      c: {
        title: schoolTypeFor(viewSchool) === "middle" ? "Study Skills Workshop" : "College & Career Planning",
        level: "Elective",
      },
    };
  }

  function truncateTrendText(str, max = 118) {
    const t = String(str || "").trim().replace(/\s+/g, " ");
    if (!t) return "";
    if (t.length <= max) return t;
    return `${t.slice(0, max - 1)}…`;
  }

  function titleForTrend(title) {
    return title || "This course";
  }

  function trendRangeWindow(range) {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    if (range === "yesterday") {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    } else if (range === "week") {
      start.setDate(start.getDate() - 7);
    }
    return { start: start.getTime(), end: end.getTime() };
  }

  function inTrendRange(ts, range) {
    const { start, end } = trendRangeWindow(range);
    const value = Number(ts || 0);
    return value >= start && value < end;
  }

  function trendingItems(mode = "course", range = "today") {
    const school = getActiveCommunitySchool();
    const grade = getCatalogGradeForSchool(school);
    const reg = getRegistry();
    const me = userId();

    if (mode === "discussion") {
      return getDiscussions()
        .filter((p) => discussionPostSchool(p) === school && (p.visibility || "public") === "public" && inTrendRange(p.at || p.updatedAt || Date.now(), range))
        .map((p) => {
          const replies = (p.comments || []).filter((c) => String(c.text || "").trim());
          const last = replies[replies.length - 1];
          const rx = getReactionCountsForTarget(`post:${p.id}`);
          const rxSum = Object.values(rx).reduce((a, b) => a + b, 0);
          const score = replies.length * 3 + rxSum + (String(p.text || "").trim() ? 1 : 0);
          let why = "";
          if (replies.length >= 2)
            why = `Active thread — ${replies.length} replies from classmates, so this topic has momentum right now.`;
          else if (replies.length === 1)
            why = `Someone responded — one reply is in; more context may be building on this post.`;
          else if (rxSum)
            why = `Reactions are landing on this post (${rxSum} total from classmates), even before many written replies.`;
          else why = `New public post in ${school} — open Networking to join the conversation.`;
          let example = "";
          if (last?.text)
            example = `Latest reply (${last.author || "Classmate"}): “${truncateTrendText(last.text, 100)}”`;
          else if (String(p.text || "").trim())
            example = `Original post: “${truncateTrendText(p.text, 100)}”`;
          return {
            type: "discussion",
            title: p.title || p.category || "Board post",
            sub: p.category || "Networking",
            level: p.responseWindow || "Anytime",
            score,
            why,
            example,
            stats: [`${replies.length} repl${replies.length === 1 ? "y" : "ies"}`, `${rxSum} reaction${rxSum === 1 ? "" : "s"}`, p.visibility || "public"],
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);
    }

    if (mode === "person") {
      return listVerifiedPeers()
        .filter((p) => p.school === school && inTrendRange(p.updatedAt || Date.now(), range))
        .map((p) => {
          const snapN = (p.scheduleSnapshot || []).length;
          const futN = (p.futurePrimary || []).length + (p.futureAlt || []).length;
          const mut = me ? mutualCount(me, p.id) : 0;
          const score = snapN * 2 + futN + mut * 4 + (p.updatedAt ? 1 : 0);
          let why = "";
          if (mut > 0)
            why = `New connection activity: ${mut} mutual friend${mut === 1 ? "" : "s"} and a recently updated profile.`;
          else if (snapN >= 6)
            why = `New profile update with ${snapN} published class rows for classmates comparing loads.`;
          else if (futN >= 4)
            why = `New future-planning activity: ${futN} saved picks signal active course planning.`;
          else if (snapN)
            why = `Recently published profile with ${snapN} class${snapN === 1 ? "" : "es"} in the directory for ${school}.`;
          else why = `New verified profile in your community — connect to compare pathways.`;
          let example = "";
          if (p.bio && String(p.bio).trim())
            example = `Bio snippet: “${truncateTrendText(p.bio, 96)}”`;
          else if (snapN)
            example = `Example: ${snapN} schedule row${snapN === 1 ? "" : "s"} on file (open profile to see overlap with your courses).`;
          return {
            type: "person",
            id: p.id,
            title: p.displayName || p.email,
            sub: `Grade ${p.grade || "—"}`,
            level: p.academicLevel || "Profile",
            score,
            why,
            example,
            stats: [`${snapN} class rows`, `${futN} future pick${futN === 1 ? "" : "s"}`, `${mut} mutual friend${mut === 1 ? "" : "s"}`],
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);
    }

    const courseScores = [];
    sortedSubjects(grade, school).forEach((subject) => {
      (catalog[subject] || []).filter((c) => courseAllowed(c, grade, school)).forEach((c) => {
        const key = courseKey(subject, c);
        const relevantUsers = Object.values(reg).filter((u) => u.verified && u.school === school && inTrendRange(u.updatedAt || Date.now(), range));
        const planned = relevantUsers.filter((u) => [...(u.futurePrimary || []), ...(u.futureAlt || [])].includes(key)).length;
        const rows = gatherCourseComments(key);
        const textRows = rows.filter((r) => r.comment && r.comment !== "—");
        const stats = courseCommunityStats(key, school, range);
        const avg = stats.avg || 0;
        const score = stats.count * 3 + planned * 2 + stats.ratingCount + avg;
        if (score <= 0) return;
        const tname = titleForTrend(c.title);
        let why = "";
        let example = "";
        if (textRows.length >= 2) {
          const a = textRows[textRows.length - 2];
          const b = textRows[textRows.length - 1];
          why = `${tname} has ${stats.count} new enrollment signal${stats.count === 1 ? "" : "s"}, ${stats.ratingCount} rating${stats.ratingCount === 1 ? "" : "s"}, and multiple classmate notes.`;
          example = `${b.name} recently wrote: “${truncateTrendText(b.comment, 92)}”`;
        } else if (textRows.length === 1) {
          const r0 = textRows[0];
          why = `${tname} has a new written note plus ${stats.count} enrollment signal${stats.count === 1 ? "" : "s"} in this time range.`;
          example = `${r0.name}: “${truncateTrendText(r0.comment, 100)}”`;
        } else if (planned > stats.count) {
          why = `${tname} is showing stronger future-plan demand (${planned} new future saves) than current published seats (${stats.count}).`;
          example =
            stats.count > 0 && stats.avg
              ? `Current published average rating is ${stats.avg.toFixed(1)} across ${stats.count} enrollment${stats.count === 1 ? "" : "s"}.`
              : `No long comments yet — open Course Info to add your own take.`;
        } else if (stats.count > 0 && stats.ratingCount) {
          why = `${tname} has ${stats.count} new enrollment signal${stats.count === 1 ? "" : "s"} and ${stats.ratingCount} rating${stats.ratingCount === 1 ? "" : "s"} (avg ${avg.toFixed(1)}).`;
          example = `${stats.ratingCount} rating${stats.ratingCount === 1 ? "" : "s"} are helping classmates compare workload and fit.`;
        } else if (stats.count > 0) {
          why = `${tname} appears in ${stats.count} new published schedule row${stats.count === 1 ? "" : "s"} in ${school}.`;
          example = `Enrollment movement is driving this card.`;
        } else {
          why = `${tname} is picking up future-plan mentions (${planned}) even before many current enrollments show up in the directory.`;
          example = `Students are flagging this course while building next-term lists.`;
        }
        courseScores.push({
          type: "course",
          key,
          title: c.title,
          sub: subject,
          level: parseCourseKey(key).level,
          score,
          why,
          example,
          stats: [
            `${stats.count} enrollment${stats.count === 1 ? "" : "s"}`,
            `${planned} future pick${planned === 1 ? "" : "s"}`,
            `${textRows.length} written note${textRows.length === 1 ? "" : "s"}`,
            `${stats.ratingCount ? avg.toFixed(1) : "—"} avg`,
          ],
        });
      });
    });
    return courseScores.sort((a, b) => b.score - a.score).slice(0, 6);
  }

  function trendingEmptyHtml(mode, range) {
    const rangeLabel = range === "today" ? "today" : range === "yesterday" ? "yesterday" : "the last week";
    const school = getActiveCommunitySchool();
    const copy = {
      course: {
        title: "No trending courses yet",
        body: `Nothing in ${school} has enough enrollment, rating, or planning signals for ${rangeLabel}. When classmates save schedules, rate classes, or add future picks, popular courses will show here with reasons and examples.`,
        hint: "Try saving your schedule or opening Course Info to add community signals.",
      },
      person: {
        title: "No trending people yet",
        body: `No verified profiles at ${school} have fresh updates for ${rangeLabel}. Trending people appear when classmates publish schedules, future plans, or profile changes you can compare against.`,
        hint: "Invite friends from Community or save your profile to help activity show up.",
      },
      discussion: {
        title: "No trending discussions yet",
        body: `The Networking board at ${school} has no active public threads for ${rangeLabel}. Posts with replies, reactions, or new questions will rank here once classmates start conversations.`,
        hint: "Open Networking to start a study group, ask a course question, or reply to a thread.",
      },
    };
    const c = copy[mode] || copy.course;
    return `<article class="trending-empty-card">
      <div class="trend-art trend-art-empty" aria-hidden="true"><span>—</span></div>
      <div class="trend-content">
        <h4>${escapeHtml(c.title)}</h4>
        <p class="trend-empty-body">${escapeHtml(c.body)}</p>
        <p class="trend-empty-hint muted small">${escapeHtml(c.hint)}</p>
      </div>
    </article>`;
  }

  function renderTrending(prefix) {
    const box = qs(`#${prefix}-trending-results`);
    if (!box) return;
    const mode = trendingModes[prefix] || "course";
    const range = trendingRanges[prefix] || "today";
    const items = trendingItems(mode, range);
    const controls = `<div class="trend-controls">
      <label class="field trend-filter-field"><span>Type</span><select data-trend-mode-select>
        ${[
          ["course", "Courses"],
          ["person", "People"],
          ["discussion", "Discussions"],
        ].map(([key, label]) => `<option value="${key}" ${mode === key ? "selected" : ""}>${label}</option>`).join("")}
      </select></label>
      <label class="field trend-filter-field"><span>Range</span><select data-trend-range-select>
        ${[
          ["today", "Today"],
          ["yesterday", "Yesterday"],
          ["week", "Last Week"],
        ].map(([key, label]) => `<option value="${key}" ${range === key ? "selected" : ""}>${label}</option>`).join("")}
      </select></label>
    </div>`;
    box.innerHTML =
      controls +
      (items.length
        ? items
          .map((it) => {
            const art =
              it.type === "person"
                ? "assets/trend-person.svg"
                : it.type === "discussion"
                ? "assets/trend-discussion.svg"
                : "assets/trend-course.svg";
            const alt =
              it.type === "person" ? "People trending" : it.type === "discussion" ? "Discussion trending" : "Course trending";
            const ex = it.example ? `<p class="trend-example muted small">${escapeHtml(it.example)}</p>` : "";
            return `<article class="trending-card ${it.type === "person" ? "person" : it.type === "discussion" ? "discussion" : ""}">
          <div class="trend-art"><img class="trend-art-img" src="${art}" width="52" height="52" alt="${escapeHtml(alt)}" loading="lazy" /></div>
          <div class="trend-content">
            <h4>${escapeHtml(it.title)}</h4>
            <p class="muted small">${escapeHtml(it.sub)} · ${escapeHtml(it.level)}</p>
            <p class="trend-why">${escapeHtml(it.why)}</p>
            ${ex}
            <div class="trend-stat-row">${(it.stats || []).map((s) => `<span>${escapeHtml(s)}</span>`).join("")}</div>
            ${it.type === "person" ? `<button type="button" class="btn btn-sm btn-outline" data-trend-profile="${escapeHtml(it.id)}">Open Profile</button>` : ""}
          </div>
        </article>`;
          })
          .join("")
        : trendingEmptyHtml(mode, range));
    qsa("[data-trend-mode-select]", box).forEach((sel) => {
      sel.addEventListener("change", () => {
        trendingModes[prefix] = sel.value || "course";
        renderTrending(prefix);
      });
    });
    qsa("[data-trend-range-select]", box).forEach((sel) => {
      sel.addEventListener("change", () => {
        trendingRanges[prefix] = sel.value || "today";
        renderTrending(prefix);
      });
    });
    qsa("[data-trend-profile]", box).forEach((btn) => btn.addEventListener("click", () => openPeerModal(btn.getAttribute("data-trend-profile"))));
  }

  function collectManualCourses(prefix) {
    const q = (qs(`#${prefix}-manual-search`)?.value || "").toLowerCase();
    const subjectFilter = qs(`#${prefix}-manual-subject`)?.value || "";
    const levelFilter = qs(`#${prefix}-manual-level`)?.value || "";
    const viewSchool = getCatalogSchool();
    const viewGrade = getCatalogGradeForSchool(viewSchool);
    const rows = [];
    sortedSubjects(viewGrade, viewSchool).forEach((subject) => {
      if (subjectFilter && subject !== subjectFilter) return;
      (catalog[subject] || [])
        .filter((c) => courseAllowed(c, viewGrade, viewSchool))
        .forEach((c) => {
          const key = courseKey(subject, c);
          const text = `${subject} ${c.level} ${c.title}`.toLowerCase();
          if (levelFilter && c.level !== levelFilter) return;
          if (q && !text.includes(q)) return;
          rows.push({ key, subject, ...c });
        });
    });
    return rows.sort((a, b) => levelRank(a.level) - levelRank(b.level) || a.title.localeCompare(b.title));
  }

  function renderManualExplorer(prefix) {
    const subject = qs(`#${prefix}-manual-subject`);
    const out = qs(`#${prefix}-manual-results`);
    if (!subject || !out) return;
    const current = subject.value;
    subject.innerHTML = '<option value="">All Subjects</option>';
    const viewSchool = getCatalogSchool();
    sortedSubjects(getCatalogGradeForSchool(viewSchool), viewSchool).forEach((s) => {
      const o = document.createElement("option");
      o.value = s;
      o.textContent = s;
      if (s === current) o.selected = true;
      subject.appendChild(o);
    });
    const rows = collectManualCourses(prefix).slice(0, 18);
    out.innerHTML = rows.length
      ? rows
          .map((r) => {
            const meta = getCourseMeta(r.key, r.title);
            return `<article class="manual-result-card">
              <div><strong>${escapeHtml(r.title)}</strong><span class="muted small">${escapeHtml(r.subject)} · ${escapeHtml(r.level)} · Grades ${escapeHtml((r.grades || []).join(", "))}</span></div>
              <p class="muted small">${escapeHtml(meta.overview || "Course details are still being built out.")}</p>
            </article>`;
          })
          .join("")
      : '<p class="muted">No courses match those filters for your school and grade.</p>';
  }

  ["home", "explore"].forEach((prefix) => {
    qsa(`#${prefix}-manual-search, #${prefix}-manual-subject, #${prefix}-manual-level`).forEach((el) => {
      el?.addEventListener("input", () => renderManualExplorer(prefix));
      el?.addEventListener("change", () => renderManualExplorer(prefix));
    });
  });

  function showExploreCard(kind = "surprise", targetSelector = "#explore-panel-body") {
    const body = qs(targetSelector);
    if (!body) return;
    const roll = kind === "surprise" ? Math.floor(Math.random() * 3) : { course: 0, person: 1, fact: 2 }[kind] ?? 0;
    const scope = targetSelector.includes("home") ? "home-explore" : "explore";
    qsa(`#${scope}-course, #${scope}-person, #${scope}-fact`).forEach((btn) => btn.setAttribute("aria-pressed", "false"));
    const activeBtn = qs(`#${scope}-${kind}`);
    if (activeBtn) activeBtn.setAttribute("aria-pressed", "true");
    if (roll === 0) {
      const pick = pickExploreCourse(scope.includes("home") ? "home" : "explore");
      if (pick) {
        const meta = getCourseMeta(pick.key, pick.c.title);
        const gradReq = gradRequirementFor(pick.sub, pick.c.title);
        const levelTag = courseLevelTag(pick.c, pick.sub);
        const gradMeta = gradReqMeta(gradReq);
        body.innerHTML = `<div class="explore-result-kicker">Random course${pick.filterLabel && pick.filterLabel !== "All Courses" ? ` · ${escapeHtml(pick.filterLabel)}` : ""}</div>
          <h3 class="explore-title">${escapeHtml(pick.c.title)}</h3>
          <div class="explore-result-meta">
            <span>${escapeHtml(pick.sub)}</span>
            <span>${escapeHtml(levelTag)}</span>
            <span class="grad-req-area-badge" title="${escapeHtml(gradReq)}"><span class="grad-req-area-badge-label">Department</span><span class="grad-req-letter-pill">${escapeHtml(gradMeta.letter)}</span></span>
            <span>${escapeHtml(gradMeta.short)}</span>
            <span>Difficulty: ${escapeHtml(meta.difficulty)}</span>
          </div>
          <p>${escapeHtml(meta.overview || "Course details are still being built out.")}</p>
          <button type="button" class="btn btn-outline" data-explore-more="course">Another Course</button>`;
        qs('[data-explore-more="course"]', body)?.addEventListener("click", () => showExploreCard("course", targetSelector));
      } else body.innerHTML = "<p class=\"muted\">Explorer is preparing a planning suggestion.</p>";
    } else if (roll === 1) {
      const peers = listVerifiedPeers()
        .filter((p) => p.school === getActiveCommunitySchool())
        .filter((p) => !exploreSameClassOnly || mutualCoursesRows(p.id).length > 0)
        .filter((p) => {
          const filter = explorerFilters[scope.includes("home") ? "home" : "explore"]?.person || "all";
          if (filter === "academic") return !state.profile.academicLevel || p.academicLevel === state.profile.academicLevel;
          if (filter === "pathway") return !state.profile.careerPathway || p.careerPathway === state.profile.careerPathway;
          if (filter === "new") return Date.now() - Number(p.updatedAt || Date.now()) < 1000 * 60 * 60 * 24 * 14;
          return true;
        });
      if (peers.length) {
        const p = peers[Math.floor(Math.random() * peers.length)];
        body.innerHTML = `<div class="explore-result-kicker">Random person</div>
          <h3 class="explore-title">${escapeHtml(p.displayName || p.email)}</h3>
          <div class="explore-result-meta">
            <span>Grade ${escapeHtml(String(p.grade || "-"))}</span>
            <span>${escapeHtml(p.academicLevel || "Profile")}</span>
            <span>${escapeHtml(p.school || "School directory")}</span>
          </div>
          <p>${escapeHtml(p.bio || "Open this profile to compare schedules, courses, and shared context.")}</p>
          <button type="button" class="btn btn-outline" data-exp-view="${escapeHtml(p.id)}">Open Profile</button>`;
        qs("[data-exp-view]", body)?.addEventListener("click", () => {
          openPeerModal(p.id);
        });
      } else {
        body.innerHTML =
          `<div class="explore-result-kicker">Random person</div>
          <h3 class="explore-title">No verified classmates yet</h3>
          <p class="muted">Save your profile to the directory or invite classmates so Explorer can surface people from your school.</p>`;
      }
    } else {
      const factFilter = explorerFilters[scope.includes("home") ? "home" : "explore"]?.fact || "all";
      const factPools = {
        academic: HIGH_SCHOOL_FACTS.slice(0, 4),
        personal: [
          "The best schedule is one you can actually live with: energy, sleep, and recovery are part of the plan.",
          "Writing down why you picked a class makes future decisions easier when options start to blur together.",
          "Talking to one person who has taken a course can reveal workload details no catalog can capture.",
        ],
        fun: [
          "Many school traditions started as tiny student ideas that became repeatable enough to stick.",
          "Color-coding a planner works best when the colors mean actions, not just subjects.",
          "A surprisingly useful planning question: what class would make you more curious after school ends?",
        ],
      };
      const facts = factFilter === "all" ? [...HIGH_SCHOOL_FACTS, ...factPools.personal, ...factPools.fun] : factPools[factFilter] || HIGH_SCHOOL_FACTS;
      const fact = facts[Math.floor(Math.random() * facts.length)];
      body.innerHTML = `<div class="explore-result-kicker">Fun fact</div>
        <p class="explore-fact">${escapeHtml(fact)}</p>
        <button type="button" class="btn btn-outline" data-explore-more="fact">Another Fact</button>`;
      qs('[data-explore-more="fact"]', body)?.addEventListener("click", () => showExploreCard("fact", targetSelector));
    }
  }

  function renderExplorePanel() {
    populateExplorerCourseFilterSelects();
    showExploreCard("surprise");
    renderTrending("explore");
  }

  qs("#explore-surprise")?.addEventListener("click", () => showExploreCard("surprise"));
  qs("#explore-course")?.addEventListener("click", () => showExploreCard("course"));
  qs("#explore-person")?.addEventListener("click", () => showExploreCard("person"));
  qs("#explore-fact")?.addEventListener("click", () => showExploreCard("fact"));
  qs("#explore-same-class-filter")?.addEventListener("change", (e) => {
    exploreSameClassOnly = e.target.checked;
    showExploreCard("person");
  });
  [
    ["#home-explorer-course-filter", "home", "course", "#home-explore-panel-body"],
    ["#home-explorer-person-filter", "home", "person", "#home-explore-panel-body"],
    ["#home-explorer-fact-filter", "home", "fact", "#home-explore-panel-body"],
    ["#explorer-course-filter", "explore", "course", "#explore-panel-body"],
    ["#explorer-person-filter", "explore", "person", "#explore-panel-body"],
    ["#explorer-fact-filter", "explore", "fact", "#explore-panel-body"],
  ].forEach(([id, scope, type, target]) => {
    qs(id)?.addEventListener("change", (e) => {
      explorerFilters[scope][type] = e.target.value;
      showExploreCard(type, target);
    });
  });
  qs("#home-explore-course")?.addEventListener("click", () => showExploreCard("course", "#home-explore-panel-body"));
  qs("#home-explore-person")?.addEventListener("click", () => showExploreCard("person", "#home-explore-panel-body"));
  qs("#home-explore-fact")?.addEventListener("click", () => showExploreCard("fact", "#home-explore-panel-body"));

  function openPeerModal(peerId) {
    const me = userId();
    const modal = qs("#peer-modal");
    const body = qs("#peer-modal-body");
    const title = qs("#peer-modal-title");
    const u = getRegistryUser(peerId);
    if (!u) {
      const account = getJson(ACCOUNTS_KEY, {})[normalizeNetworkId(peerId)] || {};
      title.textContent = "Profile";
      body.innerHTML = `<div class="empty-state empty-state-compact">
        <p>${escapeHtml(account.name || peerId)} has started an account but has not published a verified profile yet.</p>
      </div>
      <div class="match-card">
        <strong>Completed so far</strong>
        <span class="muted small">${escapeHtml(friendProfileStatus(peerId))}</span>
        ${account.school ? `<span class="muted small">School: ${escapeHtml(account.school)}</span>` : ""}
        ${account.phone ? `<span class="muted small">Phone added</span>` : ""}
      </div>`;
      modal.hidden = false;
      return;
    }
    title.textContent = (isCloseFriend(peerId) ? "★ " : "") + (u.displayName || u.email);
    const priv = u.privacy || defaultPrivacy();
    const viewer = me;
    const friend = isFriend(peerId);
    const mut = mutualCount(me, peerId);
    const mcRows = mutualCoursesRows(peerId);

    function block(lab, html) {
      return `<div class="peer-block"><h4>${escapeHtml(lab)}</h4>${html}</div>`;
    }

    let inner = "";
    if (viewpointEnabled("mutualFriends") || viewpointEnabled("mutualCourses")) {
      const parts = [];
      if (viewpointEnabled("mutualFriends")) parts.push(`<strong>${mut}</strong> mutual friend${mut === 1 ? "" : "s"}`);
      if (viewpointEnabled("mutualCourses")) parts.push(`<strong>${mcRows.length}</strong> mutual course${mcRows.length === 1 ? "" : "s"}`);
      if (parts.length) inner += `<p class="mutual-line">${parts.join(" · ")}</p>`;
    }
    if (viewpointEnabled("about")) {
      inner += block(
        "About",
        canViewField(viewer, peerId, "bio", priv) ? `<p>${escapeHtml(u.bio || "")}</p>` : `<p class="muted">Hidden</p>`
      );
    }
    if (viewpointEnabled("personalInfo")) {
      const personalRows = [];
      if (canViewField(viewer, peerId, "contactEmail", priv) && (u.contactEmail || u.email)) {
        personalRows.push(`<p><strong>Email</strong><br />${escapeHtml(u.contactEmail || u.email || "")}</p>`);
      }
      const links = (u.socialLinks || "")
        .split(/\n|,|\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (canViewField(viewer, peerId, "socialLinks", priv) && links.length) {
        personalRows.push(`<p><strong>Links</strong><br />${links.map((link) => `<a href="${escapeHtml(link)}" target="_blank" rel="noreferrer">${escapeHtml(link)}</a>`).join("<br />")}</p>`);
      }
      inner += block("Personal Information", personalRows.length ? personalRows.join("") : `<p class="muted">Not shared</p>`);
    }
    if (viewpointEnabled("grade")) {
      inner += block(
        "Grade",
        canViewField(viewer, peerId, "grade", priv) ? `<p>${escapeHtml(String(u.grade || ""))}</p>` : `<p class="muted">Hidden</p>`
      );
    }
    if (viewpointEnabled("gender")) {
      inner += block(
        "Gender",
        canViewField(viewer, peerId, "gender", priv) ? `<p>${escapeHtml(u.gender || "")}</p>` : `<p class="muted">Hidden</p>`
      );
    }
    if (viewpointEnabled("academicLevel")) {
      inner += block(
        "Academic Level",
        canViewField(viewer, peerId, "academicLevel", priv)
          ? `<p>${escapeHtml(u.academicLevel || "")}</p>`
          : `<p class="muted">Hidden</p>`
      );
    }
    if (viewpointEnabled("careerPathway")) {
      inner += block(
        "Career Pathway",
        canViewField(viewer, peerId, "careerPathway", priv)
          ? `<p>${escapeHtml(u.careerPathway || "Not set")}</p>`
          : `<p class="muted">Hidden</p>`
      );
    }
    if (viewpointEnabled("mutualCourses")) {
      inner += block(
        "Mutual Courses",
        mcRows.length
          ? `<ul>${mcRows.map((r) => `<li>${escapeHtml(formatCourseTitle(r.courseKey || r.courseLabel))}</li>`).join("")}</ul>`
          : `<p class="muted">No overlapping courses in visible schedules.</p>`
      );
    }
    if (viewpointEnabled("schedule")) {
      inner += block(
        "Classes & Schedule",
        canViewField(viewer, peerId, "schedule", priv)
          ? `<div class="table-wrap"><table class="data-table peer-schedule"><thead><tr><th>Day</th><th>Period</th><th>Start</th><th>End</th><th>Room</th><th>Course</th><th>Teacher</th></tr></thead><tbody>
            ${(u.scheduleSnapshot || [])
              .map(
                (r) =>
                  `<tr><td>${escapeHtml(r.weekday || "")}</td><td>${escapeHtml(r.period)}</td><td>${escapeHtml(r.start || "—")}</td><td>${escapeHtml(r.end || "—")}</td><td>${escapeHtml(r.room || "—")}</td><td>${escapeHtml(formatCourseTitle(r.courseKey || r.courseLabel))}</td><td>${escapeHtml(r.teacher)}</td></tr>`
              )
              .join("")}
          </tbody></table></div>`
          : `<p class="muted">Schedule visible to friends only—or restricted by privacy.</p>`
      );
    }
    if (viewpointEnabled("futurePlan")) {
      const futureEntries = Object.entries(u.futureByGrade || {})
        .map(([g, slot]) => ({
          g,
          picks: [...(slot.primary || []), ...(slot.alternatives || [])].filter(Boolean),
        }))
        .filter((x) => x.picks.length);
      inner += block(
        "Future Courses",
        canViewField(viewer, peerId, "futurePlan", priv)
          ? futureEntries.length
            ? futureEntries
                .map(
                  ({ g, picks }) =>
                    `<h5 class="peer-subhead">Grade ${escapeHtml(g)}</h5><ul>${picks
                      .map((k) => {
                        const { level, title } = parseCourseKey(k);
                        return `<li>${escapeHtml(level)} ${escapeHtml(title)}</li>`;
                      })
                      .join("")}</ul>`
                )
                .join("")
            : `<p class="muted">No future courses saved yet.</p>`
          : `<p class="muted">Hidden</p>`
      );
    }
    if (viewpointEnabled("futureNotes")) {
      const notes = Object.entries(u.futureByGrade || {})
        .flatMap(([g, slot]) => [
          slot.primaryNotes && `Grade ${g} primary: ${slot.primaryNotes}`,
          (slot.alternativeNotes || slot.notes) && `Grade ${g} alternatives: ${slot.alternativeNotes || slot.notes}`,
        ])
        .filter(Boolean);
      inner += block(
        "Future Notes",
        canViewField(viewer, peerId, "futureNotes", priv)
          ? notes.length
            ? `<ul>${notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>`
            : `<p class="muted">No future notes shared.</p>`
          : `<p class="muted">Hidden</p>`
      );
    }
    if (viewpointEnabled("gradReq")) {
      inner += block(
        "Grad Requirements",
        canViewField(viewer, peerId, "gradReq", priv)
          ? `<p class="muted">Graduation progress is shared through My Snapshot when available.</p>`
          : `<p class="muted">Hidden</p>`
      );
    }
    if (viewpointEnabled("summerWork")) {
      const summer = u.summerCourses || [];
      inner += block(
        "Summer / Online",
        canViewField(viewer, peerId, "summer", priv)
          ? summer.length
            ? `<ul>${summer.map((s) => `<li>${escapeHtml(s.title || formatCourseTitle(s.courseKey))} · ${escapeHtml(s.where || "Outside school")}</li>`).join("")}</ul>`
            : `<p class="muted">No summer or online courses listed.</p>`
          : `<p class="muted">Hidden</p>`
      );
    }
    if (viewpointEnabled("activities")) {
      inner += block(
        "Activities",
        canViewField(viewer, peerId, "activities", priv)
          ? `<ul>${(u.activities || []).map((a) => `<li>${escapeHtml(a.name)} — ${escapeHtml(a.when)}</li>`).join("")}</ul>`
          : `<p class="muted">Hidden</p>`
      );
    }
    if (viewpointEnabled("achievements")) {
      const earned = peerAchievementBadges(u, peerId);
      inner += block(
        "Achievements",
        earned.length
          ? `<div class="peer-achievement-row">${earned
              .map(
                (b) =>
                  `<span class="peer-achievement-chip">${achievementBadgeHtml(b.name, true)}<span>${escapeHtml(b.name)}</span></span>`
              )
              .join("")}</div>`
          : `<p class="muted">No unlocked achievements visible yet.</p>`
      );
    }
    if (viewpointEnabled("phone")) {
      inner += block("Phone", `<p class="muted">${canViewField(viewer, peerId, "phone", priv) ? escapeHtml(u.phoneDigits || "") : "Not Shared"}</p>`);
    }

    if (!inner.trim()) {
      inner = `<div class="empty-state empty-state-compact"><p class="muted">Your Viewpoint settings hide every profile section. Open Settings → Viewpoint to choose what you want to see.</p></div>`;
    }

    if (peerId !== me && viewpointEnabled("privateNotes")) {
      inner += block(
        "Your Private Note",
        `<p class="muted small">Only you can read this—it is stored on this device.</p>
        <textarea id="peer-private-note" class="private-note-area" rows="3" placeholder="Reminders about this person…">${escapeHtml(
          getPrivateNote(peerId)
        )}</textarea>
        <button type="button" class="btn btn-primary btn-sm" id="peer-private-note-save">Save Note</button>`
      );
      let closeHtml = "";
      if (friend) {
        if (isCloseFriend(peerId))
          closeHtml = `<button type="button" class="btn btn-ghost btn-sm" id="peer-close-remove">Remove Close Friend</button>`;
        else if (hasClosePendingTo(peerId)) closeHtml = `<span class="badge-wait">Close friend request sent</span>`;
        else if (hasClosePendingFrom(peerId))
          closeHtml = `<button type="button" class="btn btn-sm btn-primary" id="peer-close-accept">Accept Close Friend</button>
            <button type="button" class="btn btn-sm btn-ghost" id="peer-close-decline">Decline</button>`;
        else
          closeHtml = `<button type="button" class="btn btn-outline btn-sm" id="peer-close-request">Add Close Friend ★</button>`;
      }
      inner += `<div class="peer-close-bar">${closeHtml}</div>`;
    }

    body.innerHTML = inner;
    modal.hidden = false;

    qs("#peer-private-note-save")?.addEventListener("click", () => {
      savePrivateNote(peerId, qs("#peer-private-note").value.trim());
      const st = qs("#peer-private-note-save");
      if (st) {
        const o = st.textContent;
        st.textContent = "Saved";
        setTimeout(() => {
          st.textContent = o;
        }, 1600);
      }
    });
    qs("#peer-close-request")?.addEventListener("click", () => {
      requestCloseFriend(peerId);
      openPeerModal(peerId);
      renderFriendsPanel();
      renderDirectory();
    });
    qs("#peer-close-accept")?.addEventListener("click", () => {
      acceptCloseFriend(peerId);
      openPeerModal(peerId);
      renderFriendsPanel();
      renderDirectory();
    });
    qs("#peer-close-decline")?.addEventListener("click", () => {
      declineCloseFriend(peerId);
      openPeerModal(peerId);
      renderFriendsPanel();
    });
    qs("#peer-close-remove")?.addEventListener("click", () => {
      removeCloseFriend(peerId);
      openPeerModal(peerId);
      renderFriendsPanel();
      renderDirectory();
    });
  }

  qs("#peer-modal-close")?.addEventListener("click", () => (qs("#peer-modal").hidden = true));
  qs("#peer-modal")?.addEventListener("click", (e) => {
    if (e.target === qs("#peer-modal")) qs("#peer-modal").hidden = true;
  });

  /* ---------- Friends ---------- */
  function requestColumnFiller(kind) {
    const copy =
      kind === "in"
        ? {
            title: "Waiting for requests",
            body: "When classmates send you a friend or close-friend request, it will show up here with accept and decline actions.",
            tip: "Tip: Search the Community directory or use Find Friends to grow your network.",
          }
        : {
            title: "No pending outgoing requests",
            body: "Requests you send stay listed here until they are accepted, declined, or canceled.",
            tip: "Tip: Suggestions and directory profiles are the fastest way to send new requests.",
          };
    return `<div class="requests-filler" aria-hidden="true">
      <p class="requests-filler-title">${escapeHtml(copy.title)}</p>
      <p class="muted small">${escapeHtml(copy.body)}</p>
      <p class="requests-filler-tip muted small">${escapeHtml(copy.tip)}</p>
    </div>`;
  }

  function renderRequestColumn(box, label, rowsHtml, hasRows) {
    if (!box) return;
    box.innerHTML = `<p class="request-label">${escapeHtml(label)}</p>${rowsHtml}${hasRows ? "" : requestColumnFiller(label === "Incoming" ? "in" : "out")}`;
  }

  function syncFriendsSliderButtons() {
    const track = qs("#friends-horizontal");
    const prev = qs("#friends-slider-prev");
    const next = qs("#friends-slider-next");
    if (!track || !prev || !next) return;
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth - 2);
    const hasOverflow = maxScroll > 4;
    prev.disabled = !hasOverflow || track.scrollLeft <= 2;
    next.disabled = !hasOverflow || track.scrollLeft >= maxScroll;
    prev.hidden = !hasOverflow;
    next.hidden = !hasOverflow;
  }

  function renderFriendsHorizontal() {
    const wrap = qs("#friends-horizontal");
    if (!wrap) return;
    wrap.innerHTML = "";
    listFriendIds().forEach((fid) => {
      const u = getRegistryUser(fid);
      const status = friendProfileStatus(fid);
      const star = isCloseFriend(fid) ? `<span class="friend-h-star" aria-hidden="true">★</span>` : "";
      const card = document.createElement("button");
      card.type = "button";
      card.className = "friend-h-card" + (isCloseFriend(fid) ? " is-close" : "");
      card.innerHTML = `${star}<div class="friend-h-avatar">${escapeHtml((u?.displayName || fid).charAt(0).toUpperCase())}</div><span class="friend-h-name">${escapeHtml(
        u?.displayName || fid
      )}</span><span class="friend-h-status">${escapeHtml(status)}</span>`;
      card.addEventListener("click", () => openPeerModal(fid));
      wrap.appendChild(card);
    });
    if (!listFriendIds().length) {
      wrap.innerHTML = `<div class="empty-state empty-state-compact">
        <p>No friends yet. Use Find Friends or the Community directory.</p>
        <button type="button" class="btn btn-outline btn-sm" id="friends-open-community">Open Community</button>
      </div>`;
      qs("#friends-open-community")?.addEventListener("click", () => showPanel("community"));
    }
    syncFriendsSliderButtons();
  }

  function friendProfileStatus(id) {
    const u = getRegistryUser(id);
    if (!u) return "Account created";
    const completed = [];
    if (u.verified) completed.push("verified");
    if (u.grade) completed.push("grade");
    if (u.academicLevel) completed.push("academics");
    if ((u.scheduleSnapshot || []).length) completed.push("schedule");
    if ((u.futurePrimary || []).length || Object.values(u.futureByGrade || {}).some((slot) => (slot.primary || []).some(Boolean))) completed.push("future");
    if ((u.activities || []).length) completed.push("activities");
    return completed.length ? `Completed: ${completed.slice(0, 3).join(", ")}${completed.length > 3 ? "..." : ""}` : "Profile started";
  }

  function contactCandidates() {
    const accounts = getJson(ACCOUNTS_KEY, {});
    const reg = getRegistry();
    const ids = new Set([...Object.keys(accounts), ...Object.keys(reg)]);
    return [...ids].map((id) => {
      const a = accounts[id] || {};
      const u = reg[id] || {};
      return {
        id: normalizeNetworkId(id),
        email: normalizeNetworkId(u.email || a.email || id),
        phoneDigits: String(u.phoneDigits || a.phone || "").replace(/\D/g, ""),
        displayName: u.displayName || a.name || id,
        school: u.school || a.school || "",
        verified: !!u.verified,
        status: friendProfileStatus(id),
      };
    }).filter((p) => p.id && p.id !== userId());
  }

  function updateContactSearchUi() {
    const type = qs("#contacts-search-type")?.value || "name";
    const label = qs("#contacts-query-label");
    const input = qs("#contacts-paste");
    const helper = qs("#contacts-helper");
    const copy = {
      name: ["Student Name", "Type a student's name...", "Enter all or part of a student's display name."],
      email: ["Email Address", "name@student.org", "Enter the email address associated with their account."],
      phone: ["Phone Number", "9255550142", "Enter the phone number they used for CourseSync."],
    };
    if (label) label.textContent = copy[type][0];
    if (input) input.placeholder = copy[type][1];
    if (helper) helper.textContent = copy[type][2];
  }

  function getContactMatches() {
    const input = qs("#contacts-paste");
    const type = qs("#contacts-search-type")?.value || "name";
    const needle = input?.value.trim().toLowerCase() || "";
    const digits = input.value.replace(/\D/g, "");
    if (!needle && !digits) return [];
    return contactCandidates().filter((p) => {
      if (type === "name") return p.displayName.toLowerCase().includes(needle);
      if (type === "email") return p.email.includes(needle);
      return digits.length >= 3 && p.phoneDigits.includes(digits);
    });
  }

  function renderContactMatches() {
    const out = qs("#contacts-results");
    if (!out) return;
    const matches = getContactMatches();
    const pageSize = 4;
    const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
    contactMatchPage = Math.min(contactMatchPage, totalPages - 1);
    const page = matches.slice(contactMatchPage * pageSize, contactMatchPage * pageSize + pageSize);
    out.innerHTML = matches.length
      ? `<h4 class="results-title">Matches</h4><div class="match-grid">${page
          .map(
            (p) =>
              `<button type="button" class="match-card match-select-card ${selectedContactId === p.id ? "selected" : ""}" data-contact-pick="${escapeHtml(p.id)}"><strong>${escapeHtml(p.displayName)}</strong><span class="muted small">${escapeHtml(p.email)}</span><span class="muted small">${escapeHtml(p.verified ? "Verified profile" : p.status)}</span></button>`
          )
          .join("")}</div>`
      : '<div class="empty-state empty-state-compact"><p>No matches yet. Try a more specific identifier.</p></div>';
    qsa("[data-contact-pick]", out).forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedContactId = btn.getAttribute("data-contact-pick") || "";
        renderContactMatches();
      });
    });
    const label = qs("#contacts-page-label");
    if (label) label.textContent = matches.length ? `Page ${contactMatchPage + 1} of ${totalPages}` : "";
    const prev = qs("#contacts-prev");
    const next = qs("#contacts-next");
    const send = qs("#contacts-find-btn");
    if (prev) prev.disabled = contactMatchPage <= 0;
    if (next) next.disabled = contactMatchPage >= totalPages - 1;
    if (send) send.disabled = !selectedContactId;
  }

  function buildSuggestionPeers() {
    const me = userId();
    const mine = getRegistryUser(me);
    const stars = new Set(getStarredCourses());
    return listVerifiedPeers()
      .filter((p) => !isFriend(p.id))
      .map((p) => {
        let score = 0;
        if (mine?.school && p.school === mine.school) score += 4;
        else return { p, score: -1 };
        if (mine?.grade && p.grade === mine.grade) score += 3;
        else if (p.grade) score += 1;
        if (mine?.careerPathway && p.careerPathway && p.careerPathway === mine.careerPathway) score += 2;
        if (mine?.academicLevel && p.academicLevel === mine.academicLevel) score += 1;
        score += mutualCount(me, p.id) * 2;
        const peerKeys = new Set([
          ...(p.scheduleSnapshot || []).map((r) => r.courseKey).filter(Boolean),
          ...(p.futurePrimary || []),
        ]);
        if ([...stars].some((k) => peerKeys.has(k))) score += 2;
        return { p, score };
      })
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score || (a.p.displayName || "").localeCompare(b.p.displayName || ""))
      .map((x) => x.p);
  }

  function renderSuggestions() {
    const box = qs("#suggestions-list");
    if (!box) return;
    const allPeers = buildSuggestionPeers();
    const pageSize = 6;
    const visiblePeers = allPeers.filter((p) => !dismissedSuggestionIds.has(p.id));
    const totalPages = Math.max(1, Math.ceil(visiblePeers.length / pageSize));
    suggestionsPage = Math.min(suggestionsPage, totalPages - 1);
    const peers = visiblePeers.slice(suggestionsPage * pageSize, suggestionsPage * pageSize + pageSize);
    box.innerHTML = peers.length
      ? peers
          .map((p) => {
            const mut = mutualCount(userId(), p.id);
            const meta = [
              p.grade ? `Grade ${p.grade}` : "",
              p.academicLevel || "",
              p.careerPathway || "",
              mut ? `${mut} mutual` : "",
            ]
              .filter(Boolean)
              .join(" · ");
            return `<div class="suggestion-card">
              <div class="suggestion-card-main">
                <strong>${escapeHtml(p.displayName || p.email)}</strong>
                <span class="muted small">${escapeHtml(meta || p.school || "")}</span>
                <details class="suggestion-card-details">
                  <summary>Why this shows up</summary>
                  <div class="suggestion-card-detail-body">Shared school, grade, and planning overlap make this a strong connection to consider.</div>
                </details>
              </div>
              <div class="suggestion-card-actions">
                <button type="button" class="btn btn-sm btn-outline" data-sview="${escapeHtml(p.id)}">Profile</button>
                <button type="button" class="btn btn-sm btn-ghost" data-sremove="${escapeHtml(p.id)}">Remove</button>
                <button type="button" class="btn btn-sm btn-primary" data-sreq="${escapeHtml(p.id)}">Add Friend</button>
              </div>
            </div>`;
          })
          .join("")
      : '<p class="muted">No suggestions yet—invite classmates to save their profiles.</p>';
    if (!peers.length) {
      box.innerHTML = `<div class="empty-state empty-state-compact">
        <p>No suggestions yet. Invite classmates to save their profiles or search the directory.</p>
        <button type="button" class="btn btn-outline btn-sm" id="suggestions-open-community">Open Community</button>
      </div>`;
      qs("#suggestions-open-community")?.addEventListener("click", () => showPanel("community"));
    }
    qsa("[data-sreq]", box).forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-sreq");
        requestFriend(id);
        dismissedSuggestionIds.add(id);
        renderFriendsPanel();
        renderDirectory();
      });
    });
    qsa("[data-sremove]", box).forEach((b) => {
      b.addEventListener("click", () => {
        dismissedSuggestionIds.add(b.getAttribute("data-sremove"));
        renderSuggestions();
      });
    });
    qsa("[data-sview]", box).forEach((b) => {
      b.addEventListener("click", () => openPeerModal(b.getAttribute("data-sview")));
    });
    const label = qs("#suggestions-page-label");
    if (label) label.textContent = visiblePeers.length ? `Page ${suggestionsPage + 1} of ${totalPages}` : "";
    const prev = qs("#suggestions-prev");
    const next = qs("#suggestions-next");
    if (prev) prev.disabled = suggestionsPage <= 0;
    if (next) next.disabled = suggestionsPage >= totalPages - 1;
  }

  function renderFriendsPanel() {
    renderFriendsHorizontal();
    renderSuggestions();
    renderRecommendCourseForm();
    updateContactSearchUi();
    renderContactMatches();
    const showClose = requestMode === "close";
    qs("#requests-tab-friends")?.classList.toggle("active", !showClose);
    qs("#requests-tab-close")?.classList.toggle("active", showClose);
    ["#friend-requests-in", "#friend-requests-out"].forEach((id) => {
      const el = qs(id);
      if (el) el.hidden = showClose;
    });
    ["#close-requests-in", "#close-requests-out"].forEach((id) => {
      const el = qs(id);
      if (el) el.hidden = !showClose;
    });
    const rin = qs("#friend-requests-in");
    if (rin) {
      const me = userId();
      const incoming = getNetwork().requests.filter((r) => r.to === me);
      const rows = incoming
        .map((r) => {
          const u = getRegistryUser(r.from);
          return `<div class="request-row"><span>${escapeHtml(u?.displayName || r.from)}</span>
            <button type="button" class="btn btn-sm btn-primary" data-ok="${escapeHtml(r.from)}">Accept</button>
            <button type="button" class="btn btn-sm btn-ghost" data-no="${escapeHtml(r.from)}">Decline</button></div>`;
        })
        .join("");
      renderRequestColumn(rin, "Incoming", rows, incoming.length > 0);
      qsa("[data-ok]", rin).forEach((b) => {
        b.addEventListener("click", () => {
          acceptFriend(b.getAttribute("data-ok"));
          renderFriendsPanel();
          renderDirectory();
        });
      });
      qsa("[data-no]", rin).forEach((b) => {
        b.addEventListener("click", () => {
          declineFriend(b.getAttribute("data-no"));
          renderFriendsPanel();
        });
      });
    }

    const rout = qs("#friend-requests-out");
    if (rout) {
      const me = userId();
      const outgoing = getNetwork().requests.filter((r) => r.from === me);
      const rows = outgoing
        .map((r) => {
          const u = getRegistryUser(r.to);
          return `<div class="request-row"><span>${escapeHtml(u?.displayName || r.to)}</span>
            <button type="button" class="btn btn-sm btn-ghost" data-cancel="${escapeHtml(r.to)}">Cancel Request</button></div>`;
        })
        .join("");
      renderRequestColumn(rout, "Pending", rows, outgoing.length > 0);
      qsa("[data-cancel]", rout).forEach((b) => {
        b.addEventListener("click", () => {
          cancelOutgoing(b.getAttribute("data-cancel"));
          renderFriendsPanel();
        });
      });
    }

    const crin = qs("#close-requests-in");
    if (crin) {
      const me = userId();
      const incoming = getNetwork().closeRequests.filter((r) => r.to === me && isFriend(r.from));
      const rows = incoming
        .map((r) => {
          const u = getRegistryUser(r.from);
          return `<div class="request-row"><span>${escapeHtml(u?.displayName || r.from)}</span>
            <button type="button" class="btn btn-sm btn-primary" data-cok="${escapeHtml(r.from)}">Accept</button>
            <button type="button" class="btn btn-sm btn-ghost" data-cno="${escapeHtml(r.from)}">Decline</button></div>`;
        })
        .join("");
      renderRequestColumn(crin, "Incoming", rows, incoming.length > 0);
      qsa("[data-cok]", crin).forEach((b) => {
        b.addEventListener("click", () => {
          acceptCloseFriend(b.getAttribute("data-cok"));
          renderFriendsPanel();
          renderDirectory();
        });
      });
      qsa("[data-cno]", crin).forEach((b) => {
        b.addEventListener("click", () => {
          declineCloseFriend(b.getAttribute("data-cno"));
          renderFriendsPanel();
        });
      });
    }

    const crout = qs("#close-requests-out");
    if (crout) {
      const me = userId();
      const outgoing = getNetwork().closeRequests.filter((r) => r.from === me);
      const rows = outgoing
        .map((r) => {
          const u = getRegistryUser(r.to);
          return `<div class="request-row"><span>${escapeHtml(u?.displayName || r.to)}</span>
            <button type="button" class="btn btn-sm btn-ghost" data-ccancel="${escapeHtml(r.to)}">Cancel</button></div>`;
        })
        .join("");
      renderRequestColumn(crout, "Pending", rows, outgoing.length > 0);
      qsa("[data-ccancel]", crout).forEach((b) => {
        b.addEventListener("click", () => {
          cancelCloseOutgoing(b.getAttribute("data-ccancel"));
          renderFriendsPanel();
        });
      });
    }

    const sel = qs("#chat-peer-select");
    if (sel) {
      const cur = sel.value;
      const net = getNetworkingFilters();
      sel.innerHTML = '<option value="">Select A Friend…</option>';
      listFriendIds()
        .filter((fid) => networkingFilterAllowsAuthor(fid, net.messages))
        .forEach((fid) => {
          const u = getRegistryUser(fid);
          const o = document.createElement("option");
          o.value = fid;
          o.textContent = (isCloseFriend(fid) ? "★ " : "") + (u?.displayName || fid);
          sel.appendChild(o);
        });
      if (cur && [...sel.options].some((o) => o.value === cur)) sel.value = cur;
      else if (net.messages === "friends" && listFriendIds().length) sel.value = listFriendIds()[0];
    }
    renderChat();
  }

  qs("#requests-tab-friends")?.addEventListener("click", () => {
    requestMode = "friends";
    renderFriendsPanel();
  });
  qs("#requests-tab-close")?.addEventListener("click", () => {
    requestMode = "close";
    renderFriendsPanel();
  });

  qs("#friends-slider-prev")?.addEventListener("click", () => {
    const track = qs("#friends-horizontal");
    if (track) {
      track.scrollBy({ left: -Math.max(160, track.clientWidth * 0.75), behavior: "smooth" });
      setTimeout(syncFriendsSliderButtons, 280);
    }
  });
  qs("#friends-slider-next")?.addEventListener("click", () => {
    const track = qs("#friends-horizontal");
    if (track) {
      track.scrollBy({ left: Math.max(160, track.clientWidth * 0.75), behavior: "smooth" });
      setTimeout(syncFriendsSliderButtons, 280);
    }
  });
  qs("#friends-horizontal")?.addEventListener("scroll", () => syncFriendsSliderButtons(), { passive: true });
  window.addEventListener("resize", () => syncFriendsSliderButtons());
  qs("#suggestions-prev")?.addEventListener("click", () => {
    suggestionsPage = Math.max(0, suggestionsPage - 1);
    renderFriendsPanel();
  });
  qs("#suggestions-next")?.addEventListener("click", () => {
    suggestionsPage += 1;
    renderFriendsPanel();
  });

  function renderRecommendCourseForm() {
    const sel = qs("#recommend-course-select");
    if (!sel) return;
    const cur = sel.value;
    const options = [];
    sortedSubjects().forEach((subject) => {
      (catalog[subject] || []).filter((c) => courseAllowed(c)).forEach((c) => options.push({ key: courseKey(subject, c), label: `${c.title} · ${subject}` }));
    });
    sel.innerHTML = options.map((o) => `<option value="${encodeURIComponent(o.key)}">${escapeHtml(o.label)}</option>`).join("");
    if (cur && [...sel.options].some((o) => o.value === cur)) sel.value = cur;
    const recipient = qs("#recommend-recipient");
    if (recipient) {
      const curRecipient = recipient.value;
      const ids = listFriendIds();
      recipient.innerHTML = ids.length
        ? ids.map((id) => {
            const u = getRegistryUser(id);
            const label = `${isCloseFriend(id) ? "Close Friend: " : "Friend: "}${u?.displayName || id}`;
            return `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`;
          }).join("")
        : '<option value="">Add a friend first</option>';
      if (curRecipient && [...recipient.options].some((o) => o.value === curRecipient)) recipient.value = curRecipient;
    }
  }

  qs("#recommend-send")?.addEventListener("click", () => {
    const key = decodeURIComponent(qs("#recommend-course-select")?.value || "");
    const recipient = qs("#recommend-recipient")?.value || "";
    const note = qs("#recommend-note")?.value.trim() || "Worth checking out.";
    if (!key || !recipient || !isFriend(recipient)) return;
    const recs = getJson(RECOMMENDATIONS_KEY, []);
    const { title } = parseCourseKey(key);
    recs.unshift({ from: userId(), to: recipient, fromName: state.profile.displayName || userId(), school: state.profile.school, key, audience: "specific", note, at: Date.now() });
    setJson(RECOMMENDATIONS_KEY, recs.slice(0, 100));
    pushFeed(userId(), state.profile.displayName, "recommended", `recommended ${title}`);
    pushNotification(`You recommended ${title} to ${getRegistryUser(recipient)?.displayName || recipient}.`, "recommendation");
    const st = qs("#recommend-status");
    if (st) st.textContent = `Recommended ${title} to ${getRegistryUser(recipient)?.displayName || recipient}.`;
    qs("#recommend-note").value = "";
  });

  function renderChat() {
    const peerId = qs("#chat-peer-select")?.value;
    const thread = qs("#chat-thread");
    if (!thread) return;
    thread.classList.remove("chat-thread-active", "chat-thread-idle");
    if (!peerId || !isFriend(peerId)) {
      thread.classList.add("chat-thread-idle");
      thread.innerHTML =
        '<div class="chat-empty-state"><p class="chat-empty-title">No conversation selected</p><p class="muted small">Choose a friend above to view your message history or start a new chat.</p></div>';
      return;
    }
    const msgs = getThread(peerId);
    const peerName = getRegistryUser(peerId)?.displayName || peerId;
    thread.classList.add("chat-thread-active");
    if (!msgs.length) {
      thread.innerHTML = `<div class="chat-empty-state">
        <p class="chat-empty-title">No messages yet</p>
        <p class="muted small">You and ${escapeHtml(peerName)} have not exchanged messages. Say hello, ask about a course, or compare schedules using the box below.</p>
      </div>`;
      return;
    }
    thread.innerHTML = msgs
      .map((m) => {
        const mine = m.from === userId();
        const id = m.id || `${peerId}:${m.t}:${m.from}`;
        return `<div class="chat-bubble ${mine ? "mine" : "them"}">${escapeHtml(m.body)}${reactionHtml(`dm:${id}`)}</div>`;
      })
      .join("");
    wireReactions(thread, renderChat);
    thread.scrollTop = thread.scrollHeight;
  }

  qs("#chat-peer-select")?.addEventListener("change", renderChat);
  qs("#chat-send")?.addEventListener("click", () => {
    sendDm(qs("#chat-peer-select").value, qs("#chat-input").value);
    qs("#chat-input").value = "";
    renderChat();
  });
  qsa("[data-chat-emoji]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = qs("#chat-input");
      if (input) input.value = `${input.value}${btn.getAttribute("data-chat-emoji")}`;
    });
  });

  function normalizeEmail(s) {
    return s.trim().toLowerCase();
  }

  qs("#contacts-find-btn")?.addEventListener("click", () => {
    if (!selectedContactId) return;
    const name = contactCandidates().find((p) => p.id === selectedContactId)?.displayName || selectedContactId;
    requestFriend(selectedContactId);
    selectedContactId = "";
    renderContactMatches();
    const st = qs("#contacts-send-status");
    if (st) st.textContent = `Request sent to ${name}.`;
    renderFriendsPanel();
    renderDirectory();
  });

  qs("#contacts-paste")?.addEventListener("input", () => {
    contactMatchPage = 0;
    selectedContactId = "";
    renderContactMatches();
  });
  qs("#contacts-search-type")?.addEventListener("change", () => {
    contactMatchPage = 0;
    selectedContactId = "";
    if (qs("#contacts-paste")) qs("#contacts-paste").value = "";
    updateContactSearchUi();
    renderContactMatches();
  });
  qs("#contacts-prev")?.addEventListener("click", () => {
    contactMatchPage = Math.max(0, contactMatchPage - 1);
    renderContactMatches();
  });
  qs("#contacts-next")?.addEventListener("click", () => {
    contactMatchPage += 1;
    renderContactMatches();
  });

  /* ---------- Profile ---------- */
  let avatarEditorImage = null;
  let avatarOriginalDataUrl = "";

  function drawAvatarEditor() {
    const canvas = qs("#avatar-editor-canvas");
    if (!canvas || !avatarEditorImage) return;
    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    const zoom = Number(qs("#avatar-zoom")?.value || 1);
    const ox = Number(qs("#avatar-offset-x")?.value || 0);
    const oy = Number(qs("#avatar-offset-y")?.value || 0);
    const filter = qs("#avatar-filter")?.value || "none";
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.filter =
      filter === "bright"
        ? "brightness(1.12) contrast(1.04)"
        : filter === "warm"
        ? "sepia(0.22) saturate(1.15)"
        : filter === "cool"
        ? "saturate(1.05) hue-rotate(8deg)"
        : filter === "mono"
        ? "grayscale(1)"
        : "none";
    const scale = Math.max(size / avatarEditorImage.width, size / avatarEditorImage.height) * zoom;
    const w = avatarEditorImage.width * scale;
    const h = avatarEditorImage.height * scale;
    ctx.drawImage(avatarEditorImage, (size - w) / 2 + ox, (size - h) / 2 + oy, w, h);
    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  function openAvatarEditor(dataUrl) {
    avatarOriginalDataUrl = dataUrl;
    avatarEditorImage = new Image();
    avatarEditorImage.onload = () => {
      ["#avatar-zoom", "#avatar-offset-x", "#avatar-offset-y"].forEach((id) => {
        const el = qs(id);
        if (el) el.value = id === "#avatar-zoom" ? "1" : "0";
      });
      if (qs("#avatar-filter")) qs("#avatar-filter").value = "none";
      qs("#avatar-editor-modal").hidden = false;
      drawAvatarEditor();
    };
    avatarEditorImage.src = dataUrl;
  }

  function closeAvatarEditor() {
    const modal = qs("#avatar-editor-modal");
    if (modal) modal.hidden = true;
  }

  function renderPrivacyGrid() {
    const grid = qs("#privacy-grid");
    if (!grid) return;
    const groups = [
      { id: "planning", label: "Planning", keys: ["schedule", "summer", "futurePlan", "futureNotes", "gradReq"] },
      { id: "profile", label: "Profile", keys: ["bio", "grade", "academicLevel", "careerPathway", "pronouns", "phone", "contactEmail", "socialLinks", "gender", "studentType"] },
      { id: "social", label: "Social", keys: ["activities", "networking"] },
    ];
    const active = grid.dataset.activePrivacy || "planning";
    grid.innerHTML = `<div class="privacy-tabs day-tabs">${groups
      .map((g) => `<button type="button" class="day-tab ${active === g.id ? "active" : ""}" data-privacy-tab="${g.id}">${escapeHtml(g.label)}</button>`)
      .join("")}</div><div class="privacy-section-grid"></div>`;
    const section = qs(".privacy-section-grid", grid);
    PRIVACY_FIELDS.filter((pf) => (groups.find((g) => g.id === active)?.keys || []).includes(pf.key)).forEach((pf) => {
      const val = state.profile.privacy[pf.key] || "friends";
      const wrap = document.createElement("label");
      wrap.className = "privacy-row";
      wrap.innerHTML = `<span>${escapeHtml(pf.label)}</span>
        <select data-privacy-key="${pf.key}">
          <option value="school" ${val === "school" ? "selected" : ""}>School Directory</option>
          <option value="friends" ${val === "friends" ? "selected" : ""}>Friends Only</option>
          <option value="private" ${val === "private" ? "selected" : ""}>Only Me</option>
        </select>`;
      section.appendChild(wrap);
    });
    qsa("[data-privacy-tab]", grid).forEach((btn) => {
      btn.addEventListener("click", () => {
        grid.dataset.activePrivacy = btn.getAttribute("data-privacy-tab") || "planning";
        renderPrivacyGrid();
      });
    });
  }

  function isApCourseRow(row) {
    const parsed = parseCourseKey(row.courseKey || "");
    if (parsed.level === "AP") return true;
    return /\bAP\b/i.test(String(row.courseLabel || parsed.title || ""));
  }

  function countApCoursesInJourney() {
    const keys = new Set();
    const note = (row) => {
      if (!isApCourseRow(row)) return;
      keys.add(row.courseKey || normalizeText(row.courseLabel));
    };
    allScheduleRowsForSchool(state.profile.school || state.scheduleSchool).forEach(note);
    (state.pastSchedules || []).forEach((block) => (block.rows || []).forEach(note));
    Object.values(state.futureByGrade || {}).forEach((slot) => {
      [...(slot.primary || []), ...(slot.alternatives || [])].forEach((courseKey) => {
        if (!courseKey) return;
        const parsed = parseCourseKey(courseKey);
        if (parsed.level === "AP" || /\bAP\b/i.test(parsed.title || "")) keys.add(courseKey);
      });
    });
    return keys.size;
  }

  const ACHIEVEMENT_BADGE_STYLES = {
    Verified: { bg: "#2d6a4f", glyph: "✓" },
    Veteran: { bg: "#1d3557", glyph: "V" },
    Friendship: { bg: "#457b9d", glyph: "10" },
    Completion: { bg: "#bc6c25", glyph: "◎" },
    Ambitious: { bg: "#6a4c93", glyph: "AP" },
    Athlete: { bg: "#e76f51", glyph: "🏃" },
    Founder: { bg: "#1b4332", glyph: "◈" },
    Instigator: { bg: "#e9c46a", glyph: "25" },
    "Instigator II": { bg: "#9d0208", glyph: "100" },
  };

  function achievementBadgeHtml(name, unlocked) {
    const style = ACHIEVEMENT_BADGE_STYLES[name] || { bg: "#5c5852", glyph: "★" };
    return `<div class="achievement-badge${unlocked ? "" : " locked"}" style="background:${style.bg}" aria-hidden="true">${escapeHtml(style.glyph)}</div>`;
  }

  function completionAchievementStatus() {
    const scheduleRows = allScheduleRowsForSchool(state.profile.school || state.scheduleSchool).filter(
      (r) => (r.courseKey || "").trim() || (r.courseLabel || "").trim()
    );
    const hasSchedule = scheduleRows.length >= 5;
    const hasActivities = state.activities.length > 0 || (getRegistryUser(userId())?.activities || []).length > 0;
    const hasFuture = Object.values(state.futureByGrade || {}).some((slot) => (slot.primary || []).filter(Boolean).length >= 2);
    const isHigh = schoolTypeFor(state.profile.school || state.scheduleSchool) === "high";
    let gradTracked = true;
    if (isHigh) {
      const rows = [
        ...scheduleRows,
        ...(state.pastSchedules || []).flatMap((g) => (g.rows || []).map((r) => ({ ...r, past: true }))),
      ];
      const byReq = {};
      GRAD_REQUIREMENTS.forEach((r) => (byReq[r.key] = { credits: 0 }));
      const creditSeen = new Set();
      rows.forEach((r) => {
        const parsed = parseCourseKey(r.courseKey || "");
        const req = gradRequirementFor(parsed.subject || r.courseLabel, parsed.title || r.courseLabel);
        if (!byReq[req]) return;
        const creditKey = `${req}:${r.grade || "current"}:${r.semester || "s1"}:${r.courseKey || normalizeText(r.courseLabel)}`;
        if (!creditSeen.has(creditKey)) {
          creditSeen.add(creditKey);
          byReq[req].credits += 5;
        }
      });
      const filledReqs = GRAD_REQUIREMENTS.filter((req) => (byReq[req.key]?.credits || 0) > 0).length;
      gradTracked = filledReqs >= 6;
    }
    const checks = [hasSchedule, hasActivities, hasFuture, gradTracked];
    const done = checks.filter(Boolean).length;
    return {
      unlocked: checks.every(Boolean),
      progress: `${done}/${checks.length} areas complete`,
    };
  }

  function renderAchievements() {
    const grid = qs("#achievement-grid");
    if (!grid) return;
    const verified = getRegistryUser(userId());
    const veteranCutoff = new Date("2026-07-04T00:00:00").getTime();
    const friendCount = listFriendIds().length;
    const chatCount = countUserChatMessagesSent();
    const doesSport = state.activities.some((a) => a.kind === "Sport") || (verified?.activities || []).some((a) => a.kind === "Sport");
    const founder = userId() === ADMIN_EMAIL || verified?.founder;
    const completion = completionAchievementStatus();
    const apCount = countApCoursesInJourney();
    const badges = [
      { name: "Verified", desc: "Be verified in the directory.", unlocked: !!verified?.verified },
      { name: "Veteran", desc: "Verified before July 4, 2026.", unlocked: !!verified?.verified && (verified.updatedAt || Date.now()) < veteranCutoff },
      { name: "Friendship", desc: "Have at least 10 friends.", unlocked: friendCount >= 10, progress: `${friendCount}/10 friends` },
      { name: "Completion", desc: "Complete schedule, activities, future plan, and grad tracking.", unlocked: completion.unlocked, progress: completion.progress },
      { name: "Ambitious", desc: "Plan more than 11 AP courses across your high school journey.", unlocked: apCount > 11, progress: `${apCount}/12 AP courses` },
      { name: "Athlete", desc: "Add a sport to your activities.", unlocked: doesSport },
      { name: "Instigator", desc: "Send at least 25 chat messages to friends.", unlocked: chatCount >= 25, progress: `${Math.min(chatCount, 25)}/25 messages` },
      { name: "Instigator II", desc: "Send at least 100 chat messages to friends.", unlocked: chatCount >= 100, progress: `${Math.min(chatCount, 100)}/100 messages` },
      ...(founder ? [{ name: "Founder", desc: "Early CourseSync founder achievement.", unlocked: true }] : []),
    ];
    grid.innerHTML = badges
      .map(
        (b) => `<article class="achievement-card ${b.unlocked ? "unlocked" : "locked"}">
          ${achievementBadgeHtml(b.name, b.unlocked)}
          <div class="achievement-body"><strong>${escapeHtml(b.name)}</strong><p>${escapeHtml(b.desc)}</p>${b.progress ? `<span class="achievement-progress">${escapeHtml(b.progress)}</span>` : ""}</div>
        </article>`
      )
      .join("");
  }

  function peerAchievementBadges(u, peerId) {
    if (!u?.verified) return [];
    const veteranCutoff = new Date("2026-07-04T00:00:00").getTime();
    const badges = [];
    badges.push({ name: "Verified", unlocked: true });
    if ((u.updatedAt || Date.now()) < veteranCutoff) badges.push({ name: "Veteran", unlocked: true });
    if ((u.activities || []).some((a) => a.kind === "Sport")) badges.push({ name: "Athlete", unlocked: true });
    const snap = u.scheduleSnapshot || [];
    const apKeys = new Set();
    snap.forEach((r) => {
      const parsed = parseCourseKey(r.courseKey || "");
      if (parsed.level === "AP" || /\bAP\b/i.test(parsed.title || r.courseLabel || "")) apKeys.add(r.courseKey || r.courseLabel);
    });
    Object.values(u.futureByGrade || {}).forEach((slot) => {
      [...(slot.primary || []), ...(slot.alternatives || [])].filter(Boolean).forEach((k) => {
        const parsed = parseCourseKey(k);
        if (parsed.level === "AP" || /\bAP\b/i.test(parsed.title || "")) apKeys.add(k);
      });
    });
    if (apKeys.size > 11) badges.push({ name: "Ambitious", unlocked: true });
    if (snap.length >= 5 && (u.activities || []).length) badges.push({ name: "Completion", unlocked: true });
    if (peerId === ADMIN_EMAIL || u.founder) badges.push({ name: "Founder", unlocked: true });
    return badges;
  }

  function renderViewpointSettings() {
    const host = qs("#viewpoint-settings-host");
    if (!host) return;
    const tabs = `<div class="viewpoint-tabs day-tabs" role="tablist" aria-label="Viewpoint categories">
      ${VIEWPOINT_TABS.map(
        (t) =>
          `<button type="button" class="day-tab ${activeViewpointTab === t.id ? "active" : ""}" data-viewpoint-tab="${t.id}">${escapeHtml(t.label)}</button>`
      ).join("")}
    </div>`;
    const panels = VIEWPOINT_TABS.map((tab) => {
      const toggles = VIEWPOINT_TOGGLES[tab.id] || [];
      const items = toggles
        .map(
          (t) => `<label class="viewpoint-toggle-row">
            <input type="checkbox" data-viewpoint-toggle="${escapeHtml(t.key)}" />
            <span><strong>${escapeHtml(t.label)}</strong><small>${escapeHtml(t.desc)}</small></span>
          </label>`
        )
        .join("");
      return `<div class="viewpoint-panel" data-viewpoint-panel="${tab.id}" ${activeViewpointTab === tab.id ? "" : "hidden"}>${items}</div>`;
    }).join("");
    host.innerHTML = tabs + panels;
    qsa("[data-viewpoint-toggle]", host).forEach((el) => {
      el.checked = state.settings?.viewpoint?.[el.getAttribute("data-viewpoint-toggle")] !== false;
    });
    qsa("[data-viewpoint-tab]", host).forEach((btn) => {
      btn.addEventListener("click", () => {
        activeViewpointTab = btn.getAttribute("data-viewpoint-tab") || "profile";
        renderViewpointSettings();
      });
    });
    qsa("[data-viewpoint-toggle]", host).forEach((el) => {
      el.addEventListener("change", () => {
        const key = el.getAttribute("data-viewpoint-toggle");
        if (!state.settings.viewpoint) state.settings.viewpoint = {};
        state.settings.viewpoint[key] = el.checked;
        saveState(state);
      });
    });
  }

  function renderCardCustomizationSettings() {
    const host = qs("#card-customization-host");
    if (!host) return;
    const settings = state.settings?.cardCustomization || {};
    const tabs = `<div class="card-customization-tabs" role="tablist" aria-label="Card customization sections">
      <button type="button" class="card-customization-tab ${activeCardCustomizationTab === "general" ? "active" : ""}" data-card-custom-tab="general">General</button>
      <button type="button" class="card-customization-tab ${activeCardCustomizationTab === "yourself" ? "active" : ""}" data-card-custom-tab="yourself">Yourself</button>
    </div>`;
    const generalPanel = `
      <div class="card-customization-panel" data-card-custom-panel="general" ${activeCardCustomizationTab === "general" ? "" : "hidden"}>
        <label class="viewpoint-toggle-row">
          <input type="checkbox" data-card-custom-toggle="showGrade" />
          <span><strong>Grade</strong><small>Show grade on directory cards.</small></span>
        </label>
        <label class="viewpoint-toggle-row">
          <input type="checkbox" data-card-custom-toggle="showGender" />
          <span><strong>Gender</strong><small>Show gender on directory cards.</small></span>
        </label>
        <label class="viewpoint-toggle-row">
          <input type="checkbox" data-card-custom-toggle="showAcademicLevel" />
          <span><strong>Academic level</strong><small>Show the academic level line.</small></span>
        </label>
        <label class="viewpoint-toggle-row">
          <input type="checkbox" data-card-custom-toggle="showStarredMatches" />
          <span><strong>Starred course matches</strong><small>Show how many starred courses overlap.</small></span>
        </label>
        <label class="viewpoint-toggle-row">
          <input type="checkbox" data-card-custom-toggle="showMutualFriends" />
          <span><strong>Mutual friends</strong><small>Show mutual-friend counts where relevant.</small></span>
        </label>
      </div>`;
    const yourselfPanel = `
      <div class="card-customization-panel" data-card-custom-panel="yourself" ${activeCardCustomizationTab === "yourself" ? "" : "hidden"}>
        <label class="viewpoint-toggle-row">
          <input type="checkbox" data-card-custom-toggle="showDirectoryLabel" />
          <span><strong>Show your directory label</strong><small>Display your custom label on your own card.</small></span>
        </label>
        <label class="viewpoint-toggle-row">
          <input type="checkbox" data-card-custom-toggle="showVisibilityNote" />
          <span><strong>Show visibility note</strong><small>Keep the “Visible to classmates…” note on your own card.</small></span>
        </label>
      </div>`;
    host.innerHTML = tabs + (activeCardCustomizationTab === "yourself" ? yourselfPanel : generalPanel);
    qsa("[data-card-custom-toggle]", host).forEach((el) => {
      const key = el.getAttribute("data-card-custom-toggle");
      el.checked = settings[key] !== false;
    });
    qsa("[data-card-custom-tab]", host).forEach((btn) => {
      btn.addEventListener("click", () => {
        activeCardCustomizationTab = btn.getAttribute("data-card-custom-tab") || "general";
        renderCardCustomizationSettings();
      });
    });
    qsa("[data-card-custom-toggle]", host).forEach((el) => {
      el.addEventListener("change", () => {
        const key = el.getAttribute("data-card-custom-toggle");
        if (!state.settings.cardCustomization) state.settings.cardCustomization = {};
        state.settings.cardCustomization[key] = el.checked;
        saveState(state);
        renderDirectory();
      });
    });
  }

  function renderProfilePanel() {
    qs("#pf-name").value = state.profile.displayName;
    qs("#pf-phone").value = state.profile.phone;
    qs("#pf-email").value = state.profile.contactEmail || session.email || "";
    qs("#pf-links").value = state.profile.socialLinks || "";
    qs("#pf-gender").value = state.profile.gender || "";
    qs("#pf-grade").value = state.profile.grade;
    qs("#pf-academic").value = state.profile.academicLevel;
    qs("#pf-career").value = state.profile.careerPathway || "";
    qs("#pf-directory-label").value = state.profile.directoryLabel || "";
    qs("#pf-bio").value = state.profile.bio;
    qs("#pf-pronouns").value = state.profile.pronouns;
    if (qs("#pf-accent")) qs("#pf-accent").value = state.profile.accent;
    applyAppearance();
    const prev = qs("#avatar-preview");
    if (prev) {
      if (state.profile.avatarDataUrl) prev.innerHTML = `<img src="${state.profile.avatarDataUrl}" alt="" class="avatar-img" />`;
      else {
        const pr = AV_PRESETS.find((p) => p.id === state.profile.avatarPreset) || AV_PRESETS[0];
        const L = (state.profile.displayName || "S").trim().charAt(0).toUpperCase();
        prev.innerHTML = `<span class="avatar-initial" style="background:${pr.color}">${escapeHtml(L)}</span>`;
      }
    }
    const apGrid = qs("#avatar-presets");
    if (apGrid) {
      apGrid.innerHTML = "";
      AV_PRESETS.forEach((p) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "avatar-preset" + (state.profile.avatarPreset === p.id ? " selected" : "");
        b.style.background = p.color;
        b.addEventListener("click", () => {
          state.profile.avatarPreset = p.id;
          state.profile.avatarDataUrl = "";
          saveState(state);
          renderProfilePanel();
        });
        apGrid.appendChild(b);
      });
    }
    const savedGrid = qs("#avatar-saved-options");
    if (savedGrid) {
      savedGrid.innerHTML = "";
      const saved = state.profile.avatarOptions || [];
      const limit = savedGrid.dataset.expanded === "true" ? saved.length : 3;
      saved.slice(0, limit).forEach((src, idx) => {
        const wrap = document.createElement("div");
        wrap.className = "avatar-photo-wrap";
        wrap.innerHTML = `<button type="button" class="avatar-photo-option${state.profile.avatarDataUrl === src ? " selected" : ""}"><img src="${src}" alt="Saved profile option ${idx + 1}" /></button><button type="button" class="avatar-remove" aria-label="Remove saved photo ${idx + 1}">×</button>`;
        qs(".avatar-photo-option", wrap).addEventListener("click", () => {
          state.profile.avatarDataUrl = src;
          saveState(state);
          renderProfilePanel();
          renderTopbarUser();
        });
        qs(".avatar-remove", wrap).addEventListener("click", () => {
          state.profile.avatarOptions = saved.filter((x) => x !== src);
          if (state.profile.avatarDataUrl === src) state.profile.avatarDataUrl = "";
          saveState(state);
          renderProfilePanel();
          renderTopbarUser();
        });
        savedGrid.appendChild(wrap);
      });
      if (saved.length > 3 && savedGrid.dataset.expanded !== "true") {
        const more = document.createElement("button");
        more.type = "button";
        more.className = "btn btn-outline btn-sm";
        more.textContent = `More (${saved.length - 3})`;
        more.addEventListener("click", () => {
          savedGrid.dataset.expanded = "true";
          renderProfilePanel();
        });
        savedGrid.appendChild(more);
      }
      if (!state.profile.avatarOptions?.length) savedGrid.innerHTML = '<p class="muted small">No saved photos yet.</p>';
    }
    renderAchievements();
    renderTopbarUser();
  }

  function renderSettingsPanel() {
    if (qs("#pf-accent")) qs("#pf-accent").value = state.profile.accent || "#2d6a4f";
    if (qs("#setting-theme")) qs("#setting-theme").value = state.settings?.theme || "light";
    if (qs("#setting-font-family")) qs("#setting-font-family").value = state.settings?.fontFamily || "source";
    if (qs("#setting-text-scale")) qs("#setting-text-scale").value = state.settings?.textScale || "normal";
    if (qs("#setting-text-color")) qs("#setting-text-color").value = state.settings?.textColor || "charcoal";
    if (qs("#setting-require-verification")) {
      qs("#setting-require-verification").checked = state.settings?.requireVerificationCode !== false;
    }
    qsa("[data-notify-setting]").forEach((el) => {
      el.checked = state.settings?.notifications?.[el.getAttribute("data-notify-setting")] !== false;
    });
    renderViewpointSettings();
    renderCardCustomizationSettings();
    applyAppearance();
    applyFeatureVisibility();
    renderPrivacyGrid();
    const vst = qs("#settings-verification-status");
    if (vst) {
      vst.textContent =
        state.settings?.requireVerificationCode !== false
          ? "Multi-authorization is on. Log in will ask for a 6-digit code after your password."
          : "Multi-authorization is off. Log in will only use email and password on this browser.";
    }
    const schoolSel = qs("#setting-switch-school");
    if (schoolSel) {
      const schools = Object.keys(window.COMMUNITY_SCHOOLS || {});
      schoolSel.innerHTML = schools
        .map((s) => `<option value="${escapeHtml(s)}"${s === state.profile.school ? " selected" : ""}>${escapeHtml(s)}</option>`)
        .join("");
    }
    const switchStatus = qs("#settings-switch-school-status");
    if (switchStatus && !switchStatus.dataset.pinned) switchStatus.textContent = `Current school: ${state.profile.school || "Not set"}.`;
  }

  qs("#sidebar-update-log-trigger")?.addEventListener("click", () => {
    openUpdateLogModal();
  });

  qs("#update-log-close")?.addEventListener("click", () => {
    closeUpdateLogModal();
  });

  qs("#update-log-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "update-log-modal") closeUpdateLogModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeUpdateLogModal();
  });

  qs("#pf-directory-label")?.addEventListener("input", () => {
    state.profile.directoryLabel = qs("#pf-directory-label").value.trim();
    saveState(state);
    renderDirectory();
  });
  qs("#pf-directory-label")?.addEventListener("change", () => {
    state.profile.directoryLabel = qs("#pf-directory-label").value.trim();
    saveState(state);
    renderDirectory();
  });

  qs("#academic-focus-info")?.addEventListener("click", () => {
    const info = `Academic Focus explains how intensely you tend to pursue coursework and opportunities.\n\nStandard: Graduation requirements first, little to no weighted classes.\nRelaxing Time: Interests and balance matter more than difficulty.\nAccelerated: A few honors or APs, but not a full-heavy schedule.\nAmbitious: Taking over two weighted courses every year.\nAdvanced: Over four weighted courses a year.\nAP Oriented: Primarily focused on AP courses and exams.\nNo Life: Maximizing AP opportunities and workload.`;
    alert(info);
  });

  qs("#profile-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const phone = qs("#pf-phone").value.replace(/\D/g, "");
    if (phone.length < 10) {
      alert("Enter a valid phone number (at least 10 digits).");
      return;
    }
    if (!qs("#pf-gender").value) {
      alert("Please select gender for the verified directory.");
      return;
    }
    const nextContactEmail = qs("#pf-email").value.trim() || session.email || "";
    const previousContactEmail = (state.profile.contactEmail || session.email || "").trim();
    if (nextContactEmail && previousContactEmail && nextContactEmail !== previousContactEmail) {
      const confirmEmailChange = window.confirm(`Change your visible email from ${previousContactEmail} to ${nextContactEmail}?`);
      if (!confirmEmailChange) {
        qs("#pf-email").value = previousContactEmail;
        return;
      }
    }
    state.profile.displayName = qs("#pf-name").value.trim();
    state.profile.phone = qs("#pf-phone").value.trim();
    state.profile.contactEmail = nextContactEmail;
    state.profile.socialLinks = qs("#pf-links").value.trim();
    state.profile.gender = qs("#pf-gender").value;
    state.profile.grade = qs("#pf-grade").value;
    state.profile.academicLevel = qs("#pf-academic").value;
    state.profile.careerPathway = qs("#pf-career").value;
    state.profile.directoryLabel = qs("#pf-directory-label").value.trim();
    state.profile.bio = qs("#pf-bio").value.trim();
    state.profile.pronouns = qs("#pf-pronouns").value.trim();
    if (qs("#pf-accent")) state.profile.accent = qs("#pf-accent").value;
    state.scheduleSchool = state.profile.school;
    state.activeCommunitySchool = state.profile.school;
    state.followedCommunities = [state.profile.school];
    applyAppearance();
    saveState(state);
    publishToRegistry("Profile saved and published.");
    qs("#profile-saved").hidden = false;
    setTimeout(() => (qs("#profile-saved").hidden = true), 2200);
    renderHomePanel();
    renderDirectory();
  });

  ["#avatar-zoom", "#avatar-offset-x", "#avatar-offset-y", "#avatar-filter"].forEach((id) => {
    qs(id)?.addEventListener("input", drawAvatarEditor);
    qs(id)?.addEventListener("change", drawAvatarEditor);
  });

  qs("#avatar-upload")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      openAvatarEditor(reader.result);
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  });

  qs("#avatar-apply")?.addEventListener("click", () => {
    const canvas = qs("#avatar-editor-canvas");
    if (!canvas) return;
    const data = canvas.toDataURL("image/png");
    state.profile.avatarDataUrl = data;
    state.profile.avatarOptions = [data, ...(state.profile.avatarOptions || []).filter((x) => x !== data && x !== avatarOriginalDataUrl)].slice(0, 6);
    state.profile.avatarPreset = "";
    saveState(state);
    closeAvatarEditor();
    renderProfilePanel();
    renderTopbarUser();
  });

  qs("#avatar-editor-cancel")?.addEventListener("click", closeAvatarEditor);
  qs("#avatar-editor-modal")?.addEventListener("click", (e) => {
    if (e.target === qs("#avatar-editor-modal")) closeAvatarEditor();
  });
  qs("#avatar-editor-reset")?.addEventListener("click", () => {
    if (avatarOriginalDataUrl) openAvatarEditor(avatarOriginalDataUrl);
  });

  qs("#avatar-random-color")?.addEventListener("click", () => {
    const pick = AV_PRESETS[Math.floor(Math.random() * AV_PRESETS.length)];
    state.profile.avatarPreset = pick.id;
    state.profile.avatarDataUrl = "";
    state.profile.accent = pick.color;
    saveState(state);
    applyAppearance();
    renderProfilePanel();
  });

  qs("#class-detail-close")?.addEventListener("click", () => {
    qs("#class-detail-modal").hidden = true;
  });
  qs("#class-detail-modal")?.addEventListener("click", (e) => {
    if (e.target === qs("#class-detail-modal")) qs("#class-detail-modal").hidden = true;
  });

  ["#pf-accent", "#setting-theme", "#setting-font-family", "#setting-text-scale", "#setting-text-color"].forEach((sel) => {
    qs(sel)?.addEventListener("input", () => {
      const st = qs("#settings-save-status");
      if (st) st.textContent = "Appearance changes are ready to save.";
    });
    qs(sel)?.addEventListener("change", () => {
      const st = qs("#settings-save-status");
      if (st) st.textContent = "Appearance changes are ready to save.";
    });
  });

  qsa("[data-password-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.closest(".password-field-wrap")?.querySelector("input");
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.textContent = show ? "Hide" : "Show";
    });
  });

  qsa("[data-notify-setting]").forEach((el) => {
    el.addEventListener("change", () => {
      const key = el.getAttribute("data-notify-setting");
      state.settings.notifications[key] = el.checked;
      saveState(state);
    });
  });

  qs("#notifications-delete-old")?.addEventListener("click", () => {
    const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 14;
    setJson(NOTIFICATIONS_KEY, getJson(NOTIFICATIONS_KEY, []).filter((n) => Number(n.at || 0) >= cutoff));
    renderNotifications();
  });

  qs("#privacy-grid")?.addEventListener("change", (e) => {
    const t = e.target;
    if (t.matches && t.matches("select[data-privacy-key]")) {
      state.profile.privacy[t.getAttribute("data-privacy-key")] = t.value;
      saveState(state);
    }
  });

  qs("#settings-save")?.addEventListener("click", () => {
    if (qs("#pf-accent")) state.profile.accent = qs("#pf-accent").value;
    if (qs("#setting-theme")) state.settings.theme = qs("#setting-theme").value;
    if (qs("#setting-font-family")) state.settings.fontFamily = qs("#setting-font-family").value;
    if (qs("#setting-text-scale")) state.settings.textScale = qs("#setting-text-scale").value;
    if (qs("#setting-text-color")) state.settings.textColor = qs("#setting-text-color").value;
    if (qs("#setting-show-empty-days")) state.settings.showEmptyDays = qs("#setting-show-empty-days").checked;
    qsa("[data-viewpoint-toggle]", qs("#viewpoint-settings-host") || document).forEach((el) => {
      if (!state.settings.viewpoint) state.settings.viewpoint = {};
      state.settings.viewpoint[el.getAttribute("data-viewpoint-toggle")] = el.checked;
    });
    if (qs("#setting-show-empty-days")) state.settings.showEmptyDays = qs("#setting-show-empty-days").checked;
    if (qs("#setting-require-verification")) state.settings.requireVerificationCode = qs("#setting-require-verification").checked;
    qsa("[data-notify-setting]").forEach((el) => {
      state.settings.notifications[el.getAttribute("data-notify-setting")] = el.checked;
    });
    applyAppearance();
    applyFeatureVisibility();
    saveState(state);
    if (qs("#panel-home") && !qs("#panel-home").hidden) renderHomePanel();
    const st = qs("#settings-save-status");
    if (st) {
      st.textContent = "Appearance saved.";
      setTimeout(() => (st.textContent = ""), 1800);
    }
  });

  qs("#settings-password-save")?.addEventListener("click", () => {
    const p1 = qs("#settings-new-password")?.value || "";
    const p2 = qs("#settings-confirm-password")?.value || "";
    const st = qs("#settings-password-status");
    if (p1.length < 8) {
      if (st) st.textContent = "Password must be at least 8 characters.";
      return;
    }
    if (p1 !== p2) {
      if (st) st.textContent = "Passwords do not match.";
      return;
    }
    const accounts = getJson(ACCOUNTS_KEY, {});
    const id = userId();
    accounts[id] = {
      ...(accounts[id] || {}),
      email: id,
      password: p1,
      name: state.profile.displayName || session.name || "",
      school: state.profile.school,
      phone: state.profile.phone,
      updatedAt: Date.now(),
    };
    setJson(ACCOUNTS_KEY, accounts);
    qs("#settings-new-password").value = "";
    qs("#settings-confirm-password").value = "";
    if (st) {
      st.textContent = "Password updated.";
      setTimeout(() => (st.textContent = ""), 1800);
    }
  });

  qs("#setting-require-verification")?.addEventListener("change", (e) => {
    state.settings.requireVerificationCode = e.target.checked;
    saveState(state);
    const st = qs("#settings-verification-status");
    if (st) {
      st.textContent = e.target.checked
        ? "Multi-authorization is on. Log in will ask for a 6-digit code after your password."
        : "Multi-authorization is off. Log in will only use email and password on this browser.";
    }
  });

  ["#networking-board-subject-filter", "#networking-board-age-filter", "#networking-message-filter"].forEach((sel) => {
    qs(sel)?.addEventListener("change", () => {
      saveNetworkingFiltersFromUi();
      renderDiscussionBoard("discussion");
      renderDiscussionBoard("home");
      renderFriendsPanel();
    });
  });

  qs("#settings-data-reset")?.addEventListener("click", () => {
    const ok = confirm(
      "Reset all progress? Your email, phone, password, and login stay the same. Schedules, plans, past classes, and profile details will be cleared."
    );
    if (!ok) return;
    const typed = prompt('Type RESET to confirm progress reset.');
    if (typed !== "RESET") return;
    resetUserProgress();
    refreshDashboardAfterProgressReset();
    showPanel("home");
  });

  qs("#settings-switch-school-btn")?.addEventListener("click", () => {
    const next = qs("#setting-switch-school")?.value;
    const current = state.profile.school;
    const status = qs("#settings-switch-school-status");
    if (!next || next === current) {
      if (status) status.textContent = next === current ? "You are already on this school." : "Choose a school first.";
      return;
    }
    const ok = confirm(
      `Switch to ${next}? Your email and phone stay the same, but all schedules, plans, and progress from ${current} will be permanently removed.`
    );
    if (!ok) return;
    resetUserProgress({ newSchool: next });
    if (status) {
      status.dataset.pinned = "1";
      status.textContent = `Switched to ${next}. Previous-school progress was cleared.`;
    }
    refreshDashboardAfterProgressReset();
    showPanel("home");
  });

  ensureCommunitySeeds();
  applyFeatureVisibility();
  renderTopbarUser();
  renderCurrentDate();
  renderNotifications();
  rebuildEnrollmentAndRatings();
  populateExplorerCourseFilterSelects();
  showPanel("home");
  initSharedCommunityData();
})();
