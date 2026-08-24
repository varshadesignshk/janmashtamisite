-- Per-coordinator WhatsApp templates.
-- Coordinators customise the message their WhatsApp button pre-fills.
-- Two variants: for daily-committed chanters vs everyone else. UTF-8
-- native, so Tamil / Hindi work without any special handling.

ALTER TABLE users ADD COLUMN wa_template_daily TEXT;
ALTER TABLE users ADD COLUMN wa_template_nondaily TEXT;
