-- ============================================================
-- QR Menü — Demo seed: "Safran Sofrası" (KURGU işletme, gerçek isim yok)
-- Idempotent: önce mevcut demo tenant'ı siler (cascade)
-- ============================================================

delete from public.tenants where slug = 'safran-sofrasi';

insert into public.tenants (id, slug, name, theme, default_lang, languages, currency,
  whatsapp_phone, wifi_ssid, wifi_password, address, phone, instagram_url, google_maps_url,
  plan, trial_ends_at, settings)
values (
  '11111111-1111-4111-8111-111111111111',
  'safran-sofrasi',
  'Safran Sofrası',
  '{"mode":"dark","accent":"#C8A24B"}',
  'tr', '{tr,en}', 'TRY',
  '+905550000000',
  'SafranSofrasi', 'safran2026',
  'Cumhuriyet Cad. No:42, Merkez / Kırıkkale', '+903180000000',
  'https://instagram.com/safransofrasi.demo',
  'https://maps.google.com/?q=Kirikkale',
  'trial', now() + interval '30 days',
  '{"waiter_call_enabled":true,"bill_request_enabled":true,"show_calories":true,"timezone":"Europe/Istanbul"}'
);

-- Kategoriler (Kahvaltı time-window'lu: 06:30-12:00)
insert into public.categories (id, tenant_id, name, description, icon, sort_order, time_window) values
('22222222-2222-4222-8222-000000000001','11111111-1111-4111-8111-111111111111',
 '{"tr":"Kahvaltı","en":"Breakfast"}','{"tr":"Güne güzel başlayın","en":"Start your day right"}','egg',10,
 '{"start":"06:30","end":"12:00","days":[1,2,3,4,5,6,7]}'),
('22222222-2222-4222-8222-000000000002','11111111-1111-4111-8111-111111111111',
 '{"tr":"Çorbalar","en":"Soups"}',null,'soup',20,null),
('22222222-2222-4222-8222-000000000003','11111111-1111-4111-8111-111111111111',
 '{"tr":"Ara Sıcaklar","en":"Starters"}',null,'flame',30,null),
('22222222-2222-4222-8222-000000000004','11111111-1111-4111-8111-111111111111',
 '{"tr":"Izgaralar","en":"Grills"}','{"tr":"Mangal kömüründe","en":"Charcoal grilled"}','beef',40,null),
('22222222-2222-4222-8222-000000000005','11111111-1111-4111-8111-111111111111',
 '{"tr":"Pideler","en":"Pide"}','{"tr":"Taş fırından","en":"From the stone oven"}','pizza',50,null),
('22222222-2222-4222-8222-000000000006','11111111-1111-4111-8111-111111111111',
 '{"tr":"Salatalar","en":"Salads"}',null,'salad',60,null),
('22222222-2222-4222-8222-000000000007','11111111-1111-4111-8111-111111111111',
 '{"tr":"Tatlılar","en":"Desserts"}',null,'cake-slice',70,null),
('22222222-2222-4222-8222-000000000008','11111111-1111-4111-8111-111111111111',
 '{"tr":"İçecekler","en":"Drinks"}',null,'cup-soda',80,null);

-- Ürünler
insert into public.products (tenant_id, category_id, name, description, price, compare_at_price,
  spiciness, allergens, dietary, calories, portion, prep_time_minutes, sort_order,
  is_sold_out, is_featured, badges) values

-- KAHVALTI (5)
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000001',
 '{"tr":"Serpme Kahvaltı (2 Kişilik)","en":"Turkish Breakfast Spread (for 2)"}',
 '{"tr":"Bal, kaymak, üç çeşit peynir, zeytin, domates-salatalık, menemen, sigara böreği, sınırsız çay","en":"Honey, clotted cream, three cheeses, olives, fresh vegetables, menemen, fried pastry rolls, unlimited tea"}',
 850.00,null,0,'{gluten,milk,eggs}','{vegetarian}',1450,'2 kişilik',25,10,false,true,'{chefs_pick}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000001',
 '{"tr":"Menemen","en":"Menemen"}',
 '{"tr":"Domates, biber ve köy yumurtasıyla, tereyağında","en":"Free-range eggs scrambled with tomatoes and peppers in butter"}',
 180.00,null,0,'{eggs,milk}','{vegetarian,gluten_free}',420,'Tek kişilik',12,20,false,false,'{}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000001',
 '{"tr":"Sigara Böreği (6 Adet)","en":"Fried Cheese Rolls (6 pcs)"}',
 '{"tr":"Beyaz peynirli, çıtır yufkada","en":"Crispy phyllo rolls with white cheese"}',
 160.00,null,0,'{gluten,milk}','{vegetarian}',380,'6 adet',10,30,false,false,'{}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000001',
 '{"tr":"Bal Kaymak","en":"Honey & Clotted Cream"}',
 '{"tr":"Süzme bal üzerine manda kaymağı","en":"Buffalo clotted cream with strained honey"}',
 220.00,null,0,'{milk}','{vegetarian,gluten_free}',520,null,5,40,false,false,'{}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000001',
 '{"tr":"Avokadolu Yumurta Tost","en":"Avocado Egg Toast"}',
 '{"tr":"Ekşi maya ekmeği, ezilmiş avokado, poşe yumurta","en":"Sourdough, smashed avocado, poached egg"}',
 240.00,null,0,'{gluten,eggs}','{vegetarian}',460,null,10,50,false,false,'{new}'),

