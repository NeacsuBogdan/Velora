import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException
} from "@nestjs/common";
import { Prisma, SessionStatus } from "@prisma/client";
import {
  authenticatedUserSchema,
  loginRequestSchema,
  registerRequestSchema,
  sessionResponseSchema,
  type AuthenticatedUser,
  type LoginRequest,
  type RegisterRequest,
  type SessionResponse
} from "@velora/contracts";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

import { PrismaService } from "../database/prisma.service";
import { SESSION_DURATION_DAYS } from "./auth.constants";

interface LoginContext {
  ipAddress?: string;
  userAgent?: string;
}

type SessionAuditAction =
  | "AUTH_LOGIN"
  | "AUTH_REGISTER"
  | "SELLER_ACTIVATED";

type UserWithRoles = Prisma.UserGetPayload<{
  include: {
    roleAssignments: {
      include: {
        role: true;
      };
    };
  };
}>;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(
    rawInput: LoginRequest,
    context: LoginContext
  ): Promise<{ token: string; session: SessionResponse }> {
    const input = loginRequestSchema.parse(rawInput);
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: {
        roleAssignments: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const passwordMatches = await bcrypt.compare(
      input.password,
      user.passwordHash
    );

    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    return this.createSessionForUser(user, context, "AUTH_LOGIN");
  }

  async register(
    rawInput: RegisterRequest,
    context: LoginContext
  ): Promise<{ token: string; session: SessionResponse }> {
    const input = registerRequestSchema.parse(rawInput);
    const normalizedEmail = input.email.toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: normalizedEmail
      }
    });

    if (existingUser) {
      throw new ConflictException("An account with this email already exists.");
    }

    const customerRole = await this.prisma.role.findUnique({
      where: {
        code: "CUSTOMER"
      }
    });

    if (!customerRole) {
      throw new InternalServerErrorException(
        "Customer registration is unavailable because the customer role is missing."
      );
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        roleAssignments: {
          create: {
            roleId: customerRole.id
          }
        }
      },
      include: {
        roleAssignments: {
          include: {
            role: true
          }
        }
      }
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        entityType: "USER",
        entityId: user.id,
        action: "AUTH_REGISTER",
        details: {
          email: user.email,
          userAgent: context.userAgent ?? null,
          ipAddress: context.ipAddress ?? null
        }
      }
    });

    return this.createSessionForUser(user, context, "AUTH_REGISTER");
  }

  async issueSessionForUserId(
    userId: string,
    context: LoginContext,
    action: SessionAuditAction
  ): Promise<{ token: string; session: SessionResponse }> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId
      },
      include: {
        roleAssignments: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Cannot create a session for this user.");
    }

    return this.createSessionForUser(user, context, action);
  }

  private async createSessionForUser(
    user: UserWithRoles,
    context: LoginContext,
    action: SessionAuditAction
  ): Promise<{ token: string; session: SessionResponse }> {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(
      Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000
    );

    const sessionRecord = await this.prisma.session.create({
      data: {
        tokenHash: this.hashSessionToken(token),
        userId: user.id,
        status: SessionStatus.ACTIVE,
        expiresAt,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      }
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        entityType: "SESSION",
        entityId: sessionRecord.id,
        action,
        details: {
          userAgent: context.userAgent ?? null,
          ipAddress: context.ipAddress ?? null
        }
      }
    });

    return {
      token,
      session: sessionResponseSchema.parse({
        sessionId: sessionRecord.id,
        expiresAt: sessionRecord.expiresAt.toISOString(),
        user: this.mapUser(user)
      })
    };
  }

  async getSessionFromToken(token: string): Promise<SessionResponse | null> {
    const session = await this.prisma.session.findUnique({
      where: {
        tokenHash: this.hashSessionToken(token)
      },
      include: {
        user: {
          include: {
            roleAssignments: {
              include: {
                role: true
              }
            }
          }
        }
      }
    });

    if (
      !session ||
      session.status !== SessionStatus.ACTIVE ||
      session.expiresAt <= new Date() ||
      !session.user.isActive
    ) {
      return null;
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        lastSeenAt: new Date()
      }
    });

    return sessionResponseSchema.parse({
      sessionId: session.id,
      expiresAt: session.expiresAt.toISOString(),
      user: this.mapUser(session.user)
    });
  }

  async logout(token: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        tokenHash: this.hashSessionToken(token)
      },
      data: {
        status: SessionStatus.REVOKED
      }
    });
  }

  private hashSessionToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private mapUser(
    user: UserWithRoles
  ): AuthenticatedUser {
    return authenticatedUserSchema.parse({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roleAssignments.map((assignment) => ({
        code: assignment.role.code,
        name: assignment.role.name
      }))
    });
  }
}
