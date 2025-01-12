-- Create a new table for payment records
CREATE TABLE IF NOT EXISTS payment_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_price_id TEXT,
    status TEXT NOT NULL,
    plan_type TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    interval TEXT,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_records_user_id ON payment_records(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_stripe_customer_id ON payment_records(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON payment_records(status);

-- Enable Row Level Security
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own payment records"
    ON payment_records FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Only service role can insert payment records"
    ON payment_records FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Only service role can update payment records"
    ON payment_records FOR UPDATE
    USING (auth.role() = 'service_role'); 