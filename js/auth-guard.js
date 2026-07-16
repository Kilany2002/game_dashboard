App.auth = {
  async getSession() {
    const { data } = await App.sb.auth.getSession();
    return data.session;
  },

  // Call at the top of pages that require a logged-in admin (index.html).
  async requireSession() {
    const session = await App.auth.getSession();
    if (!session) {
      location.replace('login.html');
      return null;
    }
    return session;
  },

  // Call at the top of login.html so an already-authenticated admin skips the form.
  async redirectIfAuthed(target = 'index.html') {
    const session = await App.auth.getSession();
    if (session) location.replace(target);
  },
};
