package resolver

import (
	"testing"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor/imagorpath"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestGenerateImagorURL(t *testing.T) {
	// Setup test resolver with mocked imagor provider
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	mockImagorProvider := new(MockImagorProvider)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, mockImagorProvider, cfg, nil, logger)

	// Use authenticated context with write permissions
	ctx := createReadWriteContext("test-user")

	t.Run("ValidParameters", func(t *testing.T) {
		params := gql.ImagorParamsInput{
			Width:  intPtr(800),
			Height: intPtr(600),
			FitIn:  boolPtr(true),
		}

		// Mock the imagor provider to return a test URL
		expectedURL := "/imagor/fit-in/800x600/gallery1/image.jpg"
		mockImagorProvider.On("GenerateURL", "gallery1/image.jpg", imagorpath.Params{
			Width:  800,
			Height: 600,
			FitIn:  true,
		}).Return(expectedURL, nil)

		url, err := resolver.Mutation().GenerateImagorURL(ctx, "gallery1", "image.jpg", params)
		require.NoError(t, err)
		assert.Equal(t, expectedURL, url)

		mockImagorProvider.AssertExpectations(t)
	})

	t.Run("EmptyParameters", func(t *testing.T) {
		mockImagorProvider.ExpectedCalls = nil
		params := gql.ImagorParamsInput{}

		expectedURL := "/imagor/unsafe/gallery1/image.jpg"
		mockImagorProvider.On("GenerateURL", "gallery1/image.jpg", imagorpath.Params{}).Return(expectedURL, nil)

		url, err := resolver.Mutation().GenerateImagorURL(ctx, "gallery1", "image.jpg", params)
		require.NoError(t, err)
		assert.Equal(t, expectedURL, url)

		mockImagorProvider.AssertExpectations(t)
	})

	t.Run("RootImage", func(t *testing.T) {
		mockImagorProvider.ExpectedCalls = nil
		params := gql.ImagorParamsInput{
			Width: intPtr(400),
		}

		expectedURL := "/imagor/400x0/root-image.jpg"
		mockImagorProvider.On("GenerateURL", "root-image.jpg", imagorpath.Params{
			Width: 400,
		}).Return(expectedURL, nil)

		url, err := resolver.Mutation().GenerateImagorURL(ctx, "", "root-image.jpg", params)
		require.NoError(t, err)
		assert.Equal(t, expectedURL, url)

		mockImagorProvider.AssertExpectations(t)
	})
}

func TestGenerateImagorUrls(t *testing.T) {
	// Setup test resolver with mocked imagor provider
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	mockImagorProvider := new(MockImagorProvider)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, mockImagorProvider, cfg, nil, logger)

	// Use authenticated context with write permissions
	ctx := createReadWriteContext("test-user")

	t.Run("BulkMode", func(t *testing.T) {
		mockImagorProvider.ExpectedCalls = nil
		paramsList := []*gql.ImagorParamsInput{
			{
				Width:  intPtr(800),
				Height: intPtr(600),
				FitIn:  boolPtr(true),
			},
			{
				Width:  intPtr(400),
				Height: intPtr(300),
				Filters: []*gql.ImagorFilterInput{
					{Name: "grayscale", Args: ""},
				},
			},
			{
				Width: intPtr(200),
				Filters: []*gql.ImagorFilterInput{
					{Name: "quality", Args: "80"},
				},
			},
		}

		expectedURLs := []string{
			"/imagor/fit-in/800x600/gallery1/image.jpg",
			"/imagor/400x300/filters:grayscale()/gallery1/image.jpg",
			"/imagor/200x0/filters:quality(80)/gallery1/image.jpg",
		}

		// Mock all three URL generations
		mockImagorProvider.On("GenerateURL", "gallery1/image.jpg", imagorpath.Params{
			Width:  800,
			Height: 600,
			FitIn:  true,
		}).Return(expectedURLs[0], nil)

		mockImagorProvider.On("GenerateURL", "gallery1/image.jpg", imagorpath.Params{
			Width:  400,
			Height: 300,
			Filters: imagorpath.Filters{
				{Name: "grayscale", Args: ""},
			},
		}).Return(expectedURLs[1], nil)

		mockImagorProvider.On("GenerateURL", "gallery1/image.jpg", imagorpath.Params{
			Width: 200,
			Filters: imagorpath.Filters{
				{Name: "quality", Args: "80"},
			},
		}).Return(expectedURLs[2], nil)

		urls, err := resolver.Mutation().GenerateImagorUrls(ctx, "gallery1", "image.jpg", paramsList)
		require.NoError(t, err)
		require.Len(t, urls, 3)
		assert.Equal(t, expectedURLs[0], urls[0])
		assert.Equal(t, expectedURLs[1], urls[1])
		assert.Equal(t, expectedURLs[2], urls[2])

		mockImagorProvider.AssertExpectations(t)
	})

	t.Run("BulkModeEmpty", func(t *testing.T) {
		mockImagorProvider.ExpectedCalls = nil
		paramsList := []*gql.ImagorParamsInput{}

		urls, err := resolver.Mutation().GenerateImagorUrls(ctx, "gallery1", "image.jpg", paramsList)
		require.NoError(t, err)
		require.Len(t, urls, 0)
	})
}

