App.dialogs = App.dialogs || {};

App.dialogs.category = (function () {
  let dialog, form, idInput, nameInput, parentSelect, errorDiv, errorText, titleEl;

  function init() {
    dialog = document.getElementById('category-dialog');
    form = document.getElementById('category-form');
    idInput = document.getElementById('category-id');
    nameInput = document.getElementById('category-name');
    parentSelect = document.getElementById('category-parent');
    errorDiv = document.getElementById('category-error');
    errorText = document.getElementById('category-error-text');
    titleEl = document.getElementById('category-dialog-title');

    parentSelect.addEventListener('change', () => {
      updateTitle(idInput.disabled, Boolean(parentSelect.value));
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorDiv.hidden = true;

      const { error } = await App.api.upsertCategory(
        idInput.value.trim().toLowerCase().replace(/\s+/g, '_'),
        nameInput.value.trim(),
        parentSelect.value || null
      );

      if (error) {
        errorText.textContent = error.message;
        errorDiv.hidden = false;
        return;
      }

      dialog.close();
      App.events.emit('categories:changed');
    });
  }

  function updateTitle(isEditing, hasParent) {
    titleEl.textContent = isEditing
      ? (hasParent ? 'تعديل فئة فرعية' : 'تعديل الفئة')
      : (hasParent ? 'إضافة فئة فرعية' : 'إضافة فئة');
  }

  // category=null for "add"; presetParentId pre-selects a parent (e.g. from
  // the "+ إضافة فئة فرعية" action on a drilled-into category card).
  function open(category, presetParentId) {
    errorDiv.hidden = true;
    form.reset();

    const isEditing = category != null;

    const parentOptions = App.state.categoriesCache.filter((c) => !c.parent_id && c.id !== category?.id);
    parentSelect.innerHTML =
      '<option value="">لا شيء (فئة رئيسية)</option>' +
      parentOptions.map((c) => `<option value="${App.utils.escapeHtml(c.id)}">${App.utils.escapeHtml(c.name)}</option>`).join('');
    parentSelect.value = isEditing ? category.parent_id ?? '' : presetParentId ?? '';

    updateTitle(isEditing, Boolean(parentSelect.value));

    idInput.value = isEditing ? category.id : '';
    idInput.disabled = isEditing;
    nameInput.value = isEditing ? category.name : '';

    dialog.showModal();
  }

  return { init, open };
})();
