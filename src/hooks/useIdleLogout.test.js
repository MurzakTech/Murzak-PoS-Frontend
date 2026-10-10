import { idleState, IDLE_MINUTES, WARNING_SECONDS } from './useIdleLogout';

const MIN = 60 * 1000;

describe('idle sign-out timing', () => {
  const start = 1_000_000;

  it('stays active until the warning window', () => {
    expect(idleState(start, start + 5 * MIN).status).toBe('active');
    expect(idleState(start, start + IDLE_MINUTES * MIN - WARNING_SECONDS * 1000 - 1).status).toBe('active');
  });

  it('warns in the last minute with a countdown', () => {
    expect(idleState(start, start + IDLE_MINUTES * MIN - 30 * 1000)).toEqual({ status: 'warning', secondsLeft: 30 });
  });

  it('expires at the limit, including after a long sleep', () => {
    expect(idleState(start, start + IDLE_MINUTES * MIN).status).toBe('expired');
    expect(idleState(start, start + 10 * 60 * MIN).status).toBe('expired');
  });

  it('treats a missing record as just active', () => {
    expect(idleState(null, start).status).toBe('active');
  });
});
