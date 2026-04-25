package processing

import (
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAppendInternalTrafficSignature(t *testing.T) {
	t.Parallel()

	url := AppendInternalTrafficSignature("/sig/300x200/test.jpg", "300x200/test.jpg", "secret")
	assert.Equal(t, "/sig/300x200/test.jpg?it="+SignInternalTraffic("300x200/test.jpg", "secret"), url)
}

func TestVerifyInternalTrafficRequest(t *testing.T) {
	t.Parallel()

	t.Run("valid signed path is internal", func(t *testing.T) {
		signature := SignInternalTraffic("300x200/test.jpg", "secret")
		req := httptest.NewRequest("GET", "/signed/300x200/test.jpg?it="+signature, nil)
		require.True(t, VerifyInternalTrafficRequest(req, "secret"))
	})

	t.Run("invalid signed path is ignored", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/signed/300x200/test.jpg?it=bad", nil)
		assert.False(t, VerifyInternalTrafficRequest(req, "secret"))
	})

	t.Run("unsafe path verifies against canonical payload only", func(t *testing.T) {
		signature := SignInternalTraffic("300x200/test.jpg", "secret")
		req := httptest.NewRequest("GET", "/unsafe/300x200/test.jpg?it="+signature, nil)
		require.True(t, VerifyInternalTrafficRequest(req, "secret"))
	})

	t.Run("missing token is billable", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/signed/300x200/test.jpg", nil)
		assert.False(t, VerifyInternalTrafficRequest(req, "secret"))
	})
}
