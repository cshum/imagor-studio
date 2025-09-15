package resolver

import (
	"context"
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
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, mockImagorProvider, cfg, logger)

	ctx := context.Background()

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
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, mockImagorProvider, cfg, logger)

	t.Run("GeneratesThumbnailUrls", func(t *testing.T) {
		imagePath := "test/image.jpg"

		// Mock all the expected calls for thumbnail generation
		mockImagorProvider.On("GenerateURL", imagePath, imagorpath.Params{
			Width:  300,
			Height: 225,
			Filters: imagorpath.Filters{
				{Name: "quality", Args: "80"},
				{Name: "format", Args: "webp"},
				{Name: "max_frames", Args: "1"},
			},
		}).Return("/imagor/300x225/filters:quality(80):format(webp):max_frames(1)/test/image.jpg", nil)

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

		result := resolver.generateThumbnailUrls(imagePath)

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
		resolverWithoutImagor := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, logger)

		result := resolverWithoutImagor.generateThumbnailUrls("test/image.jpg")
		assert.Nil(t, result)
	})
}

// Helper function for creating float pointers (intPtr and stringPtr already exist in resolver_test.go)
func floatPtr(f float64) *float64 {
	return &f
}

func boolPtr(b bool) *bool {
	return &b
}
