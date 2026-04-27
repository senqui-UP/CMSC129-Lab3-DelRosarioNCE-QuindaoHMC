import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { User } from "../models";

export interface AuthRequest extends Request {
  user?: {
    _id: string;
    username: string;
    email: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: string;
      username: string;
      email: string;
    };

    const user = await User.findById(decoded.userId).select("_id username email");

    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    req.user = {
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: "Invalid token" });
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: "Token expired" });
      return;
    }
    res.status(401).json({ message: "Authentication failed" });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const userIdHeader = req.headers["x-user-id"] as string;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, env.JWT_SECRET) as {
        userId: string;
        username: string;
        email: string;
      };

      const user = await User.findById(decoded.userId).select("_id username email");

      if (user) {
        req.user = {
          _id: user._id.toString(),
          username: user.username,
          email: user.email,
        };
      }
    } else if (userIdHeader) {
      const user = await User.findById(userIdHeader).select("_id username email");
      if (user) {
        req.user = {
          _id: user._id.toString(),
          username: user.username,
          email: user.email,
        };
      }
    }

    next();
  } catch {
    next();
  }
};

export const generateToken = (userId: string, username: string, email: string): string => {
  const expiresIn = env.JWT_EXPIRES_IN || "7d";
  return jwt.sign(
    { userId, username, email },
    env.JWT_SECRET,
    { expiresIn } as jwt.SignOptions
  );
};
