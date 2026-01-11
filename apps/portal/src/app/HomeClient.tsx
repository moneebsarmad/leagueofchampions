"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "./providers";

const roles = [
  {
    id: "student",
    title: "Student",
    description: "Track points, celebrate progress, and climb the ranks.",
  },
  {
    id: "parent",
    title: "Parent",
    description: "Follow your child's house progress and milestones.",
  },
  {
    id: "staff",
    title: "Staff",
    description: "Award points quickly and recognize character daily.",
  },
] as const;

export default function HomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const accessError = searchParams.get("error");
  const accessMessage =
    accessError === "not_staff"
      ? "Staff access required. Please sign in with a staff account."
      : null;
  const [selectedRoleId, setSelectedRoleId] =
    useState<(typeof roles)[number]["id"]>("student");

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? roles[0],
    [selectedRoleId]
  );

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthMessage(null);
    const error = await signIn(email, password);
    if (error) {
      setAuthMessage(error);
      return;
    }
    setPassword("");
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen app-shell flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] flex items-center justify-center text-sm font-semibold">
            DAAIS
          </div>
          <h1 className="text-2xl font-semibold">League of Champions</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            {selectedRole.title} Portal
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center mb-5">
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              className={
                selectedRoleId === role.id
                  ? "btn-primary text-xs"
                  : "btn-secondary text-xs"
              }
              onClick={() => setSelectedRoleId(role.id)}
            >
              {role.title}
            </button>
          ))}
        </div>

        <form className="space-y-4" onSubmit={handleSignIn}>
          {accessMessage ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--danger)]">
              {accessMessage}
            </div>
          ) : null}

          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-[var(--text-muted)] mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input w-full"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-[var(--text-muted)] mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input w-full"
            />
          </div>

          {authMessage ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--danger)]">
              {authMessage}
            </div>
          ) : null}

          <button
            className="btn-primary w-full font-semibold"
            type="submit"
            disabled={loading || !email || !password}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-[var(--text-muted)]">
          Dār al-Arqam Islamic School
        </div>
      </div>
    </div>
  );
}
