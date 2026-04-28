package signup

import "errors"

var ErrEmailAlreadyExists = errors.New("signup email already exists")
var ErrVerificationTokenInvalid = errors.New("signup verification token is invalid")
var ErrPendingSignupNotFound = errors.New("pending signup not found")
var ErrVerificationCooldownActive = errors.New("signup verification cooldown is active")
