App.dialogs = App.dialogs || {};

App.dialogs.confirm = (function () {
  let dialogEl, titleEl, messageEl, okBtn, cancelBtn, closeBtn;
  let resolvePromise = null;

  function init() {
    dialogEl = document.getElementById('confirm-dialog');
    titleEl = document.getElementById('confirm-dialog-title');
    messageEl = document.getElementById('confirm-dialog-message');
    okBtn = document.getElementById('confirm-ok-btn');
    cancelBtn = document.getElementById('confirm-cancel-btn');
    closeBtn = document.getElementById('confirm-close-btn');

    okBtn.addEventListener('click', () => {
      dialogEl.close();
      resolvePromise?.(true);
      resolvePromise = null;
    });

    [cancelBtn, closeBtn].forEach((btn) => {
      btn.addEventListener('click', () => {
        dialogEl.close();
        resolvePromise?.(false);
        resolvePromise = null;
      });
    });
  }

  // showCancel=false turns it into a plain OK/alert-style dialog.
  function open(title, message, showCancel = true) {
    titleEl.textContent = title;
    messageEl.textContent = message;
    cancelBtn.hidden = !showCancel;
    closeBtn.hidden = !showCancel;
    okBtn.textContent = showCancel ? 'حذف' : 'حسناً';
    okBtn.style.background = showCancel ? 'var(--danger)' : 'var(--primary)';
    dialogEl.showModal();

    return new Promise((resolve) => {
      resolvePromise = resolve;
    });
  }

  return { init, open };
})();
