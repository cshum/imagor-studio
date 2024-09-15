package config

import (
	"github.com/spf13/viper"
)

type Config struct {
	Port        int    `mapstructure:"PORT"`
	StorageType string `mapstructure:"STORAGE_TYPE"`
	S3Bucket    string `mapstructure:"S3_BUCKET"`
	S3Region    string `mapstructure:"S3_REGION"`
	FilesysRoot string `mapstructure:"FILESYS_ROOT"`
}

func Load() (*Config, error) {
	viper.SetDefault("PORT", 8080)
	viper.SetDefault("STORAGE_TYPE", "filesystem")
	viper.SetDefault("FILESYS_ROOT", "./files")

	viper.AutomaticEnv()

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, err
	}

	return &config, nil
}
