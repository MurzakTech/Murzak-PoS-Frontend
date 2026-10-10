/**
 * Plain-language summary of a create_seed_item reply, e.g.
 * "8 products saved. 2 could not be saved: Camera (Missing required details: item classification)."
 */
export const summarizeSeedResult = (data = {}) => {
  const created = data.items_created?.length || 0;
  const skipped = data.items_skipped?.length || 0;
  const failedList = Array.isArray(data.items_failed) ? data.items_failed : [];
  const failed = failedList.length;
  const stockError = data.stock_entry && !data.stock_entry.created && data.stock_entry.error ? data.stock_entry.error : null;
  const describe = (f) => {
    if (typeof f === 'string') return f;
    const name = f.item_name || f.item_code || f.prefixed_item_code || 'A product';
    return f.error_message ? `${name} (${f.error_message.replace(/\.$/, '')})` : name;
  };
  const firstReason = failedList[0] && typeof failedList[0] === 'object' ? failedList[0].error_message : null;

  const parts = [];
  if (created) parts.push(`${created} product${created === 1 ? '' : 's'} saved.`);
  if (skipped) parts.push(`${skipped} already existed, so ${skipped === 1 ? 'it was' : 'they were'} left as is.`);
  if (failed) {
    const shown = failedList.slice(0, 3).map(describe).join('; ');
    parts.push(`${failed} could not be saved: ${shown}${failed > 3 ? `; and ${failed - 3} more` : ''}.`);
  }
  if (stockError) parts.push(`The opening stock quantities were not recorded: ${stockError.replace(/\.$/, '')}.`);
  if (data.stock_entry?.created) parts.push('Opening stock recorded.');

  return { created, skipped, failed, problems: failed > 0 || !!stockError, firstReason, text: parts.join(' ') || 'Nothing to save.' };
};