-- ÇORBALAR (3)
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000002',
 '{"tr":"Mercimek Çorbası","en":"Red Lentil Soup"}',
 '{"tr":"Tereyağı ve limonla","en":"Served with butter and lemon"}',
 120.00,null,0,'{gluten,milk}','{vegetarian}',210,null,5,10,false,false,'{}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000002',
 '{"tr":"Ezogelin Çorbası","en":"Ezogelin Soup"}',
 '{"tr":"Kırmızı mercimek, bulgur ve naneyle","en":"Red lentils, bulgur and dried mint"}',
 120.00,null,1,'{gluten}','{vegan}',190,null,5,20,false,false,'{}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000002',
 '{"tr":"İşkembe Çorbası","en":"Tripe Soup"}',
 '{"tr":"Sarımsaklı sirke ve pul biberle","en":"With garlic vinegar and chili flakes"}',
 180.00,null,1,'{}','{gluten_free}',280,null,5,30,false,false,'{}'),

-- ARA SICAKLAR (5)
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000003',
 '{"tr":"Acılı Ezme","en":"Spicy Ezme"}',
 '{"tr":"İnce kıyılmış domates, biber, soğan, nar ekşisi","en":"Finely chopped tomatoes, peppers, onion, pomegranate molasses"}',
 90.00,null,3,'{}','{vegan,gluten_free}',95,null,5,10,false,false,'{}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000003',
 '{"tr":"Humus","en":"Hummus"}',
 '{"tr":"Nohut ezmesi, tahin, zeytinyağı","en":"Chickpea purée with tahini and olive oil"}',
 110.00,null,0,'{sesame}','{vegan,gluten_free}',240,null,5,20,false,false,'{}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000003',
 '{"tr":"Paçanga Böreği","en":"Pastrami Börek"}',
 '{"tr":"Pastırmalı, kaşarlı çıtır börek","en":"Crispy börek with pastrami and kashar cheese"}',
 170.00,null,0,'{gluten,milk}','{}',330,'4 adet',12,30,false,false,'{}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000003',
 '{"tr":"Karides Güveç","en":"Shrimp Casserole"}',
 '{"tr":"Tereyağı, sarımsak ve kaşarla fırında","en":"Baked with butter, garlic and kashar cheese"}',
 320.00,null,1,'{crustaceans,milk}','{}',290,null,15,40,false,false,'{chefs_pick}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000003',
 '{"tr":"Çıtır Kalamar","en":"Crispy Calamari"}',
 '{"tr":"Tartar sos eşliğinde","en":"Served with tartar sauce"}',
 290.00,null,0,'{molluscs,gluten,eggs}','{}',310,null,12,50,false,false,'{}'),