func TestBuildImagePath(t *testing.T) {
	tests := []struct {
		name       string
		galleryKey string
		imageKey   string
		expected   string
	}{
		{
			name:       "GalleryImage",
			galleryKey: "gallery1",
			imageKey:   "image.jpg",
			expected:   "gallery1/image.jpg",
		},
		{
			name:       "RootImage",
			galleryKey: "",
			imageKey:   "root-image.jpg",
			expected:   "root-image.jpg",
		},
		{
			name:       "NestedGallery",
			galleryKey: "gallery1/subfolder",
			imageKey:   "nested-image.png",
			expected:   "gallery1/subfolder/nested-image.png",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := buildImagePath(tt.galleryKey, tt.imageKey)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestConvertToImagorParams(t *testing.T) {
	t.Run("AllParameters", func(t *testing.T) {
		input := gql.ImagorParamsInput{
			Width:         intPtr(800),
			Height:        intPtr(600),
			CropLeft:      floatPtr(10.5),
			CropTop:       floatPtr(20.0),
			CropRight:     floatPtr(100.5),
			CropBottom:    floatPtr(200.0),
			FitIn:         boolPtr(true),
			Stretch:       boolPtr(false),
			PaddingLeft:   intPtr(5),
			PaddingTop:    intPtr(10),
			PaddingRight:  intPtr(15),
			PaddingBottom: intPtr(20),
			HFlip:         boolPtr(true),
			VFlip:         boolPtr(false),
			HAlign:        stringPtr("left"),
			VAlign:        stringPtr("top"),
			Smart:         boolPtr(true),
			Trim:          boolPtr(true),
			TrimBy:        stringPtr("top-left"),
			TrimTolerance: intPtr(5),
			Filters: []*gql.ImagorFilterInput{
				{Name: "quality", Args: "80"},
				{Name: "brightness", Args: "10"},
			},
		}

		result := convertToImagorParams(input)

		assert.Equal(t, 800, result.Width)
		assert.Equal(t, 600, result.Height)
		assert.Equal(t, 10.5, result.CropLeft)
		assert.Equal(t, 20.0, result.CropTop)
		assert.Equal(t, 100.5, result.CropRight)
		assert.Equal(t, 200.0, result.CropBottom)
		assert.True(t, result.FitIn)
		assert.False(t, result.Stretch)
		assert.Equal(t, 5, result.PaddingLeft)
		assert.Equal(t, 10, result.PaddingTop)
		assert.Equal(t, 15, result.PaddingRight)
		assert.Equal(t, 20, result.PaddingBottom)
		assert.True(t, result.HFlip)
		assert.False(t, result.VFlip)
		assert.Equal(t, "left", result.HAlign)
		assert.Equal(t, "top", result.VAlign)
		assert.True(t, result.Smart)
		assert.True(t, result.Trim)
		assert.Equal(t, "top-left", result.TrimBy)
		assert.Equal(t, 5, result.TrimTolerance)
		assert.Len(t, result.Filters, 2)
		assert.Equal(t, "quality", result.Filters[0].Name)
		assert.Equal(t, "80", result.Filters[0].Args)
		assert.Equal(t, "brightness", result.Filters[1].Name)
		assert.Equal(t, "10", result.Filters[1].Args)
	})

	t.Run("EmptyParameters", func(t *testing.T) {
		input := gql.ImagorParamsInput{}
		result := convertToImagorParams(input)

		// All values should be zero/default
		assert.Equal(t, 0, result.Width)
		assert.Equal(t, 0, result.Height)
		assert.Equal(t, 0.0, result.CropLeft)
		assert.False(t, result.FitIn)
		assert.False(t, result.Smart)
		assert.Empty(t, result.HAlign)
		assert.Len(t, result.Filters, 0)
	})

	t.Run("NilFilters", func(t *testing.T) {
		input := gql.ImagorParamsInput{
			Width:   intPtr(400),
			Filters: nil,
		}
		result := convertToImagorParams(input)

		assert.Equal(t, 400, result.Width)
		assert.Len(t, result.Filters, 0)
	})

	t.Run("EmptyFilters", func(t *testing.T) {
		input := gql.ImagorParamsInput{
			Width:   intPtr(400),
			Filters: []*gql.ImagorFilterInput{},
		}
		result := convertToImagorParams(input)

		assert.Equal(t, 400, result.Width)
		assert.Len(t, result.Filters, 0)
	})
}

func TestImagorParamsConversion(t *testing.T) {
	// Test that our conversion produces the same result as direct imagorpath.Params
	t.Run("CompareWithDirectParams", func(t *testing.T) {
		input := gql.ImagorParamsInput{
			Width:  intPtr(800),
			Height: intPtr(600),
			FitIn:  boolPtr(true),
			Filters: []*gql.ImagorFilterInput{
				{Name: "quality", Args: "90"},
			},
		}

		converted := convertToImagorParams(input)
		direct := imagorpath.Params{
			Width:  800,
			Height: 600,
			FitIn:  true,
			Filters: imagorpath.Filters{
				{Name: "quality", Args: "90"},
			},
		}

		assert.Equal(t, direct.Width, converted.Width)
		assert.Equal(t, direct.Height, converted.Height)
		assert.Equal(t, direct.FitIn, converted.FitIn)
		assert.Len(t, converted.Filters, len(direct.Filters))
		assert.Equal(t, direct.Filters[0].Name, converted.Filters[0].Name)
		assert.Equal(t, direct.Filters[0].Args, converted.Filters[0].Args)
	})
}

func TestGenerateThumbnailUrls(t *testing.T) {
	// Setup test resolver with mocked imagor provider
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	mockImagorProvider := new(MockImagorProvider)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, mockImagorProvider, cfg, nil, logger)

	t.Run("GeneratesThumbnailUrls", func(t *testing.T) {
		imagePath := "test/image.jpg"

		// Mock all the expected calls for thumbnail generation
		mockImagorProvider.On("GenerateURL", imagePath, imagorpath.Params{
			Width:  300,
			Height: 225,
			Filters: imagorpath.Filters{
				{Name: "quality", Args: "80"},
				{Name: "format", Args: "webp"},
			},
		}).Return("/imagor/300x225/filters:quality(80):format(webp)/test/image.jpg", nil)

		mockImagorProvider.On("GenerateURL", imagePath, imagorpath.Params{
			Width:  1200,
			Height: 900,
			FitIn:  true,
			Filters: imagorpath.Filters{
				{Name: "quality", Args: "90"},
				{Name: "format", Args: "webp"},
			},
		}).Return("/imagor/fit-in/1200x900/filters:quality(90):format(webp)/test/image.jpg", nil)

		mockImagorProvider.On("GenerateURL", imagePath, imagorpath.Params{
			Width:  2400,
			Height: 1800,
			FitIn:  true,
			Filters: imagorpath.Filters{
				{Name: "quality", Args: "95"},
				{Name: "format", Args: "webp"},
			},
		}).Return("/imagor/fit-in/2400x1800/filters:quality(95):format(webp)/test/image.jpg", nil)

		mockImagorProvider.On("GenerateURL", imagePath, imagorpath.Params{
			Filters: imagorpath.Filters{
				{Name: "raw"},
			},
		}).Return("/imagor/filters:raw()/test/image.jpg", nil)

		mockImagorProvider.On("GenerateURL", imagePath, imagorpath.Params{
			Meta: true,
		}).Return("/imagor/meta/test/image.jpg", nil)

		result := resolver.generateThumbnailUrls(imagePath, "first_frame")

		require.NotNil(t, result)
		assert.NotNil(t, result.Grid)
		assert.NotNil(t, result.Preview)
		assert.NotNil(t, result.Full)
		assert.NotNil(t, result.Original)
		assert.NotNil(t, result.Meta)

		mockImagorProvider.AssertExpectations(t)
	})

	t.Run("NilImagorProvider", func(t *testing.T) {
		// Create resolver without imagor provider
		resolverWithoutImagor := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

		result := resolverWithoutImagor.generateThumbnailUrls("test/image.jpg", "first_frame")
		assert.Nil(t, result)
	})
}

func TestGenerateThumbnailUrls_WithVideoThumbnailPosition(t *testing.T) {
	// Setup test resolver with mocked imagor provider
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	mockImagorProvider := new(MockImagorProvider)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, mockImagorProvider, cfg, nil, logger)

	tests := []struct {
		name              string
		videoThumbnailPos string
		expectedFilter    string
		description       string
	}{
		{
			name:              "first_frame - no seek filter",
			videoThumbnailPos: "first_frame",
			expectedFilter:    "",
			description:       "Should not include seek filter for first_frame",
		},
		{
			name:              "seek_1s - includes seek filter",
			videoThumbnailPos: "seek_1s",
			expectedFilter:    "seek(1s)",
			description:       "Should include seek(1s) filter in URL",
		},
		{
			name:              "seek_3s - includes seek filter",
			videoThumbnailPos: "seek_3s",
			expectedFilter:    "seek(3s)",
			description:       "Should include seek(3s) filter in URL",
		},
		{
			name:              "seek_5s - includes seek filter",
			videoThumbnailPos: "seek_5s",
			expectedFilter:    "seek(5s)",
			description:       "Should include seek(5s) filter in URL",
		},
		{
			name:              "seek_10pct - includes seek filter",
			videoThumbnailPos: "seek_10pct",
			expectedFilter:    "seek(0.1)",
			description:       "Should include seek(0.1) filter for 10%",
		},
		{
			name:              "seek_25pct - includes seek filter",
			videoThumbnailPos: "seek_25pct",
			expectedFilter:    "seek(0.25)",
			description:       "Should include seek(0.25) filter for 25%",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockImagorProvider.ExpectedCalls = nil
			imagePath := "test/video.mp4"

			// Build the expected filters based on video thumbnail position
			// The seek filter is appended at the END by buildThumbnailFilters
			var gridFilters imagorpath.Filters
			if tt.expectedFilter != "" {
				// Extract filter name and args from "seek(1s)" format
				filterName := "seek"
				filterArgs := tt.expectedFilter[5 : len(tt.expectedFilter)-1] // Extract "1s" from "seek(1s)"
				gridFilters = imagorpath.Filters{
					{Name: "quality", Args: "80"},
					{Name: "format", Args: "webp"},
					{Name: filterName, Args: filterArgs},
				}
			} else {
				gridFilters = imagorpath.Filters{
					{Name: "quality", Args: "80"},
					{Name: "format", Args: "webp"},
				}
			}

			var previewFilters imagorpath.Filters
			if tt.expectedFilter != "" {
				filterName := "seek"
				filterArgs := tt.expectedFilter[5 : len(tt.expectedFilter)-1]
				previewFilters = imagorpath.Filters{
					{Name: "quality", Args: "90"},
					{Name: "format", Args: "webp"},
					{Name: filterName, Args: filterArgs},
				}
			} else {
				previewFilters = imagorpath.Filters{
					{Name: "quality", Args: "90"},
					{Name: "format", Args: "webp"},
				}
			}

			var fullFilters imagorpath.Filters
			if tt.expectedFilter != "" {
				filterName := "seek"
				filterArgs := tt.expectedFilter[5 : len(tt.expectedFilter)-1]
				fullFilters = imagorpath.Filters{
					{Name: "quality", Args: "95"},
					{Name: "format", Args: "webp"},
					{Name: filterName, Args: filterArgs},
				}
			} else {
				fullFilters = imagorpath.Filters{
					{Name: "quality", Args: "95"},
					{Name: "format", Args: "webp"},
				}
			}

			// Mock all thumbnail sizes with correct filters
			// Build the return URLs with the seek filter included
			gridURL := "/imagor/300x225/filters:quality(80):format(webp)"
			previewURL := "/imagor/fit-in/1200x900/filters:quality(90):format(webp)"
			fullURL := "/imagor/fit-in/2400x1800/filters:quality(95):format(webp)"

			if tt.expectedFilter != "" {
				gridURL = "/imagor/300x225/filters:quality(80):format(webp):" + tt.expectedFilter
				previewURL = "/imagor/fit-in/1200x900/filters:quality(90):format(webp):" + tt.expectedFilter
				fullURL = "/imagor/fit-in/2400x1800/filters:quality(95):format(webp):" + tt.expectedFilter
			}

			gridURL += "/test/video.mp4"
			previewURL += "/test/video.mp4"
			fullURL += "/test/video.mp4"

			mockImagorProvider.On("GenerateURL", imagePath, imagorpath.Params{
				Width:   300,
				Height:  225,
				Filters: gridFilters,
			}).Return(gridURL, nil)

			mockImagorProvider.On("GenerateURL", imagePath, imagorpath.Params{
				Width:   1200,
				Height:  900,
				FitIn:   true,
				Filters: previewFilters,
			}).Return(previewURL, nil)

			mockImagorProvider.On("GenerateURL", imagePath, imagorpath.Params{
				Width:   2400,
				Height:  1800,
				FitIn:   true,
				Filters: fullFilters,
			}).Return(fullURL, nil)

			mockImagorProvider.On("GenerateURL", imagePath, imagorpath.Params{
				Filters: imagorpath.Filters{
					{Name: "raw"},
				},
			}).Return("/imagor/filters:raw()/test/video.mp4", nil)

			mockImagorProvider.On("GenerateURL", imagePath, imagorpath.Params{
				Meta: true,
			}).Return("/imagor/meta/test/video.mp4", nil)

			// Generate thumbnail URLs with the position
			result := resolver.generateThumbnailUrls(imagePath, tt.videoThumbnailPos)

			// Verify result is not nil
			require.NotNil(t, result, tt.description)
			require.NotNil(t, result.Grid, tt.description)

			// Check if the expected filter is in the URL
			if tt.expectedFilter == "" {
				// For first_frame, should not contain seek filter
				assert.NotContains(t, *result.Grid, "seek(", tt.description)
			} else {
				// For seek options, should contain the seek filter
				assert.Contains(t, *result.Grid, tt.expectedFilter, tt.description)
			}

			mockImagorProvider.AssertExpectations(t)
		})
	}
}

// Helper function for creating float pointers (intPtr and stringPtr already exist in resolver_test.go)
func floatPtr(f float64) *float64 {
	return &f
}

func boolPtr(b bool) *bool {
	return &b
}
