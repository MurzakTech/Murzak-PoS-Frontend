import React, { useRef, useState } from 'react';
import { uploadProductImage } from '../../api/uploadImage';
import { logoUrl } from '../storefront/shopMeta';
import Button from '../components/Button';
import { useToast } from '../components/Toast';
import S from './strings.ecommerce';

const T = S.store;
const PICTURE_TYPES = 'image/*';

/** The shop's logo: a picture, shrunk and uploaded like a product photo. onChange(address) with '' to take it away. */
const LogoField = ({ value, onChange }) => {
  const toast = useToast();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const shown = logoUrl(value);

  const pick = async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadProductImage(file));
    } catch (error) {
      toast.error(error.message || T.logoFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="nl-logofield">
      <span className="nl-label">{T.logo}</span>
      <div className="nl-logofield__row">
        {shown ? <img className="nl-logofield__img" src={shown} alt={T.logoAlt} /> : null}
        <input ref={input} type="file" accept={PICTURE_TYPES} hidden onChange={pick} aria-label={value ? T.logoChange : T.logoAdd} />
        <Button variant="secondary" size="small" loading={busy} onClick={() => input.current && input.current.click()}>
          {value ? T.logoChange : T.logoAdd}
        </Button>
        {value ? (
          <Button variant="ghost" size="small" onClick={() => onChange('')}>
            {T.logoRemove}
          </Button>
        ) : null}
      </div>
      <p className="nl-store__help">{T.logoHelp}</p>
    </div>
  );
};

export default LogoField;
