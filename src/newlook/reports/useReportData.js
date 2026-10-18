import { useCallback, useEffect, useRef, useState } from 'react';
import { listReportQuestions, runReport } from '../../api/reportsApi';

/**
 * The data of the Reports pages. A report opens ready: it is asked for as soon as the page opens, for the period in
 * the address (the last 30 days when there is none), so nobody has to press Refresh to see numbers. A late answer to an
 * older question is thrown away, so changing the period quickly never shows the wrong numbers.
 */

/** Returns { status: 'idle' | 'loading' | 'ready' | 'error', data, error, forbidden, reload } */
export const useReport = (query, enabled = true) => {
  const [state, setState] = useState({ status: enabled ? 'loading' : 'idle', data: null, error: '', forbidden: false });
  const ticket = useRef(0);
  const asked = useRef(query);
  asked.current = query;
  const key = JSON.stringify(query);

  const run = useCallback(() => {
    ticket.current += 1;
    const mine = ticket.current;
    setState({ status: 'loading', data: null, error: '', forbidden: false });
    runReport(asked.current)
      .then((data) => {
        if (ticket.current === mine) setState({ status: 'ready', data, error: '', forbidden: false });
      })
      .catch((error) => {
        if (ticket.current === mine) setState({ status: 'error', data: null, error: error.message, forbidden: Boolean(error.forbidden) });
      });
  }, []);

  useEffect(() => {
    if (!enabled) {
      ticket.current += 1;
      setState({ status: 'idle', data: null, error: '', forbidden: false });
      return undefined;
    }
    run();
    return () => {
      ticket.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return { ...state, reload: run };
};

/**
 * The landing page's questions. The list arrives first (it needs no database work), so the cards appear at once; the
 * one-line answers are asked for next and fill in when they are ready. If they cannot be worked out the cards simply
 * keep the question. Returns { status: 'loading' | 'ready' | 'error', role, questions, answers: 'loading' | 'ready' | 'failed', error, reload }.
 */
export const useQuestions = () => {
  const [state, setState] = useState({ status: 'loading', role: null, questions: [], answers: 'loading', error: '' });
  const ticket = useRef(0);

  const run = useCallback(() => {
    ticket.current += 1;
    const mine = ticket.current;
    setState({ status: 'loading', role: null, questions: [], answers: 'loading', error: '' });
    listReportQuestions().then(
      (base) => {
        if (ticket.current !== mine) return undefined;
        setState({ status: 'ready', role: base.role, questions: base.questions, answers: 'loading', error: '' });
        return listReportQuestions({ preview: true })
          .then((full) => {
            if (ticket.current === mine) setState((prev) => ({ ...prev, questions: full.questions, answers: 'ready' }));
          })
          .catch(() => {
            if (ticket.current === mine) setState((prev) => ({ ...prev, answers: 'failed' }));
          });
      },
      (error) => {
        if (ticket.current === mine) setState({ status: 'error', role: null, questions: [], answers: 'failed', error: error.message });
        return undefined;
      }
    );
  }, []);

  useEffect(() => {
    run();
    return () => {
      ticket.current += 1;
    };
  }, [run]);

  return { ...state, reload: run };
};
