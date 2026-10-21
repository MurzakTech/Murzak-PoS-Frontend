import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../newlook/components/Button';
import logoMain from '../assets/logo_mark.png';
import '../newlook/legal/legal.css';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: 'We collect information you provide directly, such as your name, email, phone number, and business details, when you register for or use Murzak POS. We also collect operational data you enter, such as products, sales, and customer records.',
  },
  {
    title: '2. How We Use Your Information',
    body: 'We use collected information to provide and improve the service, process transactions, communicate with you about your account, and maintain the security and integrity of the platform.',
  },
  {
    title: '3. Data Storage and Security',
    body: 'Your data is stored on secured servers with access controls and encryption in transit. We take reasonable measures to protect your information from unauthorized access, alteration, or disclosure.',
  },
  {
    title: '4. Data Sharing',
    body: 'We do not sell your personal or business data. We may share data with service providers who help operate the platform (e.g., hosting providers), under confidentiality obligations, or where required by law.',
  },
  {
    title: '5. Multi-Tenant Data Isolation',
    body: 'Murzak POS is a multi-tenant platform. Each business\u2019s data is logically isolated and is not accessible to other tenants on the platform.',
  },
  {
    title: '6. Your Rights',
    body: 'You may request access to, correction of, or deletion of your personal information by contacting us. Some information may be retained as required for legal or legitimate business purposes.',
  },
  {
    title: '7. Cookies and Local Storage',
    body: 'We use browser local storage to keep you signed in and to remember preferences such as your selected theme. We do not use third-party advertising trackers.',
  },
  {
    title: '8. Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time. Material changes will be communicated through the platform or by email.',
  },
  {
    title: '9. Contact',
    body: 'For privacy-related questions or requests, contact us at murzaktechnologies@gmail.com.',
  },
];

const PrivacyPolicy = () => {
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

        <h1 className="nl-legal-title">Privacy Policy</h1>
        <p className="nl-legal-subtitle">
          Last updated: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <hr className="nl-legal-divider" />

        {SECTIONS.map((section) => (
          <section key={section.title} className="nl-legal-section">
            <h2 className="nl-legal-section__title">{section.title}</h2>
            <p className="nl-legal-section__body">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
};

export default PrivacyPolicy;
