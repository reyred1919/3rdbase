
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target, UserPlus, Building } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    mobile: '',
    email: '',
    username: '',
    password: '',
    invitationCode: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const codeFromQuery = searchParams.get('code');
    if (codeFromQuery) {
      setFormData(prev => ({ ...prev, invitationCode: codeFromQuery }));
    }
  }, [searchParams]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { firstName, lastName, email, username, password } = formData;
    if (!firstName || !lastName || !email || !username || !password) {
        toast({
            variant: "destructive",
            title: "خطا",
            description: "لطفاً تمام فیلدهای ستاره‌دار را پر کنید.",
        });
        setIsLoading(false);
        return;
    }

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
    <div className="flex items-center justify-center min-h-screen bg-muted py-12">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center">
          <Link href="/" className="flex justify-center items-center gap-2 mb-4">
            <Target className="h-8 w-8 text-primary" />
          </Link>
          <CardTitle className="font-headline text-2xl">ایجاد حساب کاربری</CardTitle>
          <CardDescription>برای استفاده از ردیاب OKR ثبت‌نام کنید.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">نام <span className="text-destructive">*</span></Label>
                <Input id="firstName" value={formData.firstName} onChange={handleChange} required disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">نام خانوادگی <span className="text-destructive">*</span></Label>
                <Input id="lastName" value={formData.lastName} onChange={handleChange} required disabled={isLoading} />
              </div>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="email">ایمیل <span className="text-destructive">*</span></Label>
                    <Input id="email" type="email" value={formData.email} onChange={handleChange} required disabled={isLoading} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="mobile">شماره موبایل</Label>
                    <Input id="mobile" type="tel" value={formData.mobile} onChange={handleChange} disabled={isLoading} />
                </div>
            </div>

            <Separator className="my-6" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label htmlFor="username">نام کاربری <span className="text-destructive">*</span></Label>
                <Input id="username" value={formData.username} onChange={handleChange} required disabled={isLoading} autoComplete="username" />
                </div>
                <div className="space-y-2">
                <Label htmlFor="password">رمز عبور <span className="text-destructive">*</span></Label>
                <Input id="password" type="password" value={formData.password} onChange={handleChange} required disabled={isLoading} autoComplete="new-password" />
                </div>
            </div>

            <Separator className="my-6"/>
            
            <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
                <div className="flex items-center gap-2 mb-2">
                    <Building className="w-5 h-5 text-muted-foreground"/>
                    <h3 className="font-semibold text-foreground">پیوستن به سازمان (اختیاری)</h3>
                </div>
                 <p className="text-xs text-muted-foreground mb-3">اگر کد دعوت دارید، اینجا وارد کنید تا به تیم خود بپیوندید.</p>
                <div className="space-y-2">
                    <Label htmlFor="invitationCode">کد دعوت</Label>
                    <Input id="invitationCode" value={formData.invitationCode} onChange={handleChange} disabled={isLoading} className="bg-background"/>
                </div>
            </div>

          </CardContent>
          <CardFooter className="flex-col gap-4 mt-4">
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
