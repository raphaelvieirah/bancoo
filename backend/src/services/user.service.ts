import { compareSync, hashSync } from "bcrypt";
import jwt from "jsonwebtoken";
import checkAuth from "../middleware/checkAuth.middleware";
import * as PrismaUtil from "../utils/prisma.util";
import currencyFormatter from "../helpers/currencyFormatter";
import {
  ILoginData,
  IRegisterData,
  IUserUpdateFormData,
  IEmailUpdateFormData,
  IPasswordUpdateFormData,
} from "../types/user";
import loanCalculation from "../helpers/loanCalculation";

const JWT_SECRET = process.env.JWT_SECRET || "ngcash2022";

export async function login({ username, password }: ILoginData) {
  const dbUser = await PrismaUtil.findUser("username", username);
  if (!dbUser) return { status: "E-mail ou senha incorretos.", success: false };
  if (compareSync(password, dbUser.password)) {
    const token = jwt.sign({ userId: dbUser.id }, JWT_SECRET, {
      expiresIn: 86400,
    });
    return {
      token: token,
      status: "Login realizado com sucesso.",
      success: true,
    };
  }
  return { status: "E-mail ou senha incorretos.", success: false };
}

export async function register({
  username,
  password,
  firstName,
  lastName,
}: IRegisterData) {
  const dbUser = await PrismaUtil.findUser("username", username);
  if (dbUser)
    return {
      status: "E-mail já cadastrado.",
      success: false,
    };
  const user = await PrismaUtil.createUser({
    username,
    password,
    firstName,
    lastName,
  });
  if (user)
    return {
      status: "Usuário criado com sucesso.",
      success: true,
    };
  return {
    status: "Ocorreu um erro ao cadastrar o usuário.",
    success: false,
  };
}

export async function updateUser(
  formData: IUserUpdateFormData,
  authorization: string | undefined
) {
  const userId = checkAuth(authorization);
  const dbUser = await PrismaUtil.findUser("id", userId);
  if (!dbUser) return { status: "ID de usuário inválido.", success: false };
  const updatedUser = await PrismaUtil.updateUser(formData);
  return {
    user: {
      ...updatedUser,
    },
    status: "Dados atualizados com sucesso.",
    success: true,
  };
}

export async function updateEmail(
  formData: IEmailUpdateFormData,
  authorization: string | undefined
) {
  const userId = checkAuth(authorization);
  const dbUser = await PrismaUtil.findUser("id", userId);
  if (!dbUser) return { status: "ID de usuário inválido.", success: false };
  if (dbUser?.username !== formData.oldEmail)
    return {
      status: "E-mail atual não coincide com o cadastrado.",
      success: false,
    };
  if (dbUser.username === formData.newEmail)
    return { status: "O novo e-mail é igual ao e-mail atual.", success: false };
  const updatedUser = await PrismaUtil.updateEmail(formData);
  return {
    user: {
      ...updatedUser,
    },
    status: "E-mail atualizado com sucesso.",
    success: true,
  };
}

export async function updatePassword(
  formData: IPasswordUpdateFormData,
  authorization: string | undefined
) {
  const userId = checkAuth(authorization);
  const dbUser = await PrismaUtil.findUser("id", userId);
  if (!dbUser) return { status: "ID de usuário inválido.", success: false };
  if (!compareSync(formData.oldPassword, dbUser.password))
    return {
      status: "Senha atual incorreta.",
      success: false,
    };
  if (compareSync(formData.newPassword, dbUser.password))
    return {
      status: "A nova senha deve ser diferente da senha atual.",
      success: false,
    };
  const updatedUser = await PrismaUtil.updatePassword(formData, dbUser);
  return {
    user: {
      ...updatedUser,
    },
    status: "Senha atualizada com sucesso.",
    success: true,
  };
}

export async function deleteUser(authorization: string | undefined) {
  const userId = checkAuth(authorization);
  const dbUser = await PrismaUtil.findUser("id", userId);
  if (!dbUser) return { status: "ID de usuário inválido.", success: false };
  const data = await PrismaUtil.deleteUser(dbUser);
  if (!data?.user && !data?.account)
    return { status: "Falha ao excluir usuário.", success: false };
  return { status: "Usuário excluído com sucesso.", success: true };
}

export async function token(authorization: string | undefined) {
  const userId = checkAuth(authorization);
  const dbUser = await PrismaUtil.findUser("id", userId);
  if (!dbUser) return { status: "ID de usuário inválido.", success: false };
  const dbUserAccount = await PrismaUtil.findAccount(dbUser);
  const user = {
    ...dbUser,
    balance: currencyFormatter("pt-BR", "BRL", dbUserAccount?.balance),
    loan: currencyFormatter("pt-BR", "BRL", loanCalculation(dbUser.income)),
  };
  return { status: "Token validado com sucesso.", success: true, user };
}
