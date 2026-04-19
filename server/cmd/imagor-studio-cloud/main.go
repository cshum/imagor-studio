package main

import (
	tools "github.com/cshum/imagor-studio/server"
)

func main() {
	tools.Run(tools.EmbedFS, tools.ModeCloud)
}
