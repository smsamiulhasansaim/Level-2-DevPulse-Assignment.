import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { sendError } from '../utils/responseHelper';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  
  if (err.code === '23505') { // PostgreSQL unique violation code
    return sendError(res, StatusCodes.BAD_REQUEST, 'Email already exists');
  }

  sendError(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Internal Server Error', err.message);
};