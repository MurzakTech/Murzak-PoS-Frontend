import { useEffect, useState } from 'react';
import { getIndustryProfile } from '../../api/industryApi';
import { getUserCompany } from '../../utils/getUserCompany';
import { GENERAL_PROFILE, readProfile, readSavedProfile, saveProfile } from './industryModel';

/**
 * The industry profile of a store (or of the business, with no store): which features are on, which words the till uses
 * and the look it starts with.
 *
 * The last answer is kept on this device for each store, so the till draws the right thing at once and offline; a fresh
 * answer replaces it. When nothing is known (a first start offline, or a server not yet updated) the general shop is used,
 * which is the till exactly as before.
 *
 *   status  'loading' (nothing known yet), 'stale' (the saved answer, the server not heard yet), 'ready', 'error'
 */
const useIndustryProfile = (warehouse, companyName) => {
  const company = companyName || getUserCompany() || '';
  const [state, setState] = useState(() => {
    const saved = readSavedProfile(company, warehouse);
    return saved ? { status: 'stale', profile: saved } : { status: 'loading', profile: GENERAL_PROFILE };
  });

  useEffect(() => {
    let cancelled = false;
    const saved = readSavedProfile(company, warehouse);
    setState(saved ? { status: 'stale', profile: saved } : { status: 'loading', profile: GENERAL_PROFILE });
    getIndustryProfile({ warehouse: warehouse || undefined, company: company || undefined })
      .then((data) => {
        if (cancelled) return;
        saveProfile(company, warehouse, data);
        setState({ status: 'ready', profile: readProfile(data) });
      })
      .catch(() => {
        if (!cancelled) setState((prev) => ({ ...prev, status: 'error' }));
      });
    return () => {
      cancelled = true;
    };
  }, [company, warehouse]);

  return state;
};

export default useIndustryProfile;
