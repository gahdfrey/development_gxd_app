import { auth } from "@/auth";
import MyAppointmentsClient from "./myappointments-client";

export default async function MyAppointmentsPage() {
  const session = await auth();

  return <MyAppointmentsClient session={session} />;
}
