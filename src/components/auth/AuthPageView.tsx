import { useEffect, useState } from "react";

import AuthCard from "@/components/auth/AuthCard";
import AuthTabs from "@/components/auth/AuthTabs";
import { useAuthForm } from "@/components/auth/useAuthForm";
import type { AuthMode } from "@/lib/auth/types";

export interface AuthPageViewProps {
  redirect?: string | null;
  mode?: AuthMode;
}

const AuthPageView = ({ redirect, mode = "login" }: AuthPageViewProps) => {
  const [activeTab, setActiveTab] = useState<AuthMode>(mode === "signup" ? "signup" : "login");

  const loginForm = useAuthForm("login", redirect);
  const signupForm = useAuthForm("signup", redirect);

  useEffect(() => {
    if (mode && (mode === "login" || mode === "signup")) {
      setActiveTab(mode);
    }
  }, [mode]);

  return (
    <AuthCard
      title={activeTab === "login" ? "Welcome back" : "Create your account"}
      subtitle={
        activeTab === "login"
          ? "Log in to manage your backlog and keep playing."
          : "Sign up to start tracking your backlog."
      }
    >
      <AuthTabs
        mode={activeTab}
        onChange={setActiveTab}
        loginFormProps={{
          values: loginForm.values,
          errors: loginForm.errors,
          status: loginForm.status,
          onChange: loginForm.setFieldValue,
          onSubmit: async () => {
            await loginForm.submit();
          },
        }}
        signupFormProps={{
          values: signupForm.values,
          errors: signupForm.errors,
          status: signupForm.status,
          onChange: signupForm.setFieldValue,
          onSubmit: async () => {
            await signupForm.submit();
          },
        }}
      />
    </AuthCard>
  );
};

export default AuthPageView;
