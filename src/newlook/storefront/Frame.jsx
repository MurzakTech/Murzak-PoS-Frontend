import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Icon from '../components/Icon';
import './storefront.css';

/**
 * The page around every shop screen: the shop's name, a language switch, an optional right-hand action, the page, and a
 * quiet footer. It is plain on purpose; the shop's products are the colour.
 */
const Frame = ({ t, language, onLanguage, title, subtitle, homeTo, actions, whatsapp, children }) => {
  const other = language === 'sw' ? 'en' : 'sw';
  return (
    <div className="sf-page">
      <header className="sf-header">
        <div className="sf-header__inner">
          <div className="sf-header__brand">
            <Icon name="store" />
            <div className="sf-header__text">
              <h1 className="sf-header__title">{homeTo ? <Link to={homeTo}>{title}</Link> : title}</h1>
              {subtitle ? <p className="sf-header__subtitle">{subtitle}</p> : null}
            </div>
          </div>
          <div className="sf-header__actions">
            {whatsapp ? (
              <Button as="a" variant="ghost" size="small" href={whatsapp} target="_blank" rel="noopener noreferrer">
                {t('orderViaWhatsApp')}
              </Button>
            ) : null}
            <Button variant="ghost" size="small" onClick={() => onLanguage(other)} aria-label={t('switchToLabel')} lang={other}>
              {t('switchTo')}
            </Button>
            {actions}
          </div>
        </div>
      </header>
      <main className="sf-main">{children}</main>
      <footer className="sf-footer">
        <p>{t('poweredBy')}</p>
      </footer>
    </div>
  );
};

export default Frame;
