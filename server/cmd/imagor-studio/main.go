package main

import (
	tools "github.com/cshum/imagor-studio/server"
	"github.com/cshum/imagor-studio/server/entrypoint"
)

func main() {
	entrypoint.Run(tools.EmbedFS, entrypoint.ModeSelfHosted)
}
