import { GuestSocketProvider } from "@/context/GuestSocketContext";

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <GuestSocketProvider>{children}</GuestSocketProvider>;
}
