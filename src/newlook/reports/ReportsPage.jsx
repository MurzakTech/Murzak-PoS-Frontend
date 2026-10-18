import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import { Skeleton, useDelayedFlag } from '../components/Skeleton';
import { PageHeader } from '../shell';
import { toNewAddress } from '../redirects/engine';
import './reports.css';
import MoreReports from './MoreReports';
import { answerFor, reportAddress } from './reportsModel';
import { useQuestions } from './useReportData';
import T from './strings.reports';

const QuestionCard = ({ question, answers }) => {
  const words = T.questions[question.key];
  const answer = answerFor(question.key, question.preview);
  const waiting = useDelayedFlag(answers === 'loading' && question.preview === undefined);
  return (
    <li className="nl-report-card">
      <h2 className="nl-report-card__title">
        <RouterLink className="nl-report-card__link" to={toNewAddress(reportAddress(question.opens))}>
          {words.title}
        </RouterLink>
      </h2>
      <p className="nl-report-card__text">{words.text}</p>
      <p className="nl-report-card__answer" aria-live="polite">
        {answer || (answers === 'loading' && question.preview === undefined && waiting ? <Skeleton width="70%" height="16px" /> : null)}
      </p>
    </li>
  );
};

/**
 * The Reports landing page (ticket P5-2, AC-31): the questions this person may open, each with a one-line answer for the
 * last 30 days when it is cheap to work out, and the "More reports" list that keeps every current report reachable.
 * A cashier is offered the one question about sales; the owner and the manager are offered all six.
 */
const ReportsPage = () => {
  const { status, role, questions, answers, error, reload } = useQuestions();

  let body;
  if (status === 'error') {
    body = <EmptyState icon="alert" tone="error" title={T.landing.errorTitle} description={error || T.landing.errorText} action={{ label: T.landing.retry, onClick: reload }} />;
  } else if (status === 'ready' && questions.length === 0) {
    body = <EmptyState title={T.landing.emptyTitle} description={T.landing.emptyText} />;
  } else if (status === 'loading') {
    body = (
      <ul className="nl-reports__questions" aria-busy="true" aria-label={T.landingLabel}>
        {Array.from({ length: 6 }, (_, i) => (
          <li className="nl-report-card" key={i}>
            <Skeleton width="70%" height="20px" />
            <Skeleton width="90%" height="14px" />
          </li>
        ))}
      </ul>
    );
  } else {
    body = (
      <ul className="nl-reports__questions" aria-label={T.landingLabel}>
        {questions.map((question) => (
          <QuestionCard key={question.key} question={question} answers={answers} />
        ))}
      </ul>
    );
  }

  return (
    <div className="nl-reports">
      <PageHeader title={T.title} subtitle={T.subtitle} />
      {body}
      {status === 'error' || (status === 'ready' && role !== 'cashier') ? <MoreReports /> : null}
    </div>
  );
};

export default ReportsPage;
