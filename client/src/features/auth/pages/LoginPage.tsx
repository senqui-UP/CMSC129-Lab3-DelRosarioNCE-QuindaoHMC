import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { theme } from "../../../styles/theme";
import {
  inputStyles,
  errorStyles,
} from "../../../styles/commonStyles";

interface LoginFormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

const validateEmail = (email: string): string | undefined => {
  if (!email) return "Email is required";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return "Please enter a valid email address";
};

const validatePassword = (password: string): string | undefined => {
  if (!password) return "Password is required";
};

export const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const { login } = useAuth();

  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);

    if (emailError) newErrors.email = emailError;
    if (passwordError) newErrors.password = passwordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      await login(formData.email, formData.password);
      navigate(redirect, { replace: true });
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Login failed. Please check your credentials.";
      setErrors({ general: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: theme.colors.background,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: theme.spacing.lg,
      }}
    >
      <style>{`
        @media (max-width: 480px) {
          .login-card { padding: 24px 16px !important; }
        }
      `}</style>
      <div
        style={{
          backgroundColor: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing["4xl"],
          width: "100%",
          maxWidth: "400px",
        }}
        className="login-card"
      >
        <h1
          style={{
            fontSize: theme.fontSize["3xl"],
            fontWeight: theme.fontWeight.extrabold,
            color: theme.colors.text.primary,
            textAlign: "center",
            marginBottom: theme.spacing.sm,
          }}
        >
          Welcome Back
        </h1>
        <p
          style={{
            fontSize: theme.fontSize.md,
            color: theme.colors.text.muted,
            textAlign: "center",
            marginBottom: theme.spacing["2xl"],
          }}
        >
          Sign in to your account
        </p>

        {errors.general && (
          <div style={errorStyles.container}>
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: theme.spacing.lg }}>
            <label
              style={{
                display: "block",
                fontSize: theme.fontSize.md,
                fontWeight: theme.fontWeight.semibold,
                color: theme.colors.text.secondary,
                marginBottom: theme.spacing.sm,
              }}
            >
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              style={{
                ...inputStyles.base,
                borderColor: errors.email
                  ? theme.colors.danger.primary
                  : theme.colors.borderLight,
              }}
            />
            {errors.email && (
              <p style={errorStyles.text}>{errors.email}</p>
            )}
          </div>

          <div style={{ marginBottom: theme.spacing["2xl"] }}>
            <label
              style={{
                display: "block",
                fontSize: theme.fontSize.md,
                fontWeight: theme.fontWeight.semibold,
                color: theme.colors.text.secondary,
                marginBottom: theme.spacing.sm,
              }}
            >
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              style={{
                ...inputStyles.base,
                borderColor: errors.password
                  ? theme.colors.danger.primary
                  : theme.colors.borderLight,
              }}
            />
            {errors.password && (
              <p style={errorStyles.text}>{errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: "100%",
              backgroundColor: isLoading ? "#2d5a8a" : theme.colors.accent.dark,
              color: theme.colors.text.primary,
              border: "none",
              padding: `${theme.spacing.md} ${theme.spacing["2xl"]}`,
              borderRadius: theme.borderRadius.lg,
              fontSize: theme.fontSize.md,
              fontWeight: theme.fontWeight.semibold,
              cursor: isLoading ? "not-allowed" : "pointer",
              transition: `background-color ${theme.transitions.normal}`,
            }}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: theme.spacing["2xl"],
            fontSize: theme.fontSize.md,
            color: theme.colors.text.muted,
          }}
        >
          Don't have an account?{" "}
          <Link
            to="/register"
            style={{
              color: theme.colors.accent.primary,
              textDecoration: "none",
              fontWeight: theme.fontWeight.semibold,
            }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};
