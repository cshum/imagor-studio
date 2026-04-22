package imagorprovider

import (
	"testing"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/stretchr/testify/assert"
)

func TestProcessorCacheSizeBytes_UsesDefaultWhenConfigMissing(t *testing.T) {
	assert.Equal(t, 200*1024*1024, processorCacheSizeBytes(nil))
}

func TestProcessorCacheSizeBytes_UsesConfiguredValue(t *testing.T) {
	assert.Equal(t, 512*1024*1024, processorCacheSizeBytes(&config.Config{ImagorCacheSizeBytes: 512 * 1024 * 1024}))
}
