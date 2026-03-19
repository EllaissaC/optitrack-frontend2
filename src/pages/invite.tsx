import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Package, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";

const acceptSchema = z.object({
  username: z.string().min(2, "Display name must be at least 2 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type AcceptValues = z.infer<typeof acceptSchema>;

export default function Invite() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token") || "";
  const [, navigate] = useLocation();

  const { data: inviteInfo, isLoading: infoLoading, error: infoError } = useQuery<{ email: string; role: string }>({
    queryKey: ["/api/auth/invite", token],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!token,
    retry: false,
  });

  const accept = useMutation({
    mutationFn: async (data: AcceptValues) => {
      const res = await apiRequest("POST", "/api/auth/accept-invite", {
        token,
        username: data.username,
        password: data.password,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      navigate("/");
    },
  });

  const form = useForm<AcceptValues>({
    resolver: zodResolver(acceptSchema),
    defaultValues: { username: "", password: "", confirmPassword: "" },
  });

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm border-border">
          <CardContent className="pt-6 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
            <p className="text-sm text-muted-foreground">No invite token found in this link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (infoLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <p className="text-sm text-muted-foreground">Validating invite link...</p>
      </div>
    );
  }

  if (infoError || !inviteInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm border-border">
          <CardContent className="pt-6 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
            <p className="font-medium text-foreground">Invalid or expired invite</p>
            <p className="text-sm text-muted-foreground">This invite link may have already been used or has expired. Please request a new invite from an administrator.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Package className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">OptiTrack</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Accept your invitation</p>
          </div>
        </div>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Set up your account</CardTitle>
            <CardDescription className="space-y-1">
              <span>Joining as </span>
              <span className="font-medium text-foreground">{inviteInfo.email}</span>
              {" "}
              <Badge variant="secondary" className="text-xs">{inviteInfo.role}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => accept.mutate(v))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Your name" data-testid="input-invite-username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="••••••••" data-testid="input-invite-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="••••••••" data-testid="input-invite-confirm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {accept.error && (
                  <p className="text-sm text-destructive">
                    {(accept.error as Error).message.replace(/^\d+:\s*/, "")}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={accept.isPending} data-testid="button-invite-submit">
                  {accept.isPending ? "Setting up account..." : "Create account & sign in"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
