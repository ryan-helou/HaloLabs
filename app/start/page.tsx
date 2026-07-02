import type { Metadata } from "next";
import StartFunnel from "@/components/StartFunnel";

export const metadata: Metadata = {
  title: "Start your plan · HaloLabs",
};

export default function StartPage() {
  return <StartFunnel />;
}
