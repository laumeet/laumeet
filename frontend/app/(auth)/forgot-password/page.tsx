// app/(auth)/forgot-password/page.tsx
import AuthLayout from '@/components/shared/layout/AuthLayout';
import ForgotPasswordForm from '@/components/shared/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll help you get back into your account"
      showBackButton={true}
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}