package cloudapi

type Disabled interface {
	CloudDisabled() bool
}

func IsDisabled(v any) bool {
	d, ok := v.(Disabled)
	return ok && d.CloudDisabled()
}
