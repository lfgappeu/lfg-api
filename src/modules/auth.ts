import Joi from "joi";
import { compareSync } from "bcrypt";
import type { ParameterizedContext } from "koa";

import { users, USER_GENDER } from "@/db/schemas/users.schema";
import { createUser, getUser } from "@/db/user";
import { getValidatedInput, sanitizeInput } from "@/utils/request";
import { ValidationError } from "@/exceptions";
import { EMAIL_TAKEN, INVALID_PARAMS, NOT_VERIFIED } from "@/errors/auth";
import type { BaseUser, TokenUser } from "@/types/user";
import { UNEXPECTED_ERROR } from "@/errors";
import { genToken } from "@/utils";
import { emailValidator, passwordValidator } from "@/utils/validators";
import { setupTokens } from "@/utils/token";

export const login = async (ctx: ParameterizedContext) => {
  if (!ctx.request?.body) {
    throw new ValidationError(INVALID_PARAMS);
  }

  const { email, password } = await getValidatedInput<TokenUser>(
    {
      email: sanitizeInput(ctx.request.body.email),
      password: sanitizeInput(ctx.request.body.password),
    },
    {
      email: emailValidator,
      password: passwordValidator,
    },
  );

  const user = await getUser(email, [], {
    password: users.password,
    id: users.id,
    verified: users.verified,
  });

  if (!user || !compareSync(password, user.password)) {
    throw new ValidationError(INVALID_PARAMS);
  }

  if (!user.verified) {
    throw new ValidationError(NOT_VERIFIED);
  }

  // @ts-expect-error - will complain that password must be optional to be able to delete
  delete user.password;

  ctx.body = {
    user,
    ...setupTokens(user.email),
  };
};

export const register = async (ctx: ParameterizedContext) => {
  const user = await getValidatedInput<BaseUser>(ctx.request.body, {
    email: emailValidator,
    password: passwordValidator,

    name: Joi.string().max(512),
    gender: Joi.string().valid(...USER_GENDER),
    birthday: Joi.date(),
    bio: Joi.string().max(5000),
    interests: Joi.array().items(Joi.string()),
    hobbies: Joi.array().items(Joi.string()),
    city: Joi.string().max(256),
  });

  const userExists = await getUser(user.email);

  if (userExists) {
    throw new ValidationError(EMAIL_TAKEN);
  }

  const token = `${genToken(32)}${Date.now()}`;

  const newUser = await createUser(
    Object.entries(user).reduce((result, [field, value]) => {
      if (Array.isArray(value)) {
        value = value.map((v) => sanitizeInput(v));
      } else if (typeof value === "string") {
        value = sanitizeInput(value);
      }

      result[field as keyof BaseUser] = value;
      return result;
    }, {} as BaseUser),
    token,
  );

  if (!newUser) {
    throw new ValidationError(UNEXPECTED_ERROR);
  }

  ctx.state = 201;
  ctx.body = newUser;
};
