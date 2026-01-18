import { Suspense } from "react";
import HomeClient from "./HomeClient";

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen app-shell" />}>
      <HomeClient />
    </Suspense>
  );
}
