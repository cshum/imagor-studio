package entrypoint

import (
	"os"
	"testing"
)

func TestShouldUseDebugLogging(t *testing.T) {
	t.Setenv("DEBUG", "")
	t.Setenv("IMAGOR_DEBUG", "")
	t.Setenv("IMAGOR_LOG_LEVEL", "")

	if shouldUseDebugLogging() {
		t.Fatal("expected debug logging to be disabled by default")
	}

	t.Setenv("DEBUG", "1")
	if !shouldUseDebugLogging() {
		t.Fatal("expected DEBUG=1 to enable debug logging")
	}

	t.Setenv("DEBUG", "")
	t.Setenv("IMAGOR_DEBUG", "true")
	if !shouldUseDebugLogging() {
		t.Fatal("expected IMAGOR_DEBUG=true to enable debug logging")
	}

	t.Setenv("IMAGOR_DEBUG", "")
	t.Setenv("IMAGOR_LOG_LEVEL", "debug")
	if !shouldUseDebugLogging() {
		t.Fatal("expected IMAGOR_LOG_LEVEL=debug to enable debug logging")
	}
}

func TestEnvVarEnablesDebug(t *testing.T) {
	for _, value := range []string{"1", "true", "yes", "on", "debug", "development", "dev"} {
		name := "TEST_DEBUG_FLAG"
		t.Setenv(name, value)
		if !envVarEnablesDebug(name) {
			t.Fatalf("expected %q to enable debug logging", value)
		}
		os.Unsetenv(name)
	}

	for _, value := range []string{"", "0", "false", "no", "off", "info"} {
		name := "TEST_DEBUG_FLAG"
		t.Setenv(name, value)
		if envVarEnablesDebug(name) {
			t.Fatalf("expected %q not to enable debug logging", value)
		}
		os.Unsetenv(name)
	}
}
