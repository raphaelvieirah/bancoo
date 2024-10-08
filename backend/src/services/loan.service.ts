import checkAuth from "../middleware/checkAuth.middleware";
import { ILoan } from "../types/loan";
import * as PrismaUtil from "../utils/prisma.util";

export async function newLoan(
  loanData: ILoan,
  authorization: string | undefined
) {
  const userId = checkAuth(authorization);
  const dbUser = await PrismaUtil.findUser("id", userId);
  if (!dbUser) return { status: "Usuário não encontrado.", success: false };
  const loans = await PrismaUtil.getLoans(dbUser);
  if (
    loans &&
    new Date().getTime() <
      (loans.length >= 1
        ? loans[loans.length - 1].requestedAt.getTime() + 86400000
        : 0)
  )
    return {
      status: "Você só pode solicitar 1 empréstimo a cada 24 horas.",
      success: false,
    };
  await PrismaUtil.createLoan(loanData, dbUser);
  return { status: "Empréstimo realizado com sucesso.", success: true };
}

export async function getLoans(authorization: string | undefined) {
  const userId = checkAuth(authorization);
  const dbUser = await PrismaUtil.findUser("id", userId);
  if (!dbUser) return { status: "Usuário não encontrado.", success: false };
  const loans = await PrismaUtil.getLoans(dbUser);
  if (!loans)
    return { status: "Nenhum empréstimo encontrado.", success: false };
  const nextLoan =
    loans.length >= 1
      ? loans[loans.length - 1].requestedAt.getTime() + 86400000
      : 0;
  return {
    loans: loans
      .map((loan) => {
        loan.requestedAt = new Date(loan.requestedAt.getTime() - 10800000);
        return loan;
      })
      .sort((a, b) =>
        new Date(a.requestedAt) < new Date(b.requestedAt) ? 1 : -1
      ),
    nextLoan,
    success: true,
  };
}
