'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target, LogIn } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';


export default function LoginPage() {
  return (
    <Suspense fallback={<div>در حال بارگذاری...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!username || !password) {
        toast({
            variant: "destructive",
            title: "خطا",
            description: "لطفاً نام کاربری و رمز عبور را وارد کنید.",
        });
        setIsLoading(false);
        return;
    }

    try {
      const result = await signIn('credentials', {
        redirect: false,
        username,
        password,
        callbackUrl,
      });

      if (result?.error) {
        toast({
          variant: 'destructive',
          title: 'خطا در ورود',
          description: 'نام کاربری یا رمز عبور نامعتبر است.',
        });
        setIsLoading(false);
      } else if (result?.ok) {
        toast({
          title: 'ورود موفق',
          description: `خوش آمدید، ${username}!`,
        });
        router.push(callbackUrl);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        variant: 'destructive',
        title: 'خطای غیرمنتظره',
        description: 'مشکلی در فرآیند ورود رخ داده است.',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="text-center">
          <Link href="/" className="flex justify-center items-center gap-2 mb-4">
            <Image 
              src="/images/logo.png"
              alt="لوگوی ردیاب OKR"
              width={32}
              height={32}
              className="h-8 w-8 text-primary"
            />
          </Link>
          <CardTitle className="font-headline text-2xl">ورود به ردیاب OKR</CardTitle>
          <CardDescription>برای دسترسی به داشبورد خود وارد شوید.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">نام کاربری</Label>
              <Input
                id="username"
                type="text"
                placeholder="نام کاربری خود را وارد کنید"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">رمز عبور</Label>
              <Input
                id="password"
                type="password"
                placeholder="*******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'در حال ورود...' : 'ورود'}
              <LogIn className="w-4 h-4 mr-2" />
            </Button>
            <Button variant="link" asChild className="text-sm">
                <Link href="/signup">حساب کاربری ندارید؟ ثبت‌نام کنید</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
