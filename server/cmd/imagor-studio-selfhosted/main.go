package main

import (
	"os"

	"github.com/cshum/imagor-studio/server/cmd/internal/runapp"
)

func main() {
	runapp.Run(os.Args[1:])
}
