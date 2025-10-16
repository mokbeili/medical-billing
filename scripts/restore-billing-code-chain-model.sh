#!/bin/bash

# Restore BillingCodeChain model to schema.prisma after accidental db pull
# This script adds the model back if it was removed by prisma db pull

SCHEMA_FILE="prisma/schema.prisma"
MODEL_DEFINITION="
/// This model represents a database VIEW, not a table.
/// It is managed via raw SQL migrations and should not be modified by Prisma.
/// See: prisma/migrations/20250829000000_add_billing_code_chain_view/migration.sql
model BillingCodeChain {
  codeId             Int     @map(\"code_id\")
  code               String
  title              String
  dayRange           Int     @map(\"day_range\")
  rootId             Int     @map(\"root_id\")
  previousCodeId     Int?    @map(\"previous_code_id\")
  previousDayRange   Int     @map(\"previous_day_range\")
  cumulativeDayRange Int     @map(\"cumulative_day_range\")
  prevPlusSelf       Int     @map(\"prev_plus_self\")
  isLast             Boolean @map(\"is_last\")

  billingCode BillingCode @relation(fields: [codeId], references: [id])

  @@id([codeId])
  @@map(\"billing_code_chain\")
}
"

# Check if BillingCodeChain model exists in schema
if ! grep -q "model BillingCodeChain" "$SCHEMA_FILE"; then
    echo "❌ BillingCodeChain model not found in schema.prisma"
    echo "📝 Adding it back..."
    
    # Find the line after BillingCodeRelation model and insert the new model
    # We'll add it after the BillingCodeRelation model ends
    awk -v model="$MODEL_DEFINITION" '
        /^model BillingCodeRelation/,/^}/ {
            if (/^}/) {
                print
                print ""
                print model
                next
            }
        }
        {print}
    ' "$SCHEMA_FILE" > "$SCHEMA_FILE.tmp" && mv "$SCHEMA_FILE.tmp" "$SCHEMA_FILE"
    
    echo "✅ BillingCodeChain model restored!"
    echo ""
    echo "Also update BillingCode model to include the relation:"
    echo "  billingCodeChains BillingCodeChain[]"
    echo ""
    echo "Then run: npx prisma generate"
else
    echo "✅ BillingCodeChain model already exists in schema.prisma"
fi

