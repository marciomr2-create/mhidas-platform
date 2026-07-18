BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL check_function_bodies = on;

DO $mhidas_prerequisite_preflight$
BEGIN
  IF to_regprocedure('public.mhidas_is_useclubbers_admin_v1(uuid)') IS NOT NULL
     OR to_regprocedure('public.mhidas_verify_detached_signature_v1(text,text,text,text)') IS NOT NULL
     OR to_regprocedure('public.mhidas_verify_detached_signature_with_key_hash_v1(text,text,text,text,text,text)') IS NOT NULL
     OR to_regprocedure('public.mhidas_decrypt_verified_url_envelope_v1(text,text,text)') IS NOT NULL THEN
    RAISE EXCEPTION 'MHIDAS_TICKET_SECURITY_PREREQUISITE_ALREADY_EXISTS_V1';
  END IF;
END;
$mhidas_prerequisite_preflight$;

CREATE FUNCTION public.mhidas_is_useclubbers_admin_v1(
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog
AS $mhidas_admin_fail_closed$
  SELECT false;
$mhidas_admin_fail_closed$;

CREATE FUNCTION public.mhidas_verify_detached_signature_v1(
  p_key_id text,
  p_algorithm text,
  p_payload text,
  p_signature text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog
AS $mhidas_signature_fail_closed$
  SELECT false;
$mhidas_signature_fail_closed$;

CREATE FUNCTION public.mhidas_verify_detached_signature_with_key_hash_v1(
  p_key_id text,
  p_algorithm text,
  p_key_hash text,
  p_fingerprint_hash text,
  p_payload text,
  p_signature text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog
AS $mhidas_signature_hash_fail_closed$
  SELECT false;
$mhidas_signature_hash_fail_closed$;

CREATE FUNCTION public.mhidas_decrypt_verified_url_envelope_v1(
  p_ciphertext text,
  p_key_id text,
  p_mac text
)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = pg_catalog
AS $mhidas_decrypt_fail_closed$
BEGIN
  RAISE EXCEPTION
    USING
      ERRCODE = 'P0001',
      MESSAGE = 'MHIDAS_URL_ENVELOPE_DECRYPTION_BACKEND_NOT_CONFIGURED_V1';
END;
$mhidas_decrypt_fail_closed$;

REVOKE ALL ON FUNCTION public.mhidas_is_useclubbers_admin_v1(uuid)
FROM PUBLIC;

REVOKE ALL ON FUNCTION public.mhidas_verify_detached_signature_v1(
  text,
  text,
  text,
  text
)
FROM PUBLIC;

REVOKE ALL ON FUNCTION public.mhidas_verify_detached_signature_with_key_hash_v1(
  text,
  text,
  text,
  text,
  text,
  text
)
FROM PUBLIC;

REVOKE ALL ON FUNCTION public.mhidas_decrypt_verified_url_envelope_v1(
  text,
  text,
  text
)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.mhidas_is_useclubbers_admin_v1(uuid)
TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.mhidas_verify_detached_signature_v1(
  text,
  text,
  text,
  text
)
TO service_role;

GRANT EXECUTE ON FUNCTION public.mhidas_verify_detached_signature_with_key_hash_v1(
  text,
  text,
  text,
  text,
  text,
  text
)
TO service_role;

GRANT EXECUTE ON FUNCTION public.mhidas_decrypt_verified_url_envelope_v1(
  text,
  text,
  text
)
TO service_role;

COMMENT ON FUNCTION public.mhidas_is_useclubbers_admin_v1(uuid)
IS 'MHIDAS fail-closed adapter: returns false until the real server-controlled admin authority is installed.';

COMMENT ON FUNCTION public.mhidas_verify_detached_signature_v1(
  text,
  text,
  text,
  text
)
IS 'MHIDAS fail-closed adapter: rejects every signature until the real verification backend is installed.';

COMMENT ON FUNCTION public.mhidas_verify_detached_signature_with_key_hash_v1(
  text,
  text,
  text,
  text,
  text,
  text
)
IS 'MHIDAS fail-closed adapter: rejects every key-bound signature until the real verification backend is installed.';

COMMENT ON FUNCTION public.mhidas_decrypt_verified_url_envelope_v1(
  text,
  text,
  text
)
IS 'MHIDAS fail-closed adapter: raises an explicit not-configured error until the real decryption backend is installed.';

COMMIT;
