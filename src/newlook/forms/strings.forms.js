const forms = {
  status: { notSaved: 'Not saved yet', saving: 'Saving', saved: 'Saved' },
  actions: { cancel: 'Cancel', save: 'Save', saveAndAdd: 'Save and add another' },
  summary: {
    one: 'Fix 1 thing before saving',
    many: 'Fix {count} things before saving',
  },
  moreOptions: { show: 'More options', hide: 'Fewer options' },
  leave: {
    title: 'Leave without saving?',
    message: 'You have changes that are not saved yet. If you leave now, they will be lost.',
    stay: 'Stay',
    leave: 'Leave without saving',
  },
};

export default forms;
