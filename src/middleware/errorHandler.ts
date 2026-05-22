import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { sendError } from '../utils/responseHelper';
import { PgError } from '../types';

export const errorHandler = (err: PgError, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);

  if (err.code === '23505') {
    if (err.constraint === 'users_email_key' || err.detail?.includes('email')) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Email already exists');
    }
    return sendError(res, StatusCodes.BAD_REQUEST, 'Duplicate entry found');
  }

  sendError(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Internal Server Error', err.message);
};