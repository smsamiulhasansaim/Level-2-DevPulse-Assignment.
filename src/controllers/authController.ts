import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';
import { StatusCodes } from 'http-status-codes';
import { sendSuccess, sendError } from '../utils/responseHelper';
import { SignupBody, LoginBody, User, UserRole } from '../types';

export const signup = async (req: Request<object, object, SignupBody>, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Name, email, and password are required');
    }

    const userRole: UserRole = role === 'maintainer' ? 'maintainer' : 'contributor';
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query<Omit<User, 'password'>>(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at, updated_at`,
      [name, email, hashedPassword, userRole]
    );

    sendSuccess(res, StatusCodes.CREATED, 'User registered successfully', result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request<object, object, LoginBody>, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Email and password are required');
    }

    const result = await pool.query<User>(`SELECT * FROM users WHERE email = $1`, [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password as string))) {
      return sendError(res, StatusCodes.UNAUTHORIZED, 'Invalid credentials');
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '1d' }
    );

    // Exclude password from response
    const { password: _password, ...safeUser } = user;

    sendSuccess(res, StatusCodes.OK, 'Login successful', { token, user: safeUser });
  } catch (error) {
    next(error);
  }
};

// S M Samiul Hasan Saim 