"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      router.replace('/dashboard');
    } else {
      router.replace('/auth');
    }
  }, [router]);

  return null;
}
