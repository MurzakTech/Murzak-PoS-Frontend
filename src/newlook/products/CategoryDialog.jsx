import React, { useState } from 'react';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Field from '../components/Field';
import Select from '../components/Select';
import fill from '../labels/fill';
import { addCategory, renameCategory } from '../../api/productsListApi';
import { isRootCategory, parentOptions } from './productsModel';
import T from './strings.products';

const FORM_ID = 'nl-category-form';

const Body = ({ category, categories, onClose, onDone }) => {
  const renaming = Boolean(category);
  const [name, setName] = useState(renaming ? category.name : '');
  const [parent, setParent] = useState(renaming && category.parent ? category.parent : T.rootCategory);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const D = T.categories.dialog;

  const save = async (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setProblem(D.nameRequired);
      return;
    }
    setBusy(true);
    setProblem('');
    try {
      const top = isRootCategory(parent);
      if (renaming) await renameCategory({ name: category.name, newName: trimmed, parent });
      else await addCategory({ name: trimmed, parent: top ? undefined : parent });
      onDone({ name: trimmed, renamed: renaming });
    } catch (error) {
      setProblem(error.message);
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      busy={busy}
      title={renaming ? fill(D.renameTitle, { name: category.name }) : D.addTitle}
      description={D.description}
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            {D.cancel}
          </Button>
          <Button type="submit" form={FORM_ID} loading={busy}>
            {D.save}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={save} className="nl-products-dialog-form">
        <Field id="nl-category-name" label={D.name} placeholder={D.namePlaceholder} value={name} error={problem || undefined} data-autofocus="" onChange={(value) => { setName(value); setProblem(''); }} />
        <Select label={D.parent} helper={D.parentHelper} options={parentOptions(categories, renaming ? category.name : '')} value={parent} onChange={setParent} />
      </form>
    </Dialog>
  );
};

/**
 * Add a category, or change one (rename it and/or move it inside another). The server's refusal (a name already used)
 * shows beside the name. onDone({ name, renamed }) is called once it is saved.
 */
const CategoryDialog = ({ open, category, categories = [], onClose, onDone }) => (open ? <Body category={category} categories={categories} onClose={onClose} onDone={onDone} /> : null);

export default CategoryDialog;
