import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
    user: {
        idUsuario: string;
        roles: string[];
    };
}