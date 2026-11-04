import { useState } from "react";
import { Link } from "react-router-dom";
import useSignup from "../hooks/usesignup";

const SignupPage = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const { SignupMutation, isPending, error } = useSignup();

  const handleChange = (event) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSignup = (event) => {
    event.preventDefault();
    SignupMutation({
      fullName: formData.fullName.trim(),
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

          <form onSubmit={handleSignup} className="signup-form">
            <div className="signup-heading">
              <span className="signup-eyebrow">YOUR PEOPLE, YOUR VIBE</span>
              <h1>Create your account</h1>
              <p>Join VibeTalk and make every conversation feel closer.</p>
            </div>

            {error && (
              <div className="alert alert-error signup-error" role="alert">
                <span>
                  {error.response?.data?.message ||
                    (error.code === "ERR_NETWORK"
                      ? "Cannot connect to the server. Please make sure the backend is running, then try again."
                      : "Unable to create your account. Please try again.")}
                </span>
              </div>
            )}

            <div className="signup-fields">
              <fieldset className="signup-field">
                <label htmlFor="signup-full-name">Full name</label>
                <div className="signup-input-wrap">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    id="signup-full-name"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    placeholder="Your name"
                    minLength={3}
                    maxLength={50}
                    value={formData.fullName}
                    onChange={handleChange}
                  />
                </div>
              </fieldset>

              <fieldset className="signup-field">
                <label htmlFor="signup-email">Email address</label>
                <div className="signup-input-wrap">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <input
                    id="signup-email"
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
                <label htmlFor="signup-password">Password</label>
                <div className="signup-input-wrap">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="10" width="18" height="11" rx="2" />
                    <path d="M7 10V7a5 5 0 0 1 10 0v3" />
                    <path d="M12 14v3" />
                  </svg>
                  <input
                    id="signup-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    placeholder="At least 6 characters"
                    minLength={6}
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
              </fieldset>
            </div>

            <label className="signup-terms">
              <input
                type="checkbox"
                required
                className="checkbox checkbox-primary checkbox-sm"
              />
              <span>I agree to the terms and conditions.</span>
            </label>

            <button
              className="btn btn-primary signup-submit"
              type="submit"
              disabled={isPending}
            >
              {isPending && <span className="loading loading-spinner" />}
              {isPending ? "Creating account..." : "Create account"}
            </button>

            <p className="signup-login">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </form>
        </div>

        <aside className="signup-visual">
          <img src="/logoSide.jpg" alt="Connect and chat with your people" />
          <div className="signup-visual-copy">
            <span>Good conversations start here.</span>
            <p>Stay close to the people who make every day better.</p>
          </div>
        </aside>
      </section>
    </main>
  );
};

export default SignupPage;
