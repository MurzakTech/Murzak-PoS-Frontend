import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Asks before leaving a form with changes that are not saved (Spec: Form page, "Leaving with unsaved changes asks first").
 * While `dirty` is true:
 *   - closing or refreshing the tab shows the browser's own warning;
 *   - clicking a link to another page of the app (the menu, a breadcrumb, Cancel as a link) stops and opens the question;
 *   - the browser's Back button stops and opens the same question.
 * Returns { open, stay, leave }: `open` says whether to show the question, `stay` closes it, `leave` goes where the person was going.
 */
const sameApp = (anchor) => {
  if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return false;
  const url = new URL(anchor.href, window.location.href);
  return url.origin === window.location.origin && url.pathname + url.search !== window.location.pathname + window.location.search;
};

const useLeaveGuard = (dirty) => {
  const navigate = useNavigate();
  const [pending, setPending] = useState(null); // { to } for a link, { back: true } for the Back button
  const allow = useRef(false);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const onClick = (event) => {
      if (allow.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target.closest && event.target.closest('a[href]');
      if (!sameApp(anchor)) return;
      event.preventDefault();
      event.stopPropagation();
      const url = new URL(anchor.href, window.location.href);
      setPending({ to: url.pathname + url.search + url.hash });
    };
    const onPop = () => {
      if (allow.current) return;
      // Put the page back where it was, then ask
      window.history.pushState(null, '', window.location.href);
      setPending({ back: true });
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('beforeunload', warn);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPop);
    };
  }, [dirty]);

  const stay = useCallback(() => setPending(null), []);
  const leave = useCallback(() => {
    const where = pending;
    allow.current = true;
    setPending(null);
    if (where && where.to) navigate(where.to);
    else if (where && where.back) window.history.go(-2); // the entry added to stay put, then the page we came from
  }, [navigate, pending]);

  return { open: pending !== null, stay, leave };
};

export default useLeaveGuard;
