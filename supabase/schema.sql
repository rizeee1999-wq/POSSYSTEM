-- ============================================================================
-- POS App — Supabase (Postgres) schema
-- Run this in Supabase Dashboard → SQL Editor (once, on a fresh project).
-- ============================================================================

-- ---------- Tables ----------------------------------------------------------

create table if not exists categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  price numeric(12,2) not null check (price >= 0),
  category_id bigint references categories(id) on delete set null,
  image_url text,
  stock integer not null default 0 check (stock >= 0),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_published on products(published);

-- A sale = one checkout / register transaction rung up by an admin.
create table if not exists sales (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users(id),
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- Line items for a sale. We snapshot product_name/unit_price so historical
-- receipts stay accurate even if the product is later edited or deleted.
create table if not exists sale_items (
  id bigint generated always as identity primary key,
  sale_id bigint not null references sales(id) on delete cascade,
  product_id bigint references products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  line_total numeric(12,2) not null
);

create index if not exists idx_sale_items_sale on sale_items(sale_id);

-- ---------- updated_at trigger ----------------------------------------------

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
before update on products
for each row execute function set_updated_at();

-- ---------- Row Level Security ------------------------------------------------
-- Public/anon visitors (the client catalog) may only ever READ published
-- products and categories. Any logged-in Supabase user (i.e. an admin you
-- create in Supabase Auth) gets full read/write access to everything.
-- There is no separate "client account" — the client site is public.

alter table categories enable row level security;
alter table products enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;

create policy "public read categories" on categories
  for select using (true);

create policy "admin full access categories" on categories
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read published products" on products
  for select using (published = true);

create policy "admin full access products" on products
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "admin full access sales" on sales
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "admin full access sale_items" on sale_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------- Checkout function ------------------------------------------------
-- Atomically: create the sale row, create one sale_items row per cart line,
-- and decrement stock — all in one transaction so a half-finished sale can
-- never leave stock counts wrong. Called from the backend as the logged-in
-- admin, via supabase.rpc('create_sale', { items }).
--
-- items shape: [{ "product_id": 1, "quantity": 2 }, ...]

create or replace function create_sale(items jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id bigint;
  v_total numeric(12,2) := 0;
  v_item jsonb;
  v_product products%rowtype;
  v_qty integer;
  v_line_total numeric(12,2);
begin
  if items is null or jsonb_array_length(items) = 0 then
    raise exception 'Cart is empty';
  end if;

  insert into sales (admin_id, total) values (auth.uid(), 0)
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(items)
  loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity in cart';
    end if;

    select * into v_product from products
      where id = (v_item->>'product_id')::bigint
      for update; -- lock the row so concurrent sales can't oversell stock

    if v_product.id is null then
      raise exception 'Product % not found', v_item->>'product_id';
    end if;

    if v_product.stock < v_qty then
      raise exception 'Not enough stock for "%": have %, need %', v_product.name, v_product.stock, v_qty;
    end if;

    v_line_total := v_product.price * v_qty;
    v_total := v_total + v_line_total;

    insert into sale_items (sale_id, product_id, product_name, quantity, unit_price, line_total)
    values (v_sale_id, v_product.id, v_product.name, v_qty, v_product.price, v_line_total);

    update products set stock = stock - v_qty where id = v_product.id;
  end loop;

  update sales set total = v_total where id = v_sale_id;

  return v_sale_id;
end;
$$;

grant execute on function create_sale(jsonb) to authenticated;

-- ---------- Optional: a couple of starter categories -------------------------

insert into categories (name)
values ('General'), ('Drinks'), ('Snacks')
on conflict (name) do nothing;
