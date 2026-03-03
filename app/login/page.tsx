'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthUI } from '@/app/components/auth/AuthUI';

function LoginPageInner() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  return <AuthUI redirectTo={redirect} />;
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}