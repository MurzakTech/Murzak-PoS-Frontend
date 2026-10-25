/**
 * The guided "Go online" steps. The wizard works on the same form as the My online store page, so what it asks is a short
 * path through those fields; this file says what each step needs before the owner may go on.
 */
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
export const WIZARD_STEPS = ['name', 'receive', 'pay', 'products', 'open'];

/**
 * What stops the owner leaving a step, as { field: messageKey } (empty when they may go on).
 * @param slugCheck  { state: 'idle' | 'checking' | 'free' | 'taken' } for the typed web address name
 * @param saved      { slug } as last saved: a name the store already owns is free for it
 */
export const stepProblems = (step, { form, slugCheck, saved, productCount, mpesaReady }) => {
  const problems = {};
  if (step === 'name') {
    const slug = form.slug.trim().toLowerCase();
    if (form.store_name.trim().length < 2) problems.store_name = 'needName';
    if (!SLUG_PATTERN.test(slug)) problems.slug = 'needSlug';
    else if (slug !== saved.slug && slugCheck.state === 'taken') problems.slug = 'slugTaken';
    else if (slug !== saved.slug && slugCheck.state === 'checking') problems.slug = 'slugChecking';
  }
  if (step === 'receive') {
    if (!form.delivery_enabled && !form.pickup_enabled) problems.receive = 'needReceive';
    if (form.pickup_enabled && !form.pickup_address.trim()) problems.pickup_address = 'needPickupAddress';
    if (form.delivery_enabled && form.delivery_mode === 'flat' && !(Number(form.delivery_flat_fee) > 0)) problems.delivery_flat_fee = 'needFee';
  }
  if (step === 'pay') {
    if (!form.accept_cash && !form.accept_mpesa) problems.pay = 'needPay';
    if (form.accept_mpesa && !mpesaReady) problems.pay = 'mpesaNotReady';
  }
  if (step === 'products') {
    if (!(productCount > 0)) problems.products = 'needProducts';
  }
  return problems;
};

/** The first step with something missing, for a store that is half set up; the last step when none is. */
export const firstOpenStep = (context) => WIZARD_STEPS.find((step) => Object.keys(stepProblems(step, context)).length) || 'open';

/** Delivery fees the wizard offers are the two simple ones; area and distance fees are set on the settings page. */
export const WIZARD_DELIVERY_MODES = ['free', 'flat'];
export const isSimpleDelivery = (mode) => WIZARD_DELIVERY_MODES.includes(mode);
