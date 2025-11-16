INSERT INTO public.clients (user_id, full_name, email, phone, cpf, tenant_id)
SELECT
    ur.user_id,
    p.full_name,
    p.email,
    p.phone,
    p.cpf,
    p.tenant_id
FROM public.user_roles ur
JOIN public.profiles p ON ur.user_id = p.user_id
LEFT JOIN public.clients c ON ur.user_id = c.user_id
WHERE ur.role = 'client' AND c.user_id IS NULL;
