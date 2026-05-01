//go:build !cgo

package userstore

func isSQLiteUniqueConstraint(error) bool {
	return false
}
