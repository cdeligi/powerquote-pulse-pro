alter table public.quotes
  add column if not exists additional_quote_information text;
