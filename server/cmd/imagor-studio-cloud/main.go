package main

import (
	tools "github.com/cshum/imagor-studio/server"
	"github.com/cshum/imagor-studio/server/internal/appmain"
	"github.com/cshum/imagor-studio/server/internal/server"
)

func main() {
	appmain.Run(tools.EmbedFS, server.ModeCloud)
}
