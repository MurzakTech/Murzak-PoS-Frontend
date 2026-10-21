import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { Chip } from '../../components/Chip';
import Icon from '../../components/Icon';
import Segmented from '../../components/Segmented';
import Table from '../../components/Table';
import { FormPage } from '../../forms';
import { PageHeader } from '../../shell';
import fill from '../../labels/fill';
import { importProducts, previewProductImport, uploadPhotosZip } from '../../../api/productImportApi';
import { readProductFile } from '../../../utils/readProductFile';
import { problemRowsCsv } from '../../../utils/productImport';
import { saveTextFile } from '../../../utils/saveTextFile';
import { PRODUCTS_PATH } from '../productsModel';
import { invalidateQuery, useUnits } from '../useProductsData';
import '../products.css';
import './import.css';
import { COLUMNS, checkSheet, templateCsv } from './importSheet';
import { PAGE_SIZE, countsOf, filterRows, importCount, previewRows, resultHasTrouble, resultLines, resultNeedsAttention, rowsToSend, saveLabel } from './importModel';
import T from './strings.import';

/**
 * Import products (ticket P7-1), on the Form page pattern. Choose a spreadsheet (and, if its picture column holds file names, a
 * ZIP of photos); the page checks it against the shop and says, for every row, what was understood and what will happen, and
 * which new categories will be created, BEFORE anything is saved. The button then imports the rows that can be imported.
 * A product whose code already exists is updated, never added twice, so the same file can be sent again safely.
 */
const ACTION_ICON = { create: 'plus', update: 'check', unchanged: 'info', invalid: 'alert' };
const STATUS_ICON = { created: 'plus', updated: 'check', unchanged: 'info', failed: 'alert', left_out: 'alert' };

const List = ({ items, className = '' }) =>
  items.length ? (
    <ul className={`nl-import__list ${className}`.trim()}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  ) : null;

