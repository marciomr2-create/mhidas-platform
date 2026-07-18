BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL check_function_bodies = on;

DO $mhidas_pgcrypto_namespace_compatibility$
DECLARE
  v_pgcrypto_schema text;
BEGIN
  SELECT n.nspname
  INTO v_pgcrypto_schema
  FROM pg_extension e
  JOIN pg_namespace n
    ON n.oid = e.extnamespace
  WHERE e.extname = 'pgcrypto';

  IF v_pgcrypto_schema IS NULL THEN
    RAISE EXCEPTION 'MHIDAS_PGCRYPTO_EXTENSION_MISSING_V1';
  END IF;

  IF v_pgcrypto_schema = 'public' THEN
    IF to_regprocedure('public.digest(text,text)') IS NULL
       OR to_regprocedure('public.hmac(text,text,text)') IS NULL THEN
      RAISE EXCEPTION
        'MHIDAS_PGCRYPTO_PUBLIC_FUNCTION_CONTRACT_MISSING_V1';
    END IF;

    RETURN;
  END IF;

  IF v_pgcrypto_schema <> 'extensions' THEN
    RAISE EXCEPTION
      'MHIDAS_PGCRYPTO_UNSUPPORTED_SCHEMA_V1:%',
      v_pgcrypto_schema;
  END IF;

  IF to_regprocedure('extensions.digest(text,text)') IS NULL
     OR to_regprocedure('extensions.hmac(text,text,text)') IS NULL THEN
    RAISE EXCEPTION
      'MHIDAS_PGCRYPTO_EXTENSIONS_FUNCTION_CONTRACT_MISSING_V1';
  END IF;

  IF to_regprocedure('public.digest(text,text)') IS NOT NULL
     OR to_regprocedure('public.hmac(text,text,text)') IS NOT NULL THEN
    RAISE EXCEPTION
      'MHIDAS_PGCRYPTO_PUBLIC_COMPATIBILITY_DRIFT_V1';
  END IF;

  EXECUTE $create_digest$
    CREATE FUNCTION public.digest(
      p_data text,
      p_algorithm text
    )
    RETURNS bytea
    LANGUAGE sql
    IMMUTABLE
    STRICT
    PARALLEL SAFE
    SET search_path = pg_catalog, extensions
    AS $digest_body$
      SELECT extensions.digest(p_data, p_algorithm);
    $digest_body$;
  $create_digest$;

  EXECUTE $create_hmac$
    CREATE FUNCTION public.hmac(
      p_data text,
      p_key text,
      p_algorithm text
    )
    RETURNS bytea
    LANGUAGE sql
    IMMUTABLE
    STRICT
    PARALLEL SAFE
    SET search_path = pg_catalog, extensions
    AS $hmac_body$
      SELECT extensions.hmac(p_data, p_key, p_algorithm);
    $hmac_body$;
  $create_hmac$;

  EXECUTE
    'REVOKE ALL ON FUNCTION public.digest(text,text) ' ||
    'FROM PUBLIC, anon, authenticated, service_role';

  EXECUTE
    'REVOKE ALL ON FUNCTION public.hmac(text,text,text) ' ||
    'FROM PUBLIC, anon, authenticated, service_role';

  EXECUTE
    $comment_digest$
      COMMENT ON FUNCTION public.digest(text,text)
      IS 'MHIDAS pgcrypto namespace compatibility adapter. Delegates to extensions.digest and is callable only by its owner.';
    $comment_digest$;

  EXECUTE
    $comment_hmac$
      COMMENT ON FUNCTION public.hmac(text,text,text)
      IS 'MHIDAS pgcrypto namespace compatibility adapter. Delegates to extensions.hmac and is callable only by its owner.';
    $comment_hmac$;
END;
$mhidas_pgcrypto_namespace_compatibility$;

DO $mhidas_pgcrypto_namespace_compatibility_postflight$
DECLARE
  v_pgcrypto_schema text;
  v_digest_definition text;
  v_hmac_definition text;
BEGIN
  SELECT n.nspname
  INTO v_pgcrypto_schema
  FROM pg_extension e
  JOIN pg_namespace n
    ON n.oid = e.extnamespace
  WHERE e.extname = 'pgcrypto';

  IF to_regprocedure('public.digest(text,text)') IS NULL
     OR to_regprocedure('public.hmac(text,text,text)') IS NULL THEN
    RAISE EXCEPTION
      'MHIDAS_PGCRYPTO_PUBLIC_COMPATIBILITY_POSTFLIGHT_MISSING_V1';
  END IF;

  IF v_pgcrypto_schema = 'extensions' THEN
    SELECT pg_get_functiondef(
      to_regprocedure('public.digest(text,text)')
    )
    INTO v_digest_definition;

    SELECT pg_get_functiondef(
      to_regprocedure('public.hmac(text,text,text)')
    )
    INTO v_hmac_definition;

    IF position('extensions.digest' IN v_digest_definition) = 0
       OR position('extensions.hmac' IN v_hmac_definition) = 0 THEN
      RAISE EXCEPTION
        'MHIDAS_PGCRYPTO_PUBLIC_COMPATIBILITY_DELEGATION_INVALID_V1';
    END IF;

    IF has_function_privilege(
         'anon',
         'public.digest(text,text)',
         'EXECUTE'
       )
       OR has_function_privilege(
         'authenticated',
         'public.digest(text,text)',
         'EXECUTE'
       )
       OR has_function_privilege(
         'service_role',
         'public.digest(text,text)',
         'EXECUTE'
       )
       OR has_function_privilege(
         'anon',
         'public.hmac(text,text,text)',
         'EXECUTE'
       )
       OR has_function_privilege(
         'authenticated',
         'public.hmac(text,text,text)',
         'EXECUTE'
       )
       OR has_function_privilege(
         'service_role',
         'public.hmac(text,text,text)',
         'EXECUTE'
       ) THEN
      RAISE EXCEPTION
        'MHIDAS_PGCRYPTO_PUBLIC_COMPATIBILITY_PRIVILEGE_DRIFT_V1';
    END IF;
  END IF;
END;
$mhidas_pgcrypto_namespace_compatibility_postflight$;

COMMIT;
