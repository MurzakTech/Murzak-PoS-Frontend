import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SetPasswordDialog, SignInCheckDialog } from './SignInTools';
import { makeStrongPassword } from './teamModel';

const member = { email: 'amina@example.com', full_name: 'Amina Wanjiru' };

describe('makeStrongPassword', () => {
  it('has a capital, a small letter, a digit and a symbol', () => {
    for (let i = 0; i < 30; i += 1) {
      const p = makeStrongPassword();
      expect(p).toHaveLength(14);
      expect(p).toMatch(/[A-Z]/);
      expect(p).toMatch(/[a-z]/);
      expect(p).toMatch(/[0-9]/);
      expect(p).toMatch(/[^A-Za-z0-9]/);
    }
  });
});

describe('SignInCheckDialog', () => {
  it('shows each check and what to do about a problem', async () => {
    const check = jest.fn().mockResolvedValue({
      ok: false,
      summary: 'One thing needs attention.',
      checks: [
        { id: 'account', title: 'Account exists', status: 'green', detail: 'Found.', fix: '' },
        { id: 'email', title: 'Email can be sent', status: 'red', detail: 'No outgoing email.', fix: 'Ask support to set up email.' },
      ],
    });
    render(<SignInCheckDialog member={member} onClose={() => {}} onSetPassword={() => {}} check={check} />);
    expect(await screen.findByText('Email can be sent')).toBeInTheDocument();
    expect(screen.getByText('Ask support to set up email.')).toBeInTheDocument();
    expect(screen.getByText('One thing needs attention.')).toBeInTheDocument();
    expect(check).toHaveBeenCalledWith('amina@example.com');
  });

  it('says so when the check cannot be made', async () => {
    const check = jest.fn().mockRejectedValue(new Error('Not allowed.'));
    render(<SignInCheckDialog member={member} onClose={() => {}} onSetPassword={() => {}} check={check} />);
    expect(await screen.findByText('Not allowed.')).toBeInTheDocument();
  });
});

describe('SetPasswordDialog', () => {
  it('refuses a short password without calling the server', async () => {
    const setPassword = jest.fn();
    render(<SetPasswordDialog member={member} onClose={() => {}} setPassword={setPassword} />);
    await userEvent.type(screen.getByLabelText('New password'), 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Set password' }));
    expect(screen.getByText('The password needs at least 8 characters.')).toBeInTheDocument();
    expect(setPassword).not.toHaveBeenCalled();
  });

  it('sets the password and shows it once', async () => {
    const setPassword = jest.fn().mockResolvedValue({});
    render(<SetPasswordDialog member={member} onClose={() => {}} setPassword={setPassword} suggest={() => 'Abcd-1234-xyz'} />);
    await userEvent.click(screen.getByRole('button', { name: 'Suggest one' }));
    await userEvent.click(screen.getByRole('button', { name: 'Set password' }));
    await waitFor(() => expect(setPassword).toHaveBeenCalledWith({ email: 'amina@example.com', password: 'Abcd-1234-xyz' }));
    expect(await screen.findByText('Abcd-1234-xyz')).toBeInTheDocument();
  });

  it('shows the server sentence when it refuses', async () => {
    const setPassword = jest.fn().mockRejectedValue(new Error('The password needs: a symbol.'));
    render(<SetPasswordDialog member={member} onClose={() => {}} setPassword={setPassword} />);
    await userEvent.type(screen.getByLabelText('New password'), 'Abcdefg1');
    await userEvent.click(screen.getByRole('button', { name: 'Set password' }));
    expect(await screen.findByText('The password needs: a symbol.')).toBeInTheDocument();
  });
});
