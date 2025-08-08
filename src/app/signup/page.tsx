
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target, UserPlus } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "ثبت‌نام موفق",
          description: "حساب کاربری شما با موفقیت ایجاد شد. اکنون می‌توانید وارد شوید.",
        });
        router.push('/login');
      } else {
        toast({
          variant: "destructive",
          title: "خطا در ثبت‌نام",
          description: data.message || "مشکلی پیش آمده است. لطفاً دوباره تلاش کنید.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطای سرور",
        description: "امکان برقراری ارتباط با سرور وجود ندارد.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="text-center">
          <Link href="/" className="flex justify-center items-center gap-2 mb-4">
            <Target className="h-8 w-8 text-primary" />
          </Link>
          <CardTitle className="font-headline text-2xl">ایجاد حساب کاربری</CardTitle>
          <CardDescription>برای استفاده از ردیاب OKR ثبت‌نام کنید.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">نام کاربری</Label>
              <Input
                id="username"
                type="text"
                placeholder="یک نام کاربری انتخاب کنید"
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
                placeholder="یک رمز عبور قوی انتخاب کنید"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'در حال ایجاد حساب...' : 'ثبت‌نام'}
              <UserPlus className="w-4 h-4 mr-2" />
            </Button>
            <Button variant="link" asChild className="text-sm">
                <Link href="/login">حساب کاربری دارید؟ وارد شوید</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
