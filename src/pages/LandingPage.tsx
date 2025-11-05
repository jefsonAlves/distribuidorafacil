import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Droplets, Flame, Shield, Truck, Clock, MapPin } from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              DeliveryPro
            </span>
          </div>
          <Button onClick={() => navigate("/auth/login")} variant="default">
            Entrar
          </Button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-gradient-hero shadow-glow mb-6 animate-bounce">
            <Droplets className="h-10 w-10 text-white" />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              Água e Gás
            </span>
            <br />
            na Porta da Sua Casa
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Entrega rápida e segura de água mineral e gás. Peça pelo app e acompanhe em tempo real.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="gradient-hero shadow-glow hover:shadow-xl transition-smooth"
              onClick={() => navigate("/auth/register")}
            >
              Fazer Pedido
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/auth/register")}
            >
              Cadastrar Empresa
            </Button>
          </div>
        </div>
      </section>

      {/* PRODUTOS */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Nossos Produtos</h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-6 hover:shadow-lg transition-smooth hover:-translate-y-1 cursor-pointer">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <Droplets className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold text-center mb-3">Água Mineral</h3>
              <p className="text-muted-foreground text-center mb-4">
                Garrafões de 20L de água mineral pura e cristalina
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Certificada e filtrada</span>
                </li>
                <li className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  <span>Entrega rápida</span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Disponível 24/7</span>
                </li>
              </ul>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-smooth hover:-translate-y-1 cursor-pointer">
              <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mb-4 mx-auto">
                <Flame className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-2xl font-semibold text-center mb-3">Gás de Cozinha</h3>
              <p className="text-muted-foreground text-center mb-4">
                Botijas P13 com garantia de qualidade e segurança
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-accent" />
                  <span>Certificado Inmetro</span>
                </li>
                <li className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-accent" />
                  <span>Troca facilitada</span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-accent" />
                  <span>Emergência 24h</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Por Que Escolher a DeliveryPro?</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 text-center">
              <MapPin className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Rastreamento em Tempo Real</h3>
              <p className="text-sm text-muted-foreground">
                Acompanhe seu pedido desde a saída até a entrega
              </p>
            </Card>

            <Card className="p-6 text-center">
              <Clock className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Entrega Rápida</h3>
              <p className="text-sm text-muted-foreground">
                Receba seus produtos em até 2 horas
              </p>
            </Card>

            <Card className="p-6 text-center">
              <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Pagamento Seguro</h3>
              <p className="text-sm text-muted-foreground">
                Cartão, Pix ou dinheiro. Você escolhe!
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-card border-t py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center md:text-left">
            <div>
              <div className="flex items-center gap-2 justify-center md:justify-start mb-4">
                <Droplets className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">DeliveryPro</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Delivery de água e gás com qualidade e agilidade
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Links Rápidos</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate("/auth/register")} className="hover:text-primary">Cadastre-se</button></li>
                <li><button onClick={() => navigate("/auth/login")} className="hover:text-primary">Entrar</button></li>
                <li><button className="hover:text-primary">Sobre Nós</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Contato</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>WhatsApp: (11) 9999-9999</li>
                <li>Email: contato@deliverypro.com</li>
                <li>Horário: 24h por dia</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            © 2025 DeliveryPro. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;