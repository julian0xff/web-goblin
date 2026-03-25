import type { Metadata } from "next";
import { MainLayout } from "@/app/_components/main-layout";

export const metadata: Metadata = {
  title: "Web Goblin",
  description:
    "Paste a URL, steal its design DNA, and turn the result into a prompt-ready style breakdown.",
};

export default function Home() {
  return <MainLayout />;
}
