-- 0007: quote_stay() and create_booking(). check_in, check_out and create_walk_in follow
-- in Block 3. Prices are always computed here, never taken from the browser.

-- "Today" for the hotels is Addis Ababa time, not the database's UTC date.
create function app.hotel_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Africa/Addis_Ababa')::date;
$$;

grant execute on function app.hotel_today() to authenticated, service_role;

-- Price of a stay, line by line: room nights, optional breakfast, then the service
-- charge on the subtotal and VAT on subtotal + service (PLAN A7, illustrative).
create function public.quote_stay(
  p_tenant uuid,
  p_room_type uuid,
  p_rate_plan uuid,
  p_from date,
  p_to date,
  p_adults int,
  p_breakfast boolean default false
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  settings jsonb;
  plan public.rate_plans;
  nights int := p_to - p_from;
  lines jsonb := '[]'::jsonb;
  subtotal numeric(12, 2) := 0;
  service numeric(12, 2);
  tax numeric(12, 2);
  breakfast_price numeric(12, 2);
  r record;
  found_nights int := 0;
begin
  if nights < 1 or nights > 30 then
    raise exception 'invalid_dates' using errcode = '22023';
  end if;

  select t.settings into settings from public.tenants t where t.id = p_tenant;
  select * into plan from public.rate_plans where id = p_rate_plan and tenant_id = p_tenant;
  if plan.id is null then
    raise exception 'unknown_rate_plan' using errcode = '22023';
  end if;

  for r in
    select dr.date, dr.amount
    from public.daily_rates dr
    where dr.tenant_id = p_tenant and dr.room_type_id = p_room_type and dr.rate_plan_id = p_rate_plan
      and dr.date >= p_from and dr.date < p_to
    order by dr.date
  loop
    found_nights := found_nights + 1;
    subtotal := subtotal + r.amount;
    lines := lines || jsonb_build_object(
      'category', 'room', 'description', 'Room night, ' || plan.name,
      'amount', r.amount, 'posted_on', r.date);
  end loop;

  if found_nights <> nights then
    raise exception 'no_rate' using errcode = '22023';
  end if;

  if p_breakfast and not plan.includes_breakfast then
    breakfast_price := coalesce((settings ->> 'breakfastPrice')::numeric, 450);
    for i in 0 .. nights - 1 loop
      subtotal := subtotal + breakfast_price * p_adults;
      lines := lines || jsonb_build_object(
        'category', 'extra', 'description', format('Breakfast, %s adult%s', p_adults, case when p_adults > 1 then 's' else '' end),
        'amount', breakfast_price * p_adults, 'posted_on', p_from + i);
    end loop;
  end if;

  service := round(subtotal * coalesce((settings ->> 'serviceChargePct')::numeric, 10) / 100, 2);
  tax := round((subtotal + service) * coalesce((settings ->> 'vatPct')::numeric, 15) / 100, 2);
  lines := lines
    || jsonb_build_object('category', 'service', 'description', 'Service charge', 'amount', service, 'posted_on', p_from)
    || jsonb_build_object('category', 'tax', 'description', 'VAT', 'amount', tax, 'posted_on', p_from);

  return jsonb_build_object(
    'nights', nights,
    'lines', lines,
    'subtotal', subtotal,
    'service', service,
    'tax', tax,
    'total', subtotal + service + tax
  );
end;
$$;

revoke all on function public.quote_stay(uuid, uuid, uuid, date, date, int, boolean) from public, anon;
grant execute on function public.quote_stay(uuid, uuid, uuid, date, date, int, boolean) to authenticated, service_role;

-- A website booking, all or nothing: guest, reservation, room line, folio with items,
-- the captured payment and the confirmation in the outbox. The server action charges
-- the mock gateway first and passes only the result (token, last 4, transaction id);
-- a declined card never reaches this function, so a decline creates nothing.
create function public.create_booking(
  p_tenant uuid,
  p_property uuid,
  p_room_type uuid,
  p_rate_plan uuid,
  p_from date,
  p_to date,
  p_adults int,
  p_children int,
  p_breakfast boolean,
  p_guest jsonb,
  p_payment jsonb
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  quote jsonb;
  free int;
  prefix text;
  v_guest uuid;
  v_res uuid;
  v_folio uuid;
  v_code text;
  token text;
  line jsonb;
begin
  if p_from < app.hotel_today() then
    raise exception 'invalid_dates' using errcode = '22023';
  end if;

  -- Serialise bookings per room type so two guests cannot take the last room.
  perform pg_advisory_xact_lock(hashtextextended(p_room_type::text, 0));

  select a.available into free
  from public.availability(p_tenant, p_property, p_from, p_to) a
  where a.room_type_id = p_room_type;
  if coalesce(free, 0) < 1 then
    raise exception 'sold_out' using errcode = 'P0001';
  end if;

  quote := public.quote_stay(p_tenant, p_room_type, p_rate_plan, p_from, p_to, p_adults, p_breakfast);
  if (p_payment ->> 'amount')::numeric <> (quote ->> 'total')::numeric then
    raise exception 'price_changed' using errcode = 'P0001';
  end if;

  select coalesce(t.settings ->> 'codePrefix', upper(left(t.slug, 2))) into prefix
  from public.tenants t where t.id = p_tenant;
  v_code := prefix || '-' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 6));
  token := translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/', '-_');

  insert into public.guests (tenant_id, first_name, last_name, email, phone, preferences)
  values (
    p_tenant, p_guest ->> 'first_name', p_guest ->> 'last_name', p_guest ->> 'email', p_guest ->> 'phone',
    coalesce(array(select jsonb_array_elements_text(p_guest -> 'preferences')), '{}')
  )
  returning id into v_guest;

  insert into public.reservations (
    tenant_id, property_id, guest_id, rate_plan_id, code, channel, source, status,
    check_in, check_out, adults, children, total, portal_token_hash
  )
  values (
    p_tenant, p_property, v_guest, p_rate_plan, v_code, 'direct', 'website', 'confirmed',
    p_from, p_to, p_adults, p_children, (quote ->> 'total')::numeric,
    encode(extensions.digest(token, 'sha256'), 'hex')
  )
  returning id into v_res;

  insert into public.reservation_rooms (tenant_id, reservation_id, room_type_id)
  values (p_tenant, v_res, p_room_type);

  insert into public.folios (tenant_id, reservation_id) values (p_tenant, v_res) returning id into v_folio;

  for line in select * from jsonb_array_elements(quote -> 'lines') loop
    insert into public.folio_items (tenant_id, folio_id, category, description, amount, posted_on)
    values (
      p_tenant, v_folio, (line ->> 'category')::public.folio_category, line ->> 'description',
      (line ->> 'amount')::numeric, (line ->> 'posted_on')::date
    );
  end loop;

  insert into public.payments (tenant_id, folio_id, method, amount, token, test_card_last4, transaction_id)
  values (
    p_tenant, v_folio, 'card', (quote ->> 'total')::numeric,
    p_payment ->> 'token', p_payment ->> 'last4', p_payment ->> 'transaction_id'
  );

  insert into public.outbox (tenant_id, channel, recipient, subject, body, reference)
  values (
    p_tenant, 'email', coalesce(p_guest ->> 'email', ''), 'Your booking ' || v_code,
    format('Dear %s, your stay from %s to %s is confirmed. Check in online before you arrive.',
      p_guest ->> 'first_name', p_from, p_to),
    v_res::text
  );

  return jsonb_build_object(
    'reservation_id', v_res,
    'code', v_code,
    'portal_token', token,
    'total', quote -> 'total'
  );
end;
$$;

revoke all on function public.create_booking(uuid, uuid, uuid, uuid, date, date, int, int, boolean, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_booking(uuid, uuid, uuid, uuid, date, date, int, int, boolean, jsonb, jsonb) to service_role;
