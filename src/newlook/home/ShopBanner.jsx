import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Icon from '../components/Icon';
import S from '../strings';
import fill from '../labels/fill';
import { useBrand } from '../brand/BrandProvider';

const T = S.home.banner;

/**
 * The shop banner at the top of Home: the shop's logo (or its first letter), its name and tagline from Settings, Brand, and the jobs
 * done most often as big buttons. It is tinted with the shop's accent colour, so changing the colour in Settings, Brand changes how
 * Home feels. Nothing here asks the server: the brand and business come from the provider that the rest of the New look already uses.
 *
 *   actions  [{ key, label, icon, to }] already limited to what the person may do
 *   canBrand show the "Add your logo and colours" hint to the owner when nothing is set yet
 *   brandTo  where that hint goes
 */
const ShopBanner = ({ actions, canBrand = false, brandTo }) => {
  const { brand, business } = useBrand();
  const name = (business && (business.companyName || business.name)) || '';
  const hasLook = Boolean(brand.logo || brand.tagline);
  return (
    <section className="nl-card nl-shop" aria-label={T.label}>
      <div className="nl-shop__who">
        {brand.logo ? (
          <img className="nl-shop__logo" src={brand.logo} alt={fill(T.logoAlt, { name: name || T.label })} />
        ) : (
          <span className="nl-shop__mark" aria-hidden="true">
            {(name || '').trim().charAt(0).toUpperCase() || <Icon name="store" />}
          </span>
        )}
        <div className="nl-shop__text">
          {name ? <p className="nl-shop__name">{name}</p> : null}
          <p className="nl-shop__tagline">{brand.tagline || T.defaultTagline}</p>
          {canBrand && !hasLook && brandTo ? (
            <RouterLink className="nl-link" to={brandTo}>
              {T.setBrand}
            </RouterLink>
          ) : null}
        </div>
      </div>
      {actions.length ? (
        <nav className="nl-shop__actions" aria-label={T.actionsLabel}>
          {actions.map((a) => (
            <RouterLink key={a.key} className="nl-shop__action" to={a.to}>
              <Icon name={a.icon} />
              <span>{a.label}</span>
            </RouterLink>
          ))}
        </nav>
      ) : null}
    </section>
  );
};

export default ShopBanner;
