package entrypoint

import (
	"context"
	"fmt"
	"net/http"

	"github.com/cshum/imagor-studio/server/internal/config"
	internalserver "github.com/cshum/imagor-studio/server/internal/server"
	sharedprocessing "github.com/cshum/imagor-studio/server/pkg/processing"
	"go.uber.org/zap"
)

func NewProcessingHandlerForTests(args []string, nodeCfg sharedprocessing.NodeConfig, runtimeFactory sharedprocessing.RuntimeFactory, hooks sharedprocessing.NodeHooks) (http.Handler, func() error, error) {
	logger := zap.NewNop()
	cfg, err := config.Load(args, nil)
	if err != nil {
		return nil, nil, fmt.Errorf("load processing config: %w", err)
	}
	services, err := InitializeProcessingWithFactoryAndHooks(cfg, nodeCfg, logger, runtimeFactory, hooks)
	if err != nil {
		return nil, nil, fmt.Errorf("initialize processing services: %w", err)
	}
	srv, err := internalserver.NewProcessingFromServices(cfg, nil, logger, services)
	if err != nil {
		_ = services.ImagorProvider.Shutdown(context.TODO())
		return nil, nil, fmt.Errorf("create processing server: %w", err)
	}
	cleanup := func() error {
		return srv.Close()
	}
	return srv.Handler(), cleanup, nil
}
