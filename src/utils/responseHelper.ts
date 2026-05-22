import { Response } from 'express';

export const sendSuccess = (res: Response, statusCode: number, message: string, data?: unknown) => {
  res.status(statusCode).json({
    success: true,
    message,
    ...(data !== undefined && { data })
  });
};

export const sendError = (res: Response, statusCode: number, message: string, errors?: unknown) => {
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors !== undefined && { errors })
  });
};