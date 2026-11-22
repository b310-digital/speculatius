# Billing Retries

## Purpose
Failed card payments silently churn customers. Retry failed
charges and warn the customer before suspension.

## Non-goals
- Dunning sequences beyond 3 emails
- Partial payments

## Requirements

### Requirement: Retry failed charges
WHEN a charge fails on an active subscription, the billing service SHALL retry it once after 24 hours.

#### Scenario: BILL-003 Retry after 24 hours
- **GIVEN** an invoice whose charge failed
- **WHEN** 24 hours have passed
- **THEN** the charge is retried once
- **AND** the customer receives a payment-failed notice

#### Scenario: BILL-004 No retry for cancelled subscriptions
- **GIVEN** a failed invoice on a cancelled subscription
- **WHEN** 24 hours have passed
- **THEN** no retry happens

## Open questions
- Retry window for annual plans?
