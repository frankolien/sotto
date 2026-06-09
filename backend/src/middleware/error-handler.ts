import { ErrorRequestHandler, RequestHandler } from 'express';

/** 404 for unmatched routes. */
export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
};

/** Centralised error responder. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const status = typeof err?.status === 'number' ? err.status : 500;
  if (status >= 500) console.error(`${req.method} ${req.originalUrl} →`, err?.message ?? err);
  res.status(status).json({ error: String(err?.message ?? err) });
};
