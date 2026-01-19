import { Session } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AllAppointmentsClient from "./all-appointments-client";

export default async function AllAppointmentsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return <AllAppointmentsClient session={session} />;
}
