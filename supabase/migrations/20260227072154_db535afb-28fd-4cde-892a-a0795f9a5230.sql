
-- Create token_balances table for per-user SIXTH token tracking
CREATE TABLE public.token_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance bigint NOT NULL DEFAULT 0,
  total_purchased bigint NOT NULL DEFAULT 0,
  total_spent_usd numeric NOT NULL DEFAULT 0,
  total_buy_tax_paid numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.token_balances ENABLE ROW LEVEL SECURITY;

-- Users can read their own balance
CREATE POLICY "Users can view own token balance"
  ON public.token_balances FOR SELECT
  USING (auth.uid() = user_id);

-- Admin can view all balances
CREATE POLICY "Admin can view all token balances"
  ON public.token_balances FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_token_balances_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_token_balances_updated_at
  BEFORE UPDATE ON public.token_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_token_balances_timestamp();

-- Minting function: calculates tokens on exponential bonding curve
-- Matches the frontend constants exactly:
--   INITIAL_PRICE = 0.00001, TARGET_PRICE = 0.01
--   FULL_MARKET_CAP = 22,000,000, LIQUIDITY_POOL = floor(22M * 0.49) = 10,780,000
--   K = ln(TARGET_PRICE / INITIAL_PRICE) / LIQUIDITY_POOL_SIZE
--   BUY_TAX = 1%
CREATE OR REPLACE FUNCTION public.mint_tokens_on_credit_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
BEGIN
  -- Only process credit_purchase revenue
  IF NEW.revenue_type != 'credit_purchase' THEN
    RETURN NEW;
  END IF;

  -- Skip if no user associated
  IF NEW.source_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Bonding curve constant K
  v_k := ln(v_target_price / v_initial_price) / v_liquidity_pool_size;

  -- Get current total supply across all holders
  SELECT COALESCE(SUM(balance), 0) INTO v_current_supply FROM public.token_balances;

  -- Ensure we don't exceed liquidity pool
  IF v_current_supply >= v_liquidity_pool_size THEN
    RETURN NEW;
  END IF;

  -- Calculate tax and net amount
  v_usd_gross := NEW.amount;
  v_tax_amount := v_usd_gross * v_buy_tax_rate;
  v_usd_after_tax := v_usd_gross - v_tax_amount;

  -- Current reserve on the curve (integral from 0 to current_supply)
  IF v_current_supply = 0 THEN
    v_current_reserve := 0;
  ELSE
    v_current_reserve := (v_initial_price / v_k) * (exp(v_k * v_current_supply) - 1);
  END IF;

  -- Target reserve after this purchase
  v_target_reserve := v_current_reserve + v_usd_after_tax;

  -- Solve for new supply: s_after = ln(target_reserve * K / P0 + 1) / K
  v_s_after := ln(v_target_reserve * v_k / v_initial_price + 1) / v_k;

  -- Tokens minted = difference, capped at liquidity pool
  v_tokens_minted := GREATEST(0, LEAST(
    floor(v_s_after - v_current_supply),
    v_liquidity_pool_size - v_current_supply
  ));

  -- Skip if no tokens to mint
  IF v_tokens_minted <= 0 THEN
    RETURN NEW;
  END IF;

  -- Upsert token balance for the buyer
  INSERT INTO public.token_balances (user_id, balance, total_purchased, total_spent_usd, total_buy_tax_paid)
  VALUES (NEW.source_user_id, v_tokens_minted, v_tokens_minted, v_usd_gross, v_tax_amount)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = token_balances.balance + v_tokens_minted,
    total_purchased = token_balances.total_purchased + v_tokens_minted,
    total_spent_usd = token_balances.total_spent_usd + v_usd_gross,
    total_buy_tax_paid = token_balances.total_buy_tax_paid + v_tax_amount;

  -- Record buy tax as separate platform revenue entry for tracking
  INSERT INTO public.platform_revenue (amount, revenue_type, source_user_id, source_transaction_id, metadata)
  VALUES (v_tax_amount, 'token_buy_tax', NEW.source_user_id, NEW.source_transaction_id,
    jsonb_build_object(
      'tokens_minted', v_tokens_minted,
      'usd_gross', v_usd_gross,
      'usd_after_tax', v_usd_after_tax,
      'spot_price', v_initial_price * exp(v_k * (v_current_supply + v_tokens_minted)),
      'supply_before', v_current_supply,
      'supply_after', v_current_supply + v_tokens_minted
    )
  );

  RETURN NEW;
END;
$$;

-- Trigger on platform_revenue insert
CREATE TRIGGER mint_tokens_after_credit_purchase
  AFTER INSERT ON public.platform_revenue
  FOR EACH ROW EXECUTE FUNCTION public.mint_tokens_on_credit_purchase();
