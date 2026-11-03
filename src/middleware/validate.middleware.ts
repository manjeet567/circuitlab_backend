import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors.js';

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error: any) {
      if (error instanceof ZodError || error.name === 'ZodError' || Array.isArray(error.issues)) {
        return next(
          new ValidationError(
            'Request body failed validation',
            error.format ? error.format() : error.issues
          )
        );
      }
      next(error);
    }
  };
}
