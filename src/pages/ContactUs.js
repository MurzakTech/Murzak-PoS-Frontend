import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../newlook/components/Button';
import Icon from '../newlook/components/Icon';
import logoMain from '../assets/logo_mark.png';
import '../newlook/legal/legal.css';

const ContactUs = () => {
  const navigate = useNavigate();

  return (
    <div className="nl-legal-page">
      <div className="nl-legal-container">
        <header className="nl-legal-topbar">
          <img
            src={logoMain}
            alt="Murzak POS"
            className="nl-legal-logo"
            onClick={() => navigate('/')}
          />
          <Button variant="secondary" icon="chevronLeft" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </header>

        <h1 className="nl-legal-title">Contact Us</h1>
        <p className="nl-legal-subtitle" style={{ maxWidth: 560 }}>
          Have a question about Murzak POS, need support, or want to talk about your business needs?
          Reach out and our team will get back to you.
        </p>

        <div className="nl-contact-grid">
          <div className="nl-contact-card">
            <div className="nl-contact-card__icon">
              <Icon name="inbox" />
            </div>
            <h2 className="nl-contact-card__title">Email</h2>
            <p className="nl-contact-card__body">
              For support, sales, or general enquiries.
            </p>
            <a
              href="mailto:murzaktechnologies@gmail.com"
              className="nl-contact-card__link"
            >
              murzaktechnologies@gmail.com
            </a>
          </div>

          <div className="nl-contact-card">
            <div className="nl-contact-card__icon">
              <Icon name="store" />
            </div>
            <h2 className="nl-contact-card__title">Based in Nairobi</h2>
            <p className="nl-contact-card__body">
              Serving businesses across Kenya with managed hosting, business systems, and custom software.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
