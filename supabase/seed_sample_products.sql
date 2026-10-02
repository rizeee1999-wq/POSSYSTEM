-- Barbershop sample products for trying out the POS app.
-- Run this in Supabase Dashboard → SQL Editor, after schema.sql.
-- Safe to re-run. Also safe to run even if the old generic (Drinks/Snacks)
-- sample data was never seeded — the cleanup steps are no-ops in that case.

-- Remove the old generic sample products, if they were seeded before.
delete from products where name in (
  'ទឹកកូកា កំប៉ុង', 'ទឹកសុទ្ធ អង្គរ', 'កាហ្វេទឹកកក',
  'នំបុ័ងឡានចេក', 'ដំឡូងបំពង', 'មីស្ងួតកញ្ចប់',
  'ថង់ដៃទិញឥវ៉ាន់', 'ដបទឹកប្លាស្ទិកទទេ', 'ក្រណាត់សម្អាត'
);

-- Remove the now-unused Drinks/Snacks categories (safe: no products
-- reference them after the delete above).
delete from categories where name in ('Drinks', 'Snacks');

-- Barbershop-specific categories.
insert into categories (name)
values ('ឧបករណ៍កាត់សក់'), ('ផលិតផលថែទាំសក់'), ('គ្រឿងប្រើប្រាស់')
on conflict (name) do nothing;

-- Barbershop sample products: tools, hair-care products, and shop
-- accessories/supplies.
insert into products (name, description, price, category_id, stock, published)
select v.name, v.description, v.price, c.id, v.stock, true
from (
  values
    ('ម៉ាស៊ីនកាត់សក់', 'ម៉ាស៊ីនកាត់សក់អគ្គិសនី ភ្ជាប់ក្បាលច្រើនទំហំ', 25.00, 'ឧបករណ៍កាត់សក់', 15),
    ('កន្ត្រៃកាត់សក់', 'កន្ត្រៃដែកអ៊ីណុកសម្រាប់កាត់សក់', 12.00, 'ឧបករណ៍កាត់សក់', 20),
    ('កន្ត្រៃស្តើងសក់', 'កន្ត្រៃសម្រាប់ស្តើងបន្ថយចំនួនសក់', 10.00, 'ឧបករណ៍កាត់សក់', 20),
    ('សិតសក់ឈើ', 'សិតឈើគុណភាពខ្ពស់ មួយឈុតច្រើនទំហំ', 3.50, 'ឧបករណ៍កាត់សក់', 40),
    ('ច្រឹបសក់', 'ច្រឹបសម្រាប់រៀបចំសក់រួញ', 2.50, 'ឧបករណ៍កាត់សក់', 30),
    ('ដបបាញ់ទឹក', 'ដបបាញ់ទឹកសម្រាប់សើមសក់មុនកាត់', 3.00, 'ឧបករណ៍កាត់សក់', 30),
    ('ស្ពាន់សក់', 'ស្ពាន់សម្រាប់លាងសំអាតសក់', 5.50, 'ផលិតផលថែទាំសក់', 50),
    ('ក្រែមបន្ទន់សក់', 'ក្រែមបន្ទន់សក់ ប្រើក្រោយពេលកក់ស្ពាន់', 5.50, 'ផលិតផលថែទាំសក់', 50),
    ('ប្រេងលាបសក់', 'ប្រេង/ក្រែមលាបសក់ឲ្យរលោងមានរសជាតិ', 4.50, 'ផលិតផលថែទាំសក់', 35),
    ('អាវការពារកាត់សក់', 'អាវក្រណាត់ការពារខ្លួនអតិថិជនពេលកាត់សក់', 8.00, 'គ្រឿងប្រើប្រាស់', 15),
    ('ស្រោមដៃកោរសក់', 'ស្រោមដៃប្រើប្រាស់សម្រាប់ជាងកាត់សក់', 1.50, 'គ្រឿងប្រើប្រាស់', 60),
    ('ក្រដាសការពារក', 'ក្រដាសព័ទ្ធកសម្រាប់ការពារមុនកាត់សក់', 1.00, 'គ្រឿងប្រើប្រាស់', 100)it
) as v(name, description, price, category_name, stock)
join categories c on c.name = v.category_name
where not exists (select 1 from products p where p.name = v.name);
