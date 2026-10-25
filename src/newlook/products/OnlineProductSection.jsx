import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getProductOnline, MAX_ONLINE_DESCRIPTION, MAX_ONLINE_PHOTOS, saveProductOnline } from '../../api/onlineStoreApi';
import { uploadProductImage } from '../../api/uploadImage';
import { productImageUrl } from '../../utils/productArt';
import Button from '../components/Button';
import Card from '../components/Card';
import Checkbox from '../components/Checkbox';
import { Skeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import fill from '../labels/fill';
import T from './strings.products';

const O = T.online;
const PHOTO_TYPES = 'image/*';

/**
 * What a product says about itself in the online store: whether it is shown, a description and extra photos. It saves on its
 * own button, apart from the product's own form, so saving one never touches the other.
 */
const OnlineProductSection = ({ code, name, company }) => {
  const toast = useToast();
  const input = useRef(null);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [form, setForm] = useState({ description: '', images: [], showOnline: true });
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setState('loading');
    try {
      setForm(await getProductOnline(code, company));
      setState('ready');
    } catch (error) {
      setState('error');
    }
  }, [code, company]);

  useEffect(() => {
    load();
  }, [load]);

  const addPhoto = async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const address = await uploadProductImage(file);
      setForm((current) => ({ ...current, images: [...current.images, address].slice(0, MAX_ONLINE_PHOTOS) }));
    } catch (error) {
      toast.error(error.message || O.uploadFailed);
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = (index) => setForm((current) => ({ ...current, images: current.images.filter((_, i) => i !== index) }));

  const save = async () => {
    setSaving(true);
    try {
      await saveProductOnline({ itemCode: code, description: form.description, images: form.images, showOnline: form.showOnline, company });
      toast.success(O.saved);
    } catch (error) {
      toast.error(error.message || O.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  if (state === 'loading') {
    return (
      <Card title={O.title} aria-busy="true">
        <Skeleton width="100%" height="96px" />
      </Card>
    );
  }
  if (state === 'error') {
    return (
      <Card title={O.title}>
        <p role="alert">{O.loadFailed}</p>
        <Button variant="secondary" onClick={load}>
          {O.retry}
        </Button>
      </Card>
    );
  }

  return (
    <Card title={O.title}>
      <div className="nl-products-online">
        <p className="nl-helper">{O.intro}</p>
        <Checkbox label={O.show} checked={form.showOnline} onChange={(showOnline) => setForm((current) => ({ ...current, showOnline }))} />

        <div className="nl-field">
          <label className="nl-label" htmlFor="nl-online-description">
            {O.description}
          </label>
          <div className="nl-input-wrap">
            <textarea
              id="nl-online-description"
              className="nl-input nl-products-online__text"
              rows={4}
              maxLength={MAX_ONLINE_DESCRIPTION}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              aria-describedby="nl-online-description-note"
            />
          </div>
          <p id="nl-online-description-note" className="nl-helper">
            {fill(O.descriptionHelp, { max: MAX_ONLINE_DESCRIPTION })}
          </p>
        </div>

        <div>
          <span className="nl-label">{O.photosTitle}</span>
          <p className="nl-helper">{fill(O.photosHelp, { max: MAX_ONLINE_PHOTOS })}</p>
          <ul className="nl-products-online__photos">
            {form.images.map((address, index) => (
              <li key={`${address}-${index}`}>
                <img src={productImageUrl({ image: address }) || address} alt={fill(O.photoAlt, { number: index + 1, name })} />
                <Button variant="ghost" size="small" aria-label={fill(O.removePhoto, { number: index + 1 })} onClick={() => removePhoto(index)}>
                  ×
                </Button>
              </li>
            ))}
          </ul>
          {form.images.length < MAX_ONLINE_PHOTOS ? (
            <>
              <input ref={input} type="file" accept={PHOTO_TYPES} hidden onChange={addPhoto} aria-label={O.addPhoto} />
              <Button variant="secondary" size="small" loading={busy} onClick={() => input.current && input.current.click()}>
                {busy ? O.uploading : O.addPhoto}
              </Button>
            </>
          ) : null}
        </div>

        <div className="nl-products-online__actions">
          <Button loading={saving} onClick={save}>
            {O.save}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default OnlineProductSection;
