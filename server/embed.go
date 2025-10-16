package tools

import (
	"embed"
)

//go:embed static/* embedded-static/*
var EmbedFS embed.FS
