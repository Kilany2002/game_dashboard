App.dialogs = App.dialogs || {};

App.dialogs.question = (function () {
  let dialog, form, originalIdInput, categorySelect, textInput, answerInput, errorDiv, errorText, titleEl;

  function init() {
    dialog = document.getElementById('question-dialog');
    form = document.getElementById('question-form');
    originalIdInput = document.getElementById('question-original-id');
    categorySelect = document.getElementById('question-category');
    textInput = document.getElementById('question-text');
    answerInput = document.getElementById('question-answer');
    errorDiv = document.getElementById('question-error');
    errorText = document.getElementById('question-error-text');
    titleEl = document.getElementById('question-dialog-title');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorDiv.hidden = true;

      const { error } = await App.api.upsertQuestion(
        originalIdInput.value || null,
        categorySelect.value,
        textInput.value.trim(),
        answerInput.value.trim()
      );

      if (error) {
        errorText.textContent = error.message;
        errorDiv.hidden = false;
        return;
      }

      dialog.close();
      App.events.emit('questions:changed');
    });
  }

  function buildCategoryOptions(categories) {
    const topLevel = categories.filter((c) => !c.parent_id).sort((a, b) => a.name.localeCompare(b.name));
    const childrenByParent = {};
    categories.forEach((c) => {
      if (c.parent_id) (childrenByParent[c.parent_id] ??= []).push(c);
    });

    return topLevel.map((parent) => {
      const children = (childrenByParent[parent.id] || []).sort((a, b) => a.name.localeCompare(b.name));
      if (!children.length) return '';
      const options = children
        .map((c) => `<option value="${App.utils.escapeHtml(c.id)}">${App.utils.escapeHtml(c.name)}</option>`)
        .join('');
      return `<optgroup label="${App.utils.escapeHtml(parent.name)}">${options}</optgroup>`;
    }).join('');
  }

  function hasAnySubcategory(categories) {
    return categories.some((c) => c.parent_id);
  }

  async function open(question) {
    if (!hasAnySubcategory(App.state.categoriesCache)) {
      await App.dialogs.confirm.open(
        'لا توجد فئات فرعية بعد',
        'أضف فئة فرعية أولاً — يمكن ربط الأسئلة بالفئات الفرعية فقط، وليس بالفئات الرئيسية.',
        false
      );
      return;
    }

    errorDiv.hidden = true;
    form.reset();

    categorySelect.innerHTML = buildCategoryOptions(App.state.categoriesCache);

    const isEditing = question != null;
    titleEl.textContent = isEditing ? 'تعديل السؤال' : 'إضافة سؤال';
    originalIdInput.value = isEditing ? question.id : '';
    categorySelect.value = isEditing ? question.category_id : '';
    textInput.value = isEditing ? question.text : '';
    answerInput.value = isEditing ? question.correct_answer : '';

    dialog.showModal();
  }

  return { init, open, buildCategoryOptions, hasAnySubcategory };
})();
