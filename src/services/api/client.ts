import { env } from '../../lib/env';
import { getCurrentSession } from '../auth';

type ApiRequestOptions = Omit<RequestInit, 'headers'> & {
  auth?: boolean;
  headers?: HeadersInit;
};

function extractErrorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== 'object') {
    return fallback;
  }

  if ('error' in data && typeof data.error === 'string' && data.error) {
    return data.error;
  }

  if ('message' in data && typeof data.message === 'string' && data.message) {
    return data.message;
  }

  if (
    'mensagem' in data &&
    typeof data.mensagem === 'string' &&
    data.mensagem
  ) {
    return data.mensagem;
  }

  return fallback;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { auth = true, headers, body, ...rest } = options;
  const finalHeaders = new Headers(headers);

  if (
    body &&
    !(body instanceof FormData) &&
    !finalHeaders.has('Content-Type')
  ) {
    finalHeaders.set('Content-Type', 'application/json');
  }

  if (auth) {
    const session = await getCurrentSession();

    if (session?.access_token && !finalHeaders.has('Authorization')) {
      finalHeaders.set('Authorization', `Bearer ${session.access_token}`);
    }
  }

  const response = await fetch(`${env.apiUrl}${path}`, {
    ...rest,
    body,
    headers: finalHeaders,
  });

  const data = await parseResponse<unknown>(response);

  if (!response.ok) {
    throw new ApiError(
      extractErrorMessage(data, 'Falha ao processar a requisição.'),
      response.status,
      data,
    );
  }

  return data as T;
}
