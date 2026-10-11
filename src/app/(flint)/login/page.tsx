import { redirect } from "next/navigation";
import { isPresenter } from "@/server/presenter";
import { LoginForm } from "./login-form";

export const metadata = { title: "Presenter sign-in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") ? next : "/demo";
  if (await isPresenter()) redirect(nextPath === "/demo" ? "/demo" : `/demo?next=${encodeURIComponent(nextPath)}`);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-semibold">Presenter sign-in</h1>
      <p className="mt-1 text-sm text-slate-600">For Flint staff running the HDTP demo.</p>
      <LoginForm next={nextPath} />
    </div>
  );
}
