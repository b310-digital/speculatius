# Billing Retries

## Purpose
Failed card payments silently churn customers.

## Non-goals
- Partial payments

## Requirements

## Requirement: Retry failed charges
The billing service SHALL retry a failed charge.

#### Scenario: BILL-010 Retry and notify
- **GIVEN** an invoice whose charge failed
- **WHEN** 24 hours have passed
- **WHEN** the customer opens the app
- **THEN** the charge is retried once

### Requirement: Notify customer
The billing service should notify the customer.

### Requirement: Suspend account
Accounts SHALL be suspended after 3 failed retries.

#### Scenario: BILL-011 Suspend after third failure
- **WHEN** the third retry fails
- **THEN** the account is suspended
