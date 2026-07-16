// Tiny pub/sub so unrelated pieces (dialogs, views) can react to data
// changes without reaching into each other directly.
App.events = (function () {
  const bus = new EventTarget();

  return {
    emit(name, detail) {
      bus.dispatchEvent(new CustomEvent(name, { detail }));
    },
    on(name, handler) {
      bus.addEventListener(name, (e) => handler(e.detail));
    },
  };
})();
