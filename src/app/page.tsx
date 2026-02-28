import { redirect } from "next/navigation";

export default function Home() {
  // We'll just redirect to /chat.
  // The /chat page itself will handle auth protection.
  redirect("/chat");
}
