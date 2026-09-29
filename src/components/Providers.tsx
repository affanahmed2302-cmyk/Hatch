"use client";
import CallRing from "./CallRing";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CallRing />
    </>
  );
}
