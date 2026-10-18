/**
 * The Reports landing page (ticket P5-2, AC-31): the six questions with a one-line answer each, the One question a cashier
 * is offered, the "More reports" list that keeps every current report reachable, and the loading and error states.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ReportsPage from './ReportsPage';
import { listReportQuestions } from '../../api/reportsApi';
import { PREVIEWS_OWNER, QUESTIONS_CASHIER, QUESTIONS_OWNER } from './__fixtures__/reportAnswers';

jest.mock('../../api/reportsApi', () => ({ listReportQuestions: jest.fn() }));

const draw = () =>
  render(
    <MemoryRouter initialEntries={['/new-look/reports']}>
      <ReportsPage />
    </MemoryRouter>
  );

const ownerAnswers = () => listReportQuestions.mockImplementation(async ({ preview } = {}) => (preview ? PREVIEWS_OWNER : QUESTIONS_OWNER));

beforeEach(() => jest.resetAllMocks());

describe('the questions', () => {
  test('an owner sees the six questions, each a link to its report', async () => {
    ownerAnswers();
    draw();
    const list = await screen.findByRole('list', { name: 'Questions about your shop' });
    const links = within(list).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual([
      'How much did I sell?',
      'What is my profit?',
      'Who owes me money?',
      'Where did my money go?',
      'What is in stock, and what is it worth?',
      'What is not selling?',
    ]);
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/new-look/reports/sales',
      '/new-look/reports/profit',
      '/new-look/reports/owed',
      '/new-look/reports/running-costs',
      '/new-look/reports/stock-summary',
      '/new-look/reports/aging-stock',
    ]);
  });

  test('each question shows its one-line answer for the last 30 days when it could be worked out', async () => {
    ownerAnswers();
    draw();
    expect(await screen.findByText('Last 30 days: KES 30,000 sold')).toBeInTheDocument();
    expect(screen.getByText('Last 30 days: KES 23,000 profit, 23% of sales')).toBeInTheDocument();
    expect(screen.getByText('KES 24,500 owed by 2 customers')).toBeInTheDocument();
    expect(screen.getByText('Last 30 days: KES 16,400 spent')).toBeInTheDocument();
    expect(screen.getByText('Your stock is worth KES 40,000')).toBeInTheDocument();
  });

  test('the cards appear before the answers: the list is asked for first, then the answers', async () => {
    ownerAnswers();
    draw();
    await screen.findByRole('list', { name: 'Questions about your shop' });
    expect(listReportQuestions.mock.calls[0]).toEqual([]);
    await waitFor(() => expect(listReportQuestions).toHaveBeenCalledWith({ preview: true }));
  });

  test('if the answers cannot be worked out the cards keep the question', async () => {
    listReportQuestions.mockImplementation(async ({ preview } = {}) => {
      if (preview) throw new Error('slow');
      return QUESTIONS_OWNER;
    });
    draw();
    expect(await screen.findByRole('link', { name: 'What is my profit?' })).toBeInTheDocument();
    await waitFor(() => expect(listReportQuestions).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(/Last 30 days/)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('a cashier is offered one question and no list of other reports', async () => {
    listReportQuestions.mockResolvedValue(QUESTIONS_CASHIER);
    draw();
    expect(await screen.findByRole('link', { name: 'How much did I sell?' })).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: 'More reports' })).not.toBeInTheDocument();
  });
});

describe('More reports', () => {
  test('lists the six current reports and their 13 sub-reports, each opened on its current screen', async () => {
    ownerAnswers();
    draw();
    await screen.findByRole('heading', { name: 'More reports' });
    const card = screen.getByRole('region', { name: 'More reports' });
    const links = within(card).getAllByRole('link');
    expect(links).toHaveLength(19);
    links.forEach((link) => {
      expect(link.getAttribute('href')).toMatch(/^\/reports\/.+\?legacy=1$/);
    });
    expect(within(card).getByRole('link', { name: 'Stock movement' })).toHaveAttribute('href', '/reports/stock-movement?legacy=1');
    expect(within(card).getByRole('link', { name: 'Transfer efficiency' })).toHaveAttribute('href', '/reports/performance-metrics/transfer-efficiency?legacy=1');
  });
});

describe('loading and errors', () => {
  test('while loading there are grey shapes, not an empty page', async () => {
    listReportQuestions.mockReturnValue(new Promise(() => {}));
    draw();
    expect(screen.getByRole('heading', { level: 1, name: 'Reports' })).toBeInTheDocument();
    expect(screen.getByLabelText('Questions about your shop')).toHaveAttribute('aria-busy', 'true');
  });

  test('a failure says so, offers Try again, and still keeps the other reports reachable', async () => {
    listReportQuestions.mockRejectedValueOnce(new Error('We could not reach the server.'));
    draw();
    expect(await screen.findByText('We could not load the reports')).toBeInTheDocument();
    expect(screen.getByText('We could not reach the server.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'More reports' })).toBeInTheDocument();
    ownerAnswers();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('link', { name: 'What is my profit?' })).toBeInTheDocument();
  });
});
