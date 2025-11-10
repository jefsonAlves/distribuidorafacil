import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Flame, 
  Home, 
  Truck, 
  Clock, 
  MessageCircle, 
  Lock, 
  Scale,
  Instagram,
  Facebook,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const LandingPage = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Verificar se o usuário está autenticado
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAction = (action: 'pedido' | 'saiba-mais') => {
    // Sempre redirecionar para login quando clicar em "Fazer Pedido" ou "Pedidos"
    if (action === 'pedido') {
      navigate("/auth/login");
    } else {
      // Para "Saiba Mais", fazer scroll suave para a seção de serviços
      const servicosSection = document.getElementById('servicos');
      if (servicosSection) {
        servicosSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#EF5350] to-[#E53935] flex items-center justify-center shadow-lg">
              <Flame className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-[#333333] tracking-tight">
              Chaski Gas
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#empresa" className="text-[#333333] hover:text-[#EF5350] transition-colors duration-300 font-medium">Empresa</a>
            <a href="#produtos" className="text-[#333333] hover:text-[#EF5350] transition-colors duration-300 font-medium">Produtos</a>
            <a href="#servicos" className="text-[#333333] hover:text-[#EF5350] transition-colors duration-300 font-medium">Serviços</a>
            <a href="#contato" className="text-[#333333] hover:text-[#EF5350] transition-colors duration-300 font-medium">Contato</a>
          </nav>

          <Button 
            onClick={() => handleAction('pedido')}
            className="bg-[#EF5350] hover:bg-[#E53935] text-white shadow-md hover:shadow-lg transition-all duration-300 rounded-xl px-6"
          >
            Pedidos
          </Button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="pt-32 pb-24 px-4 bg-gradient-to-b from-[#EF5350]/10 via-white to-white relative overflow-hidden">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Texto */}
            <div className="space-y-8 animate-fade-in">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#333333] leading-tight">
                Distribuímos Gás com<br />
                <span className="text-[#EF5350]">Segurança e Rapidez</span>
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed">
                Faça seu pedido agora mesmo e receba em casa com toda a segurança e qualidade que você merece.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  onClick={() => handleAction('pedido')}
                  className="bg-[#EF5350] hover:bg-[#E53935] text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-8 py-6 text-lg font-semibold"
                >
                  Fazer Pedido
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => handleAction('saiba-mais')}
                  className="border-2 border-[#EF5350] text-[#EF5350] hover:bg-[#EF5350] hover:text-white transition-all duration-300 rounded-2xl px-8 py-6 text-lg font-semibold"
                >
                  Saiba Mais
                </Button>
              </div>
            </div>

            {/* Imagem do Botijão */}
            <div className="relative animate-fade-in-delay">
              <div className="relative z-10 flex justify-center">
                <div className="h-96 w-96 rounded-full bg-gradient-to-br from-[#EF5350]/20 to-[#E53935]/10 flex items-center justify-center shadow-2xl">
                  <div className="h-80 w-80 rounded-full bg-gradient-to-br from-[#EF5350]/30 to-[#E53935]/20 flex items-center justify-center">
                    <Flame className="h-48 w-48 text-[#EF5350] drop-shadow-2xl" />
                  </div>
                </div>
              </div>
              {/* Decoração de fundo */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] bg-[#EF5350]/5 rounded-full blur-3xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVIÇOS */}
      <section id="servicos" className="py-20 px-4 bg-[#F9FAFB]">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-[#333333] mb-16">
            Nossos Serviços
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Entrega em Domicílio */}
            <Card className="p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border-0">
              <div className="h-16 w-16 rounded-2xl bg-[#EF5350]/10 flex items-center justify-center mb-6">
                <Home className="h-8 w-8 text-[#EF5350]" />
              </div>
              <h3 className="text-2xl font-bold text-[#333333] mb-3">Entrega em Domicílio</h3>
              <p className="text-gray-600 leading-relaxed">Rápida e segura, levamos até você com toda a comodidade.</p>
            </Card>

            {/* Gás Envasado */}
            <Card className="p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border-0">
              <div className="h-16 w-16 rounded-2xl bg-[#264653]/10 flex items-center justify-center mb-6">
                <Flame className="h-8 w-8 text-[#264653]" />
              </div>
              <h3 className="text-2xl font-bold text-[#333333] mb-3">Gás Envasado</h3>
              <p className="text-gray-600 leading-relaxed">5kg, 10kg, 15kg, 45kg - Todos os tamanhos disponíveis.</p>
            </Card>

            {/* Gás a Granel */}
            <Card className="p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border-0">
              <div className="h-16 w-16 rounded-2xl bg-[#EF5350]/10 flex items-center justify-center mb-6">
                <Truck className="h-8 w-8 text-[#EF5350]" />
              </div>
              <h3 className="text-2xl font-bold text-[#333333] mb-3">Gás a Granel</h3>
              <p className="text-gray-600 leading-relaxed">Ideal para restaurantes e comércios com maior demanda.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* POR QUE ESCOLHER */}
      <section id="empresa" className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Lado Esquerdo - Imagem */}
            <div className="relative">
              <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="h-96 bg-gradient-to-br from-[#EF5350]/20 to-[#264653]/20 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="h-32 w-32 rounded-full bg-white/80 mx-auto flex items-center justify-center shadow-lg">
                      <MessageCircle className="h-16 w-16 text-[#EF5350]" />
                    </div>
                    <p className="text-lg font-semibold text-[#333333]">Equipe Dedicada</p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 h-64 w-64 bg-[#EF5350]/5 rounded-full blur-3xl"></div>
            </div>

            {/* Lado Direito - Benefícios */}
            <div className="space-y-12">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-[#333333] mb-4">
                  Por que escolher<br />
                  <span className="text-[#EF5350]">Chaski Gas?</span>
                </h2>
                <p className="text-lg text-gray-600">
                  Somos especialistas em distribuição de gás com compromisso com a qualidade e segurança.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Pontualidade */}
                <div className="space-y-3 group">
                  <div className="h-14 w-14 rounded-2xl bg-[#EF5350]/10 flex items-center justify-center group-hover:bg-[#EF5350] transition-all duration-300">
                    <Clock className="h-7 w-7 text-[#EF5350] group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="text-xl font-bold text-[#333333]">Pontualidade</h3>
                  <p className="text-gray-600 text-sm">Entrega no horário combinado</p>
                </div>

                {/* Trato Amável */}
                <div className="space-y-3 group">
                  <div className="h-14 w-14 rounded-2xl bg-[#EF5350]/10 flex items-center justify-center group-hover:bg-[#EF5350] transition-all duration-300">
                    <MessageCircle className="h-7 w-7 text-[#EF5350] group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="text-xl font-bold text-[#333333]">Trato Amável</h3>
                  <p className="text-gray-600 text-sm">Atendimento de excelência</p>
                </div>

                {/* Stock Permanente */}
                <div className="space-y-3 group">
                  <div className="h-14 w-14 rounded-2xl bg-[#EF5350]/10 flex items-center justify-center group-hover:bg-[#EF5350] transition-all duration-300">
                    <Lock className="h-7 w-7 text-[#EF5350] group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="text-xl font-bold text-[#333333]">Stock Permanente</h3>
                  <p className="text-gray-600 text-sm">Sempre disponível</p>
                </div>

                {/* Peso Exato */}
                <div className="space-y-3 group">
                  <div className="h-14 w-14 rounded-2xl bg-[#EF5350]/10 flex items-center justify-center group-hover:bg-[#EF5350] transition-all duration-300">
                    <Scale className="h-7 w-7 text-[#EF5350] group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="text-xl font-bold text-[#333333]">Peso Exato</h3>
                  <p className="text-gray-600 text-sm">Garantia de qualidade</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUTOS */}
      <section id="produtos" className="py-20 px-4 bg-[#F9FAFB]">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-[#333333] mb-16">
            Nossos Produtos
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 5kg */}
            <Card className="p-6 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border-0 text-center group cursor-pointer">
              <div className="h-32 w-32 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Flame className="h-16 w-16 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-[#333333] mb-2">5kg</h3>
              <p className="text-gray-600 text-sm">Ideal para uso doméstico</p>
            </Card>

            {/* 10kg */}
            <Card className="p-6 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border-0 text-center group cursor-pointer">
              <div className="h-32 w-32 rounded-full bg-gradient-to-br from-green-100 to-green-200 mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Flame className="h-16 w-16 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-[#333333] mb-2">10kg</h3>
              <p className="text-gray-600 text-sm">Perfeito para famílias</p>
            </Card>

            {/* 15kg */}
            <Card className="p-6 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border-0 text-center group cursor-pointer">
              <div className="h-32 w-32 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Flame className="h-16 w-16 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold text-[#333333] mb-2">15kg</h3>
              <p className="text-gray-600 text-sm">Mais popular</p>
            </Card>

            {/* 45kg */}
            <Card className="p-6 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border-0 text-center group cursor-pointer">
              <div className="h-32 w-32 rounded-full bg-gradient-to-br from-[#EF5350]/20 to-[#E53935]/20 mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Flame className="h-16 w-16 text-[#EF5350]" />
              </div>
              <h3 className="text-2xl font-bold text-[#333333] mb-2">45kg</h3>
              <p className="text-gray-600 text-sm">Para comércios</p>
            </Card>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contato" className="bg-[#222222] text-white py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            {/* Logo e Descrição */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#EF5350] to-[#E53935] flex items-center justify-center">
                  <Flame className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold">Chaski Gas</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Distribuindo gás com segurança e qualidade desde sempre. Seu conforto é nossa prioridade.
              </p>
            </div>

            {/* Links Rápidos */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold mb-4">Links Rápidos</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#empresa" className="text-gray-400 hover:text-[#EF5350] transition-colors duration-300">Empresa</a>
                </li>
                <li>
                  <a href="#produtos" className="text-gray-400 hover:text-[#EF5350] transition-colors duration-300">Produtos</a>
                </li>
                <li>
                  <a href="#servicos" className="text-gray-400 hover:text-[#EF5350] transition-colors duration-300">Serviços</a>
                </li>
                <li>
                  <button 
                    onClick={() => navigate("/auth/login")}
                    className="text-gray-400 hover:text-[#EF5350] transition-colors duration-300"
                  >
                    Login
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate("/auth/register")}
                    className="text-gray-400 hover:text-[#EF5350] transition-colors duration-300"
                  >
                    Cadastre-se
                  </button>
                </li>
              </ul>
            </div>

            {/* Contato */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold mb-4">Contato</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-400">
                  <Phone className="h-5 w-5" />
                  <span>(11) 9999-9999</span>
                </li>
                <li className="flex items-center gap-3 text-gray-400">
                  <Mail className="h-5 w-5" />
                  <span>contato@chaskigas.com</span>
                </li>
                <li className="flex items-center gap-3 text-gray-400">
                  <MapPin className="h-5 w-5" />
                  <span>São Paulo, SP</span>
                </li>
              </ul>
              
              {/* Redes Sociais */}
              <div className="flex gap-4 pt-4">
                <a 
                  href="#" 
                  className="h-10 w-10 rounded-full bg-white/10 hover:bg-[#EF5350] flex items-center justify-center transition-all duration-300"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a 
                  href="#" 
                  className="h-10 w-10 rounded-full bg-white/10 hover:bg-[#EF5350] flex items-center justify-center transition-all duration-300"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a 
                  href="#" 
                  className="h-10 w-10 rounded-full bg-white/10 hover:bg-[#EF5350] flex items-center justify-center transition-all duration-300"
                  aria-label="WhatsApp"
                >
                  <Phone className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>

          {/* Linha Inferior */}
          <div className="pt-8 border-t border-gray-700 text-center text-gray-400">
            <p>© 2025 Chaski Gas. Todos os direitos reservados.</p>
            <p className="mt-2">Telefone: (11) 9999-9999</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;