CREATE OR REPLACE FUNCTION public.handle_new_client_role()
RETURNS TRIGGER AS $$
DECLARE
    _user_id uuid;
    _full_name text;
    _email text;
    _phone text;
    _cpf text;
    _tenant_id uuid;
BEGIN
    -- Check if the inserted role is 'client'
    IF NEW.role = 'client' THEN
        -- Get user and profile information
        SELECT
            p.full_name,
            p.email,
            p.phone,
            p.cpf,
            p.tenant_id INTO _full_name, _email, _phone, _cpf, _tenant_id
        FROM public.profiles p
        WHERE p.user_id = NEW.user_id;

        -- Insert into clients table
        INSERT INTO public.clients (user_id, full_name, email, phone, cpf, tenant_id)
        VALUES (NEW.user_id, _full_name, _email, _phone, _cpf, _tenant_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_role_assigned_create_client
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.handle_new_client_role();
