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
  const REACTIONS_KEY = "coursesync_reactions_v1";
  const RECOMMENDATIONS_KEY = "coursesync_recommendations_v1";
  const NOTIFICATIONS_KEY = "coursesync_notifications_v1";
  const ADMIN_EMAIL = "calvin.kwok888@gmail.com";

  const LEVEL_ORDER = ["AP", "Honors", "Accelerated", "CP", "College Prep", "Elective"];
  const BELL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const SEMESTERS = [
    { key: "s1", label: "Semester 1" },
    { key: "s2", label: "Semester 2" },
  ];
  const GRADE_KEYS = ["6", "7", "8", "9", "10", "11", "12"];
  const ACTIVITY_PAGE_SIZE = 4;

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
    { key: "bio", label: "Bio" },
    { key: "grade", label: "Grade" },
    { key: "academicLevel", label: "Academic Level" },
    { key: "careerPathway", label: "Career Pathway" },
    { key: "pronouns", label: "Pronouns" },
    { key: "phone", label: "Phone Number" },
    { key: "gender", label: "Gender" },
    { key: "studentType", label: "Student Type" },
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
  const session = loadSession();

  function defaultPrivacy() {
    return {
      schedule: "friends",
      activities: "friends",
      summer: "friends",
      futurePlan: "friends",
      bio: "school",
      grade: "school",
      academicLevel: "school",
      careerPathway: "school",
      pronouns: "school",
      phone: "private",
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
    return { primary: [""], alternatives: [""], notes: "" };
  }

  function defaultFutureByGrade() {
    const o = {};
    GRADE_KEYS.forEach((g) => {
      o[g] = emptyFutureSlot();
    });
    return o;
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
      bio: "",
      pronouns: "",
      avatarDataUrl: "",
      avatarOptions: [],
      avatarPreset: "emerald",
      accent: "#2d6a4f",
      privacy: defaultPrivacy(),
    },
    settings: {
      theme: "light",
      notifications: {
        friendRequests: true,
        messages: true,
        courseRecommendations: true,
        networkingPosts: true,
        communityChanges: true,
      },
    },
    scheduleSchool: "Emerald High School",
    scheduleBellDay: "Monday",
    myClassesDayTab: "Monday",
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
        notifications: { ...d.settings.notifications, ...parsed.settings?.notifications },
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
          notes: parsed.futureAltNotes || "",
        };
      }
    }
    if (!Array.isArray(out.followedCommunities)) out.followedCommunities = [];
    if (out.activeCommunitySchool === undefined || out.activeCommunitySchool === null) out.activeCommunitySchool = "";
    if (out.emeraldBackup === undefined) out.emeraldBackup = null;
    if (!Array.isArray(out.profile.avatarOptions)) out.profile.avatarOptions = [];
    if (!Array.isArray(out.pastSchedules)) out.pastSchedules = [];
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

  function normalizeSemesterSchedule(value) {
    if (value?.s1 || value?.s2) {
      return { s1: { ...emptyWeek(), ...value.s1 }, s2: { ...emptyWeek(), ...value.s2 } };
    }
    return { s1: { ...emptyWeek(), ...(value || {}) }, s2: emptyWeek() };
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
    return rows;
  }
  function applyAppearance() {
    document.documentElement.style.setProperty("--user-accent", state.profile.accent || "#2d6a4f");
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
    return "Elective";
  }

  const GRAD_REQUIREMENTS = [
    { key: "History/Social Science", dusd: "30 credits", uc: "A. History: 2 years", detail: "World History, U.S. History, Civics, and Economics build the social science foundation." },
    { key: "English", dusd: "40 credits", uc: "B. English: 4 years", detail: "College-prep reading, writing, discussion, and argument development across all four years." },
    { key: "Mathematics", dusd: "20 credits", uc: "C. Mathematics: 3 years, 4 recommended", detail: "Algebra, Geometry, Algebra 2 or higher math progressions strengthen college readiness." },
    { key: "Science", dusd: "20 credits", uc: "D. Science: 2 years, 3-4 recommended", detail: "Biological and physical science courses, with lab and applied science options." },
    { key: "World Language", dusd: "10-20 credits", uc: "E. Language Other Than English: 2 years", detail: "Two levels of the same language, with a third year recommended for stronger UC/CSU preparation." },
  ];

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
      return JSON.parse(localStorage.getItem(REGISTRY_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function setRegistry(reg) {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg));
  }

  function getRegistryUser(id) {
    return getRegistry()[id] || null;
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
    return state.activeCommunitySchool || state.profile.school || "Emerald High School";
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
    if ((a.weekday || "") !== (b.weekday || "")) return false;
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

  function courseCommunityStats(courseKey, school = getActiveCommunitySchool()) {
    const reg = getRegistry();
    let count = 0;
    let ratingSum = 0;
    let ratingCount = 0;
    Object.values(reg).forEach((u) => {
      if (!u.verified || !u.scheduleSnapshot || u.school !== school) return;
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
    const feed = JSON.parse(localStorage.getItem(FEED_KEY) || "[]");
    feed.unshift({ actorId, name, type, detail, at: Date.now() });
    localStorage.setItem(FEED_KEY, JSON.stringify(feed.slice(0, 150)));
  }

  function publishToRegistry(message) {
    const id = userId();
    if (!id) return;
    const reg = getRegistry();
    const merged = mergeFutureListsForPublish();
    reg[id] = {
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
    if (grade && c.grades?.length && !c.grades.map(String).includes(String(grade))) return false;
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

  function getReactions(id) {
    return getJson(REACTIONS_KEY, {})[id] || {};
  }

  function addReaction(id, emoji) {
    const all = getJson(REACTIONS_KEY, {});
    if (!all[id]) all[id] = {};
    all[id][emoji] = (all[id][emoji] || 0) + 1;
    setJson(REACTIONS_KEY, all);
  }

  function reactionHtml(id) {
    const cur = getReactions(id);
    return `<div class="reaction-row" data-react-target="${escapeHtml(id)}">${["👍", "🔥", "❤️", "😂"].map((e) => `<button type="button" class="reaction-btn" data-react="${e}">${e} ${cur[e] || ""}</button>`).join("")}</div>`;
  }

  function wireReactions(root = document, after = () => {}) {
    qsa("[data-react-target]", root).forEach((wrap) => {
      qsa("[data-react]", wrap).forEach((btn) => {
        btn.addEventListener("click", () => {
          addReaction(wrap.getAttribute("data-react-target"), btn.getAttribute("data-react"));
          after();
        });
      });
    });
  }

  function pushNotification(text, type = "update") {
    const map = {
      request: "friendRequests",
      message: "messages",
      recommendation: "courseRecommendations",
      networking: "networkingPosts",
      community: "communityChanges",
    };
    const settingKey = map[type];
    if (settingKey && state.settings?.notifications?.[settingKey] === false) return;
    const list = getJson(NOTIFICATIONS_KEY, []);
    list.unshift({ text, type, at: Date.now(), read: false });
    setJson(NOTIFICATIONS_KEY, list.slice(0, 60));
    renderNotifications();
  }

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
  function getNetwork() {
    try {
      const n = JSON.parse(localStorage.getItem(NETWORK_KEY) || "{}");
      if (!Array.isArray(n.requests)) n.requests = [];
      if (!Array.isArray(n.friends)) n.friends = [];
      if (!Array.isArray(n.closeRequests)) n.closeRequests = [];
      if (!Array.isArray(n.closeFriends)) n.closeFriends = [];
      return n;
    } catch {
      return { requests: [], friends: [], closeRequests: [], closeFriends: [] };
    }
  }

  function saveNetwork(n) {
    localStorage.setItem(NETWORK_KEY, JSON.stringify(n));
  }

  function friendPair(a, b) {
    return [a, b].sort().join("|||");
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
    if (!me || peerId === me) return;
    const n = getNetwork();
    if (isFriend(peerId)) return;
    if (n.requests.some((r) => r.from === me && r.to === peerId)) return;
    n.requests.push({ from: me, to: peerId, at: Date.now() });
    saveNetwork(n);
  }

  function acceptFriend(peerId) {
    const me = userId();
    const n = getNetwork();
    n.requests = n.requests.filter((r) => !(r.from === peerId && r.to === me));
    if (!n.friends.some((f) => friendPair(f.a, f.b) === friendPair(me, peerId))) {
      n.friends.push({ a: me, b: peerId, since: Date.now() });
    }
    saveNetwork(n);
  }

  function declineFriend(peerId) {
    const me = userId();
    const n = getNetwork();
    n.requests = n.requests.filter((r) => !(r.from === peerId && r.to === me));
    saveNetwork(n);
  }

  function cancelOutgoing(peerId) {
    const me = userId();
    const n = getNetwork();
    n.requests = n.requests.filter((r) => !(r.from === me && r.to === peerId));
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
    const n = getNetwork();
    n.closeRequests = n.closeRequests.filter((r) => !(r.from === peerId && r.to === me));
    saveNetwork(n);
  }

  function cancelCloseOutgoing(peerId) {
    const me = userId();
    const n = getNetwork();
    n.closeRequests = n.closeRequests.filter((r) => !(r.from === me && r.to === peerId));
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
  const panelIds = ["home", "snapshot", "explore", "schedule", "future", "grad", "courses", "classes", "community", "discussion", "friends", "profile", "settings"];
  const panelTitles = {
    home: "Main",
    snapshot: "My Snapshot",
    explore: "Explore",
    schedule: "Current Schedule",
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
  let commentsTarget = null;
  let activityFeedPage = 0;
  const trendingModes = { home: "course", explore: "course" };
  let requestMode = "friends";

  function showPanel(id) {
    if (id === "grad" && schoolTypeFor(getActiveCommunitySchool()) !== "high") id = "home";
    qsa('[data-panel="grad"]').forEach((btn) => {
      btn.hidden = schoolTypeFor(getActiveCommunitySchool()) !== "high";
    });
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
    const unread = list.filter((n) => !n.read).length;
    const count = qs("#notification-count");
    const box = qs("#notification-list");
    if (count) count.textContent = String(unread);
    if (!box) return;
    const auto = [
      { text: "Community highlights now summarize active courses, classmates, ratings, comments, and recommendations.", at: Date.now(), type: "notice" },
      ...(state.settings?.notifications?.friendRequests === false
        ? []
        : getNetwork().requests.filter((r) => r.to === userId()).map((r) => ({ text: `${getRegistryUser(r.from)?.displayName || r.from} sent you a friend request.`, at: Date.now(), type: "request" }))),
    ];
    const merged = [...auto, ...list].slice(0, 8);
    box.innerHTML = merged.length
      ? merged
          .map((n) => {
            const label = n.type === "notice" ? "CourseSync" : n.type || "Alert";
            return `<div class="notification-item"><strong>${escapeHtml(label)}</strong><p>${escapeHtml(n.text)}</p></div>`;
          })
          .join("")
      : '<p class="muted small">No alerts right now.</p>';
  }

  qs("#notification-trigger")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const drop = qs("#notification-dropdown");
    if (!drop) return;
    drop.hidden = !drop.hidden;
    qs("#notification-trigger")?.setAttribute("aria-expanded", drop.hidden ? "false" : "true");
  });

  function renderHomePanel() {
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
    renderFriendActivity();
    showExploreCard("course", "#home-explore-panel-body");
    renderCareerOutline();
    renderTrending("home");
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
      ],
      "STEM / Engineering": [
        "Prioritize math sequencing and lab science: calculus readiness, physics, chemistry, and design projects make engineering pathways easier to enter.",
        "Keep an engineering notebook for projects: requirements, sketches, failed tests, revisions, and final evidence are exactly how engineers think.",
        "Join a build-focused activity such as robotics, Science Olympiad, research, or maker projects where iteration matters more than perfect first attempts.",
      ],
      "Health / Medicine": [
        "Take biology and chemistry seriously, then add anatomy, psychology, sports medicine, or health pathway courses when available.",
        "Build service habits early: volunteering, tutoring, caregiving, or clinic-adjacent experiences help test whether patient-centered work fits you.",
        "Practice precise notes, calm communication, and ethical decision-making; medicine rewards consistency and trust as much as academic strength.",
      ],
      "Business / Entrepreneurship": [
        "Pair business electives with statistics, economics, writing, and leadership because strong founders understand people, numbers, and persuasion.",
        "Start small: sell a product, run an event budget, build a club sponsorship plan, or analyze a local business problem with real data.",
        "Track outcomes and lessons learned; a thoughtful failure with numbers and reflection is more useful than a vague success story.",
      ],
      "Arts / Media / Design": [
        "Create a process portfolio: sketches, drafts, critiques, revisions, and finished work show growth better than final images alone.",
        "Choose courses and clubs that create deadlines for publishing, performing, editing, or presenting because creative careers depend on delivery.",
        "Study audience and constraints: design is strongest when you can explain who it serves, why choices were made, and what changed after feedback.",
      ],
      "Education / Public Service": [
        "Look for tutoring, mentoring, leadership, peer support, or service roles where you practice explaining ideas to different kinds of people.",
        "Take courses that strengthen writing, psychology, history, government, and communication because public service depends on context and trust.",
        "Keep examples of impact: who you helped, what changed, and what you learned about responsibility, patience, and fairness.",
      ],
      "Humanities / Law": [
        "Build a reading-and-writing routine: annotate evidence, write arguments, revise for clarity, and practice explaining both sides of an issue.",
        "Debate, journalism, mock trial, student government, and history courses help you practice persuasion with evidence instead of volume.",
        "Learn to ask sharper questions; law and humanities reward people who can define the real issue before arguing a position.",
      ],
      "Exploring Options": [
        "Try a balanced mix: one rigorous academic course, one creative or technical elective, and one activity where other people depend on you.",
        "Notice what kind of hard work feels meaningful. Interest is not always easy; sometimes the signal is that you keep returning to it.",
        "Use future planning to test hypotheses: choose courses that reveal whether you like building, helping, analyzing, creating, leading, or explaining.",
      ],
    };
    const rec = facts[career] || facts["Exploring Options"];
    box.innerHTML = `<p><strong>${escapeHtml(career)}</strong></p><p>${escapeHtml(rec[Math.floor(Math.random() * rec.length)])}</p><p class="muted small">Recommended next step: choose courses and activities that give you evidence of interest, not just a label.</p>`;
  }

  qs("#invite-friend-btn")?.addEventListener("click", () => {
    const email = qs("#invite-email")?.value.trim();
    const out = qs("#invite-output");
    if (!out) return;
    if (!email || !email.includes("@")) {
      out.textContent = "Add a valid email first.";
      return;
    }
    out.textContent = `Invite ready for ${email}: Join my CourseSync community for ${state.profile.school}. Sign up, save your profile, then we can compare schedules and courses.`;
  });

  function renderSnapshotPanel() {
    const box = qs("#snapshot-content");
    if (!box) return;
    const rows = flattenScheduleForPublish();
    const scheduleHtml = rows.length
      ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Semester</th><th>Day</th><th>Period</th><th>Time</th><th>Course</th><th>Teacher</th></tr></thead><tbody>${rows
          .map(
            (r) =>
              `<tr><td>${escapeHtml(SEMESTERS.find((s) => s.key === r.semester)?.label || "")}</td><td>${escapeHtml(r.weekday || "")}</td><td>${escapeHtml(r.period || "")}</td><td>${escapeHtml(
                `${r.start || "—"}-${r.end || "—"}`
              )}</td><td>${escapeHtml(r.courseLabel || "")}</td><td>${escapeHtml(r.teacher || "")}</td></tr>`
          )
          .join("")}</tbody></table></div>`
      : '<p class="muted">No current classes saved yet.</p>';
    const future = Object.entries(state.futureByGrade || {})
      .map(([g, slot]) => ({ g, picks: [...(slot.primary || []), ...(slot.alternatives || [])].filter(Boolean) }))
      .filter((x) => x.picks.length);
    const futureHtml = future.length
      ? future
          .map(
            ({ g, picks }) =>
              `<h4>Grade ${escapeHtml(g)}</h4><ul>${picks
                .map((k) => {
                  const { level, title } = parseCourseKey(k);
                  return `<li>${escapeHtml(level)} ${escapeHtml(title)}</li>`;
                })
                .join("")}</ul>`
          )
          .join("")
      : '<p class="muted">No future courses planned yet.</p>';
    const summerHtml = state.summerCourses.length
      ? `<ul>${state.summerCourses.map((s) => `<li><strong>${escapeHtml(s.title)}</strong> · ${escapeHtml(s.where)}</li>`).join("")}</ul>`
      : '<p class="muted">No summer or online courses saved yet.</p>';
    box.innerHTML = `
      <article class="card"><h3 class="card-title">Current Schedule</h3>${scheduleHtml}</article>
      <article class="card"><h3 class="card-title">Future Courses</h3>${futureHtml}</article>
      <article class="card"><h3 class="card-title">Summer / Online Courses</h3>${summerHtml}</article>`;
  }

  function renderFriendActivity() {
    const ul = qs("#friend-activity-list");
    const loadBtn = qs("#friend-activity-load-more");
    const filterEl = qs("#activity-filter-days");
    if (!ul) return;
    const me = userId();
    const friends = new Set(listFriendIds());
    const feed = JSON.parse(localStorage.getItem(FEED_KEY) || "[]");
    const sevenOnly = filterEl ? filterEl.value === "7" : true;
    const cutoff = sevenOnly ? Date.now() - 7 * 24 * 60 * 60 * 1000 : 0;
    const filtered = feed.filter(
      (e) => friends.has(e.actorId) && e.actorId !== me && e.actorId && e.at >= cutoff
    );
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
      : '<li class="activity-empty"><div><strong>No friend activity yet</strong><p class="muted small">Add friends or check back after classmates save profile updates.</p></div></li>';
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
    BELL_DAYS.forEach((day) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "day-tab" + (state.myClassesDayTab === day ? " active" : "");
      b.textContent = day.slice(0, 3);
      b.title = day;
      b.addEventListener("click", () => {
        state.myClassesDayTab = day;
        saveState(state);
        renderMyClassesDayTabs();
        renderClassRows();
      });
      tabs.appendChild(b);
    });
  }

  function renderMyClassesSemesterTabs() {
    const tabs = qs("#my-classes-semester-tabs");
    if (!tabs) return;
    tabs.innerHTML = "";
    SEMESTERS.forEach((sem) => {
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
      tabs.appendChild(b);
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
        "ACCESS Period",
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
    const reqFilter = qs("#course-browser-grad-filter")?.value || "";
    let html = "";
    sortedSubjects(grade, school).forEach((subject) => {
      const courses = [...(catalog[subject] || [])].filter((c) => courseAllowed(c, grade, school)).sort(
        (a, b) => levelRank(a.level) - levelRank(b.level) || a.title.localeCompare(b.title)
      );
      const byLevel = {};
      courses.forEach((c) => {
        const req = gradRequirementFor(subject, c.title);
        if (reqFilter && req !== reqFilter) return;
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

  function renderAddClassBrowser() {
    const box = qs("#course-browser-add");
    const filter = qs("#course-filter-add")?.value || "";
    if (!box) return;
    box.innerHTML = buildCourseBrowserHTML(filter);
    wireCourseBrowser(box, (key) => {
      qs("#add-class-course-value").value = key;
      const { subject, level, title } = parseCourseKey(key);
      qs("#add-class-course-label").textContent = title;
    });
  }

  function renderClassRows() {
    const tbody = qs("#classes-tbody");
    if (!tbody) return;
    const day = state.myClassesDayTab;
    const list = currentWeek()[day] || [];
    tbody.innerHTML = "";
    list.forEach((row, idx) => {
      const tr = document.createElement("tr");
      const times = row.start && row.end ? { start: row.start, end: row.end } : resolveTimesForEntry(day, row.period, state.scheduleSchool);
      tr.innerHTML = `
        <td>${escapeHtml(normalizedPeriod(row.period))}</td>
        <td>${escapeHtml(times.start)}</td>
        <td>${escapeHtml(times.end)}</td>
        <td>${escapeHtml(row.room || "—")}</td>
        <td>${escapeHtml(formatCourseTitle(row.courseKey || row.courseLabel))}</td>
        <td>${escapeHtml(row.teacher)}</td>
        <td><button type="button" class="btn btn-sm btn-outline" data-comment="${day}::${idx}">Comments</button></td>
        <td><button type="button" class="btn btn-ghost btn-sm" data-rc="${day}::${idx}">Remove</button></td>`;
      tbody.appendChild(tr);
    });
    qsa("[data-rc]", tbody).forEach((btn) => {
      btn.addEventListener("click", () => {
        const [d, i] = btn.getAttribute("data-rc").split("::");
        pushUndoSnapshot();
        currentWeek()[d].splice(Number(i), 1);
        saveState(state);
        commentsTarget = null;
        renderCommentsPanel();
        renderClassRows();
      });
    });
    qsa("[data-comment]", tbody).forEach((btn) => {
      btn.addEventListener("click", () => {
        const [d, i] = btn.getAttribute("data-comment").split("::");
        commentsTarget = { semester: state.myClassesSemester, day: d, index: Number(i) };
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
    ctx.textContent = `${SEMESTERS.find((s) => s.key === (commentsTarget.semester || state.myClassesSemester))?.label || "Semester"} · ${commentsTarget.day} · ${row.period} · ${row.courseLabel}`;
    qs("#comments-rating").value = String(row.rating ?? 5);
    qs("#comments-text").value = row.comment || "";
  }

  qs("#comments-save-btn")?.addEventListener("click", () => {
    if (!commentsTarget) return;
    pushUndoSnapshot();
    const row = currentWeek(commentsTarget.semester || state.myClassesSemester)[commentsTarget.day][commentsTarget.index];
    row.rating = Number(qs("#comments-rating").value);
    row.comment = qs("#comments-text").value.trim();
    saveState(state);
    pushFeed(userId(), state.profile.displayName, "rated", `Rated ${row.courseLabel}`);
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
      li.innerHTML = `<div><strong>${escapeHtml(s.title)}</strong><div class="muted small">${escapeHtml(s.where)}</div></div><button type="button" class="btn btn-ghost btn-sm" data-rs="${i}">Remove</button>`;
      ul.appendChild(li);
    });
    qsa("[data-rs]", ul).forEach((b) => {
      b.addEventListener("click", () => {
        pushUndoSnapshot();
        state.summerCourses.splice(Number(b.getAttribute("data-rs")), 1);
        saveState(state);
        renderSummerList();
      });
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
      tr.innerHTML = `<td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.kind)}</td><td>${escapeHtml(row.when)}</td><td>${cal}</td><td><button type="button" class="btn btn-ghost btn-sm" data-ra="${idx}">Remove</button></td>`;
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
    const schoolSel = qs("#schedule-school");
    if (schoolSel) {
      const allowed = getCommunitiesForSwitcher();
      if (!allowed.includes(state.scheduleSchool)) state.scheduleSchool = state.profile.school;
      schoolSel.innerHTML = allowed.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
      schoolSel.value = state.scheduleSchool;
    }
    if (qs("#add-class-weekday")) qs("#add-class-weekday").value = state.myClassesDayTab;
    renderBellDayTabs();
    renderBellScheduleTable();
    renderMyClassesSemesterTabs();
    renderMyClassesDayTabs();
    fillPeriodSelect();
    if (qs("#course-browser-grad-wrap")) qs("#course-browser-grad-wrap").hidden = schoolTypeFor(state.scheduleSchool) !== "high";
    qs("#add-class-course-value").value = "";
    qs("#add-class-course-label").textContent = "— None —";
    renderAddClassBrowser();
    renderClassRows();
    renderActivityRows();
    renderSummerList();
    renderCommentsPanel();
    if (qs("#sports-fields")) qs("#sports-fields").hidden = qs("#act-kind")?.value !== "Sport";
    const doc = window.EHS_COURSE_LIST_URL;
    qsa("#ehs-doc-link, #course-info-doc-btn").forEach((el) => {
      if (el && doc) el.href = doc;
    });
  }

  qs("#schedule-school")?.addEventListener("change", (e) => {
    state.scheduleSchool = e.target.value;
    saveState(state);
    renderSchedulePanel();
  });

  qs("#course-filter-add")?.addEventListener("input", () => renderAddClassBrowser());
  qs("#course-browser-grad-filter")?.addEventListener("change", () => renderAddClassBrowser());

  qs("#act-kind")?.addEventListener("change", () => {
    const sports = qs("#sports-fields");
    if (sports) sports.hidden = qs("#act-kind").value !== "Sport";
  });

  qs("#add-class-btn")?.addEventListener("click", () => {
    const weekday = qs("#add-class-weekday").value;
    const semesterPick = qs("#add-class-semester")?.value || "both";
    const period = qs("#add-class-period").value;
    const room = qs("#add-class-room").value.trim();
    const courseVal = qs("#add-class-course-value").value;
    const teacher = qs("#add-class-teacher").value.trim();
    if (!period || !courseVal || !teacher) {
      alert("Choose a weekday, period, course, and teacher.");
      return;
    }
    const { subject, level, title } = parseCourseKey(courseVal);
    pushUndoSnapshot();
    const days = weekday === "All" ? BELL_DAYS : [weekday];
    const semesters = semesterPick === "both" ? ["s1", "s2"] : [semesterPick];
    semesters.forEach((sem) => {
      days.forEach((day) => {
        const times = resolveTimesForEntry(day, period, state.scheduleSchool);
        scheduleBucket(state.scheduleSchool)[sem][day].push({
          period,
          room,
          courseLabel: title,
          courseKey: courseVal,
          teacher,
          start: times.start,
          end: times.end,
          rating: 5,
          comment: "",
        });
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
    const date = qs("#act-date")?.value || "";
    const startTime = qs("#act-start")?.value || "";
    const endTime = qs("#act-end")?.value || "";
    let when = qs("#act-when").value.trim();
    if (kind === "Sport") {
      if (!sport || !date || !startTime) {
        alert("For sports, choose the sport, date, and start time.");
        return;
      }
      when = `${date} ${startTime}${endTime ? `-${endTime}` : ""}${when ? ` · ${when}` : ""}`;
    }
    if (!name || !when) {
      alert("Add activity name and when it meets.");
      return;
    }
    pushUndoSnapshot();
    state.activities.push({ name: kind === "Sport" && sport ? `${sport}: ${name}` : name, kind, when, sport, date, startTime, endTime });
    saveState(state);
    qs("#act-name").value = "";
    qs("#act-when").value = "";
    if (qs("#act-sport")) qs("#act-sport").value = "";
    if (qs("#act-date")) qs("#act-date").value = "";
    if (qs("#act-start")) qs("#act-start").value = "";
    if (qs("#act-end")) qs("#act-end").value = "";
    renderActivityRows();
  });

  qs("#add-summer-btn")?.addEventListener("click", () => {
    const title = qs("#summer-title").value.trim();
    const where = qs("#summer-where").value.trim();
    if (!title || !where) {
      alert("Add both the course name and where you are taking it.");
      return;
    }
    pushUndoSnapshot();
    state.summerCourses.push({ title, where });
    saveState(state);
    qs("#summer-title").value = "";
    qs("#summer-where").value = "";
    renderSummerList();
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
    pushUndoSnapshot();
    state.pastSchedules.unshift({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      school: state.scheduleSchool,
      grade: state.profile.grade,
      savedAt: Date.now(),
      schedule: rows,
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
    const ta = qs("#future-alt-notes");
    if (!ta) return;
    ta.value = getFutureSlot().notes || "";
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
        const note = (s.notes || "").trim();
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
    getFutureSlot().notes = qs("#future-alt-notes").value;
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
    const rows = allScheduleRowsForSchool(state.profile.school || "Emerald High School");
    const byReq = {};
    GRAD_REQUIREMENTS.forEach((r) => (byReq[r.key] = []));
    rows.forEach((r) => {
      const parsed = parseCourseKey(r.courseKey || "");
      const req = gradRequirementFor(parsed.subject || r.courseLabel, parsed.title || r.courseLabel);
      if (byReq[req]) byReq[req].push(r);
    });
    box.innerHTML = GRAD_REQUIREMENTS.map((req) => {
      const taken = byReq[req.key] || [];
      const years = new Set(taken.map((r) => `${r.semester}:${r.courseKey || r.courseLabel}`)).size;
      return `<article class="grad-card">
        <h3>${escapeHtml(req.key)}</h3>
        <p class="muted small"><strong>DUSD:</strong> ${escapeHtml(req.dusd)} · <strong>UC/CSU:</strong> ${escapeHtml(req.uc)}</p>
        <p>${escapeHtml(req.detail)}</p>
        <p><strong>${years}</strong> course record${years === 1 ? "" : "s"} found in your saved high-school schedule.</p>
        ${
          taken.length
            ? `<ul>${taken.slice(0, 8).map((r) => `<li>${escapeHtml(SEMESTERS.find((s) => s.key === r.semester)?.label || "")} · ${escapeHtml(formatCourseTitle(r.courseKey || r.courseLabel))}</li>`).join("")}</ul>`
            : '<p class="muted small">No saved schedule evidence yet. Add past or current courses to track this area.</p>'
        }
      </article>`;
    }).join("");
  }

  /* ---------- Course info ---------- */
  function renderCourseInfo() {
    const grid = qs("#course-info-grid");
    if (!grid) return;
    fillCourseInfoSubjectFilter();
    const viewSchool = getCatalogSchool();
    const viewGrade = getCatalogGradeForSchool(viewSchool);
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
        return {
          key: k,
          count: stats.count,
          avg: stats.avg === null ? "—" : stats.avg.toFixed(2),
          meta,
          label: parseCourseKey(k),
          gradReq: gradRequirementFor(parseCourseKey(k).subject, parseCourseKey(k).title),
          starred: starred.has(k),
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
    if (!entries.length) {
      grid.innerHTML = `<div class="empty-state">
        <p>No courses match that search for ${escapeHtml(viewSchool)}${viewGrade ? ` and grade ${escapeHtml(viewGrade)}` : ""}.</p>
        <button type="button" class="btn btn-outline" id="course-info-open-schedule">Open Schedule</button>
      </div>`;
      qs("#course-info-open-schedule")?.addEventListener("click", () => showPanel("schedule"));
      return;
    }
    grid.innerHTML = entries
      .map((e) => {
        const { subject, level, title } = e.label;
        const enc = encodeURIComponent(e.key);
        return `<details class="course-info-card" open>
          <summary><span>${escapeHtml(title)}</span><span class="level-tag">${escapeHtml(level)}</span></summary>
          <div class="course-info-head"><span class="enroll-badge">${e.count} student${e.count === 1 ? "" : "s"}</span><span class="level-tag">${escapeHtml(e.gradReq)}</span></div>
          <p class="muted small">${escapeHtml(subject)}</p>
          <p><strong>Difficulty:</strong> ${escapeHtml(e.meta.difficulty)}</p>
          <p>${escapeHtml(e.meta.overview)} This course currently maps to <strong>${escapeHtml(e.gradReq)}</strong> for planning filters, so you can compare it against graduation and A-G progress.</p>
          <p class="rating-line"><strong>Avg. rating:</strong> ${escapeHtml(String(e.avg))} ${e.avg !== "—" ? "(from saved schedules)" : ""}</p>
          <button type="button" class="btn btn-ghost btn-sm course-star-btn" data-course-star="${enc}" aria-pressed="${e.starred ? "true" : "false"}">${e.starred ? "★ Starred" : "☆ Star"}</button>
          <button type="button" class="btn btn-outline btn-sm" data-cc-open="${enc}">View all comments</button>
        </details>`;
      })
      .join("");
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
  }

  function fillCourseInfoSubjectFilter() {
    const sel = qs("#course-info-subject-filter");
    if (!sel) return;
    const cur = sel.value || courseInfoSubjectFilter;
    sel.innerHTML = '<option value="">All Subjects</option>';
    const viewSchool = getCatalogSchool();
    sortedSubjects(getCatalogGradeForSchool(viewSchool), viewSchool).forEach((s) => {
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
  qs("#course-info-search")?.addEventListener("input", () => renderCourseInfo());
  qs("#course-info-sort")?.addEventListener("change", (e) => {
    courseInfoSort = e.target.value;
    renderCourseInfo();
  });
  qs("#course-info-level-filter")?.addEventListener("change", (e) => {
    courseInfoLevelFilter = e.target.value;
    renderCourseInfo();
  });
  qs("#course-info-subject-filter")?.addEventListener("change", (e) => {
    courseInfoSubjectFilter = e.target.value;
    renderCourseInfo();
  });
  qs("#course-info-grad-filter")?.addEventListener("change", (e) => {
    courseInfoGradFilter = e.target.value;
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
  function backupEmeraldData() {
    state.emeraldBackup = {
      scheduleSchool: state.scheduleSchool,
      scheduleBellDay: state.scheduleBellDay,
      myClassesDayTab: state.myClassesDayTab,
      scheduleByWeekday: state.scheduleByWeekday,
      scheduleByCommunity: state.scheduleByCommunity,
      activities: state.activities,
      summerCourses: state.summerCourses,
      futureByGrade: state.futureByGrade,
      savedAt: Date.now(),
    };
  }

  function clearPlanningForCommunity(school) {
    if (school !== "Fallon Middle School") return;
    if (!state.emeraldBackup && (state.scheduleSchool === "Emerald High School" || flattenScheduleForPublish().length || Object.values(state.futureByGrade || {}).some((slot) => [...(slot.primary || []), ...(slot.alternatives || [])].some(Boolean)))) {
      backupEmeraldData();
    }
    state.scheduleSchool = "Fallon Middle School";
    state.scheduleBellDay = "Monday";
    state.myClassesDayTab = "Monday";
    state.scheduleByCommunity["Fallon Middle School"] = emptySemesterSchedule();
    state.scheduleByWeekday = emptyWeek();
    state.activities = [];
    state.summerCourses = [];
    state.futureByGrade = defaultFutureByGrade();
  }

  function removeCommunity(school) {
    if (!school || school === state.profile.school) return false;
    state.followedCommunities = (state.followedCommunities || []).filter((s) => s !== school);
    delete state.scheduleByCommunity?.[school];
    if (state.scheduleSchool === school) state.scheduleSchool = state.profile.school;
    if (state.activeCommunitySchool === school) state.activeCommunitySchool = state.profile.school;
    saveState(state);
    return true;
  }

  function restoreEmeraldData() {
    const backup = state.emeraldBackup;
    if (!backup) return false;
    state.scheduleSchool = backup.scheduleSchool || "Emerald High School";
    state.scheduleBellDay = backup.scheduleBellDay || "Monday";
    state.myClassesDayTab = backup.myClassesDayTab || "Monday";
    state.scheduleByCommunity["Emerald High School"] = backup.scheduleByCommunity?.["Emerald High School"] || normalizeSemesterSchedule(backup.scheduleByWeekday);
    state.scheduleByWeekday = { ...emptyWeek(), ...backup.scheduleByWeekday };
    state.activities = backup.activities || [];
    state.summerCourses = backup.summerCourses || [];
    state.futureByGrade = backup.futureByGrade || defaultFutureByGrade();
    state.activeCommunitySchool = "Emerald High School";
    state.emeraldBackup = null;
    saveState(state);
    return true;
  }

  function getCommunitiesForSwitcher() {
    const schools = window.COMMUNITY_SCHOOLS || {};
    const set = new Set();
    if (state.profile.school) set.add(state.profile.school);
    (state.followedCommunities || []).forEach((s) => {
      if (s) set.add(s);
    });
    return [...set].filter((s) => schools[s] || s === state.profile.school);
  }

  function fillCommunityAddSelect() {
    const sel = qs("#community-add-select");
    if (!sel) return;
    const have = new Set(getCommunitiesForSwitcher());
    const all = Object.keys(window.COMMUNITY_SCHOOLS || {});
    sel.innerHTML = '<option value="">Choose a school…</option>';
    all
      .filter((s) => !have.has(s))
      .forEach((s) => {
        const o = document.createElement("option");
        o.value = s;
        o.textContent = s;
        sel.appendChild(o);
      });
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
    if (premise && meta) premise.textContent = `${meta.premise} This community view controls which directory members, course options, posts, and schedule choices appear across CourseSync.`;
    else if (premise)
      premise.textContent =
        "Connect with verified students in the directory below. Switch communities to see another school you follow.";
    if (countEl) countEl.textContent = String(n);
    const sw = qs("#community-switch");
    if (sw) {
      const opts = getCommunitiesForSwitcher();
      sw.innerHTML = "";
      if (!opts.length) {
        const o = document.createElement("option");
        o.value = school;
        o.textContent = school;
        sw.appendChild(o);
      } else {
        opts.forEach((s) => {
          const o = document.createElement("option");
          o.value = s;
          o.textContent = s;
          if (s === school) o.selected = true;
          sw.appendChild(o);
        });
      }
    }
    fillCommunityAddSelect();
    const removeBtn = qs("#community-remove-btn");
    if (removeBtn) removeBtn.hidden = school === state.profile.school;
  }

  function renderCommunityPanel() {
    renderCommunityHeader();
    renderCommunityLinks();
    renderDirectory();
    renderAdminTools();
  }

  function renderCommunityLinks() {
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

  function listVerifiedPeers() {
    const me = userId();
    const reg = getRegistry();
    return Object.entries(reg)
      .filter(([, u]) => u.verified)
      .filter(([id]) => id !== me)
      .map(([id, u]) => ({ id, ...u }));
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
    let peers = listVerifiedPeers().filter((p) => {
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
        empty.innerHTML = `<p>No verified students match yet. Complete your profile and save to appear here.</p>
          <button type="button" class="btn btn-outline" id="directory-open-profile">Open Profile</button>`;
        qs("#directory-open-profile")?.addEventListener("click", () => showPanel("profile"));
      }
      return;
    }
    empty?.classList.add("hidden");
    peers.forEach((p) => {
      const card = document.createElement("article");
      card.className = "directory-card" + (isCloseFriend(p.id) ? " directory-card-close" : "");
      const fr = isFriend(p.id);
      const pend = hasPendingTo(p.id);
      const inc = hasPendingFrom(p.id);
      let btn = "";
      if (fr) btn = `<span class="badge-ok">Friends</span>`;
      else if (pend) btn = `<span class="badge-wait">Requested</span>`;
      else if (inc) btn = `<button type="button" class="btn btn-sm btn-primary" data-acc="${escapeHtml(p.id)}">Accept</button>`;
      else btn = `<button type="button" class="btn btn-sm btn-outline" data-req="${escapeHtml(p.id)}">Add Friend</button>`;
      const mut = mutualCount(userId(), p.id);
      const starCourseCount = peerStarredCourseCount(p);
      const star = isCloseFriend(p.id) ? `<span class="close-star" title="Close friend">★</span>` : "";
      const tier =
        isCloseFriend(p.id) ? "Close friend" : fr ? "Friend" : p.school === state.profile.school ? "Classmate" : "Member";
      card.innerHTML = `
        ${star}
        <div class="directory-avatar">${escapeHtml((p.displayName || "?").charAt(0).toUpperCase())}</div>
        <h3>${escapeHtml(p.displayName || p.email)}</h3>
        <p class="muted small tier-pill">${escapeHtml(tier)}</p>
        <p class="muted small">Grade ${escapeHtml(String(p.grade || "—"))} · ${escapeHtml(p.gender || "")} · ${escapeHtml(
        p.academicLevel || "—"
      )}</p>
        <p class="muted small">${escapeHtml(p.careerPathway || "Career pathway not set")}</p>
        <p class="muted small">${mut} mutual friend${mut === 1 ? "" : "s"}</p>
        <p class="muted small">${starCourseCount} starred course match${starCourseCount === 1 ? "" : "es"}</p>
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

  qs("#community-switch")?.addEventListener("change", (e) => {
    const next = e.target.value;
    if (next !== getActiveCommunitySchool()) {
      const ok = confirm("Switch communities? Course lists, directory, networking posts, and community-specific schedule data will change for this view.");
      if (!ok) {
        e.target.value = getActiveCommunitySchool();
        return;
      }
    }
    state.activeCommunitySchool = next;
    clearPlanningForCommunity(state.activeCommunitySchool);
    saveState(state);
    renderCommunityPanel();
    renderHomePanel();
  });

  qs("#community-add-btn")?.addEventListener("click", () => {
    const v = qs("#community-add-select")?.value;
    if (!v) return;
    const ok = confirm("Add and switch to this community? The dashboard will show that community's course and directory data.");
    if (!ok) return;
    if (!state.followedCommunities.includes(v)) state.followedCommunities.push(v);
    state.activeCommunitySchool = v;
    clearPlanningForCommunity(state.activeCommunitySchool);
    saveState(state);
    renderCommunityPanel();
    renderHomePanel();
  });

  qs("#community-remove-btn")?.addEventListener("click", () => {
    const school = getActiveCommunitySchool();
    const ok = confirm(`Remove ${school} from your followed communities? Community-specific schedule options and local planning data for that community will be removed from this workspace.`);
    if (!ok) return;
    removeCommunity(school);
    renderCommunityPanel();
    renderHomePanel();
    renderSchedulePanel();
  });

  function isAdmin() {
    return userId() === ADMIN_EMAIL;
  }

  function deleteAccount(accountId) {
    if (!isAdmin() || !accountId || accountId === userId()) return;
    const reg = getRegistry();
    delete reg[accountId];
    setRegistry(reg);
    const n = getNetwork();
    n.requests = n.requests.filter((r) => r.from !== accountId && r.to !== accountId);
    n.friends = n.friends.filter((f) => f.a !== accountId && f.b !== accountId);
    n.closeRequests = n.closeRequests.filter((r) => r.from !== accountId && r.to !== accountId);
    n.closeFriends = n.closeFriends.filter((f) => f.a !== accountId && f.b !== accountId);
    saveNetwork(n);
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
        if (confirm(`Delete ${id} from this device community?`)) {
          deleteAccount(id);
          rebuildEnrollmentAndRatings();
          renderCommunityPanel();
        }
      });
    });
  }

  function getDiscussions() {
    try {
      return JSON.parse(localStorage.getItem(DISCUSSION_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveDiscussions(posts) {
    localStorage.setItem(DISCUSSION_KEY, JSON.stringify(posts));
  }

  function renderDiscussionPanel() {
    const feed = qs("#discussion-feed");
    if (!feed) return;
    const school = getActiveCommunitySchool();
    const title = qs("#discussion-feed-title");
    const posts = getDiscussions()
      .filter((p) => {
        if (p.school !== school) return false;
        if (p.authorId === userId()) return true;
        const vis = p.visibility || "public";
        if (vis === "public") return true;
        if (vis === "friends") return isFriend(p.authorId);
        if (vis === "close") return isCloseFriend(p.authorId);
        if (vis === "specific") return (p.specificPeople || []).map((x) => x.toLowerCase()).includes(userId());
        return false;
      })
      .sort((a, b) => b.at - a.at);
    if (title) title.textContent = posts[0]?.title ? `Board · ${posts[0].title}` : "Board";
    feed.innerHTML = posts.length
      ? posts
          .map(
            (p) =>
              `<article class="discussion-post"><div class="discussion-post-head"><strong>${escapeHtml(p.title || p.category || "Post")}</strong><span>${escapeHtml(p.category)} · ${escapeHtml(p.responseWindow || "Anytime")} · ${escapeHtml(p.visibility || "public")} · ${escapeHtml(new Date(p.at).toLocaleString())}</span></div><p class="muted small">By ${escapeHtml(p.author)}</p><p>${escapeHtml(p.text)}</p>${reactionHtml(`post:${p.id}`)}
              <div class="thread-comments">${(p.comments || []).map((c, i) => `<div class="thread-comment"><strong>${escapeHtml(c.author)}</strong><p>${escapeHtml(c.text)}</p>${reactionHtml(`post:${p.id}:comment:${i}`)}</div>`).join("")}</div>
              <div class="thread-reply"><input type="text" placeholder="Comment on this thread…" data-thread-input="${escapeHtml(p.id)}" /><button type="button" class="btn btn-sm btn-outline" data-thread-reply="${escapeHtml(p.id)}">Reply</button></div></article>`
          )
          .join("")
      : '<p class="muted">No board posts yet. Create a public post to start the community board.</p>';
    wireReactions(feed, renderDiscussionPanel);
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
        renderDiscussionPanel();
      });
    });
  }

  qs("#discussion-post-btn")?.addEventListener("click", () => {
    const text = qs("#discussion-text")?.value.trim();
    if (!text) {
      alert("Write a discussion message first.");
      return;
    }
    const posts = getDiscussions();
    posts.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: qs("#discussion-title")?.value.trim() || qs("#discussion-category")?.value || "Board post",
      author: state.profile.displayName || userId(),
      authorId: userId(),
      school: getActiveCommunitySchool(),
      category: qs("#discussion-category")?.value || "Coursework",
      responseWindow: qs("#discussion-response-window")?.value || "This Week",
      visibility: qs("#discussion-visibility")?.value || "public",
      specificPeople: (qs("#discussion-specific-people")?.value || "").split(/[,;]+/).map((x) => x.trim()).filter(Boolean),
      text,
      at: Date.now(),
    });
    saveDiscussions(posts);
    pushNotification("Your Networking post was added to the board.", "networking");
    qs("#discussion-title").value = "";
    qs("#discussion-text").value = "";
    renderDiscussionPanel();
    renderTrending("home");
  });

  qs("#discussion-visibility")?.addEventListener("change", () => {
    const wrap = qs("#discussion-specific-wrap");
    if (wrap) wrap.hidden = qs("#discussion-visibility").value !== "specific";
  });

  /* ---------- Classes (same period / teacher) ---------- */
  function renderClassesPanel() {
    const box = qs("#classes-content");
    if (!box) return;
    const me = userId();
    const reg = getRegistry();
    const mySchool = state.profile.school;
    const rows = flattenScheduleForPublish().filter((r) => r.period && r.teacher);
    renderPastClasses();
    if (!rows.length) {
      box.innerHTML = `<div class="empty-state">
        <p>Add classes with a period and teacher to your schedule, then save, to find classmates here.</p>
        <button type="button" class="btn btn-outline" id="classes-open-schedule">Open Schedule</button>
      </div>`;
      qs("#classes-open-schedule")?.addEventListener("click", () => showPanel("schedule"));
      return;
    }
    const articles = [];
    rows.forEach((row) => {
      const matches = [];
      Object.entries(reg).forEach(([id, u]) => {
        if (!u.verified || id === me || u.school !== mySchool) return;
        if (!(u.scheduleSnapshot || []).some((r) => sameClassBlock(row, r))) return;
        matches.push(id);
      });
      articles.push(`<article class="class-match-card">
        <div class="class-match-head">
          <h4>${escapeHtml(formatCourseTitle(row.courseKey || row.courseLabel) || "Class")}</h4>
          <span class="pill pill-soft">${escapeHtml(row.weekday || "")} · ${escapeHtml(normalizedPeriod(row.period))}</span>
        </div>
        <p class="muted small">${escapeHtml(row.start || "—")}–${escapeHtml(row.end || "—")} · ${escapeHtml(
        row.teacher || ""
      )}${row.room ? ` · Room ${escapeHtml(row.room)}` : ""}</p>
        <p class="small"><strong>${matches.length}</strong> classmate${matches.length === 1 ? "" : "s"} with this subject, room, period, and teacher:</p>
        ${
          matches.length
            ? `<button type="button" class="btn btn-outline btn-sm" data-classmates="${escapeHtml(matches.join(","))}">All Classmates</button>`
            : '<p class="muted small">No mutual classmates published yet.</p>'
        }
      </article>`);
    });
    box.innerHTML = `<div class="class-match-grid">${articles.join("")}</div>`;
    qs("#classes-open-community")?.addEventListener("click", () => showPanel("community"));
    qsa("[data-classmates]", box).forEach((b) => {
      b.addEventListener("click", () => openClassmatesModal(b.getAttribute("data-classmates").split(",").filter(Boolean)));
    });
    renderPastClasses();
  }

  function renderPastClasses() {
    const box = qs("#past-classes-content");
    if (!box) return;
    const rows = state.pastSchedules || [];
    box.innerHTML = rows.length
      ? rows
          .map((year) => {
            const classes = year.schedule || [];
            return `<article class="past-year-card">
              <h4>${escapeHtml(year.school || "Previous School Year")} ${year.grade ? `· Grade ${escapeHtml(String(year.grade))}` : ""}</h4>
              <p class="muted small">Saved ${escapeHtml(new Date(year.savedAt || Date.now()).toLocaleDateString())} · ${classes.length} class${classes.length === 1 ? "" : "es"}</p>
              <ul>${classes
                .slice(0, 10)
                .map((r) => `<li>${escapeHtml(r.weekday || "")} · ${escapeHtml(normalizedPeriod(r.period))} · ${escapeHtml(formatCourseTitle(r.courseKey || r.courseLabel))}</li>`)
                .join("")}</ul>
            </article>`;
          })
          .join("")
      : '<p class="muted">No past classes saved yet. Use New Schedule in Current Schedule when your schedule changes.</p>';
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
  function pickExploreCourse() {
    const viewSchool = getCatalogSchool();
    const viewGrade = getCatalogGradeForSchool(viewSchool);
    const subs = sortedSubjects(viewGrade, viewSchool);
    for (let tries = 0; tries < 40; tries++) {
      const sub = subs[Math.floor(Math.random() * subs.length)];
      const courses = (catalog[sub] || []).filter((c) => courseAllowed(c, viewGrade, viewSchool));
      if (!courses.length) continue;
      const c = courses[Math.floor(Math.random() * courses.length)];
      return { key: courseKey(sub, c), sub, c };
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

  function titleForTrend(title) {
    return title || "This course";
  }

  function trendingItems(mode = "course") {
    const school = getActiveCommunitySchool();
    const grade = getCatalogGradeForSchool(school);
    const reg = getRegistry();
    if (mode === "discussion") {
      return getDiscussions()
        .filter((p) => p.school === school && (p.visibility || "public") === "public")
        .map((p) => ({
          type: "discussion",
          title: p.title || p.category || "Board post",
          sub: p.category || "Networking",
          level: p.responseWindow || "Anytime",
          score: (p.comments || []).length * 2 + Object.values(getReactions(`post:${p.id}`)).reduce((a, b) => a + b, 0) + 1,
          why: (p.comments || []).length ? "Classmates are responding" : "New board activity",
          stats: [`${(p.comments || []).length} replies`, `${p.responseWindow || "Anytime"}`, p.visibility || "public"],
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);
    }
    if (mode === "person") {
      return listVerifiedPeers()
        .filter((p) => p.school === school)
        .map((p) => ({
          type: "person",
          id: p.id,
          title: p.displayName || p.email,
          sub: `Grade ${p.grade || "—"}`,
          level: p.academicLevel || "Profile",
          score: (p.scheduleSnapshot || []).length + (p.futurePrimary || []).length + mutualCount(userId(), p.id),
          why: "Profile activity is high in this community",
          stats: [
            `${(p.scheduleSnapshot || []).length} classes`,
            `${(p.futurePrimary || []).length} future picks`,
            `${mutualCount(userId(), p.id)} mutual friends`,
          ],
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);
    }
    const courseScores = [];
    sortedSubjects(grade, school).forEach((subject) => {
      (catalog[subject] || []).filter((c) => courseAllowed(c, grade, school)).forEach((c) => {
        const key = courseKey(subject, c);
        const planned = Object.values(reg).filter((u) => u.verified && u.school === school && ([...(u.futurePrimary || []), ...(u.futureAlt || [])].includes(key))).length;
        const comments = gatherCourseComments(key).length;
        const stats = courseCommunityStats(key, school);
        const avg = stats.avg || 0;
        const score = stats.count * 3 + planned * 2 + comments + avg;
        if (score > 0)
          courseScores.push({
            type: "course",
            key,
            title: c.title,
            sub: subject,
            level: c.level,
            score,
            why:
              planned > stats.count
                ? `${titleForTrend(c.title)} is showing stronger future-plan demand than current enrollment, which usually means students are considering it for next year.`
                : comments
                ? `${titleForTrend(c.title)} has recent rating/comment activity, so classmates are adding context beyond the catalog description.`
                : `${titleForTrend(c.title)} is appearing in published schedules for this community.`,
            stats: [
              `${stats.count} published schedule enrollment${stats.count === 1 ? "" : "s"}`,
              `${planned} future-plan save${planned === 1 ? "" : "s"}`,
              `${comments} comment item${comments === 1 ? "" : "s"}`,
              `${avg ? avg.toFixed(1) : "—"} average rating`,
            ],
          });
      });
    });
    return courseScores.sort((a, b) => b.score - a.score).slice(0, 6);
  }

  function renderTrending(prefix) {
    const box = qs(`#${prefix}-trending-results`);
    if (!box) return;
    const mode = trendingModes[prefix] || "course";
    const items = trendingItems(mode);
    const controls = `<div class="trend-tabs" role="tablist" aria-label="Trending type">
      ${[
        ["course", "Courses"],
        ["person", "People"],
        ["discussion", "Discussions"],
      ]
        .map(([key, label]) => `<button type="button" class="day-tab ${mode === key ? "active" : ""}" data-trend-mode="${key}">${label}</button>`)
        .join("")}
    </div>`;
    box.innerHTML =
      controls +
      (items.length
        ? items
          .map(
            (it) => `<article class="trending-card ${it.type === "person" ? "person" : it.type === "discussion" ? "discussion" : ""}">
          <div class="trend-art" aria-hidden="true">${it.type === "person" ? "People" : it.type === "discussion" ? "Board" : "Info"}</div>
          <div class="trend-content">
            <h4>${escapeHtml(it.title)}</h4>
            <p class="muted small">${escapeHtml(it.sub)} · ${escapeHtml(it.level)}</p>
            <p class="trend-why">${escapeHtml(it.why)}</p>
            <div class="trend-stat-row">${(it.stats || []).map((s) => `<span>${escapeHtml(s)}</span>`).join("")}</div>
            ${it.type === "person" ? `<button type="button" class="btn btn-sm btn-outline" data-trend-profile="${escapeHtml(it.id)}">Open Profile</button>` : ""}
          </div>
        </article>`
          )
          .join("")
        : '<p class="muted">Trending will appear once your community has saved activity for this section.</p>');
    qsa("[data-trend-mode]", box).forEach((btn) => {
      btn.addEventListener("click", () => {
        trendingModes[prefix] = btn.getAttribute("data-trend-mode") || "course";
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
      const pick = pickExploreCourse();
      if (pick) {
        const meta = getCourseMeta(pick.key, pick.c.title);
        body.innerHTML = `<div class="explore-result-kicker">Random course</div>
          <h3 class="explore-title">${escapeHtml(pick.c.title)}</h3>
          <div class="explore-result-meta">
            <span>${escapeHtml(pick.sub)}</span>
            <span>${escapeHtml(pick.c.level)}</span>
            <span>Difficulty: ${escapeHtml(meta.difficulty)}</span>
          </div>
          <p>${escapeHtml(meta.overview || "Course details are still being built out.")}</p>
          <button type="button" class="btn btn-outline" data-explore-more="course">Another Course</button>`;
        qs('[data-explore-more="course"]', body)?.addEventListener("click", () => showExploreCard("course", targetSelector));
      } else body.innerHTML = "<p class=\"muted\">Catalog not loaded.</p>";
    } else if (roll === 1) {
      const peers = listVerifiedPeers().filter((p) => p.school === getActiveCommunitySchool());
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
      const fact = HIGH_SCHOOL_FACTS[Math.floor(Math.random() * HIGH_SCHOOL_FACTS.length)];
      body.innerHTML = `<div class="explore-result-kicker">Fun fact</div>
        <p class="explore-fact">${escapeHtml(fact)}</p>
        <button type="button" class="btn btn-outline" data-explore-more="fact">Another Fact</button>`;
      qs('[data-explore-more="fact"]', body)?.addEventListener("click", () => showExploreCard("fact", targetSelector));
    }
  }

  function renderExplorePanel() {
    showExploreCard("surprise");
    renderTrending("explore");
  }

  qs("#explore-surprise")?.addEventListener("click", () => showExploreCard("surprise"));
  qs("#explore-course")?.addEventListener("click", () => showExploreCard("course"));
  qs("#explore-person")?.addEventListener("click", () => showExploreCard("person"));
  qs("#explore-fact")?.addEventListener("click", () => showExploreCard("fact"));
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
      title.textContent = "Profile";
      body.innerHTML = "<p class=\"muted\">This student has not published a verified profile on this device yet.</p>";
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

    let inner = `<p class="mutual-line"><strong>${mut}</strong> mutual friend${mut === 1 ? "" : "s"} · <strong>${
      mcRows.length
    }</strong> mutual course${mcRows.length === 1 ? "" : "s"}</p>`;
    inner += block(
      "About",
      canViewField(viewer, peerId, "bio", priv) ? `<p>${escapeHtml(u.bio || "")}</p>` : `<p class="muted">Hidden</p>`
    );
    inner += block(
      "Grade",
      canViewField(viewer, peerId, "grade", priv) ? `<p>${escapeHtml(String(u.grade || ""))}</p>` : `<p class="muted">Hidden</p>`
    );
    inner += block(
      "Gender",
      canViewField(viewer, peerId, "gender", priv) ? `<p>${escapeHtml(u.gender || "")}</p>` : `<p class="muted">Hidden</p>`
    );
    inner += block(
      "Academic Level",
      canViewField(viewer, peerId, "academicLevel", priv)
        ? `<p>${escapeHtml(u.academicLevel || "")}</p>`
        : `<p class="muted">Hidden</p>`
    );
    inner += block(
      "Career Pathway",
      canViewField(viewer, peerId, "careerPathway", priv)
        ? `<p>${escapeHtml(u.careerPathway || "Not set")}</p>`
        : `<p class="muted">Hidden</p>`
    );
    inner += block(
      "Mutual Courses",
      mcRows.length
        ? `<ul>${mcRows.map((r) => `<li>${escapeHtml(r.courseLabel || "")}</li>`).join("")}</ul>`
        : `<p class="muted">No overlapping courses in visible schedules.</p>`
    );
    inner += block(
      "Schedule",
      canViewField(viewer, peerId, "schedule", priv)
        ? `<div class="table-wrap"><table class="data-table peer-schedule"><thead><tr><th>Day</th><th>Period</th><th>Start</th><th>End</th><th>Room</th><th>Course</th><th>Teacher</th></tr></thead><tbody>
            ${(u.scheduleSnapshot || [])
              .map(
                (r) =>
                  `<tr><td>${escapeHtml(r.weekday || "")}</td><td>${escapeHtml(r.period)}</td><td>${escapeHtml(r.start || "—")}</td><td>${escapeHtml(r.end || "—")}</td><td>${escapeHtml(r.room || "—")}</td><td>${escapeHtml(r.courseLabel)}</td><td>${escapeHtml(r.teacher)}</td></tr>`
              )
              .join("")}
          </tbody></table></div>`
        : `<p class="muted">Schedule visible to friends only—or restricted by privacy.</p>`
    );
    inner += block(
      "Activities",
      canViewField(viewer, peerId, "activities", priv)
        ? `<ul>${(u.activities || []).map((a) => `<li>${escapeHtml(a.name)} — ${escapeHtml(a.when)}</li>`).join("")}</ul>`
        : `<p class="muted">Hidden</p>`
    );
    inner += block("Phone", `<p class="muted">${canViewField(viewer, peerId, "phone", priv) ? escapeHtml(u.phoneDigits || "") : "Not Shared"}</p>`);

    if (peerId !== me) {
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
  function renderFriendsHorizontal() {
    const wrap = qs("#friends-horizontal");
    if (!wrap) return;
    wrap.innerHTML = "";
    listFriendIds().forEach((fid) => {
      const u = getRegistryUser(fid);
      const star = isCloseFriend(fid) ? `<span class="friend-h-star" aria-hidden="true">★</span>` : "";
      const card = document.createElement("button");
      card.type = "button";
      card.className = "friend-h-card" + (isCloseFriend(fid) ? " is-close" : "");
      card.innerHTML = `${star}<div class="friend-h-avatar">${escapeHtml((u?.displayName || fid).charAt(0).toUpperCase())}</div><span class="friend-h-name">${escapeHtml(
        u?.displayName || fid
      )}</span>`;
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
  }

  function renderSuggestions() {
    const box = qs("#suggestions-list");
    if (!box) return;
    const me = userId();
    const mine = getRegistryUser(me);
    const peers = listVerifiedPeers().filter((p) => {
      if (isFriend(p.id)) return false;
      if (mine?.school && p.school !== mine.school) return false;
      if (mine?.grade && p.grade && p.grade !== mine.grade) return false;
      return true;
    }).slice(0, 8);
    box.innerHTML = peers.length
      ? peers
          .map(
            (p) =>
              `<div class="suggestion-card"><strong>${escapeHtml(p.displayName)}</strong><span class="muted small">${escapeHtml(
                p.grade || ""
              )} · ${escapeHtml(p.academicLevel || "")}</span><button type="button" class="btn btn-sm btn-outline" data-sreq="${escapeHtml(
                p.id
              )}">Add Friend</button></div>`
          )
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
        requestFriend(b.getAttribute("data-sreq"));
        renderFriendsPanel();
        renderDirectory();
      });
    });
  }

  function renderFriendsPanel() {
    renderFriendsHorizontal();
    renderSuggestions();
    renderRecommendCourseForm();
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
    qs(".friend-request-divider")?.toggleAttribute("hidden", showClose);
    qs(".close-request-divider")?.toggleAttribute("hidden", !showClose);

    const rin = qs("#friend-requests-in");
    if (rin) {
      rin.innerHTML = '<p class="request-label">Incoming</p>';
      const me = userId();
      getNetwork().requests
        .filter((r) => r.to === me)
        .forEach((r) => {
          const u = getRegistryUser(r.from);
          const div = document.createElement("div");
          div.className = "request-row";
          div.innerHTML = `<span>${escapeHtml(u?.displayName || r.from)}</span>
            <button type="button" class="btn btn-sm btn-primary" data-ok="${escapeHtml(r.from)}">Accept</button>
            <button type="button" class="btn btn-sm btn-ghost" data-no="${escapeHtml(r.from)}">Decline</button>`;
          rin.appendChild(div);
        });
      if (rin.children.length === 1) rin.innerHTML += '<p class="muted">No incoming requests.</p>';
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
      rout.innerHTML = '<p class="request-label">Pending</p>';
      const me = userId();
      getNetwork().requests
        .filter((r) => r.from === me)
        .forEach((r) => {
          const u = getRegistryUser(r.to);
          const div = document.createElement("div");
          div.className = "request-row";
          div.innerHTML = `<span>${escapeHtml(u?.displayName || r.to)}</span>
            <button type="button" class="btn btn-sm btn-ghost" data-cancel="${escapeHtml(r.to)}">Cancel Request</button>`;
          rout.appendChild(div);
        });
      if (rout.children.length === 1) rout.innerHTML += '<p class="muted">No pending outgoing requests.</p>';
      qsa("[data-cancel]", rout).forEach((b) => {
        b.addEventListener("click", () => {
          cancelOutgoing(b.getAttribute("data-cancel"));
          renderFriendsPanel();
        });
      });
    }

    const crin = qs("#close-requests-in");
    if (crin) {
      crin.innerHTML = '<p class="request-label">Incoming</p>';
      const me = userId();
      getNetwork().closeRequests
        .filter((r) => r.to === me)
        .forEach((r) => {
          const u = getRegistryUser(r.from);
          if (!isFriend(r.from)) return;
          const div = document.createElement("div");
          div.className = "request-row";
          div.innerHTML = `<span>${escapeHtml(u?.displayName || r.from)}</span>
            <button type="button" class="btn btn-sm btn-primary" data-cok="${escapeHtml(r.from)}">Accept</button>
            <button type="button" class="btn btn-sm btn-ghost" data-cno="${escapeHtml(r.from)}">Decline</button>`;
          crin.appendChild(div);
        });
      if (crin.children.length === 1) crin.innerHTML += '<p class="muted">No incoming close friend requests.</p>';
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
      crout.innerHTML = '<p class="request-label">Pending</p>';
      const me = userId();
      getNetwork().closeRequests
        .filter((r) => r.from === me)
        .forEach((r) => {
          const u = getRegistryUser(r.to);
          const div = document.createElement("div");
          div.className = "request-row";
          div.innerHTML = `<span>${escapeHtml(u?.displayName || r.to)}</span>
            <button type="button" class="btn btn-sm btn-ghost" data-ccancel="${escapeHtml(r.to)}">Cancel</button>`;
          crout.appendChild(div);
        });
      if (crout.children.length === 1) crout.innerHTML += '<p class="muted">No pending close friend requests.</p>';
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
      sel.innerHTML = '<option value="">Select A Friend…</option>';
      listFriendIds().forEach((fid) => {
        const u = getRegistryUser(fid);
        const o = document.createElement("option");
        o.value = fid;
        o.textContent = (isCloseFriend(fid) ? "★ " : "") + (u?.displayName || fid);
        sel.appendChild(o);
      });
      if (cur && [...sel.options].some((o) => o.value === cur)) sel.value = cur;
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
  }

  qs("#recommend-send")?.addEventListener("click", () => {
    const key = decodeURIComponent(qs("#recommend-course-select")?.value || "");
    const audience = qs("#recommend-audience")?.value || "friends";
    const note = qs("#recommend-note")?.value.trim() || "Worth checking out.";
    if (!key) return;
    const recs = getJson(RECOMMENDATIONS_KEY, []);
    const { title } = parseCourseKey(key);
    recs.unshift({ from: userId(), fromName: state.profile.displayName || userId(), school: state.profile.school, key, audience, note, at: Date.now() });
    setJson(RECOMMENDATIONS_KEY, recs.slice(0, 100));
    pushFeed(userId(), state.profile.displayName, "recommended", `recommended ${title}`);
    pushNotification(`You recommended ${title} to ${audience}.`, "recommendation");
    const st = qs("#recommend-status");
    if (st) st.textContent = `Recommended ${title}.`;
    qs("#recommend-note").value = "";
  });

  function renderChat() {
    const peerId = qs("#chat-peer-select")?.value;
    const thread = qs("#chat-thread");
    if (!thread) return;
    if (!peerId || !isFriend(peerId)) {
      thread.innerHTML = '<p class="muted">Choose a friend to message.</p>';
      return;
    }
    const msgs = getThread(peerId);
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
    const raw = qs("#contacts-paste").value;
    const out = qs("#contacts-results");
    const lines = raw.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    const emails = new Set();
    const phones = new Set();
    lines.forEach((line) => {
      if (line.includes("@")) emails.add(normalizeEmail(line));
      else phones.add(line.replace(/\D/g, ""));
    });
    const peers = listVerifiedPeers().filter((p) => {
      const em = (p.email || "").toLowerCase();
      const ph = (p.phoneDigits || "").replace(/\D/g, "");
      if (emails.has(em)) return true;
      if (phones.has(ph) && ph.length >= 10) return true;
      return false;
    });
    out.innerHTML =
      peers.length > 0
        ? `<h4 class="results-title">Matches</h4><div class="match-grid">${peers
            .map(
              (p) =>
                `<div class="match-card"><strong>${escapeHtml(p.displayName)}</strong><span class="muted small">${escapeHtml(p.email)}</span><button type="button" class="btn btn-sm btn-primary" data-mreq="${escapeHtml(p.id)}">Add Friend</button><button type="button" class="btn btn-sm btn-ghost" data-mview="${escapeHtml(p.id)}">Profile</button></div>`
            )
            .join("")}</div>`
        : '<p class="muted">No verified matches for those emails or phone numbers on this device.</p>';
    qsa("[data-mreq]", out).forEach((b) => {
      b.addEventListener("click", () => {
        requestFriend(b.getAttribute("data-mreq"));
        renderFriendsPanel();
        renderDirectory();
      });
    });
    qsa("[data-mview]", out).forEach((b) => {
      b.addEventListener("click", () => openPeerModal(b.getAttribute("data-mview")));
    });
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
    grid.innerHTML = "";
    PRIVACY_FIELDS.forEach((pf) => {
      const val = state.profile.privacy[pf.key] || "friends";
      const wrap = document.createElement("label");
      wrap.className = "privacy-row";
      wrap.innerHTML = `<span>${escapeHtml(pf.label)}</span>
        <select data-privacy-key="${pf.key}">
          <option value="school" ${val === "school" ? "selected" : ""}>School Directory</option>
          <option value="friends" ${val === "friends" ? "selected" : ""}>Friends Only</option>
          <option value="private" ${val === "private" ? "selected" : ""}>Only Me</option>
        </select>`;
      grid.appendChild(wrap);
    });
  }

  function renderAchievements() {
    const grid = qs("#achievement-grid");
    if (!grid) return;
    const posts = JSON.parse(localStorage.getItem(DISCUSSION_KEY) || "[]").filter((p) => p.authorId === userId()).length;
    const verified = getRegistryUser(userId());
    const veteranCutoff = new Date("2026-07-04T00:00:00").getTime();
    const friendCount = listFriendIds().length;
    const doesSport = state.activities.some((a) => a.kind === "Sport") || (verified?.activities || []).some((a) => a.kind === "Sport");
    const founder = userId() === ADMIN_EMAIL || verified?.founder;
    const badges = [
      { name: "Verified", desc: "Be verified in the directory.", unlocked: !!verified?.verified },
      { name: "Veteran", desc: "Verified before July 4, 2026.", unlocked: !!verified?.verified && (verified.updatedAt || Date.now()) < veteranCutoff },
      { name: "Connected", desc: "Have at least 10 friends.", unlocked: friendCount >= 10, progress: `${friendCount}/10 friends` },
      { name: "Pillar", desc: "Post at least 100 times in Networking.", unlocked: posts >= 100, progress: `${posts}/100 posts` },
      { name: "Athlete", desc: "Add a sport to your activities.", unlocked: doesSport },
      ...(founder ? [{ name: "Founder", desc: "Early CourseSync founder achievement.", unlocked: true }] : []),
    ];
    grid.innerHTML = badges
      .map(
        (b) => `<article class="achievement-card ${b.unlocked ? "unlocked" : "locked"}">
          <span class="achievement-icon">${b.unlocked ? "★" : "☆"}</span>
          <div><strong>${escapeHtml(b.name)}</strong><p>${escapeHtml(b.desc)}</p>${b.progress ? `<span>${escapeHtml(b.progress)}</span>` : ""}</div>
        </article>`
      )
      .join("");
  }

  function renderProfilePanel() {
    qs("#pf-name").value = state.profile.displayName;
    qs("#pf-phone").value = state.profile.phone;
    qs("#pf-school").value = state.profile.school;
    qs("#pf-gender").value = state.profile.gender || "";
    qs("#pf-student-type").value = state.profile.studentType || "";
    qs("#pf-grade").value = state.profile.grade;
    qs("#pf-academic").value = state.profile.academicLevel;
    qs("#pf-career").value = state.profile.careerPathway || "";
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
      (state.profile.avatarOptions || []).forEach((src, idx) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "avatar-photo-option" + (state.profile.avatarDataUrl === src ? " selected" : "");
        b.innerHTML = `<img src="${src}" alt="Saved profile option ${idx + 1}" />`;
        b.addEventListener("click", () => {
          state.profile.avatarDataUrl = src;
          saveState(state);
          renderProfilePanel();
          renderTopbarUser();
        });
        savedGrid.appendChild(b);
      });
      if (!state.profile.avatarOptions?.length) savedGrid.innerHTML = '<p class="muted small">No saved photos yet.</p>';
    }
    renderTopbarUser();
  }

  function renderSettingsPanel() {
    if (qs("#pf-accent")) qs("#pf-accent").value = state.profile.accent || "#2d6a4f";
    if (qs("#setting-theme")) qs("#setting-theme").value = state.settings?.theme || "light";
    qsa("[data-notify-setting]").forEach((el) => {
      el.checked = state.settings?.notifications?.[el.getAttribute("data-notify-setting")] !== false;
    });
    applyAppearance();
    renderPrivacyGrid();
    renderAchievements();
    const status = qs("#emerald-backup-status");
    if (status) {
      status.textContent = state.emeraldBackup
        ? `Emerald data saved ${new Date(state.emeraldBackup.savedAt || Date.now()).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}.`
        : "No Emerald backup is currently tucked away.";
    }
    const restoreBtn = qs("#restore-emerald-data");
    if (restoreBtn) restoreBtn.disabled = !state.emeraldBackup;
  }

  qs("#profile-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const phone = qs("#pf-phone").value.replace(/\D/g, "");
    if (phone.length < 10) {
      alert("Enter a valid phone number (at least 10 digits).");
      return;
    }
    if (!qs("#pf-gender").value || !qs("#pf-student-type").value) {
      alert("Please select gender and student type for the verified directory.");
      return;
    }
    state.profile.displayName = qs("#pf-name").value.trim();
    state.profile.phone = qs("#pf-phone").value.trim();
    state.profile.school = qs("#pf-school").value;
    state.profile.gender = qs("#pf-gender").value;
    state.profile.studentType = qs("#pf-student-type").value;
    state.profile.grade = qs("#pf-grade").value;
    state.profile.academicLevel = qs("#pf-academic").value;
    state.profile.careerPathway = qs("#pf-career").value;
    state.profile.bio = qs("#pf-bio").value.trim();
    state.profile.pronouns = qs("#pf-pronouns").value.trim();
    if (qs("#pf-accent")) state.profile.accent = qs("#pf-accent").value;
    state.scheduleSchool = state.profile.school;
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

  qs("#avatar-clear-upload")?.addEventListener("click", () => {
    state.profile.avatarDataUrl = "";
    saveState(state);
    renderProfilePanel();
  });

  qs("#pf-accent")?.addEventListener("input", (e) => {
    state.profile.accent = e.target.value;
    applyAppearance();
    saveState(state);
  });

  qs("#setting-theme")?.addEventListener("change", (e) => {
    state.settings.theme = e.target.value;
    applyAppearance();
    saveState(state);
  });

  qsa("[data-notify-setting]").forEach((el) => {
    el.addEventListener("change", () => {
      const key = el.getAttribute("data-notify-setting");
      state.settings.notifications[key] = el.checked;
      saveState(state);
    });
  });

  qs("#privacy-grid")?.addEventListener("change", (e) => {
    const t = e.target;
    if (t.matches && t.matches("select[data-privacy-key]")) {
      state.profile.privacy[t.getAttribute("data-privacy-key")] = t.value;
      saveState(state);
    }
  });

  qs("#restore-emerald-data")?.addEventListener("click", () => {
    if (!restoreEmeraldData()) return;
    renderSettingsPanel();
    renderTopbarUser();
    renderHomePanel();
  });

  qs("#settings-open-emerald")?.addEventListener("click", () => {
    state.activeCommunitySchool = "Emerald High School";
    saveState(state);
    showPanel("community");
  });

  qs("#settings-save")?.addEventListener("click", () => {
    if (qs("#pf-accent")) state.profile.accent = qs("#pf-accent").value;
    if (qs("#setting-theme")) state.settings.theme = qs("#setting-theme").value;
    qsa("[data-notify-setting]").forEach((el) => {
      state.settings.notifications[el.getAttribute("data-notify-setting")] = el.checked;
    });
    applyAppearance();
    saveState(state);
    const st = qs("#settings-save-status");
    if (st) {
      st.textContent = "Settings saved.";
      setTimeout(() => (st.textContent = ""), 1800);
    }
  });

  renderTopbarUser();
  renderCurrentDate();
  renderNotifications();
  rebuildEnrollmentAndRatings();
  showPanel("home");
})();
