import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../lib/api.js";

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { mutate: login, isPending, error } = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      queryClient.setQueryData(["authUser"], { user: data.user });
      navigate(data.user.isOnboarded ? "/" : "/onboarding", { replace: true });
    },
  });

  const handleChange = (event) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      [event.target.name]: event.target.value,
    }));
  };

  const handleLogin = (event) => {
    event.preventDefault();
    login({
      email: formData.email.trim(),
      password: formData.password,
    });
  };

  return (
    <main className="signup-page">
      <section className="signup-card">
        <div className="signup-content">
          <Link to="/" className="signup-brand" aria-label="VibeTalk home">
            <img src="/logo.png" alt="" width={38} height={38} />
            <span>VibeTalk</span>
          </Link>

          <form onSubmit={handleLogin} className="signup-form">
            <div className="signup-heading">
              <span className="signup-eyebrow">YOUR PEOPLE, YOUR VIBE</span>
              <h1>Welcome back</h1>
              <p>Welcome to VibeTalk. Sign in to continue the conversation.</p>
            </div>

            {error && (
              <div className="alert alert-error signup-error" role="alert">
                <span>
                  {error.response?.data?.message ||
                    (error.code === "ERR_NETWORK"
                      ? "Cannot connect to the server. Please try again."
                      : "Unable to sign in. Please check your details and try again.")}
                </span>
              </div>
            )}

            <div className="signup-fields">
              <fieldset className="signup-field">
                <label htmlFor="login-email">Email address</label>
                <div className="signup-input-wrap">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </fieldset>

              <fieldset className="signup-field">
                <label htmlFor="login-password">Password</label>
                <div className="signup-input-wrap">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="10" width="18" height="11" rx="2" />
                    <path d="M7 10V7a5 5 0 0 1 10 0v3" />
                    <path d="M12 14v3" />
                  </svg>
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="Your password"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
              </fieldset>
            </div>

            <button
              className="btn btn-primary signup-submit"
              type="submit"
              disabled={isPending}
            >
              {isPending && <span className="loading loading-spinner" />}
              {isPending ? "Signing in..." : "Login"}
            </button>

            <p className="signup-login">
              Don&apos;t have an account? <Link to="/signup">Create one</Link>
            </p>
          </form>
        </div>

        <aside className="signup-visual">
          <img src="/logoSide.jpg" alt="Connect and chat with your people" />
          <div className="signup-visual-copy">
            <span>Welcome back.</span>
            <p>Your people are just one conversation away.</p>
          </div>
        </aside>
      </section>
    </main>
  );
};

export default LoginPage;
