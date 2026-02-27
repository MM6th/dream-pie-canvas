
-- Backfill: mint tokens for existing credit purchase revenue
-- Using the same bonding curve math as the trigger
DO $$
DECLARE
  v_initial_price numeric := 0.00001;
  v_target_price numeric := 0.01;
  v_liquidity_pool_size bigint := 10780000;
  v_k numeric;
  v_buy_tax_rate numeric := 0.01;
  v_current_supply bigint;
  v_usd_gross numeric;
  v_usd_after_tax numeric;
  v_tax_amount numeric;
  v_current_reserve numeric;
  v_target_reserve numeric;
  v_s_after numeric;
  v_tokens_minted bigint;
  v_row RECORD;
BEGIN
  v_k := ln(v_target_price / v_initial_price) / v_liquidity_pool_size;

  FOR v_row IN
    SELECT id, amount, source_user_id, source_transaction_id
    FROM public.platform_revenue
    WHERE revenue_type = 'credit_purchase'
    ORDER BY created_at
  LOOP
    -- Get current supply
    SELECT COALESCE(SUM(balance), 0) INTO v_current_supply FROM public.token_balances;

    IF v_current_supply >= v_liquidity_pool_size THEN
      EXIT;
    END IF;

    v_usd_gross := v_row.amount;
    v_tax_amount := v_usd_gross * v_buy_tax_rate;
    v_usd_after_tax := v_usd_gross - v_tax_amount;

    IF v_current_supply = 0 THEN
      v_current_reserve := 0;
    ELSE
      v_current_reserve := (v_initial_price / v_k) * (exp(v_k * v_current_supply) - 1);
    END IF;

    v_target_reserve := v_current_reserve + v_usd_after_tax;
    v_s_after := ln(v_target_reserve * v_k / v_initial_price + 1) / v_k;
    v_tokens_minted := GREATEST(0, LEAST(
      floor(v_s_after - v_current_supply),
      v_liquidity_pool_size - v_current_supply
    ));

    IF v_tokens_minted <= 0 THEN
      CONTINUE;
    END IF;

    -- Upsert token balance
    INSERT INTO public.token_balances (user_id, balance, total_purchased, total_spent_usd, total_buy_tax_paid)
    VALUES (v_row.source_user_id, v_tokens_minted, v_tokens_minted, v_usd_gross, v_tax_amount)
    ON CONFLICT (user_id) DO UPDATE SET
      balance = token_balances.balance + v_tokens_minted,
      total_purchased = token_balances.total_purchased + v_tokens_minted,
      total_spent_usd = token_balances.total_spent_usd + v_usd_gross,
      total_buy_tax_paid = token_balances.total_buy_tax_paid + v_tax_amount;

    -- Record buy tax
    INSERT INTO public.platform_revenue (amount, revenue_type, source_user_id, source_transaction_id, metadata)
    VALUES (v_tax_amount, 'token_buy_tax', v_row.source_user_id, v_row.source_transaction_id,
      jsonb_build_object(
        'backfill', true,
        'tokens_minted', v_tokens_minted,
        'usd_gross', v_usd_gross,
        'supply_after', v_current_supply + v_tokens_minted
      )
    );

    RAISE NOTICE 'Minted % tokens for user % from $% (tax: $%)',
      v_tokens_minted, v_row.source_user_id, v_usd_gross, v_tax_amount;
  END LOOP;
END;
$$;
