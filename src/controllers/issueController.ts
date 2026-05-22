import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/db';
import { StatusCodes } from 'http-status-codes';
import { sendSuccess, sendError } from '../utils/responseHelper';
import {
  Issue,
  IssueEnriched,
  IssueMetrics,
  IssueStatus,
  IssueType,
  UserPublic,
  CreateIssueBody,
  UpdateIssueBody
} from '../types';

export const createIssue = async (
  req: Request<object, object, CreateIssueBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { title, description, type } = req.body;
    const reporter_id = req.user!.id;

    if (!title || !description || !type) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Title, description, and type are required');
    }

    if (title.length > 150) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Title must be at most 150 characters');
    }

    if (description.length < 20) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Description must be at least 20 characters');
    }

    if (type !== 'bug' && type !== 'feature_request') {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Type must be either "bug" or "feature_request"');
    }

    const result = await pool.query<Issue>(
      `INSERT INTO issues (title, description, type, reporter_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
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

    let queryStr = `SELECT * FROM issues WHERE 1=1`;
    const queryParams: (string | string[])[] = [];
    let paramIdx = 1;

    if (type) {
      queryStr += ` AND type = $${paramIdx++}`;
      queryParams.push(type as string);
    }
    if (status) {
      queryStr += ` AND status = $${paramIdx++}`;
      queryParams.push(status as string);
    }

    const sortOrder = sort === 'oldest' ? 'ASC' : 'DESC';
    queryStr += ` ORDER BY created_at ${sortOrder}`;

    const issuesResult = await pool.query<Issue>(queryStr, queryParams);
    const issues = issuesResult.rows;

    if (issues.length === 0) {
      return sendSuccess(res, StatusCodes.OK, 'Issues fetched', []);
    }

    // Batch fetch reporters — no JOINs as per spec
    const reporterIds = [...new Set(issues.map(i => i.reporter_id))];
    const usersResult = await pool.query<UserPublic>(
      `SELECT id, name, role FROM users WHERE id = ANY($1::int[])`,
      [reporterIds]
    );

    const userMap = usersResult.rows.reduce<Record<number, UserPublic>>((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

    const enrichedIssues: IssueEnriched[] = issues.map(issue => {
      const { reporter_id, ...issueData } = issue;
      return { ...issueData, reporter: userMap[reporter_id] ?? null };
    });

    sendSuccess(res, StatusCodes.OK, 'Issues fetched successfully', enrichedIssues);
  } catch (error) {
    next(error);
  }
};

export const getSingleIssue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const issueResult = await pool.query<Issue>(`SELECT * FROM issues WHERE id = $1`, [id]);

    if (issueResult.rows.length === 0) {
      return sendError(res, StatusCodes.NOT_FOUND, 'Issue not found');
    }

    const issue = issueResult.rows[0];

    const userResult = await pool.query<UserPublic>(
      `SELECT id, name, role FROM users WHERE id = $1`,
      [issue.reporter_id]
    );

    const { reporter_id, ...issueData } = issue;
    const finalData: IssueEnriched = {
      ...issueData,
      reporter: userResult.rows[0] ?? null
    };

    sendSuccess(res, StatusCodes.OK, 'Issue fetched successfully', finalData);
  } catch (error) {
    next(error);
  }
};

export const updateIssue = async (
  req: Request<{ id: string }, object, UpdateIssueBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { title, description, type, status } = req.body;
    const user = req.user!;

    const existing = await pool.query<Issue>(`SELECT * FROM issues WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      return sendError(res, StatusCodes.NOT_FOUND, 'Issue not found');
    }
    const issue = existing.rows[0];

    // Role-based access control
    if (user.role === 'contributor') {
      if (issue.reporter_id !== user.id) {
        return sendError(res, StatusCodes.FORBIDDEN, 'You can only edit your own issues');
      }
      if (issue.status !== 'open') {
        return sendError(res, StatusCodes.CONFLICT, 'Contributors can only edit open issues');
      }
    }

    // Validation
    if (title && title.length > 150) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Title must be at most 150 characters');
    }

    if (description && description.length < 20) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Description must be at least 20 characters');
    }

    if (type && type !== 'bug' && type !== 'feature_request') {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Type must be either "bug" or "feature_request"');
    }

    if (status && user.role === 'maintainer') {
      const validStatuses: IssueStatus[] = ['open', 'in_progress', 'resolved'];
      if (!validStatuses.includes(status)) {
        return sendError(res, StatusCodes.BAD_REQUEST, 'Status must be "open", "in_progress", or "resolved"');
      }
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: (string | number)[] = [];
    let idx = 1;

    if (title)                              { updates.push(`title = $${idx++}`);       values.push(title); }
    if (description)                        { updates.push(`description = $${idx++}`); values.push(description); }
    if (type)                               { updates.push(`type = $${idx++}`);        values.push(type); }
    if (status && user.role === 'maintainer') { updates.push(`status = $${idx++}`);   values.push(status); }

    if (updates.length === 0) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const updateQuery = `UPDATE issues SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await pool.query<Issue>(updateQuery, values);

    sendSuccess(res, StatusCodes.OK, 'Issue updated successfully', result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const deleteIssue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await pool.query<{ id: number }>(
      `DELETE FROM issues WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return sendError(res, StatusCodes.NOT_FOUND, 'Issue not found');
    }

    sendSuccess(res, StatusCodes.OK, 'Issue deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const getMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const totalResult = await pool.query<{ total: string }>(`SELECT COUNT(*) AS total FROM issues`);

    const statusResult = await pool.query<{ status: IssueStatus; count: string }>(
      `SELECT status, COUNT(*) AS count FROM issues GROUP BY status`
    );

    const typeResult = await pool.query<{ type: IssueType; count: string }>(
      `SELECT type, COUNT(*) AS count FROM issues GROUP BY type`
    );

    // Build status map with defaults
    const statusMap: Record<IssueStatus, number> = { open: 0, in_progress: 0, resolved: 0 };
    statusResult.rows.forEach(row => { statusMap[row.status] = parseInt(row.count); });

    // Build type map with defaults
    const typeMap: Record<IssueType, number> = { bug: 0, feature_request: 0 };
    typeResult.rows.forEach(row => { typeMap[row.type] = parseInt(row.count); });

    const metrics: IssueMetrics = {
      total_issues:     parseInt(totalResult.rows[0].total),
      open:             statusMap['open'],
      in_progress:      statusMap['in_progress'],
      resolved:         statusMap['resolved'],
      bugs:             typeMap['bug'],
      feature_requests: typeMap['feature_request']
    };

    sendSuccess(res, StatusCodes.OK, 'Metrics fetched successfully', metrics);
  } catch (error) {
    next(error);
  }
};