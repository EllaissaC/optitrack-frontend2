import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { useLocation } from "wouter";

export interface AuthClinic {
  id: string;
  clinicName: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string | null;
  role: "admin" | "optician" | "staff";
  isActive: boolean;
  clinicId: string | null;
  clinic: AuthClinic | null;
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
  };
}

export function useLogin() {
  const [, navigate] = useLocation();
  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });
      navigate("/home");
    },
  });
}

export function useLogout() {
  const [, navigate] = useLocation();
  return useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      navigate("/login");
    },
  });
}