-- IZGARALAR (6)
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000004',
 '{"tr":"Adana Kebap","en":"Adana Kebab"}',
 '{"tr":"El yapımı acılı zırh kıyma, közlenmiş domates ve biberle","en":"Hand-minced spicy lamb kebab with grilled tomatoes and peppers"}',
 450.00,null,2,'{}','{halal,gluten_free}',620,'200 g',20,10,false,true,'{chefs_pick}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000004',
 '{"tr":"Urfa Kebap","en":"Urfa Kebab"}',
 '{"tr":"Acısız zırh kıyma kebabı","en":"Mild hand-minced lamb kebab"}',
 450.00,null,0,'{}','{halal,gluten_free}',600,'200 g',20,20,false,false,'{}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000004',
 '{"tr":"Kuzu Şiş","en":"Lamb Skewers"}',
 '{"tr":"Marine kuzu bonfile, közlenmiş sebzelerle","en":"Marinated lamb tenderloin with grilled vegetables"}',
 520.00,580.00,0,'{}','{halal,gluten_free}',540,'180 g',22,30,false,false,'{}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000004',
 '{"tr":"Tavuk Şiş","en":"Chicken Skewers"}',
 '{"tr":"Yoğurtlu marine, pilav ve salatayla","en":"Yogurt-marinated, served with rice and salad"}',
 340.00,null,0,'{milk}','{halal}',480,'200 g',18,40,false,false,'{}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000004',
 '{"tr":"Karışık Izgara (2 Kişilik)","en":"Mixed Grill (for 2)"}',
 '{"tr":"Adana, kuzu şiş, tavuk şiş, pirzola; pilav ve mezelerle","en":"Adana, lamb and chicken skewers, lamb chops; with rice and mezze"}',
 980.00,null,1,'{milk}','{halal}',1350,'2 kişilik',30,50,false,true,'{}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000004',
 '{"tr":"Izgara Levrek","en":"Grilled Sea Bass"}',
 '{"tr":"Roka ve limonla","en":"With arugula and lemon"}',
 420.00,null,0,'{fish}','{gluten_free}',380,'300 g',25,60,true,false,'{}'),

-- PİDELER (4)
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000005',
 '{"tr":"Kıymalı Pide","en":"Minced Meat Pide"}',
 '{"tr":"Kuşbaşı soğanlı kıyma harcı","en":"Seasoned minced meat with onions"}',
 260.00,null,0,'{gluten}','{halal}',680,null,18,10,false,false,'{}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000005',
 '{"tr":"Kaşarlı Pide","en":"Cheese Pide"}',
 '{"tr":"Bol kaşar peynirli","en":"Generous kashar cheese"}',
 230.00,null,0,'{gluten,milk}','{vegetarian}',720,null,18,20,false,false,'{}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000005',
 '{"tr":"Kuşbaşılı Kaşarlı Pide","en":"Diced Beef & Cheese Pide"}',
 '{"tr":"Kuşbaşı et ve kaşar","en":"Diced beef with kashar cheese"}',
 320.00,null,0,'{gluten,milk}','{halal}',760,null,20,30,false,false,'{chefs_pick}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000005',
 '{"tr":"Sucuklu Yumurtalı Pide","en":"Sujuk & Egg Pide"}',
 '{"tr":"Dana sucuk, köy yumurtası","en":"Beef sujuk with free-range egg"}',
 280.00,null,1,'{gluten,eggs}','{halal}',710,null,18,40,false,false,'{new}'),

-- SALATALAR (3)
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000006',
 '{"tr":"Çoban Salata","en":"Shepherd Salad"}',
 '{"tr":"Domates, salatalık, biber, soğan, maydanoz","en":"Tomato, cucumber, pepper, onion, parsley"}',
 130.00,null,0,'{}','{vegan,gluten_free}',90,null,8,10,false,false,'{}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000006',
 '{"tr":"Roka Salatası","en":"Arugula Salad"}',
 '{"tr":"Parmesan, çeri domates, nar ekşili sos","en":"Parmesan, cherry tomatoes, pomegranate dressing"}',
 160.00,null,0,'{milk}','{vegetarian,gluten_free}',150,null,8,20,false,false,'{}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000006',
 '{"tr":"Izgara Tavuklu Sezar","en":"Grilled Chicken Caesar"}',
 '{"tr":"Izgara tavuk, kruton, sezar sos","en":"Grilled chicken, croutons, caesar dressing"}',
 280.00,null,0,'{gluten,milk,eggs,fish,mustard}','{}',420,null,15,30,false,false,'{}'),

