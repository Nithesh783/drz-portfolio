import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { verifyPassword } from "./password";

export interface AdminIdentity {
  id: string;
  name: string;
  email: string;
  role: "admin";
}

interface TokenPayload extends AdminIdentity {
  exp: number;
  iat: number;
}

const SESSION_SECONDS = 60 * 60 * 8;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(email: string, password: string): Promise<{
    token: string;
    identity: AdminIdentity;
    maxAge: number;
  }> {
    this.getSecret();
    const account = await this.prisma.adminAccount.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (
      !account ||
      account.role !== "admin" ||
      !(await verifyPassword(password, account.passwordHash))
    ) {
      throw new UnauthorizedException("Email or password is incorrect.");
    }

    const identity: AdminIdentity = {
      id: account.id,
      name: account.name,
      email: account.email,
      role: "admin",
    };
    const issuedAt = Math.floor(Date.now() / 1000);
    const payload: TokenPayload = {
      ...identity,
      iat: issuedAt,
      exp: issuedAt + SESSION_SECONDS,
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      "base64url",
    );
    const signature = this.sign(encodedPayload);

    return {
      token: `${encodedPayload}.${signature}`,
      identity,
      maxAge: SESSION_SECONDS,
    };
  }

  verifyToken(token: string): AdminIdentity | null {
    const [encodedPayload, signature, extra] = token.split(".");
    if (!encodedPayload || !signature || extra !== undefined) return null;

    const expected = Buffer.from(this.sign(encodedPayload), "base64url");
    const received = Buffer.from(signature, "base64url");
    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      return null;
    }

    try {
      const payload = JSON.parse(
        Buffer.from(encodedPayload, "base64url").toString("utf8"),
      ) as Partial<TokenPayload>;
      if (
        typeof payload.id !== "string" ||
        typeof payload.name !== "string" ||
        typeof payload.email !== "string" ||
        payload.role !== "admin" ||
        typeof payload.exp !== "number" ||
        payload.exp <= Math.floor(Date.now() / 1000)
      ) {
        return null;
      }

      return {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        role: "admin",
      };
    } catch {
      return null;
    }
  }

  async isActiveAdmin(id: string): Promise<boolean> {
    const account = await this.prisma.adminAccount.findUnique({
      where: { id },
      select: { role: true },
    });
    return account?.role === "admin";
  }

  private sign(encodedPayload: string): string {
    return createHmac("sha256", this.getSecret())
      .update(encodedPayload)
      .digest("base64url");
  }

  private getSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret || Buffer.byteLength(secret) < 32) {
      throw new ServiceUnavailableException(
        "Admin authentication is unavailable until JWT_SECRET is configured with at least 32 bytes.",
      );
    }
    return secret;
  }
}
