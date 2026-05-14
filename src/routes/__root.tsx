import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-black">404</h1>
        <h2 className="mt-4 text-xl font-bold uppercase tracking-wide">Strona nie znaleziona</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ta strona nie istnieje lub została przeniesiona.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center brutal-border brutal-shadow bg-primary px-4 py-2 text-sm font-bold uppercase text-primary-foreground transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
          >
            Wróć na pulpit
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-black uppercase">Błąd ładowania</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 inline-flex brutal-border brutal-shadow bg-primary px-4 py-2 text-sm font-bold uppercase text-primary-foreground"
        >
          Spróbuj ponownie
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "EKO-LOG — Harmonogram odbiorów odpadów" },
      { name: "description", content: "Profesjonalny kalendarz wywozu odpadów dla mieszkańców i firm." },
      { name: "author", content: "EKO-LOG" },
      { property: "og:title", content: "EKO-LOG — Harmonogram odbiorów" },
      { property: "og:description", content: "Profesjonalny kalendarz wywozu odpadów." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background text-foreground">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header
              data-print-hide
              className="h-14 flex items-center gap-3 border-b-2 border-border bg-card px-3"
            >
              <SidebarTrigger className="brutal-border brutal-shadow-sm bg-primary text-primary-foreground hover:bg-primary/90" />
              <div className="flex items-baseline gap-2">
                <span className="font-display text-lg font-black uppercase tracking-tight">EKO-LOG</span>
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  Operations Console
                </span>
              </div>
            </header>
            <main className="flex-1 min-w-0">
              <Outlet />
            </main>
          </div>
        </div>
        <Toaster />
      </SidebarProvider>
    </QueryClientProvider>
  );
}
