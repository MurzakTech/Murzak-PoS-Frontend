import { closeState } from './POSOpeningEntryDetails';
import { closeNotice } from '../../store/salesSlice';

jest.mock('../../api/axiosInstance', () => ({ __esModule: true, default: {} }));

describe('closeState', () => {
  it('lets an open shift be closed or cancelled', () => {
    expect(closeState({ status: 'Open', closing: null })).toMatchObject({ closing: false, failed: false, canClose: true, canCancel: true });
  });

  it('treats a close running in the background as closing, with no buttons to press twice', () => {
    for (const entry of [{ status: 'Closing' }, { status: 'Open', closing: { status: 'Queued' } }]) {
      expect(closeState(entry)).toMatchObject({ closing: true, canClose: false, canCancel: false });
    }
  });

  it('explains a close that failed and lets it be tried again', () => {
    const state = closeState({ status: 'Open', closing: { status: 'Failed', error_message: 'Stock is negative' } });
    expect(state).toMatchObject({ failed: true, failedReason: 'Stock is negative', canClose: true });
  });

  it('offers nothing for a closed shift', () => {
    expect(closeState({ status: 'Closed', closing: { status: 'Submitted' } })).toMatchObject({ closing: false, failed: false, canClose: false, canCancel: false });
  });
});

describe('closeNotice', () => {
  it('says what happened', () => {
    expect(closeNotice('closed')).toMatchObject({ severity: 'success', title: 'Till closed' });
    expect(closeNotice('closing').message).toMatch(/background/);
    expect(closeNotice('already_closed').message).toBe('This shift is already closed.');
  });

  it('falls back to "closed" for an older server that sends no outcome', () => {
    expect(closeNotice(undefined)).toEqual(closeNotice('closed'));
  });
});
