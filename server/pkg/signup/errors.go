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

type VerificationCooldownError struct {
	RemainingSeconds int
}

func (e *VerificationCooldownError) Error() string {
	return ErrVerificationCooldownActive.Error()
}

func (e *VerificationCooldownError) Is(target error) bool {
	return target == ErrVerificationCooldownActive
}

func NewVerificationCooldownError(remainingSeconds int) error {
	if remainingSeconds < 0 {
		remainingSeconds = 0
	}
	return &VerificationCooldownError{RemainingSeconds: remainingSeconds}
}

func VerificationCooldownRemainingSeconds(err error) (int, bool) {
	var cooldownErr *VerificationCooldownError
	if !errors.As(err, &cooldownErr) {
		return 0, false
	}
	return cooldownErr.RemainingSeconds, true
}
