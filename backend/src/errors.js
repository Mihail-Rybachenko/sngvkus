export function httpError(status, message, details) {
  const err = new Error(message);
  err.status = status;
  if (details !== undefined) err.details = details;
  return err;
}

export function errorMiddleware(err, req, res, next) {
  const status = Number(err?.status || 500);
  const message =
    status >= 500 ? 'Internal server error' : (err?.message || 'Error');

  const payload = { message };
  const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
  if (!isProd && err?.details !== undefined) payload.details = err.details;

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(status).json(payload);
}

