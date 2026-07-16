// Shared in-memory cache for the currently loaded admin session.
// viewCache marks a route as "already loaded" so switching tabs doesn't
// re-fetch; the refresh button / dialogs clear the relevant key to force it.
App.state = {
  categoriesCache: [],
  questionsCache: [],
  leaderboardCache: [],
  roomsCache: [],
  usersCache: [],
  viewCache: {},
};
