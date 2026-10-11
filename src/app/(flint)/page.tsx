import { redirect } from "next/navigation";
import { isPresenter } from "@/server/presenter";

export default async function FlintHome() {
  redirect((await isPresenter()) ? "/demo" : "/login");
}
