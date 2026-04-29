package signup

import "errors"

var ErrEmailAlreadyExists = errors.New("signup email already exists")
var ErrVerificationTokenInvalid = errors.New("signup verification token is invalid")
var ErrPendingSignupNotFound = errors.New("pending signup not found")
var ErrVerificationCooldownActive = errors.New("signup verification cooldown is active")
var ErrInviteTokenInvalid = errors.New("signup invitation token is invalid")
var ErrInviteEmailMismatch = errors.New("signup invitation email does not match")
var ErrEmailChangeVerificationTokenInvalid = errors.New("email change verification token is invalid")
var ErrPendingEmailChangeNotFound = errors.New("pending email change not found")
var ErrEmailChangeVerificationCooldownActive = errors.New("email change verification cooldown is active")
