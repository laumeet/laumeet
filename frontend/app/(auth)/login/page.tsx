// app/(auth)/login/page.tsx
import AuthLayout from '@/components/shared/layout/AuthLayout';
import LoginForm from '@/components/shared/auth/LoginForm';

export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue your campus journey"
      showBackButton={true}
    >
      <LoginForm />
    </AuthLayout>
  );
}