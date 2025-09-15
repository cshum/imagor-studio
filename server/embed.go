package tools

import (
	"embed"
)

//go:embed static/**
var EmbedFS embed.FS
