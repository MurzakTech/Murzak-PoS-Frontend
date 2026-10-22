import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import { SkeletonText } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { PageHeader } from '../shell';
import { usePreviewRedirects } from '../redirects/live';
import { useNewLook } from '../NewLookProvider';
import { getUserCompany } from '../../utils/getUserCompany';
import { getSetupState, saveSetupProgress } from '../../api/setupApi';
import BusinessStep from './BusinessStep';
import CashStep from './CashStep';
import PaymentsStep from './PaymentsStep';
import ProductsStep from './ProductsStep';
import ShopStep from './ShopStep';
import StaffStep from './StaffStep';
import { HOME_PATH, STEP_KEYS, clearSnooze, linksFor, nextKey, startStep } from './setupModel';
import T from './strings.setup';
import './setup.css';

const STEPS = { business: BusinessStep, shop: ShopStep, cash: CashStep, payments: PaymentsStep, products: ProductsStep, staff: StaffStep };
const LAST = STEP_KEYS[STEP_KEYS.length - 1];

/**
 * The first-time set-up wizard at /new-look/setup (ticket P5-4, acceptance check AC-33): six short steps on the Form page pattern.
 * What do you sell (asked once), shop name and tax ID, usual opening cash, payment methods, first products, your team.
 *
 * Every step can be skipped and the whole set-up can be finished later. What was done or skipped is kept on the server, so a refresh
 * (or coming back from Home) continues at the first step not passed yet. "Skip for now" and "Finish" both mark set-up done.
 * Only the owner can set up the shop.
 *
 *   load   injectable for tests; defaults to the server call
 */
const SetupWizard = ({ load = getSetupState }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const toast = useToast();
  const previewOn = usePreviewRedirects();
  const { company: newLookCompany } = useNewLook();
  const company = newLookCompany || getUserCompany() || undefined;
  const [loaded, setLoaded] = useState({ status: 'loading', state: null });
  const [step, setStep] = useState(null);
  const links = useMemo(() => linksFor(previewOn), [previewOn]);

  const open = useCallback(() => {
    setLoaded({ status: 'loading', state: null });
    load(company)
      .then((state) => {
        setLoaded({ status: 'ready', state });
        setStep(startStep(state, search.get('step')));
      })
      .catch((err) => {
        console.error('Failed to open set-up:', err);
        setLoaded({ status: 'error', state: null });
      });
    // The address is read once, when set-up opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, company]);
  useEffect(open, [open]);

  const state = loaded.state;

  const goTo = useCallback(
    (key) => {
      setStep(key);
      setSearch({ step: key }, { replace: true });
    },
    [setSearch]
  );

  // What the server now says about the steps, and anything else that changed (the kind, the opening cash), without asking again
  const apply = (progress, patch = {}) =>
    setLoaded((prev) => ({
      ...prev,
      state: {
        ...prev.state,
        ...(progress ? { doneSteps: progress.doneSteps, skippedSteps: progress.skippedSteps, finished: progress.finished, nextStep: progress.nextStep } : {}),
        ...patch,
      },
    }));

  const end = (message, tone) => {
    clearSnooze(company);
    toast[tone](message);
    navigate(HOME_PATH);
  };

  const resolvedCompany = company || state?.company;

  const finishAll = async () => {
    const progress = await saveSetupProgress('finish', { company: resolvedCompany });
    apply(progress);
    end(T.finished, 'success');
  };

  const ctx = state && {
    state,
    company: resolvedCompany,
    links,
    goTo,
    leave: () => navigate(HOME_PATH),
    nextLabel: (key) => (key === LAST ? T.actions.finish : T.actions.nextPlain),
    // The step was saved (by its own call, which hands back `progress`) or just needs marking done; then on to the next
    complete: async (key, { progress, patch } = {}) => {
      const result = progress || (await saveSetupProgress(key, { company: resolvedCompany }));
      apply(result, patch);
      const next = nextKey(key);
      if (next) goTo(next);
      else await finishAll();
    },
    skip: async (key) => {
      const result = await saveSetupProgress(key, { skipped: true, company: resolvedCompany });
      apply(result);
      const next = nextKey(key);
      if (next) goTo(next);
      else await finishAll();
    },
    // The last step's Finish: mark it done, then end set-up
    finishWith: async (key) => {
      apply(await saveSetupProgress(key, { company: resolvedCompany }));
      await finishAll();
    },
    // "Skip for now": ends set-up without going through the other steps
    skipAll: async () => {
      const progress = await saveSetupProgress('finish', { company });
      apply(progress);
      end(T.skippedDone, 'info');
    },
  };

  if (loaded.status === 'loading' || (loaded.status === 'ready' && !step)) {
    return (
      <div className="nl-form-page">
        <PageHeader title={T.title} />
        <div aria-busy="true" aria-label={T.loading}>
          <SkeletonText lines={5} />
        </div>
      </div>
    );
  }
  if (loaded.status === 'error') {
    return (
      <div className="nl-form-page">
        <PageHeader title={T.title} />
        <EmptyState icon="alert" tone="error" title={T.loadFailed.title} description={T.loadFailed.text} action={{ label: T.loadFailed.retry, onClick: open }} level={2} />
      </div>
    );
  }
  if (!state.canEdit) {
    return (
      <div className="nl-form-page">
        <PageHeader title={T.title} />
        <EmptyState icon="user" title={T.ownerOnly.title} description={T.ownerOnly.text} action={{ label: T.ownerOnly.home, onClick: () => navigate(HOME_PATH) }} level={2} />
      </div>
    );
  }

  const Step = STEPS[step];
  return <Step key={step} ctx={ctx} />;
};

export default SetupWizard;
