"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

/**
 * Root page (/) - Redirects to appropriate destination
 * - Authenticated users → /mode
 * - Unauthenticated users → /login
 * 
 * This page exists only for redirection. The actual login UI is at /login
 */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    async function redirectBasedOnAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session ?? data;
        if (!mounted) return;
        
        if (session) {
          router.replace('/mode');
        } else {
          router.replace('/login');
        }
      } catch (e) {
        console.error('Error checking auth:', e);
        // On error, redirect to login
        if (mounted) router.replace('/login');
      }
    }
    redirectBasedOnAuth();
    return () => { mounted = false; };
  }, [router]);

  // Loading state while redirecting
  const pageStyles = {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000016',
    backgroundImage: 'radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)',
    color: '#E6FBFF',
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
  };

  return (
    <main style={pageStyles}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          fontSize: 14, 
          opacity: 0.7,
          animation: 'pulse 2s ease-in-out infinite'
        }}>
          Carregando...
        </div>
      </div>
    </main>
  );
}