-- TATLILAR (5)
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000007',
 '{"tr":"Künefe","en":"Künefe"}',
 '{"tr":"Antep fıstıklı, kaymak eşliğinde, sıcak servis","en":"With pistachios and clotted cream, served hot"}',
 240.00,null,0,'{gluten,milk,nuts}','{vegetarian}',540,null,15,10,false,true,'{chefs_pick}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000007',
 '{"tr":"Fıstıklı Baklava (4 Dilim)","en":"Pistachio Baklava (4 pcs)"}',
 '{"tr":"Günlük, Antep fıstıklı","en":"Daily made with Antep pistachios"}',
 280.00,null,0,'{gluten,nuts,milk}','{vegetarian}',620,'4 dilim',5,20,false,false,'{}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000007',
 '{"tr":"Fırın Sütlaç","en":"Baked Rice Pudding"}',
 '{"tr":"Fındıklı, fırında karamelize","en":"Caramelized in the oven, topped with hazelnuts"}',
 140.00,null,0,'{milk,nuts}','{vegetarian,gluten_free}',310,null,5,30,false,false,'{}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000007',
 '{"tr":"Katmer","en":"Katmer"}',
 '{"tr":"Antep usulü, kaymaklı fıstıklı","en":"Gaziantep style with clotted cream and pistachio"}',
 260.00,null,0,'{gluten,milk,nuts}','{vegetarian}',580,null,12,40,false,false,'{new}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000007',
 '{"tr":"Mevsim Meyveleri","en":"Seasonal Fruit Plate"}',
 '{"tr":"Günün taze meyveleri","en":"Fresh fruits of the day"}',
 160.00,null,0,'{}','{vegan,gluten_free}',120,null,8,50,false,false,'{}'),

-- İÇECEKLER (4)
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000008',
 '{"tr":"Çay","en":"Turkish Tea"}',
 null,30.00,null,0,'{}','{vegan,gluten_free}',2,null,2,10,false,false,'{}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000008',
 '{"tr":"Türk Kahvesi","en":"Turkish Coffee"}',
 '{"tr":"Közde pişirilir, lokum eşliğinde","en":"Ember-brewed, served with Turkish delight"}',
 90.00,null,0,'{}','{vegan,gluten_free}',15,null,8,20,false,false,'{}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000008',
 '{"tr":"Ayran","en":"Ayran"}',
 '{"tr":"Yayık ayranı","en":"Traditional churned yogurt drink"}',
 50.00,null,0,'{milk}','{vegetarian,gluten_free,halal}',80,'300 ml',2,30,false,false,'{}'),
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-000000000008',
 '{"tr":"Ev Yapımı Limonata","en":"Homemade Lemonade"}',
 '{"tr":"Taze nane ile","en":"With fresh mint"}',
 90.00,null,0,'{}','{vegan,gluten_free}',110,'400 ml',5,40,false,false,'{new}');

-- Kampanya: Çay Saati — hafta içi 15:00-17:00, Tatlılar kategorisinde %15
insert into public.campaigns (tenant_id, name, type, value, scope, category_id,
  days_of_week, start_time, end_time, badge_text) values
('11111111-1111-4111-8111-111111111111','Çay Saati %15','percent',15,'category',
 '22222222-2222-4222-8222-000000000007','{1,2,3,4,5}','15:00','17:00',
 '{"tr":"Çay Saati %15","en":"Tea Time -15%"}');

-- Masalar (10)
insert into public.tables (tenant_id, code, name, sort_order) values
('11111111-1111-4111-8111-111111111111','1','Masa 1',10),
('11111111-1111-4111-8111-111111111111','2','Masa 2',20),
('11111111-1111-4111-8111-111111111111','3','Masa 3',30),
('11111111-1111-4111-8111-111111111111','4','Masa 4',40),
('11111111-1111-4111-8111-111111111111','5','Masa 5',50),
('11111111-1111-4111-8111-111111111111','6','Masa 6',60),
('11111111-1111-4111-8111-111111111111','7','Masa 7',70),
('11111111-1111-4111-8111-111111111111','8','Masa 8',80),
('11111111-1111-4111-8111-111111111111','bahce-1','Bahçe 1',90),
('11111111-1111-4111-8111-111111111111','bahce-2','Bahçe 2',100);

select 'tenant' as t, count(*) from public.tenants where slug='safran-sofrasi'
union all select 'categories', count(*) from public.categories where tenant_id='11111111-1111-4111-8111-111111111111'
union all select 'products', count(*) from public.products where tenant_id='11111111-1111-4111-8111-111111111111'
union all select 'campaigns', count(*) from public.campaigns where tenant_id='11111111-1111-4111-8111-111111111111'
union all select 'tables', count(*) from public.tables where tenant_id='11111111-1111-4111-8111-111111111111';
