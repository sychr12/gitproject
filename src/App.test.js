import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import api from './services/api';

jest.mock('./services/api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, '', '/');
  jest.clearAllMocks();
});

function addRepository(name) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Repositório' }), {
    target: { value: name },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar repositório' }));
}

test('renders the repository form', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Meus Repositorios' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Repositório' })).toBeInTheDocument();
});

test('keeps saved repositories when mounted in StrictMode', () => {
  const saved = [{ name: 'facebook/react' }];
  localStorage.setItem('repos', JSON.stringify(saved));
  render(<React.StrictMode><App /></React.StrictMode>);
  expect(screen.getByText('facebook/react')).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem('repos'))).toEqual(saved);
});

test.each(['invalid JSON', '{}', '[null, {"name": 123}]'])('handles invalid saved data: %s', saved => {
  localStorage.setItem('repos', saved);
  render(<App />);
  expect(screen.getByRole('textbox')).toBeInTheDocument();
  expect(screen.queryAllByRole('listitem')).toHaveLength(0);
});

test('adds, saves and opens a repository with its encoded name', async () => {
  api.get.mockResolvedValueOnce({ data: { full_name: 'facebook/react' } });
  render(<App />);
  addRepository('  facebook/react  ');
  const link = await screen.findByRole('link', { name: 'Abrir facebook/react' });
  expect(api.get).toHaveBeenCalledWith('repos/facebook/react');
  expect(JSON.parse(localStorage.getItem('repos'))).toEqual([{ name: 'facebook/react' }]);
  expect(link).toHaveAttribute('href', '/repositorio/facebook%2Freact');
  fireEvent.click(link);
  expect(screen.getByRole('heading', { name: 'Repositorio' })).toBeInTheDocument();
});

test('rejects duplicates regardless of case', async () => {
  localStorage.setItem('repos', JSON.stringify([{ name: 'facebook/react' }]));
  render(<App />);
  addRepository('FACEBOOK/React');
  expect(await screen.findByRole('alert')).toHaveTextContent('Repositório duplicado.');
  expect(api.get).not.toHaveBeenCalled();
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
});

test('rejects duplicates after the API resolves a renamed repository', async () => {
  localStorage.setItem('repos', JSON.stringify([{ name: 'facebook/react' }]));
  api.get.mockResolvedValueOnce({ data: { full_name: 'facebook/react' } });
  render(<App />);
  addRepository('old-owner/react');
  expect(await screen.findByRole('alert')).toHaveTextContent('Repositório duplicado.');
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
});

test.each(['   ', 'react'])('rejects invalid input without a request: %s', name => {
  render(<App />);
  addRepository(name);
  expect(screen.getByRole('alert')).toBeInTheDocument();
  expect(api.get).not.toHaveBeenCalled();
});

test('shows request errors and enables retry', async () => {
  api.get.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } });
  render(<App />);
  addRepository('missing/repo');
  expect(await screen.findByRole('alert')).toHaveTextContent('Repositório não encontrado.');
  expect(screen.getByRole('button', { name: 'Adicionar repositório' })).toBeEnabled();
});

test('does not restore a deleted repository when an in-flight addition completes', async () => {
  localStorage.setItem('repos', JSON.stringify([{ name: 'facebook/react' }]));
  let resolveRequest;
  api.get.mockImplementationOnce(() => new Promise(resolve => { resolveRequest = resolve; }));
  render(<App />);
  addRepository('vitejs/vite');
  expect(screen.getByRole('button', { name: 'Adicionar repositório' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Excluir facebook/react' }));
  await act(async () => {
    resolveRequest({ data: { full_name: 'vitejs/vite' } });
  });
  expect(screen.queryByText('facebook/react')).not.toBeInTheDocument();
  expect(screen.getByText('vitejs/vite')).toBeInTheDocument();
  await waitFor(() => {
    expect(JSON.parse(localStorage.getItem('repos'))).toEqual([{ name: 'vitejs/vite' }]);
  });
});
