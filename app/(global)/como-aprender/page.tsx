import type { Metadata } from "next";
import { HowToLearn } from "@/components/howto/how-to-learn";

export const metadata: Metadata = { title: "Cómo aprender" };

export default function Page() {
  return <HowToLearn />;
}
