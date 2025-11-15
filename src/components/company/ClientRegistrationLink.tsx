import { useEffect, useState } from "react";
import { Copy, Share2, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ClientRegistrationLinkProps {
  tenantId: string;
}

export const ClientRegistrationLink = ({ tenantId }: ClientRegistrationLinkProps) => {
  const [slug, setSlug] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchTenantSlug = async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("slug")
        .eq("id", tenantId)
        .single();

      if (!error && data?.slug) {
        setSlug(data.slug);
      }
    };

    fetchTenantSlug();
  }, [tenantId]);

  const registrationLink = `${window.location.origin}/auth/register?company=${slug}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(registrationLink);
      setCopied(true);
      toast.success("Link copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Erro ao copiar link");
    }
  };

  if (!slug) return null;

  return (
    <Card className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          <CardTitle className="text-white">Link de Cadastro de Clientes</CardTitle>
        </div>
        <CardDescription className="text-primary-foreground/90">
          Compartilhe este link para seus clientes se cadastrarem e fazerem pedidos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/20">
          <code className="text-sm text-white break-all">
            {registrationLink}
          </code>
        </div>
        <Button 
          onClick={copyToClipboard}
          className="w-full bg-white text-primary hover:bg-white/90 font-semibold"
          size="lg"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Link Copiado!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copiar Link
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
