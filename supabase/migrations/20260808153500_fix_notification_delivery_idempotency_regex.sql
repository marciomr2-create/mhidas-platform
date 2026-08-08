begin;

alter table public.notification_deliveries
    drop constraint if exists notification_deliveries_idempotency_key_check;

alter table public.notification_deliveries
    add constraint notification_deliveries_idempotency_key_check
    check (
        idempotency_key = lower(btrim(idempotency_key))
        and char_length(idempotency_key) between 8 and 320
        and idempotency_key ~ '^[a-z0-9][a-z0-9:_./-]*$'
    );

commit;