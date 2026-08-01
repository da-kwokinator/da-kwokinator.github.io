/**
 * Community metadata for the Community tab (logos are representative imagery).
 */
window.COMMUNITY_SCHOOLS = {
  "Emerald High School": {
    id: "emerald",
    logo: "assets/course-planning.svg",
    type: "Public high school",
    grades: "9–12",
    location: "Dublin, California",
    premise:
      "A comprehensive high school community balancing rigorous coursework, arts and athletics, and pathways toward college and career readiness. Students connect through clubs, leadership, and shared schedules.",
  },
  "Fallon Middle School": {
    id: "fallon",
    logo: "assets/fallon-bell-schedule.png",
    type: "Public middle school",
    grades: "6–8",
    location: "Dublin, California",
    premise:
      "Fallon supports the transition from elementary to high school with exploratory electives, advisory, and activities that build study habits and friendships across grades.",
  },
};

window.listCommunitySchoolIds = function listCommunitySchoolIds() {
  return Object.keys(window.COMMUNITY_SCHOOLS || {});
};
