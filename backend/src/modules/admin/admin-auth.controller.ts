import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";
import { AdminAuthGuard, type AuthenticatedRequest } from "./admin-auth.guard";
import { AuthService } from "./auth.service";

class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(200)
  password!: string;
}

@Controller("admin/auth")
export class AdminAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(200)
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.login(body.email, body.password);
    response.setHeader(
      "Set-Cookie",
      `portfolio_admin=${session.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${session.maxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    );
    return session.identity;
  }

  @Post("logout")
  @HttpCode(204)
  logout(@Res({ passthrough: true }) response: Response): void {
    response.setHeader(
      "Set-Cookie",
      `portfolio_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    );
  }

  @Get("me")
  @UseGuards(AdminAuthGuard)
  me(@Req() request: Request & AuthenticatedRequest) {
    return request.admin;
  }
}
