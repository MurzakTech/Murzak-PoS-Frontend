// The connection module keeps its state at module level, so each test loads a fresh copy of it
let client;
let io;
let sockets;

const fakeSocket = () => {
  const handlers = {};
  const managerHandlers = {};
  const socket = {
    connected: false,
    active: true,
    on: jest.fn((name, fn) => { handlers[name] = fn; }),
    io: { on: jest.fn((name, fn) => { managerHandlers[name] = fn; }) },
    disconnect: jest.fn(() => { socket.connected = false; if (handlers.disconnect) handlers.disconnect('io client disconnect'); }),
    // test helpers
    fire: (name, ...args) => handlers[name] && handlers[name](...args),
    fireManager: (name, ...args) => managerHandlers[name] && managerHandlers[name](...args),
    up: () => { socket.connected = true; handlers.connect(); },
  };
  sockets.push(socket);
  return socket;
};

beforeEach(() => {
  jest.resetModules();
  jest.useFakeTimers();
  sockets = [];
  jest.doMock('socket.io-client', () => ({ io: jest.fn(() => fakeSocket()) }));
  io = require('socket.io-client').io;
  client = require('./realtimeClient');
  localStorage.setItem('access_token', 'token-A');
});

afterEach(() => {
  client.disconnectRealtime();
  jest.useRealTimers();
  localStorage.clear();
});

const payment = { kind: 'payment', name: 'ifbm93t695', status: 'Success', company: 'Shop A' };

describe('opening the connection', () => {
  it('connects to the page\'s own address, polling first, carrying the sign-in', () => {
    client.subscribeMessages(() => {});
    expect(io).toHaveBeenCalledTimes(1);
    const [url, options] = io.mock.calls[0];
    expect(url).toBe(window.location.origin);
    expect(options.transports).toEqual(['polling', 'websocket']);
    expect(options.transportOptions.polling.extraHeaders).toEqual({ Authorization: 'Bearer token-A' });
  });

  it('does not connect when nobody is signed in', () => {
    localStorage.clear();
    client.subscribeMessages(() => {});
    expect(io).not.toHaveBeenCalled();
    expect(client.isConnected()).toBe(false);
  });

  it('shares one connection between screens', () => {
    client.subscribeMessages(() => {});
    client.subscribeConnection(() => {});
    expect(io).toHaveBeenCalledTimes(1);
  });
});

describe('messages and connection state', () => {
  it('hands each message to every listener', () => {
    const a = jest.fn();
    const b = jest.fn();
    client.subscribeMessages(a);
    client.subscribeMessages(b);
    sockets[0].fire('murzak_pos_event', payment);
    expect(a).toHaveBeenCalledWith(payment);
    expect(b).toHaveBeenCalledWith(payment);
  });

  it('ignores anything that is not a message object, and a listener that throws does not stop the others', () => {
    const bad = jest.fn(() => { throw new Error('boom'); });
    const good = jest.fn();
    client.subscribeMessages(bad);
    client.subscribeMessages(good);
    sockets[0].fire('murzak_pos_event', null);
    sockets[0].fire('murzak_pos_event', 'refresh');
    expect(good).not.toHaveBeenCalled();
    sockets[0].fire('murzak_pos_event', payment);
    expect(good).toHaveBeenCalledWith(payment);
  });

  it('stops telling a listener once it has left', () => {
    const a = jest.fn();
    const stop = client.subscribeMessages(a);
    stop();
    sockets[0].fire('murzak_pos_event', payment);
    expect(a).not.toHaveBeenCalled();
  });

  it('tells listeners when the connection goes up and down', () => {
    const changed = jest.fn();
    client.subscribeConnection(changed);
    expect(client.isConnected()).toBe(false);
    sockets[0].up();
    expect(client.isConnected()).toBe(true);
    expect(changed).toHaveBeenCalledTimes(1);
    sockets[0].fire('disconnect', 'transport close');
    expect(client.isConnected()).toBe(false);
    expect(changed).toHaveBeenCalledTimes(2);
    sockets[0].fire('connect_error', new Error('refused'));
    expect(changed).toHaveBeenCalledTimes(2); // still down: nothing new to say
  });
});

describe('signing in again and out', () => {
  it('uses the newest token when it retries by itself, and gives up once signed out', () => {
    client.subscribeMessages(() => {});
    localStorage.setItem('access_token', 'token-B');
    sockets[0].fireManager('reconnect_attempt');
    expect(io.mock.calls[0][1].transportOptions.polling.extraHeaders.Authorization).toBe('Bearer token-B');
    localStorage.removeItem('access_token');
    sockets[0].fireManager('reconnect_attempt');
    expect(sockets[0].disconnect).toHaveBeenCalled();
  });

  it('never lets a different person reuse the previous person\'s connection', () => {
    client.subscribeMessages(() => {});
    sockets[0].up();
    localStorage.setItem('access_token', 'token-B');
    client.subscribeMessages(() => {});
    expect(sockets[0].disconnect).toHaveBeenCalled();
    expect(io).toHaveBeenCalledTimes(2);
    expect(io.mock.calls[1][1].transportOptions.polling.extraHeaders.Authorization).toBe('Bearer token-B');
  });

  it('closes at once when the person signs out', () => {
    const changed = jest.fn();
    client.subscribeConnection(changed);
    sockets[0].up();
    client.disconnectRealtime();
    expect(sockets[0].disconnect).toHaveBeenCalled();
    expect(client.isConnected()).toBe(false);
  });

  it('tries afresh when a screen asks after the server refused the sign-in', () => {
    client.subscribeMessages(() => {});
    sockets[0].active = false; // socket.io has given up
    client.subscribeMessages(() => {});
    expect(io).toHaveBeenCalledTimes(2);
  });
});

describe('closing when no screen needs it', () => {
  it('closes a few seconds after the last screen leaves, not before', () => {
    const stop = client.subscribeMessages(() => {});
    stop();
    jest.advanceTimersByTime(4000);
    expect(sockets[0].disconnect).not.toHaveBeenCalled();
    jest.advanceTimersByTime(2000);
    expect(sockets[0].disconnect).toHaveBeenCalled();
  });

  it('keeps the connection when another screen opens straight after', () => {
    const stop = client.subscribeMessages(() => {});
    stop();
    jest.advanceTimersByTime(2000);
    client.subscribeMessages(() => {});
    jest.advanceTimersByTime(10000);
    expect(sockets[0].disconnect).not.toHaveBeenCalled();
    expect(io).toHaveBeenCalledTimes(1);
  });
});
