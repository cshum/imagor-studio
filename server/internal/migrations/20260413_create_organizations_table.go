package migrations

import (
	"context"
	"time"

	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		// Local structs scoped to this migration — no coupling to model package.
		type Organization struct {
			bun.BaseModel `bun:"table:organizations"`

			ID string `bun:"id,pk,type:text"`
			// owning user; the user who created the org (first member, role='owner')
			OwnerID string `bun:"owner_id,notnull,type:text"`
			Name    string `bun:"name,notnull"`
			// slug is used in URLs and subdomain generation; immutable after creation
			Slug string `bun:"slug,notnull,unique"`

			// Plan & billing — no free tier.
			// plan values: "trial" | "early_bird" | "starter" | "pro" | "enterprise"
			Plan string `bun:"plan,notnull,default:'trial'"`
			// plan_status values: "trialing" | "active" | "past_due" | "canceled"
			PlanStatus string `bun:"plan_status,notnull,default:'trialing'"`

			// Billing fields — NULL until a Stripe subscription is created.
			StripeCustomerID     *string    `bun:"stripe_customer_id,unique"`
			StripeSubscriptionID *string    `bun:"stripe_subscription_id,unique"`
			BillingEmail         *string    `bun:"billing_email"`
			TrialEndsAt          *time.Time `bun:"trial_ends_at"`

			CreatedAt time.Time `bun:"created_at,notnull,default:current_timestamp"`
			UpdatedAt time.Time `bun:"updated_at,notnull,default:current_timestamp"`
		}

		type OrgMember struct {
			bun.BaseModel `bun:"table:org_members"`

			OrgID  string `bun:"org_id,pk,type:text"`
			UserID string `bun:"user_id,pk,type:text"`
			// role values: "owner" | "admin" | "member"
			Role      string    `bun:"role,notnull,default:'owner'"`
			CreatedAt time.Time `bun:"created_at,notnull,default:current_timestamp"`
		}

		// Create organizations table.
		if _, err := db.NewCreateTable().
			Model((*Organization)(nil)).
			IfNotExists().
			Exec(ctx); err != nil {
			return err
		}

		// Index on slug for slug-based lookups.
		if _, err := db.NewCreateIndex().
			Model((*Organization)(nil)).
			Index("idx_organizations_slug").
			Unique().
			Column("slug").
			IfNotExists().
			Exec(ctx); err != nil {
			return err
		}

		// Index on owner_id for owner-based lookups.
		if _, err := db.NewCreateIndex().
			Model((*Organization)(nil)).
			Index("idx_organizations_owner_id").
			Column("owner_id").
			IfNotExists().
			Exec(ctx); err != nil {
			return err
		}

		// Create org_members table (composite PK: org_id + user_id).
		if _, err := db.NewCreateTable().
			Model((*OrgMember)(nil)).
			IfNotExists().
			Exec(ctx); err != nil {
			return err
		}

		// Index on user_id so we can efficiently look up "which org does this user belong to".
		_, err := db.NewCreateIndex().
			Model((*OrgMember)(nil)).
			Index("idx_org_members_user_id").
			Column("user_id").
			IfNotExists().
			Exec(ctx)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		// Down: drop tables in reverse dependency order.
		type OrgMember struct {
			bun.BaseModel `bun:"table:org_members"`
		}
		type Organization struct {
			bun.BaseModel `bun:"table:organizations"`
		}
		if _, err := db.NewDropTable().Model((*OrgMember)(nil)).IfExists().Exec(ctx); err != nil {
			return err
		}
		_, err := db.NewDropTable().Model((*Organization)(nil)).IfExists().Exec(ctx)
		return err
	})
}
