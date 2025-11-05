# Instruções para Configuração do Admin Master

## 🔐 Criar Primeiro Administrador

### Passo 1: Cadastrar o Usuário
1. Acesse a página de registro: `/auth/register`
2. Escolha **"Cliente"** como tipo de cadastro (temporário)
3. Preencha com seus dados:
   - **Email**: O email que você deseja usar como admin (ex: `admin@deliverypro.com`)
   - **Senha**: Escolha uma senha forte (mínimo 6 caracteres)
   - **Nome Completo**: Seu nome
   - **Telefone**: Seu telefone

### Passo 2: Ativar Permissão de Admin Master

Após criar o usuário, você precisa executar uma query no banco de dados para transformá-lo em admin_master:

#### Opção A: Via Lovable Cloud (Backend)
1. Clique no botão "Backend" no canto superior direito do Lovable
2. Vá para "SQL Editor"
3. Execute o seguinte comando:

```sql
SELECT create_admin_master('admin@deliverypro.com', 'Seu Nome Completo');
```

**Substitua**:
- `admin@deliverypro.com` pelo email que você cadastrou
- `Seu Nome Completo` pelo seu nome

#### Opção B: Via Supabase Dashboard (se tiver acesso)
1. Acesse o Supabase Dashboard
2. Vá em "SQL Editor"
3. Execute o mesmo comando acima

### Passo 3: Acessar o Sistema
1. Acesse a página de login admin: `/admin/login`
2. Entre com as credenciais que você criou
3. Pronto! Você terá acesso total ao sistema

---

## 🎯 Funcionalidades do Admin Master

Como admin_master, você tem acesso a:

### 1. Gerenciar Empresas (Tenants)
- Criar novas empresas no sistema
- Ativar/desativar empresas
- Configurar planos e cobrança
- Redefinir senhas de usuários

### 2. Visualizar Logs do Sistema
- Acompanhar todas as ações realizadas
- Auditar mudanças críticas
- Investigar problemas

### 3. Dashboard Central
- Visão geral de todas as empresas
- Estatísticas gerais do sistema
- Monitoramento de atividade

---

## ⚠️ Segurança

### Boas Práticas:
✅ Use uma senha forte e única
✅ Mantenha suas credenciais seguras
✅ Não compartilhe sua conta admin
✅ Faça logout após usar o sistema
✅ Monitore os logs de auditoria regularmente

### Avisos:
❌ Nunca compartilhe a senha do admin
❌ Não use a mesma senha em outros sites
❌ Cuidado ao deletar dados - a ação é irreversível

---

## 🆘 Problemas Comuns

### "Acesso negado" ao tentar fazer login
- Verifique se executou o comando `create_admin_master` corretamente
- Confirme que o email está correto
- Verifique se há um registro na tabela `user_roles` com `role = 'admin_master'`

### Esqueceu a senha?
Execute no SQL Editor:
```sql
-- Isso irá enviar um email de recuperação
-- Substitua pelo seu email
```

### Como adicionar outro admin?
Execute novamente a função `create_admin_master` com o email do novo admin.

---

## 📞 Suporte

Em caso de dúvidas ou problemas:
- Verifique os logs do sistema
- Consulte a documentação técnica
- Entre em contato com o suporte técnico

---

**Última atualização**: Janeiro 2025
