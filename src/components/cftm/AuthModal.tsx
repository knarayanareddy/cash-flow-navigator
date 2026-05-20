import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, MailCheck, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: Props) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
          data: { company, full_name: "" },
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      toast.error("Couldn't send magic link", { description: err.message });
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setSent(false);
    setEmail("");
    setCompany("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setTimeout(reset, 200);
      }}
    >
      <DialogContent className="max-w-md border-white/10 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-lg font-semibold tracking-tight">
            {sent ? "Check your email" : "Sign in to save scenarios"}
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            {sent
              ? `We sent a magic link to ${email}. Click it to sign in — you'll come back here automatically.`
              : "Passwordless sign-in via magic link. We'll save your work to your account."}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex flex-col items-center gap-4 py-2"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-positive/15">
                <MailCheck className="h-8 w-8 text-positive" />
              </div>
              <Button variant="ghost" size="sm" onClick={reset} className="text-xs text-muted-foreground">
                Use a different email
              </Button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={send}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cfo@yourcompany.com"
                  className="bg-white/[0.04]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company" className="text-xs">Company name</Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Inc."
                  className="bg-white/[0.04]"
                />
              </div>
              <Button type="submit" disabled={sending} className="w-full gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Send Magic Link
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                By continuing you agree we may email you a one-time sign-in link.
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