const ImportProductsPage = () => {
  const navigate = useNavigate();
  const units = useUnits();
  const fileInput = useRef(null);
  const zipInput = useRef(null);
  const ticket = useRef(0);

  const [fileName, setFileName] = useState('');
  const [check, setCheck] = useState(null);
  const [preview, setPreview] = useState(null);
  const [zipName, setZipName] = useState('');
  const [photosFile, setPhotosFile] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | reading | checking | importing | uploading
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [filter, setFilter] = useState('all');
  const [shown, setShown] = useState(PAGE_SIZE);

  const shopUnits = units.status === 'ready' ? units.data : [];

  const runPreview = useCallback(async (nextCheck, nextPhotos) => {
    ticket.current += 1;
    const mine = ticket.current;
    setError('');
    if (!nextCheck || nextCheck.rows.length === 0) {
      setPreview(null);
      setPhase('idle');
      return;
    }
    setPhase('checking');
    try {
      const answer = await previewProductImport({ rows: rowsToSend(nextCheck), photosFile: nextPhotos });
      if (ticket.current !== mine) return;
      setPreview(answer);
    } catch (e) {
      if (ticket.current !== mine) return;
      setPreview(null);
      setError(e.message || T.checkFailed);
    }
    if (ticket.current === mine) setPhase('idle');
  }, []);

  const onFile = async (event) => {
    const selected = event.target.files && event.target.files[0];
    event.target.value = ''; // lets the same file be chosen again after it has been fixed
    if (!selected) return;
    ticket.current += 1;
    setResult(null);
    setPreview(null);
    setCheck(null);
    setFilter('all');
    setShown(PAGE_SIZE);
    setError('');
    setFileName(selected.name);
    setPhase('reading');
    const { rows, error: readError } = await readProductFile(selected);
    if (readError) {
      setPhase('idle');
      setError(readError);
      return;
    }
    const checked = checkSheet(rows, { shopUnits });
    setCheck(checked);
    if (checked.fileProblems.length) {
      setPhase('idle');
      return;
    }
    runPreview(checked, photosFile);
  };

  const onZip = async (event) => {
    const selected = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!selected) return;
    setError('');
    setPhase('uploading');
    try {
      const url = await uploadPhotosZip(selected);
      setZipName(selected.name);
      setPhotosFile(url);
      runPreview(check, url);
    } catch (e) {
      setPhase('idle');
      setError(e.message);
    }
  };

  const removeZip = () => {
    setZipName('');
    setPhotosFile('');
    runPreview(check, '');
  };

  const counts = useMemo(() => countsOf(check, preview), [check, preview]);
  const rows = useMemo(() => previewRows(check, preview), [check, preview]);
  const visible = filterRows(rows, filter);
  const busy = phase !== 'idle';
  const toImport = importCount(counts);

  const submit = async () => {
    if (busy) return;
    if (!check || !preview) {
      setError(T.nothingToImport);
      return;
    }
    if (toImport === 0) {
      setError(T.nothingReady);
      return;
    }
    setError('');
    setPhase('importing');
    try {
      setResult(await importProducts({ rows: rowsToSend(check), photosFile }));
      invalidateQuery('products');
      invalidateQuery();
      setCheck(null);
      setPreview(null);
      setFileName('');
    } catch (e) {
      setError(e.message || T.failed);
    }
    setPhase('idle');
  };

  const reset = () => {
    ticket.current += 1;
    setResult(null);
    setCheck(null);
    setPreview(null);
    setFileName('');
    setError('');
    setFilter('all');
    setShown(PAGE_SIZE);
  };

  const downloadProblems = () => {
    if (check && check.invalid.length) saveTextFile(`﻿${problemRowsCsv(check)}`, T.file.problemsName);
  };

  // ---------------------------------------------------------------- after the import
  if (result) {
    const trouble = resultHasTrouble(result);
    const R = T.result;
    const resultRows = result.rows.filter((r) => filter === 'all' || resultNeedsAttention(r)).map((r) => ({ ...r, id: r.row }));
    return (
      <div className="nl-form-page nl-import">
        <PageHeader title={T.title} subtitle={T.subtitle} />
        <Card title={trouble ? R.titleAttention : R.title} level={2}>
          <p className="nl-import__chips" aria-label={T.preview.countsLabel}>
            {Object.keys(R.counts)
              .filter((key) => result.counts[key] > 0)
              .map((key) => (
                <Chip key={key} icon={STATUS_ICON[key === 'left_out' ? 'left_out' : key]}>
                  {fill(R.counts[key], { count: result.counts[key] })}
                </Chip>
              ))}
          </p>
          <List items={resultLines(result)} />
          <p className="nl-import__note">{R.again}</p>
          <div className="nl-import__buttons">
            <Button onClick={() => navigate(PRODUCTS_PATH)}>{R.viewProducts}</Button>
            <Button variant="secondary" onClick={reset}>
              {R.another}
            </Button>
          </div>
        </Card>
        <Card title={R.caption} small level={2}>
          <Segmented
            label={T.preview.filter}
            options={[
              { value: 'all', label: T.preview.filterAll },
              { value: 'attention', label: T.preview.filterAttention },
            ]}
            value={filter}
            onChange={setFilter}
          />
          <Table
            caption={R.caption}
            rows={resultRows.slice(0, shown)}
            columns={[
              { key: 'row', header: R.columns.row, nowrap: true },
              {
                key: 'product',
                header: R.columns.product,
                render: (r) => (
                  <>
                    <strong>{r.item_name || r.item_code}</strong>
                    <span className="nl-products-sub">{r.item_code}</span>
                  </>
                ),
              },
              {
                key: 'result',
                header: R.columns.result,
                render: (r) => (
                  <>
                    <Chip icon={STATUS_ICON[r.status]}>{R.status[r.status] || r.status}</Chip>
                    {r.message ? <span className="nl-products-sub">{r.message}</span> : null}
                    <List items={[...(r.problems || []).map((p) => p.message), ...(r.notes || [])]} className="nl-import__small" />
                  </>
                ),
              },
            ]}
            empty={{ icon: 'check', title: T.preview.noAttention }}
          />
          {resultRows.length > shown ? (
            <Button variant="secondary" onClick={() => setShown((n) => n + PAGE_SIZE)}>
              {T.preview.showMore}
            </Button>
          ) : null}
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------- choosing and checking
  const fileProblems = check ? check.fileProblems : [];
  const attentionCount = rows.filter((r) => r.action === T.keys.invalid).length;

  return (
    <div className="nl-import">
      <FormPage
        title={T.title}
        subtitle={T.subtitle}
        dirty={Boolean(check) && !result}
        saving={phase === 'importing'}
        errors={[]}
        onSave={submit}
        onCancel={() => navigate(PRODUCTS_PATH)}
        saveLabel={saveLabel(check && preview ? counts : null)}
      >
        {error ? (
          <p className="nl-error" role="alert">
            <Icon name="alert" />
            <span>{error}</span>
          </p>
        ) : null}

        <Card title={T.file.title} small level={2}>
          <p className="nl-import__note">{T.file.intro}</p>
          <div className="nl-import__buttons">
            <input ref={fileInput} type="file" hidden aria-label={T.file.labelHidden} accept={T.file.accept} onChange={onFile} />
            <Button icon="arrowUp" variant={check ? 'secondary' : 'primary'} disabled={busy || units.status === 'loading'} loading={phase === 'reading'} onClick={() => fileInput.current && fileInput.current.click()}>
              {fileName ? T.file.change : T.file.choose}
            </Button>
            <Button variant="ghost" icon="arrowDown" onClick={() => saveTextFile(templateCsv(), T.file.templateName)}>
              {T.file.templateCsv}
            </Button>
          </div>
          {fileName ? <p className="nl-import__note">{fill(T.file.chosen, { name: fileName })}</p> : null}
          {phase === 'reading' ? <p role="status" className="nl-import__note">{T.file.reading}</p> : null}
          {fileProblems.map((p) => (
            <p key={p} className="nl-error" role="alert">
              <Icon name="alert" />
              <span>{p}</span>
            </p>
          ))}
        </Card>

        <Card title={T.photos.title} small level={2}>
          <p className="nl-import__note">{T.photos.intro}</p>
          <div className="nl-import__buttons">
            <input ref={zipInput} type="file" hidden aria-label={T.photos.labelHidden} accept={T.photos.accept} onChange={onZip} />
            <Button variant="secondary" icon="arrowUp" disabled={busy} loading={phase === 'uploading'} onClick={() => zipInput.current && zipInput.current.click()}>
              {zipName ? T.photos.change : T.photos.choose}
            </Button>
            {zipName ? (
              <Button variant="ghost" disabled={busy} onClick={removeZip}>
                {T.photos.remove}
              </Button>
            ) : null}
          </div>
          {zipName ? <p className="nl-import__note">{fill(T.photos.chosen, { name: zipName })}</p> : null}
          {preview && preview.photos.zip_used ? (
            <p className="nl-import__note" role="status">
              {fill(T.photos.found, { count: preview.photos.zip_files })} {preview.photos.zip_ignored ? fill(T.photos.ignored, { count: preview.photos.zip_ignored }) : ''}
            </p>
          ) : null}
          {preview && preview.photos.problem ? (
            <p className="nl-error" role="alert">
              <Icon name="alert" />
              <span>{preview.photos.problem}</span>
            </p>
          ) : null}
        </Card>

        {phase === 'checking' ? (
          <p role="status" className="nl-import__note">
            {T.checking}
          </p>
        ) : null}

        {check && !fileProblems.length && (preview || check.invalid.length) && phase !== 'checking' ? (
          <Card title={T.preview.title} small level={2}>
            <p className="nl-import__chips" aria-label={T.preview.countsLabel}>
              {['create', 'update', 'unchanged', T.keys.invalid].map((key) =>
                counts[key] > 0 ? (
                  <Chip key={key} icon={ACTION_ICON[key]}>
                    {fill(T.preview.counts[key], { count: counts[key] })}
                  </Chip>
                ) : null
              )}
            </p>
            {preview && preview.categoriesLine ? (
              <p className="nl-import__fact" role="status">
                <Icon name="info" />
                <span>{preview.categoriesLine}</span>
              </p>
            ) : null}
            {preview && preview.brandsLine ? (
              <p className="nl-import__fact">
                <Icon name="info" />
                <span>{preview.brandsLine}</span>
              </p>
            ) : null}
            {preview && preview.stock.rows > 0 ? (
              <p className="nl-import__fact">
                <Icon name="info" />
                <span>
                  {fill(T.preview.stock, { rows: preview.stock.rows, units: preview.stock.units })} {preview.store ? fill(T.preview.store, { store: preview.store }) : ''}
                </span>
              </p>
            ) : null}
            {check.unknownColumns.length ? (
              <p className="nl-import__fact">
                <Icon name="info" />
                <span>{fill(T.unknownColumns, { names: check.unknownColumns.join(', ') })}</span>
              </p>
            ) : null}
            {attentionCount > 0 ? (
              <div className="nl-import__left-out">
                <p className="nl-import__strong">
                  <Icon name="alert" />
                  <span>{attentionCount === 1 ? T.preview.leftOutOne : fill(T.preview.leftOutTitle, { count: attentionCount })}</span>
                </p>
                <p className="nl-import__note">{T.preview.leftOutBody}</p>
                {check.invalid.length ? (
                  <Button variant="secondary" size="small" icon="arrowDown" onClick={downloadProblems}>
                    {T.preview.downloadProblems}
                  </Button>
                ) : null}
              </div>
            ) : null}

            <Segmented
              label={T.preview.filter}
              options={[
                { value: 'all', label: T.preview.filterAll },
                { value: 'attention', label: T.preview.filterAttention },
              ]}
              value={filter}
              onChange={(value) => {
                setFilter(value);
                setShown(PAGE_SIZE);
              }}
            />
            <Table
              caption={T.preview.caption}
              rows={visible.slice(0, shown)}
              columns={[
                { key: 'row', header: T.table.row, nowrap: true },
                {
                  key: 'product',
                  header: T.table.product,
                  render: (r) => (
                    <>
                      <strong>{r.name || r.code}</strong>
                      <span className="nl-products-sub">{r.code}</span>
                    </>
                  ),
                },
                { key: 'understood', header: T.table.understood, render: (r) => <List items={r.understood} className="nl-import__small" /> },
                {
                  key: 'will',
                  header: T.table.result,
                  render: (r) => (
                    <>
                      <Chip icon={ACTION_ICON[r.action]}>{T.actions[r.action]}</Chip>
                      <span className="nl-products-sub">{r.action === T.keys.invalid ? '' : r.will}</span>
                      <List items={[...r.problems, ...r.notes, ...(r.changes.length ? [fill(T.changes, { list: r.changes.join('; ') })] : [])]} className="nl-import__small" />
                    </>
                  ),
                },
              ]}
              empty={{ icon: 'check', title: T.preview.noAttention }}
            />
            <p className="nl-import__note">{fill(T.preview.showing, { shown: Math.min(shown, visible.length), total: visible.length })}</p>
            {visible.length > shown ? (
              <Button variant="secondary" onClick={() => setShown((n) => n + PAGE_SIZE)}>
                {T.preview.showMore}
              </Button>
            ) : null}
            <p className="nl-import__note">{T.preview.reuseNote}</p>
          </Card>
        ) : null}

        {!check ? (
          <Card title={T.guide.title} small level={2}>
            <details className="nl-import__guide">
              <summary>{T.guide.show}</summary>
              <p className="nl-import__note">{T.guide.intro}</p>
              <p className="nl-import__note">{T.guide.sameCode}</p>
              <table className="nl-import__guide-table">
                <caption className="nl-import__sr">{T.guide.caption}</caption>
                <thead>
                  <tr>
                    <th scope="col">{T.guide.columns.heading}</th>
                    <th scope="col">{T.guide.columns.needed}</th>
                    <th scope="col">{T.guide.columns.meaning}</th>
                  </tr>
                </thead>
                <tbody>
                  {COLUMNS.map((c) => (
                    <tr key={c.field}>
                      <th scope="row">{T.headings[c.field]}</th>
                      <td>{c.required ? T.guide.required : T.guide.optional}</td>
                      <td>{T.columns[c.field]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </Card>
        ) : null}

      </FormPage>
    </div>
  );
};

export default ImportProductsPage;
export { ImportProductsPage };
