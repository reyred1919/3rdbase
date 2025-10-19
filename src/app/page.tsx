import Link from 'next/link';
import { Target, TrendingUp, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Target className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold font-headline text-foreground">ردیاب OKR</h1>
        </div>
        <Button asChild>
          <Link href="/login">ورود به سامانه</Link>
        </Button>
      </header>

      <main className="flex-grow">
        <section className="container mx-auto px-6 py-20 text-center flex flex-col items-center">
          <h2 className="text-4xl md:text-5xl font-bold font-headline text-foreground leading-tight">
            روی اهدافی که واقعا مهم هستند تمرکز کنید
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
            با پلتفرم ردیابی OKR ما، اهداف خود را به نتایج قابل اندازه‌گیری تبدیل کنید، تیم خود را همسو سازید و پیشرفت را به صورت شفاف دنبال کنید.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/login">شروع کنید</Link>
          </Button>
           <Image 
            src="/images/hero-800x400.jpg"
            alt="نمایی از داشبورد برنامه"
            width={800}
            height={400}
            className="mt-12 rounded-lg shadow-2xl"
            data-ai-hint="داشبورد نمودار"
          />
        </section>

        <section className="bg-muted py-20">
          <div className="container mx-auto px-6">
            <h3 className="text-3xl font-bold text-center mb-12">چرا ردیاب OKR؟</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardHeader className="items-center">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Target className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>تمرکز و همسویی</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">با تعیین اهداف شفاف، تمام تیم را در یک جهت هماهنگ کنید.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="items-center">
                   <div className="p-3 bg-primary/10 rounded-full">
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>پیگیری شفاف پیشرفت</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">پیشرفت را با نتایج کلیدی قابل اندازه‌گیری دنبال کرده و مشکلات را به سرعت شناسایی کنید.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="items-center">
                   <div className="p-3 bg-primary/10 rounded-full">
                    <CheckCircle className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>دستیابی به نتایج</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">فرهنگ نتیجه‌گرایی را در سازمان خود تقویت کرده و به اهداف بزرگ دست پیدا کنید.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-card border-t py-6">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p>ردیاب OKR &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
