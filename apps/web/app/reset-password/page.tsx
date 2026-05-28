import { AuthRecoveryForm } from "../auth-recovery-form";

type ResetPasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage(props: ResetPasswordPageProps) {
  const searchParams = await props.searchParams;
  const token = getFirstParam(searchParams?.token);

  return <AuthRecoveryForm mode="reset-password" token={token} />;
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
