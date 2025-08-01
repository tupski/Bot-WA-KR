import { Request, Response, NextFunction } from 'express';

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = {
    success: false,
    error: {
      message: `Route ${req.originalUrl} not found`,
      statusCode: 404
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  res.status(404).json(error);
};
