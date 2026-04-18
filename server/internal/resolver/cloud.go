package resolver

// CloudCapabilities collects the minimal cloud-only runtime checks used while
// separating GraphQL composition from shared resolver logic.
type CloudCapabilities interface {
	IsCloudEnabled() bool
}
