import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { AuthService, type AdminIdentity } from "./auth.service";

export interface AuthenticatedRequest extends Request {
  admin?: AdminIdentity;
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.headers.cookie
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("portfolio_admin="))
      ?.slice("portfolio_admin=".length);
    const identity = token ? this.authService.verifyToken(token) : null;

    if (!identity || !(await this.authService.isActiveAdmin(identity.id))) {
      throw new UnauthorizedException("Admin authentication is required.");
    }

    request.admin = identity;
    return true;
  }
}
