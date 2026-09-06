import { Request, Response, NextFunction } from 'express';

export function errorMiddleware(err: any, req: Request, res: Response, _next: NextFunction): void {
  console.error('[API Error]', {
    path: req.path,
    method: req.method,
    message: err?.message || err,
    stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined
  });

  const statusCode = err?.status || err?.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err?.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err?.stack } : {})
  });
}
