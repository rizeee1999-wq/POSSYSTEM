-- ============================================================================
-- Barbershop & Hair Salon POS System — Supabase (Postgres) Schema
-- Run this in Supabase Dashboard → SQL Editor (once, on a fresh or updated project).
-- ============================================================================

-- ---------- Categories --------------------------------------------------------

create table if not exists categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

-- ---------- Barbers & Stylists Staff -----------------------------------------

create table if not exists barbers (
  id bigint generated always as identity primary key,
  name text not null,
  nickname text,
  role text not null default 'barber', -- 'master_barber', 'stylist', 'barber', 'apprentice'
  phone text,
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Services & Retail Products ---------------------------------------

create table if not exists products (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  price numeric(12,2) not null check (price >= 0),
  category_id bigint references categories(id) on delete set null,
  image_url text,
  item_type text not null default 'service' check (item_type in ('service', 'product')),
  duration_min integer not null default 30 check (duration_min >= 0),
  stock integer not null default 0 check (stock >= 0),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_published on products(published);
create index if not exists idx_products_item_type on products(item_type);

-- ---------- Product Stock In / Restock History --------------------------------

create table if not exists product_stock_logs (
  id bigint generated always as identity primary key,
  product_id bigint not null references products(id) on delete cascade,
  quantity_added integer not null check (quantity_added > 0),
  stock_after integer not null check (stock_after >= 0),
  note text,
  added_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_product_stock_logs_product on product_stock_logs(product_id);
create index if not exists idx_product_stock_logs_added_at on product_stock_logs(added_at);

-- ---------- Walk-in & Chair Queue -------------------------------------------

create table if not exists queue_tickets (
  id bigint generated always as identity primary key,
  customer_name text not null,
  customer_phone text,
  barber_id bigint references barbers(id) on delete set null,
  service_id bigint references products(id) on delete set null,
  status text not null default 'waiting' check (status in ('waiting', 'in_chair', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_queue_status on queue_tickets(status);

-- ---------- Sales & Checkout ------------------------------------------------

create table if not exists sales (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users(id),
  customer_name text default 'អតិថិជនទូទៅ (Walk-in)',
  customer_phone text,
  barber_id bigint references barbers(id) on delete set null,
  payment_method text not null default 'cash_usd', -- 'cash_usd', 'cash_khr', 'aba_khqr', 'card'
  subtotal numeric(12,2) not null default 0,
  tip numeric(12,2) not null default 0 check (tip >= 0),
  total numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

-- Line items for a sale.
create table if not exists sale_items (
  id bigint generated always as identity primary key,
  sale_id bigint not null references sales(id) on delete cascade,
  product_id bigint references products(id) on delete set null,
  product_name text not null,
  item_type text not null default 'service',
  barber_id bigint references barbers(id) on delete set null,
  barber_name text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  line_total numeric(12,2) not null
);

create index if not exists idx_sale_items_sale on sale_items(sale_id);
create index if not exists idx_sales_barber on sales(barber_id);
create index if not exists idx_sales_created_at on sales(created_at);

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

drop trigger if exists trg_queue_updated_at on queue_tickets;
create trigger trg_queue_updated_at
before update on queue_tickets
for each row execute function set_updated_at();

-- ---------- Row Level Security ------------------------------------------------

alter table categories enable row level security;
alter table barbers enable row level security;
alter table products enable row level security;
alter table queue_tickets enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;

-- Categories
drop policy if exists "public read categories" on categories;
create policy "public read categories" on categories
  for select using (true);

drop policy if exists "admin full access categories" on categories;
create policy "admin full access categories" on categories
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Barbers
drop policy if exists "public read active barbers" on barbers;
create policy "public read active barbers" on barbers
  for select using (active = true);

drop policy if exists "admin full access barbers" on barbers;
create policy "admin full access barbers" on barbers
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Products / Services
drop policy if exists "public read published products" on products;
create policy "public read published products" on products
  for select using (published = true);

drop policy if exists "admin full access products" on products;
create policy "admin full access products" on products
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Queue tickets
drop policy if exists "admin full access queue" on queue_tickets;
create policy "admin full access queue" on queue_tickets
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Sales & Items
drop policy if exists "admin full access sales" on sales;
create policy "admin full access sales" on sales
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "admin full access sale_items" on sale_items;
create policy "admin full access sale_items" on sale_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Product Stock Logs
alter table product_stock_logs enable row level security;
drop policy if exists "admin full access product_stock_logs" on product_stock_logs;
create policy "admin full access product_stock_logs" on product_stock_logs
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------- Haircut & Salon Checkout function --------------------------------
-- Atomically: creates sale, line items, and decrements stock ONLY for retail products
-- (services do not decrement physical inventory).
--
-- items shape: [{ "product_id": 1, "quantity": 1, "barber_id": 2, "barber_name": "Dara" }]
-- details shape: { "customer_name": "...", "customer_phone": "...", "barber_id": 2, "payment_method": "cash_usd", "tip": 2, "notes": "..." }

create or replace function create_sale(items jsonb, details jsonb default '{}'::jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id bigint;
  v_subtotal numeric(12,2) := 0;
  v_tip numeric(12,2) := coalesce((details->>'tip')::numeric, 0);
  v_total numeric(12,2) := 0;
  v_item jsonb;
  v_product products%rowtype;
  v_qty integer;
  v_line_total numeric(12,2);
  v_barber_id bigint := (details->>'barber_id')::bigint;
  v_item_barber_id bigint;
  v_item_barber_name text;
begin
  if items is null or jsonb_array_length(items) = 0 then
    raise exception 'Cart is empty';
  end if;

  if v_tip < 0 then
    v_tip := 0;
  end if;

  insert into sales (
    admin_id,
    customer_name,
    customer_phone,
    barber_id,
    payment_method,
    subtotal,
    tip,
    total,
    notes
  ) values (
    auth.uid(),
    coalesce(nullif(trim(details->>'customer_name'), ''), 'អតិថិជនទូទៅ (Walk-in)'),
    nullif(trim(details->>'customer_phone'), ''),
    v_barber_id,
    coalesce(nullif(details->>'payment_method', ''), 'cash_usd'),
    0,
    v_tip,
    0,
    nullif(trim(details->>'notes'), '')
  )
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(items)
  loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity in cart';
    end if;

    select * into v_product from products
      where id = (v_item->>'product_id')::bigint
      for update;

    if v_product.id is null then
      raise exception 'Product/Service % not found', v_item->>'product_id';
    end if;

    -- Only check and decrement stock if it is a retail physical product
    if v_product.item_type = 'product' then
      if v_product.stock < v_qty then
        raise exception 'Not enough stock for "%": have %, need %', v_product.name, v_product.stock, v_qty;
      end if;
      update products set stock = stock - v_qty where id = v_product.id;
    end if;

    v_line_total := v_product.price * v_qty;
    v_subtotal := v_subtotal + v_line_total;

    v_item_barber_id := coalesce((v_item->>'barber_id')::bigint, v_barber_id);
    v_item_barber_name := nullif(trim(v_item->>'barber_name'), '');

    insert into sale_items (
      sale_id,
      product_id,
      product_name,
      item_type,
      barber_id,
      barber_name,
      quantity,
      unit_price,
      line_total
    ) values (
      v_sale_id,
      v_product.id,
      v_product.name,
      v_product.item_type,
      v_item_barber_id,
      v_item_barber_name,
      v_qty,
      v_product.price,
      v_line_total
    );
  end loop;

  v_total := v_subtotal + v_tip;

  update sales
  set subtotal = v_subtotal,
      total = v_total
  where id = v_sale_id;

  return v_sale_id;
end;
$$;

grant execute on function create_sale(jsonb, jsonb) to authenticated;

-- Overload for single-arg call
create or replace function create_sale(items jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  return create_sale(items, '{}'::jsonb);
end;
$$;

grant execute on function create_sale(jsonb) to authenticated;

-- ---------- Starter Barbershop & Salon Data ----------------------------------

-- 1. Categories
insert into categories (name)
values 
  ('កាត់សក់ & ផ្លុំសិត (Haircut & Styling)'),
  ('កោរពុកមាត់ & កន្សែងក្តៅ (Shave & Beard)'),
  ('កក់សក់ & ម៉ាស្សាក្បាល (Wash & Massage)'),
  ('ប្តូរពណ៌សក់ & អ៊ុតរួញ (Color & Perm)'),
  ('ផលិតផលសិតសក់ & ថែទាំ (Haircare & Products)')
on conflict (name) do nothing;

-- 2. Barbers & Stylists
insert into barbers (name, nickname, role, phone, active)
values
  ('ដារ៉ា (Dara)', 'Master Barber', 'master_barber', '012 345 678', true),
  ('សុខា', 'ជាងច្នៃម៉ូតសក់', 'stylist', '098 765 432', true),
  ('បូណា', 'ជាងជំនាញកាត់ហ្វេត', 'barber', '088 123 456', true),
  ('វណ្ណៈ', 'ជាងកោរពុកមាត់', 'barber', '077 998 877', true)
on conflict do nothing;

-- 3. Services & Products
insert into products (name, description, price, category_id, item_type, duration_min, stock, published)
select 
  'កាត់សក់បុរសទូទៅ',
  'កាត់សក់ម៉ូតបុរាណ និងទាន់សម័យ សមស្របតាមទម្រង់មុខ រួមទាំងការលាងសំអាតសក់',
  5.00,
  (select id from categories where name like 'កាត់សក់%' limit 1),
  'service',
  30,
  999,
  true
where not exists (select 1 from products where name = 'កាត់សក់បុរសទូទៅ');

insert into products (name, description, price, category_id, item_type, duration_min, stock, published)
select 
  'កាត់សក់ហ្វេត + ផ្លុំសិត',
  'កាត់សក់ម៉ូតហ្វេតច្បាស់ស្អាត ផ្លុំសិតម៉ូត និងលាបក្រមួន',
  7.00,
  (select id from categories where name like 'កាត់សក់%' limit 1),
  'service',
  40,
  999,
  true
where not exists (select 1 from products where name = 'កាត់សក់ហ្វេត + ផ្លុំសិត');

insert into products (name, description, price, category_id, item_type, duration_min, stock, published)
select 
  'កាត់សក់កុមារ',
  'សេវាកាត់សក់កុមារទន់ភ្លន់ និងស្អាតទាន់សម័យ',
  4.00,
  (select id from categories where name like 'កាត់សក់%' limit 1),
  'service',
  25,
  999,
  true
where not exists (select 1 from products where name = 'កាត់សក់កុមារ');

insert into products (name, description, price, category_id, item_type, duration_min, stock, published)
select 
  'កោរពុកមាត់ + កន្សែងក្តៅ',
  'កោរពុកមាត់ដោយឡាមប្រពៃណី អមដោយកន្សែងក្តៅ និងប្រេងបន្ទន់ស្បែក',
  4.00,
  (select id from categories where name like 'កោរពុកមាត់%' limit 1),
  'service',
  25,
  999,
  true
where not exists (select 1 from products where name = 'កោរពុកមាត់ + កន្សែងក្តៅ');

insert into products (name, description, price, category_id, item_type, duration_min, stock, published)
select 
  'កក់សក់ + ម៉ាស្សាក្បាល',
  'កក់សក់ស្អាតជ្រៅ ម៉ាស្សាក្បាល ក និងស្មា ជួយសម្រួលអារម្មណ៍',
  3.50,
  (select id from categories where name like 'កក់សក់%' limit 1),
  'service',
  20,
  999,
  true
where not exists (select 1 from products where name = 'កក់សក់ + ម៉ាស្សាក្បាល');

insert into products (name, description, price, category_id, item_type, duration_min, stock, published)
select 
  'ប្តូរពណ៌សក់ម៉ូត',
  'លាបពណ៌សក់បុរស ពណ៌ធម្មជាតិ និងពណ៌ម៉ូតពេញនិយម',
  15.00,
  (select id from categories where name like 'ប្តូរពណ៌សក់%' limit 1),
  'service',
  60,
  999,
  true
where not exists (select 1 from products where name = 'ប្តូរពណ៌សក់ម៉ូត');

insert into products (name, description, price, category_id, item_type, duration_min, stock, published)
select 
  'ជែលសិតសក់ម៉ូត (១០០ ក្រាម)',
  'ជែលសិតសក់គុណភាពខ្ពស់ ផ្តល់សំណើម រក្សាម៉ូតសក់បានពេញមួយថ្ងៃ និងលាងទឹកចេញងាយស្រួល',
  8.00,
  (select id from categories where name like 'ផលិតផល%' limit 1),
  'product',
  0,
  24,
  true
where not exists (select 1 from products where name = 'ជែលសិតសក់ម៉ូត (១០០ ក្រាម)');

insert into products (name, description, price, category_id, item_type, duration_min, stock, published)
select 
  'ក្រមួនសិតសក់ (៨០ ក្រាម)',
  'ក្រមួនសិតសក់បង្កើតទម្រង់សក់ស្អាតបែបធម្មជាតិ មិនរលោង',
  7.50,
  (select id from categories where name like 'ផលិតផល%' limit 1),
  'product',
  0,
  18,
  true
where not exists (select 1 from products where name = 'ក្រមួនសិតសក់ (៨០ ក្រាម)');

insert into products (name, description, price, category_id, item_type, duration_min, stock, published)
select 
  'ប្រេងបន្ទន់ពុកមាត់ (៣០ មីលីលីត្រ)',
  'ជួយបំប៉នពុកមាត់ និងផ្តល់ក្លិនក្រអូបទាក់ទាញ',
  6.00,
  (select id from categories where name like 'ផលិតផល%' limit 1),
  'product',
  0,
  15,
  true
where not exists (select 1 from products where name = 'ប្រេងបន្ទន់ពុកមាត់ (៣០ មីលីលីត្រ)');
