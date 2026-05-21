import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/db';
import { StatusCodes } from 'http-status-codes';
import { sendSuccess, sendError } from '../utils/responseHelper';

export const createIssue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, type } = req.body;
    const reporter_id = req.user!.id;

    if (!title || !description || !type) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Title, description, and type are required');
    }

    const result = await pool.query(
      `INSERT INTO issues (title, description, type, reporter_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, description, type, reporter_id]
    );

    sendSuccess(res, StatusCodes.CREATED, 'Issue created successfully', result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const getAllIssues = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sort, type, status } = req.query;
    
    // Dynamic Query Building (Without Query Builders)
    let queryStr = `SELECT * FROM issues WHERE 1=1`;
    const queryParams: any[] = [];
    let paramIdx = 1;

    if (type) {
      queryStr += ` AND type = $${paramIdx++}`;
      queryParams.push(type);
    }
    if (status) {
      queryStr += ` AND status = $${paramIdx++}`;
      queryParams.push(status);
    }

    const sortOrder = sort === 'oldest' ? 'ASC' : 'DESC';
    queryStr += ` ORDER BY created_at ${sortOrder}`;

    const issuesResult = await pool.query(queryStr, queryParams);
    const issues = issuesResult.rows;

    if (issues.length === 0) {
      return sendSuccess(res, StatusCodes.OK, 'Issues fetched', []);
    }

    // Handle Reporter Relationship without SQL JOIN
    const reporterIds = [...new Set(issues.map(i => i.reporter_id))];
    const usersResult = await pool.query(
      `SELECT id, name, role FROM users WHERE id = ANY($1::int[])`,
      [reporterIds]
    );
    
    const userMap = usersResult.rows.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<number, any>);

    const enrichedIssues = issues.map(issue => {
      const { reporter_id, ...issueData } = issue;
      return { ...issueData, reporter: userMap[reporter_id] || null };
    });

    sendSuccess(res, StatusCodes.OK, 'Issues fetched successfully', enrichedIssues);
  } catch (error) {
    next(error);
  }
};

export const getSingleIssue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const issueResult = await pool.query(`SELECT * FROM issues WHERE id = $1`, [id]);
    
    if (issueResult.rows.length === 0) {
      return sendError(res, StatusCodes.NOT_FOUND, 'Issue not found');
    }
    
    const issue = issueResult.rows[0];

    // Fetch user without JOIN
    const userResult = await pool.query(`SELECT id, name, role FROM users WHERE id = $1`, [issue.reporter_id]);
    
    const { reporter_id, ...issueData } = issue;
    const finalData = {
      ...issueData,
      reporter: userResult.rows[0] || null
    };

    sendSuccess(res, StatusCodes.OK, 'Issue fetched successfully', finalData);
  } catch (error) {
    next(error);
  }
};

export const updateIssue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, description, type, status } = req.body;
    const user = req.user!;

    // 1. Fetch existing issue to check permissions
    const existing = await pool.query(`SELECT * FROM issues WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      return sendError(res, StatusCodes.NOT_FOUND, 'Issue not found');
    }
    const issue = existing.rows[0];

    // 2. Permission Logic
    if (user.role === 'contributor') {
      if (issue.reporter_id !== user.id) {
        return sendError(res, StatusCodes.FORBIDDEN, 'You can only edit your own issues');
      }
      if (issue.status !== 'open') {
        return sendError(res, StatusCodes.CONFLICT, 'Contributors can only edit open issues');
      }
    }

    // 3. Dynamic Update Query
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (title) { updates.push(`title = $${idx++}`); values.push(title); }
    if (description) { updates.push(`description = $${idx++}`); values.push(description); }
    if (type) { updates.push(`type = $${idx++}`); values.push(type); }
    if (status && user.role === 'maintainer') { updates.push(`status = $${idx++}`); values.push(status); }

    if (updates.length === 0) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const updateQuery = `UPDATE issues SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await pool.query(updateQuery, values);

    sendSuccess(res, StatusCodes.OK, 'Issue updated successfully', result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const deleteIssue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM issues WHERE id = $1 RETURNING id`, [id]);

    if (result.rows.length === 0) {
      return sendError(res, StatusCodes.NOT_FOUND, 'Issue not found');
    }

    sendSuccess(res, StatusCodes.OK, 'Issue deleted successfully');
  } catch (error) {
    next(error);
  }
};