/**
 * Brief overviews and difficulty hints for Course Info.
 * Matches by level prefix in course key (AP / Honors / CP / etc.) and title keywords.
 */
window.getCourseMeta = function getCourseMeta(courseKey, courseLabel) {
  const text = `${courseKey} ${courseLabel || ""}`.toLowerCase();
  const base = { overview: "", difficulty: "Moderate" };

  if (text.includes("::ap::") || text.includes(" ap ")) {
    base.difficulty = "High";
    base.overview =
      "College-level pacing with an AP exam or portfolio target. Expect frequent homework, independent review, cumulative assessments, and stronger time management needs.";
  } else if (text.includes("::honors::") || text.includes("honors")) {
    base.difficulty = "Medium–High";
    base.overview =
      "Faster than CP with more depth, more independent practice, and higher expectations for tests, projects, and writing. Best for students ready for steady weekly workload.";
  } else if (text.includes("::cp::") || text.includes("::college prep::")) {
    base.difficulty = "Moderate";
    base.overview =
      "Grade-level standards with structured practice and support. Good fit for building core skills, protecting schedule balance, or strengthening a subject before taking advanced work.";
  } else if (text.includes("elective")) {
    base.difficulty = "Varies";
    base.overview =
      "Exploratory or specialty focus that can connect to interests, arts, leadership, technology, or career pathways. Workload varies by project and performance expectations.";
  }

  if (/calculus|precalculus|statistics/.test(text)) {
    base.overview =
      "Math skills build sequentially, so missed concepts can stack quickly. Daily practice, error review, and asking questions early are especially important.";
  }
  if (/biology|chemistry|physics|environmental science/.test(text)) {
    base.overview =
      "Lab work, conceptual models, vocabulary, calculations, and safety procedures matter. Strong notes and regular review help connect class activities to tests.";
  }
  if (/english|literature|writing|erwc/.test(text)) {
    base.overview =
      "Reading, discussion, annotation, and writing cycles are central. Expect essays, timed responses, projects, and revision based on teacher feedback.";
  }
  if (/history|government|economics|psychology|geography/.test(text)) {
    base.overview =
      "Content-heavy course with reading, notes, argument writing, source analysis, and sometimes projects or current events. Keeping up with units prevents cramming.";
  }
  if (/spanish|french|german|mandarin|chinese|japanese|latin|language/.test(text)) {
    base.overview =
      "Daily participation, vocabulary practice, listening, speaking, and grammar patterns build fluency. Consistent short practice usually beats last-minute studying.";
  }
  if (/computer science|programming|cs principles/.test(text)) {
    base.overview =
      "Problem-solving with code, algorithms, computing concepts, or design projects. Debugging, persistence, and clear documentation are central.";
  }
  if (/art|design|music|theater|band|choir|orchestra|dance/.test(text)) {
    base.overview =
      "Studio, rehearsal, critique, or performance work. Expect practice outside class, portfolio development, production deadlines, or public performances depending on the course.";
  }
  if (/physical education|pe |strength|fitness|yoga/.test(text)) {
    base.difficulty = "Low–Moderate";
    base.overview =
      "Participation, fitness habits, teamwork, wellness knowledge, and sometimes written reflections. Attendance and consistent effort usually matter a lot.";
  }
  if (/capstone|seminar|research/.test(text)) {
    base.difficulty = "High";
    base.overview =
      "Long-term research, presentations, service, or portfolio work. Strong planning, milestone tracking, and mentor feedback are important to avoid deadline pileups.";
  }

  if (!base.overview) {
    base.overview =
      "Course includes classwork, homework, assessments, and teacher-specific expectations. Check counselor guidance and the current registration resources for prerequisites and grade eligibility.";
  }

  return base;
};

window.EHS_COURSE_LIST_URL =
  "https://docs.google.com/document/d/1gLrb0ozG-_WllHzmWmbsWDJEB_DkHBw-DRiNkLm6WGQ/edit";
