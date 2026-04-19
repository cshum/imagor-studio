package spacestore

import "regexp"

var dnsLabelRE = regexp.MustCompile(`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`)

func validateSpaceKey(key string) error {
	if key == "" {
		return errSpaceKeyEmpty{}
	}
	if len(key) > 63 {
		return errSpaceKeyInvalid{}
	}
	if !dnsLabelRE.MatchString(key) {
		return errSpaceKeyInvalid{}
	}
	return nil
}

type errSpaceKeyEmpty struct{}

func (errSpaceKeyEmpty) Error() string { return "space key must not be empty" }

type errSpaceKeyInvalid struct{}

func (errSpaceKeyInvalid) Error() string {
	return "space key must contain only lowercase letters, digits, and hyphens, and must start and end with an alphanumeric character"
}
